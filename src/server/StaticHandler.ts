import { createHash } from "node:crypto"
import type { Stats } from "node:fs"
import { readFile } from "node:fs/promises"
import type { IncomingMessage } from "node:http"
import { extname, relative, resolve, sep } from "node:path"

import type { Caching, FileTransform, Handler, HtmlTransform, Mount, PageSource } from "spell/server"
// Import directly:  through the `SRV` barrel, the Linker's HTML parser lands in spell-epic's extension (I58)
import { typeFor } from "./mime"
import { Reply } from "./Reply"
import { Request } from "./Request"
import { type Resolved, resolveInside } from "./safePath"
import { HttpError } from "./server.types"

/**
 * Serves folders under URL prefixes:  `GET` / `HEAD` only, never anything outside a folder.
 * - the LONGEST matching prefix wins, e.g. `/element/` over `/`
 * - folders mounted at the SAME prefix are laid over each other:  the first mounted that has the path serves it
 *   - e.g. the page server's `/worktrees/`, from the worktrees beside the repo and from the old `.claude/worktrees`
 *   - a catch-all mount (`Mount.skip`, which drops folders of the path) comes after the others there, whenever mounted:
 *     e.g. the epic folder under every worktree's address, after the worktrees' own files
 * - a folder serves its `index.html`;  asked for without its trailing `/`, it redirects (301) to it
 * - names starting with `.` are 403 unless the mount says `dotFiles`
 * - every answer has an `ETag` of the file on disk, so a page editor can say `If-Match`
 * - how long a browser keeps a copy:  the `caching` setting (`Caching`;  epic `solid-2-final` P2)
 *   - `"never"` (the default):  `Cache-Control: no-store`, as every worktree's page server answers
 *   - `"normal"`:  a hashed name (`Mount.hashed`) a year, `immutable`;  the rest `no-cache`, each load answered
 *     "not modified" (304) while the browser's copy matches its `ETag`
 *     - a page through the `html` hooks is "not modified" only while the hooks still make what they made for its last
 *       answer at that address:  the server's settings in it (the write token, airplane mode ...) are never stale
 *   - a file the hooks rewrite says `Vary: Sec-Fetch-Dest`:  a script's `fetch()` of it (below) is a copy of its own
 * - hooks:
 *   - `transforms[".ts"]`:  rewrites a file by extension, e.g. `ui`'s smoke server turns `.ts` into JavaScript
 *   - `html`:  rewrites every `.html` page in turn, e.g. inject an import map or `window.SPELL_SERVER`
 *   - `overlays`:  a URL path served from another one when a file is there (a folder laid over another)
 *   - NOT for a script's `fetch()` (`Sec-Fetch-Dest: empty`):  it gets the file AS IS
 *     - navigations, `<script>`s and module imports still get the hooks
 *     - why:  `<ui-include>` / `<ui-code>` / `<ui-markdown>` show a file and save it back,
 *       and must never see (or write) the injected live-reload tags
 * - nothing matched or file missing:  `next()`, so routes after it (an SPA fallback) still get a turn
 */
export class StaticHandler {
  /**
   * folders served, longest prefix first;  at one prefix, in the order mounted (`sort()` is stable),
   * the catch-alls (`skip`) last
   */
  private mounts: (Required<Omit<Mount, "hashed">> & Pick<Mount, "hashed">)[] = []

  /** rewrites of `.html` pages, in order */
  readonly html: HtmlTransform[]

  /** rewrites by extension (`.ts`), applied before `html` */
  readonly transforms: Record<string, FileTransform>

  /** how long browsers keep copies (`Caching`) */
  readonly caching: Caching

  /**
   * what the `html` hooks made of each page last, by its address and `ETag`:  a hash of it, so a page is
   * "not modified" (304) only while they'd make the same again (`caching: "normal"`)
   */
  private pagesSent = new Map<string, string>()

  /**
   * OVERLAYS:  each maps a URL path to another one, served in its place WHEN a file is there,
   * so one folder lays over another.
   * - e.g. the page server's `/components/ui/_assets/...` from a component set's site bundle (its `componentSets` setting)
   * - the first overlay that finds a file wins;  none:  the path as asked
   * - `undefined`:  not this overlay's path
   */
  readonly overlays: ((path: string) => string | undefined)[] = []

  constructor({ mounts = [], html = [], transforms = {}, caching = "never" }: StaticHandlerProps = {}) {
    this.html = html
    this.transforms = transforms
    this.caching = caching
    for (const mount of mounts) this.mount(mount)
  }

  /** serve `mount.dir` under `mount.prefix` too;  a prefix already mounted:  laid under the folders there */
  mount(mount: Mount): this {
    const prefix = mount.prefix.endsWith("/") ? mount.prefix : `${mount.prefix}/`
    this.mounts.push({ dotFiles: false, index: "index.html", skip: 0, ...mount, prefix, dir: resolve(mount.dir) })
    this.mounts.sort((a, b) => b.prefix.length - a.prefix.length || a.skip - b.skip)
    return this
  }

  /** the handler:  pass it to `router.use()` */
  handle: Handler = async (request, reply, next) => {
    if (request.method !== "GET" && request.method !== "HEAD") return next()
    const path = request.path
    const resolved = this.resolve(path)
    if (!resolved) return next()
    if ("redirect" in resolved) return void reply.redirect(`${request.baseUrl}${path}/`, 301)
    if ("status" in resolved) {
      if (resolved.status === 404) return next()
      throw new HttpError(resolved.status, resolved.message)
    }
    await this.serve(request, reply, resolved)
  }

  /**
   * Where URL path `path` leads through the mounts, exactly as `handle()` would serve it.
   * - `undefined`:  no mount
   * - for routes that act on a page by its URL, e.g. `docs`' details answers (`/worktrees/<w>/...` included)
   * - an overlay's file first (`overlays`)
   */
  resolve(path: string): StaticFound | undefined {
    for (const overlay of this.overlays) {
      const other = overlay(path)
      const found = other === undefined ? undefined : this.resolveMounted(other)
      if (found && "file" in found) return found
    }
    return this.resolveMounted(path)
  }

  /**
   * `resolve()` without the overlays:  through the mounts alone.
   * - several folders at the longest matching prefix:  the first one that has the path (not a 404) answers
   * - a catch-all (`skip`) looks without the path's first folders;  a path too short for it isn't its
   */
  private resolveMounted(path: string): StaticFound | undefined {
    const mount = this.mounts.find((each) => path.startsWith(each.prefix) || `${path}/` === each.prefix)
    if (!mount) return undefined
    // a mount's own folder without its slash (`/ui`):  redirect like any folder, so its pages' relative links resolve
    if (path.length < mount.prefix.length) return { redirect: `${path}/` }
    const inside = path.slice(mount.prefix.length - 1)
    let resolved: Resolved | undefined
    for (const each of this.mounts.filter(({ prefix }) => prefix === mount.prefix)) {
      const at = each.skip ? skipFolders(inside, each.skip) : inside
      if (at === undefined) continue
      resolved = resolveInside(each.dir, at, each)
      if ("file" in resolved && each.hashed) {
        const inside = relative(each.dir, resolved.file).split(sep).join("/")
        return { ...resolved, hashed: each.hashed.test(inside) }
      }
      if (!("status" in resolved) || resolved.status !== 404) return resolved
    }
    return resolved
  }

  /** answer with `resolved`'s file, through the hooks;  "not modified" when the browser's copy is current */
  private async serve(request: Request, reply: Reply, { file, stat, hashed }: Served): Promise<void> {
    const etag = StaticHandler.etagOf(stat)
    reply.set("ETag", etag)
    if (this.caching === "never") reply.noStore()
    else reply.set("Cache-Control", hashed ? HASHED_CACHE : CHECK_EACH_TIME)
    const ext = extname(file).toLowerCase()
    const transform = this.transforms[ext]
    const isHtml = ext === ".html" || ext === ".htm"
    const hooked = !!transform || (isHtml && this.html.length > 0)
    if (hooked) reply.vary("Sec-Fetch-Dest")
    const isCurrent = this.caching === "normal" && matchesEtag(request.get("if-none-match"), etag)
    const raw = request.get("sec-fetch-dest") === "empty"
    if (raw || !hooked) {
      if (isCurrent) return void reply.status(304).end()
      reply.type(typeFor(file))
      return reply.sendFile(file, { dotfiles: "allow" })
    }
    const context = { path: decodeURIComponent(request.path), file, request }
    let body: string | Uint8Array = await readFile(file, "utf8")
    let type = typeFor(file)
    if (transform) ({ body, type } = transform(body, context))
    if (isHtml && typeof body === "string") for (const hook of this.html) body = hook(body, context)
    if (this.caching === "normal") {
      const key = `${request.originalUrl}\0${etag}`
      const made = createHash("sha1").update(body).digest("hex")
      if (isCurrent && this.pagesSent.get(key) === made) return void reply.status(304).end()
      if (this.pagesSent.size >= PAGES_SENT_LIMIT) this.pagesSent.clear()
      this.pagesSent.set(key, made)
    }
    reply.type(type).send(body)
  }

  /**
   * The page at URL path `path` (still percent-encoded), as a navigation to it gets it:  through the `html` hooks,
   * with its `ETag`;  `undefined` when it's no `.html` file served here, or bigger than `limit` bytes.
   * - what live reload pushes to a page with its change (`LiveReload`), so the page needn't fetch it
   * - the hooks see a made-up `GET` of `path`, with no headers:  none reads more than the path and file
   * - NEVER throws:  a file that can't be read is `undefined`
   */
  async render(path: string, limit = Infinity): Promise<PageSource | undefined> {
    const resolved = this.resolve(path)
    if (!resolved || !("file" in resolved) || !/\.html?$/i.test(resolved.file) || resolved.stat.size > limit)
      return undefined
    try {
      const request = new Request({ method: "GET", url: path, headers: {} } as IncomingMessage)
      const context = { path: decodeURIComponent(path), file: resolved.file, request }
      let html = await readFile(resolved.file, "utf8")
      for (const hook of this.html) html = hook(html, context)
      return { html, etag: StaticHandler.etagOf(resolved.stat) }
    } catch {
      return undefined
    }
  }

  /**
   * The `ETag` of a file with `stat`:  its size and modified time, quoted.
   * - cheap (no hashing), and changes on every write that changes the file
   */
  static etagOf(stat: Stats): string {
    return `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`
  }
}

/** A hashed name's `Cache-Control`, with `caching: "normal"`:  kept a year, never asked about again. */
const HASHED_CACHE = "public, max-age=31536000, immutable"

/** Everything else's, with `caching: "normal"`:  kept, but checked with the server before each use. */
const CHECK_EACH_TIME = "no-cache"

/** The most pages `pagesSent` remembers before it starts again:  forgetting one only costs a page sent whole. */
const PAGES_SENT_LIMIT = 5000

/** A file `resolve()` found, and whether its name carries a build's hash (`Mount.hashed`). */
type Served = { file: string; stat: Stats; hashed?: boolean }

/** What `resolve()` finds:  a file (and whether its name is hashed), a redirect or a refusal. */
export type StaticFound = Resolved | Served

/** Whether request header `If-None-Match` (`ifNoneMatch`) names `etag`:  one of a list, weak (`W/`) or not, or `*`. */
function matchesEtag(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false
  return ifNoneMatch.split(",").some((each) => {
    const named = each.trim().replace(/^W\//, "")
    return named === etag || named === "*"
  })
}

/**
 * URL path `path` (`/w/epics/x.html`) without its first `count` folders (`/epics/x.html`);
 * `undefined` when it has no more than that (`/w`).
 */
function skipFolders(path: string, count: number): string | undefined {
  return new RegExp(`^(?:/[^/]+){${count}}(/.*)$`).exec(path)?.[1]
}

/**
 * `new StaticHandler()` props.
 * - `mounts`:  folders to serve
 * - `html` / `transforms`:  the hooks (see the class)
 * - `caching`:  how long browsers keep copies (`Caching`);  default `"never"`
 */
export type StaticHandlerProps = {
  mounts?: Mount[]
  html?: HtmlTransform[]
  transforms?: Record<string, FileTransform>
  caching?: Caching
}
