import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { createServer, type IncomingMessage, type Server } from "node:http"
import {
  createSecureServer,
  type Http2SecureServer,
  type Http2ServerRequest,
  type Http2ServerResponse
} from "node:http2"
import { createServer as createNetServer, type Server as NetServer, type Socket } from "node:net"
import { relative, sep } from "node:path"
import type { Duplex } from "node:stream"

import type { Caching, FileTransform, HtmlTransform, Mount, ServedFile } from "spell/server"
// Import directly:  through the `SRV` barrel, the Linker's HTML parser lands in spell-epic's extension (I58)
import { Guard } from "./Guard"
import { toListener } from "./listener"
import {
  holdRevealScript,
  LIVE_EVENTS,
  LIVE_SCRIPT,
  LIVE_VERSIONS,
  liveClientScript,
  type LiveVersions,
  type ServerConfig
} from "./liveClient"
import type { CertificateFiles } from "./LocalCertificate"
import { LiveReload } from "./LiveReload"
import { type ListenOptions, listenPreferred } from "./ports"
import { underPrefix } from "./proxy"
import { Reply } from "./Reply"
import { Request } from "./Request"
import { Router } from "./Router"
import { HttpError } from "./server.types"
import { StaticHandler } from "./StaticHandler"
// Import directly:  the `site` barrel is browser code (`SiteHeader extends HTMLElement`)
import { APPLE_TOUCH_ICON_PNG, FAVICON_PNG_32, FAVICON_SVG } from "spell/server/site/favicon"

/**
 * A local web server:  `node:http` + `Guard` + `Router` + `StaticHandler` (+ `LiveReload`), in that order.
 * - requests go:
 *   host check -> `/api/server/live.js` and `/api/server/versions` (when `live`) -> `router`
 *   -> static files -> Spell's favicon (`FAVICONS`, `/favicon.ico`) -> `fallback` (e.g. an SPA's `index.html`) -> 404
 * - websocket upgrades go:  host check -> `/api/server/live` (when `live`:  live reload) -> `upgrade()`'s, in order
 * - `live`:  watches nothing by itself -- call `live.watch(dir)`
 *   - a page's change carries the page as served (`StaticHandler.render()`):  the page needn't fetch it
 *   - every `.html` page gets, before `</head>`:  Spell's favicon links (unless it links its own icon),
 *     `window.SPELL_SERVER` and the live client
 * - Spell's favicon on EVERY server, live or not, at the root:
 *   `/favicon.svg`, `/favicon-32.png`, `/apple-touch-icon.png`, and `/favicon.ico` (its 32px PNG)
 *   - after the static files, so a folder's own icons win
 * - loopback only (`127.0.0.1`) unless `listen()` says otherwise
 * - HTTPS and HTTP/2 too, with a `certificate` (epic `solid-2-final` P14):  plain HTTP stays, on the SAME port
 *   - each connection is handed on by its first byte:  a TLS hello to node's HTTP/2 server, anything else to `server`
 *   - so the `spell` and `epic` tools keep `url` (`http://127.0.0.1:<port>`):  node trusts no keychain;
 *     people's browsers get `secureUrl` (`https://localhost:<port>`)
 *   - HTTP/1.1 over TLS stays allowed (`allowHTTP1`):  websockets upgrade on it, as on plain HTTP
 */
export class WebServer {
  /** folder pages are reported relative to (live reload, `SPELL_SERVER.file`);  `/` mount's folder by default */
  readonly root?: string

  /** routes tried BEFORE static files */
  readonly router = new Router()

  /** routes tried AFTER static files */
  readonly fallback = new Router()

  /** the static folders */
  readonly files: StaticHandler

  /** host and write checks */
  readonly guard: Guard

  /** live reload, when asked for */
  readonly live?: LiveReload

  /** node's server:  plain HTTP */
  readonly server: Server

  /** node's HTTP/2 server, with a `certificate`:  HTTPS, HTTP/1.1 over TLS allowed */
  readonly secure?: Http2SecureServer

  /** with a `certificate`, what listens:  each connection handed to `secure` or `server` by its first byte */
  private readonly front?: NetServer

  /** the front's connections, ended by `close()`:  `closeAllConnections()` doesn't see a handed-on one */
  private connections = new Set<Socket>()

  /** extra fields for each page's `window.SPELL_SERVER` */
  private configure?: (served: ServedFile) => Record<string, unknown>

  /**
   * what runs first, before live reload and the routes, once the host check passes:  for requests this server only
   * passes on (main's page server's worktree names, `HostRoutes`)
   */
  readonly firstRoutes = new Router()

  /** websocket upgrades by path prefix, e.g. `/ui` -> a dev server's HMR */
  private upgrades: { claims: (request: Request) => boolean; handle: UpgradeHandler }[] = []

  /** upgraded sockets:  `closeAllConnections()` doesn't see them, so `close()` ends them itself */
  private sockets = new Set<Duplex>()

  /** port once listening;  0 before */
  port = 0

  constructor(props: WebServerProps = {}) {
    const { mounts = [], html = [], transforms, caching, live = false, checkHost = true, onError, certificate } = props
    this.root = props.root ?? mounts.find((mount) => mount.prefix === "/")?.dir
    this.configure = props.configure
    this.guard = new Guard({ token: props.token })
    if (live) this.live = new LiveReload({ root: this.root ?? process.cwd() })
    this.files = new StaticHandler({
      mounts,
      transforms,
      caching,
      html: live ? [...html, (page, served) => this.inject(page, served)] : html
    })
    // a page's change carries the page, as served (epic `epic-engine` P40)
    if (this.live) this.live.pages = (path) => this.files.render(path, LiveReload.PAGE_LIMIT)

    const top = new Router()
    if (checkHost) top.use(this.guard.hostCheck)
    // before its own live reload:  a request this server only passes on (a worktree's name, `HostRoutes`)
    top.use(this.firstRoutes)
    if (this.live) {
      this.upgrade(LIVE_EVENTS, this.live.events)
      top.get(LIVE_SCRIPT, (_request, reply) =>
        reply.type("text/javascript; charset=utf-8").noStore().send(liveClientScript())
      )
      top.get(LIVE_VERSIONS, (request, reply) => {
        const paths = new URL(request.originalUrl, "http://host").searchParams.getAll("path")
        const answer: LiveVersions = { versions: this.versionsOf(paths), run: this.live?.run, token: this.guard.token }
        reply.noStore().json(answer)
      })
    }
    const favicons = new Router()
    for (const [path, icon] of Object.entries(FAVICONS)) favicons.get(path, (_request, reply) => sendIcon(reply, icon))
    favicons.get("/favicon.ico", (_request, reply) => sendIcon(reply, FAVICONS[FAVICON_PNG]!))
    top.use(this.router, this.files.handle, favicons, this.fallback)
    const listener = toListener(top.handle, { onError: onError ?? logError })
    this.server = createServer(listener)
    this.server.on("upgrade", (raw: IncomingMessage, socket: Duplex, head: Buffer) => this.onUpgrade(raw, socket, head))
    if (certificate) {
      // the compatibility API:  HTTP/2's request and response take the place of HTTP/1.1's
      this.secure = createSecureServer({ ...certificate, allowHTTP1: true }, listener as unknown as Http2Listener)
      this.secure.on("upgrade", (raw: IncomingMessage, socket: Duplex, head: Buffer) =>
        this.onUpgrade(raw, socket, head)
      )
      this.front = createNetServer((socket) => this.handOn(socket))
    }
  }

  /** a connection to the front, handed to `secure` (a TLS hello, byte 22) or `server` once its first bytes come */
  private handOn(socket: Socket): void {
    this.connections.add(socket)
    socket.on("close", () => this.connections.delete(socket))
    socket.on("error", () => socket.destroy())
    socket.once("data", (first: Buffer) => {
      socket.pause()
      socket.unshift(first)
      ;(first[0] === TLS_HANDSHAKE ? this.secure! : this.server).emit("connection", socket)
      process.nextTick(() => socket.resume())
    })
  }

  /**
   * Answer websocket upgrades under `prefix` (or that `claims()` accepts) with `handle`,
   * e.g. `SRV.proxyUpgrade` to a dev server.
   * - the host check applies
   * - an upgrade nothing claims is refused
   */
  upgrade(
    prefix: string | ((request: Request) => boolean),
    handle: UpgradeHandler,
    { first = false }: { first?: boolean } = {}
  ): this {
    const claims = typeof prefix === "string" ? (request: Request) => underPrefix(request.path, prefix) : prefix
    if (first) this.upgrades.unshift({ claims, handle })
    else this.upgrades.push({ claims, handle })
    return this
  }

  /** route one upgrade */
  private onUpgrade(raw: IncomingMessage, socket: Duplex, head: Buffer): void {
    const request = new Request(raw)
    const claim = this.upgrades.find(({ claims }) => claims(request))
    this.sockets.add(socket)
    socket.on("close", () => this.sockets.delete(socket))
    try {
      if (!claim) throw new HttpError(404, "no upgrade here")
      this.guard.checkHost(request)
      void Promise.resolve(claim.handle(raw, socket, head)).catch(() => socket.destroy())
    } catch {
      socket.destroy()
    }
  }

  /**
   * What each of `paths` (URL paths) holds now, as served:  a hash of its file, by path (`LIVE_VERSIONS`).
   * - `null`:  no file there (gone, a folder, a route's answer), or too big to read (`LiveReload.HASH_LIMIT`)
   * - the live client itself (`LIVE_SCRIPT`):  a hash of its text
   * - why:  after a restart, a page asks again, and reloads only when code IT runs changed (epic `epic-engine` I293)
   * - NEVER throws
   */
  versionsOf(paths: string[]): Record<string, string | null> {
    const versions: Record<string, string | null> = {}
    for (const path of paths.slice(0, MAX_VERSIONS)) {
      try {
        if (path === LIVE_SCRIPT) {
          versions[path] = createHash("sha1").update(liveClientScript()).digest("hex")
          continue
        }
        const found = this.files.resolve(decodeURIComponent(path))
        versions[path] =
          found && "file" in found && found.stat.isFile() && found.stat.size <= LiveReload.HASH_LIMIT
            ? createHash("sha1").update(readFileSync(found.file)).digest("hex")
            : null
      } catch {
        versions[path] = null
      }
    }
    return versions
  }

  /** base URL once listening, e.g. `http://127.0.0.1:4747`:  plain HTTP, what tools ask */
  get url(): string {
    return `http://127.0.0.1:${this.port}`
  }

  /**
   * SIDE EFFECT:  HTTPS answers with `certificate` from now on, with no restart:  each new connection takes it (the
   * page server's, made again for a new worktree's names, epic `editor` P49);  whether it could:  `false` without HTTPS
   */
  useCertificate(certificate: CertificateFiles): boolean {
    if (!this.secure) return false
    this.secure.setSecureContext(certificate)
    return true
  }

  /** the HTTPS base URL once listening, for people's browsers, `https://localhost:4747`;  `undefined` without one */
  get secureUrl(): string | undefined {
    return this.secure ? `https://localhost:${this.port}` : undefined
  }

  /**
   * Start listening:  on `port` (0:  any), falling back to any free port if it's taken (unless `fallback: false`).
   * - SIDE EFFECT:  the guard now accepts this port's host names
   */
  async listen(options: ListenOptions = {}): Promise<{ url: string; port: number }> {
    this.port = await listenPreferred(this.front ?? this.server, options)
    this.guard.allowPort(this.port)
    return { url: this.url, port: this.port }
  }

  /** stop:  live reload, open connections and websockets, the server */
  close(): Promise<void> {
    this.live?.close()
    for (const socket of this.sockets) socket.destroy()
    for (const socket of this.connections) socket.destroy()
    this.server.closeAllConnections()
    const listening = this.front ?? this.server
    // a server that never listened says so:  done all the same
    return new Promise((done) => listening.close(() => done()))
  }

  /** the config every live page gets, as `window.SPELL_SERVER` */
  config(served: ServedFile): ServerConfig {
    const file = this.root
      ? `/${relative(this.root, served.file).split(sep).map(encodeURIComponent).join("/")}`
      : served.path
    return {
      port: this.port,
      token: this.guard.token,
      events: LIVE_EVENTS,
      run: this.live?.run,
      file,
      source: served.file,
      ...this.configure?.(served)
    }
  }

  /**
   * `page`, with these added before `</head>` (or first, without one):
   * - Spell's favicon links, unless its `<head>` links its own icon
   * - `window.SPELL_SERVER`
   * - the live client
   */
  private inject(page: string, served: ServedFile): string {
    const config = JSON.stringify(this.config(served)).replace(/</g, "\\u003c")
    const head = page.search(/<\/head>/i)
    const icons = HAS_ICON.test(head < 0 ? "" : page.slice(0, head)) ? "" : FAVICON_LINKS
    const tags = `${icons}<script>window.SPELL_SERVER = ${config}</script>\n<script>${holdRevealScript()}</script>\n<script src="${LIVE_SCRIPT}" defer></script>\n`
    return head < 0 ? tags + page : page.slice(0, head) + tags + page.slice(head)
  }
}

/**
 * `new WebServer()` props.
 * - `mounts` / `html` / `transforms` / `caching`:  as `StaticHandler` (`caching` default `"never"`)
 * - `root`:  folder pages are reported relative to;  default the `/` mount's
 * - `live`:  live reload + `window.SPELL_SERVER` on every page
 * - `configure`:  more fields for `window.SPELL_SERVER`
 * - `token`:  the guard's (default:  random)
 * - `checkHost`:  refuse foreign `Host` headers (default `true`)
 * - `onError`:  told of 5xx failures (default:  `console.error`)
 * - `certificate`:  HTTPS and HTTP/2 too, on the same port (`SRV.LocalCertificate`'s `tls`)
 */
export type WebServerProps = {
  mounts?: Mount[]
  html?: HtmlTransform[]
  transforms?: Record<string, FileTransform>
  caching?: Caching
  root?: string
  live?: boolean
  configure?: (served: ServedFile) => Record<string, unknown>
  token?: string
  checkHost?: boolean
  onError?: (error: unknown, request: Request) => void
  certificate?: CertificateFiles
}

/** Answers a websocket upgrade:  takes over `socket`. */
export type UpgradeHandler = (raw: IncomingMessage, socket: Duplex, head: Buffer) => unknown

/** What node's HTTP/2 server calls with each request:  its compatibility API's request and response */
type Http2Listener = (request: Http2ServerRequest, response: Http2ServerResponse) => void

/** A TLS connection's first byte:  its handshake record */
const TLS_HANDSHAKE = 22

/** the most paths one `LIVE_VERSIONS` call hashes:  an epic page loads a few hundred files */
const MAX_VERSIONS = 1000

/** Where the 32px PNG favicon is;  `/favicon.ico` answers with it too. */
export const FAVICON_PNG = "/favicon-32.png"

/**
 * Spell's favicon (`spell/server/site/favicon`, made by `yarn favicon`) by path:  content type and bytes.
 * - the SVG for every browser that takes one, the PNG for those that don't, the touch icon for iOS home screens
 */
export const FAVICONS: Record<string, { type: string; body: Buffer }> = {
  "/favicon.svg": { type: "image/svg+xml", body: Buffer.from(FAVICON_SVG) },
  [FAVICON_PNG]: { type: "image/png", body: Buffer.from(FAVICON_PNG_32, "base64") },
  "/apple-touch-icon.png": { type: "image/png", body: Buffer.from(APPLE_TOUCH_ICON_PNG, "base64") }
}

/**
 * The favicon links a live page gets.
 * - the PNG FIRST, with `sizes`:  without them, Chrome takes the PNG over the SVG
 */
export const FAVICON_LINKS =
  `<link rel="icon" href="${FAVICON_PNG}" sizes="32x32" type="image/png">\n` +
  `<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n` +
  `<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n`

/** Whether a page links its own icon:  `<link rel="icon">` or `"shortcut icon"`, any attribute order. */
const HAS_ICON = /<link\b[^>]*\brel\s*=\s*["']?(?:shortcut\s+)?icon\b/i

/** Answer with favicon `icon`:  cached an hour (`yarn favicon` rarely changes it). */
function sendIcon(reply: Reply, { type, body }: { type: string; body: Buffer }): void {
  reply.type(type).set("Cache-Control", "public, max-age=3600").send(body)
}

/** Log a failure:  method, URL and stack. */
function logError(error: unknown, request: Request): void {
  console.error(`${request.method} ${request.originalUrl}:`, error)
}
