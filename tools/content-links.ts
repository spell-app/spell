/**
 * `tools/content-links.ts`:  re-points the content repo's epic-page links that lead nowhere since epic `repo-split`
 * moved everything (P9-P14), at today's layout.  Only LINKS change:  an `<a href>` and its `target`, a path `title`
 * or `file`;  never a word of the page (epic `repo-split` I61).
 * - What it fixes, in every epic's pages (the epic page, its parts, its details pages):
 *   1. a part's link one `../` short:  the content rewrite wrote parts' links from the epic page's folder, but a part's
 *      links are written from `parts/` (`PlanParts.toPart()`)
 *   2. an old path (`../../packages/ui/...`, `cli/bin/spell.mjs`, `toolchain/bin/`) whose new place exists:  the
 *      repo-split rename tables (`PATH_RULES`, the content rewrite's), or a moved file by its one namesake in its repo
 *   3. a link out of the kit to a repo that's inside it now (`../../../spell-epic/` from an epic page)
 * - Everything else a link check reports is left, and listed:  a file that's gone, an address it can't place.
 * - Not for the words:  the repo-split epic's pages ARE its old -> new tables, as written (the content rewrite left
 *   them out on purpose);  history elements' links are plumbing, so they're fixed too.
 * - Asset addresses (`<link>`, `<script>`, `src=`) are `epic migrate`'s:  its `engine-asset-paths` step (I63).
 * - Idempotent:  a second run changes nothing.
 * - Node 24 runs it as is (its types stripped):  node's own modules only, as `tools/repos.ts`.
 *
 * ```sh
 * node tools/content-links.ts                 # dry run:  what it would change, per file, and what it left
 * node tools/content-links.ts --apply         # write it
 * node tools/content-links.ts --only repo-split --apply    # only epics whose name matches
 * ```
 */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

////////////////
// ## Layout
////////////////

/**
 * The kit's layout on disk:  what exists, and where a file of a given name is, kit-relative.
 * - the content repo's folders are laid under the kit, as the page server serves them:  `epics/x` is
 *   `<content>/epics/x` when the kit has no `epics/` of its own
 */
export class Layout {
  /** the kit's root */
  readonly kit: string

  /** the content repo's root */
  readonly content: string

  /** the content repo's folders the kit serves at its root:  `epics`, `guides` ... */
  readonly contentAreas: ReadonlySet<string>

  constructor(kit: string, content: string) {
    this.kit = kit
    this.content = content
    this.contentAreas = new Set(
      readdirSync(content, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => entry.name)
        .filter((name) => {
          const own = lstatSync(join(kit, name), { throwIfNoEntry: false })
          return !own || own.isSymbolicLink()
        })
    )
  }

  private seen = new Map<string, boolean>()

  /** Whether kit-relative `rel` (a file or folder, a trailing `/` allowed) exists, as served. */
  exists(rel: string): boolean {
    const clean = rel.replace(/\/+$/, "")
    if (!clean || clean.startsWith("/") || clean.split("/").includes("..")) return false
    let hit = this.seen.get(clean)
    if (hit === undefined) {
      hit = existsSync(this.diskPath(clean)) && !leftover(this.diskPath(clean))
      this.seen.set(clean, hit)
    }
    return hit
  }

  /** Kit-relative `rel` on disk:  in the content repo for its areas. */
  diskPath(rel: string): string {
    return this.contentAreas.has(rel.split("/")[0]!) ? join(this.content, rel) : join(this.kit, rel)
  }

  private names = new Map<string, Map<string, string[]>>()

  /**
   * Kit-relative files named `name` in `repo` (a child repo's folder, or `""`:  the kit's own `src/`, `tests/`,
   * `bin/`, `scripts/`, `tools/`), outside built and installed folders.
   */
  namesakes(repo: string, name: string): string[] {
    let index = this.names.get(repo)
    if (!index) {
      index = new Map()
      for (const root of repo ? [repo] : KIT_FOLDERS) walkNames(this.kit, root, index)
      this.names.set(repo, index)
    }
    return index.get(name) ?? []
  }
}

/**
 * Is `dir` a folder left behind by a move, holding nothing but an install (`element/node_modules/` at the kit's
 * root, from before P14)?  A link there leads nowhere a reader wants.
 */
function leftover(dir: string): boolean {
  if (!statSync(dir).isDirectory()) return false
  return readdirSync(dir).every((name) => name === "node_modules" || name === ".DS_Store")
}

/** The kit's own code folders, where `namesakes("")` looks. */
const KIT_FOLDERS = ["src", "tests", "bin", "scripts", "tools"]

/** Folders `namesakes()` never walks:  built, installed, generated, or a nested repo. */
const SKIP_WALK = /^(?:node_modules|dist.*|build|results|\.git|\.cache|spell\.epics|spell-[a-z]+|.*\.tmp|__pack)$/

/** Index every file under kit-relative `rel` by its name. */
function walkNames(kit: string, rel: string, index: Map<string, string[]>): void {
  let entries
  try {
    entries = readdirSync(join(kit, rel), { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const path = `${rel}/${entry.name}`
    if (entry.isDirectory()) {
      if (!SKIP_WALK.test(entry.name)) walkNames(kit, path, index)
    } else if (entry.isFile()) index.set(entry.name, [...(index.get(entry.name) ?? []), path])
  }
}

////////////////
// ## The rename tables
////////////////

/** Old kit-relative path prefix -> new prefixes, tried in order (the first that exists wins). */
const PATH_RULES: Array<[string, string[]]> = []

/** Add `from` (one prefix or several) -> `to`. */
function rule(from: string | string[], to: string[]): void {
  for (const prefix of [from].flat()) PATH_RULES.push([prefix, to])
}

// spell-ui:  the monorepo's `packages/ui/`, and the split's `spell-ui/` before P14 put everything in `src/`
for (const p of ["packages/ui", "spell-ui"]) {
  rule(`${p}/components`, ["spell-ui/src/components"])
  rule(`${p}/tools/results`, ["spell-ui/results"])
  rule(`${p}/tools`, ["spell-ui/src/tools"])
  rule(`${p}/test-helpers`, ["spell-ui/src/test-helpers"])
  rule(`${p}/test`, ["spell-ui/src/test-helpers", "spell-ui/tests"])
  rule(`${p}/cli/src`, ["spell-ui/src/cli"])
  rule(`${p}/cli`, ["spell-ui/src/cli"])
  rule(`${p}/icons`, ["spell-ui/src/icons/icon-packs", "spell-ui/src/icons"])
}
rule("packages/ui", ["spell-ui"])

// spell-brand
for (const p of ["packages/brand", "spell-brand"]) {
  rule(`${p}/components`, ["spell-brand/src/components"])
  rule(`${p}/tests/src`, ["spell-brand/tests"])
}
rule("packages/brand", ["spell-brand"])

// spell-epic:  the monorepo's `packages/epics/` (and `packages/docs/tools/` before it), spell-app's `spell-epic` link
rule(["packages/epics/tools", "packages/docs/tools", "spell-epic/tools"], ["spell-epic/src/tools"])
rule("packages/epics", ["spell-epic", "spell-epic/src"])
rule("spell-app/spell-epic", ["spell-epic"])

// the kit:  the monorepo's `packages/<x>/`, the old repos (spell-util, spell-server, spell-element), the kit's
// folders before P14 (`server/src/` ...)
for (const p of ["packages/util", "spell-util/util", "util"]) rule(`${p}/src`, ["src/util"])
rule(["packages/util", "spell-util/util"], ["src/util"])
for (const p of ["packages/toolchain", "spell-util/toolchain", "toolchain"]) {
  rule(`${p}/bin`, ["bin"])
  rule(`${p}/src`, ["src/toolchain"])
}
rule(["packages/toolchain", "spell-util/toolchain", "toolchain"], ["src/toolchain"])
for (const p of ["packages/server", "spell-server/server", "server"]) {
  rule(`${p}/src`, ["src/server"])
  rule(`${p}/test`, ["src/server/test"])
}
rule(["packages/server", "spell-server/server"], ["src/server"])
// the assembler merged into the server (Q43)
for (const p of ["packages/assembler", "spell-server/assembler", "assembler"]) rule(`${p}/src`, ["src/server"])
rule(["packages/assembler", "spell-server/assembler"], ["src/server"])
// `spell-solid`:  spell-element's old name
for (const p of ["packages/spell-element", "packages/spell-solid", "spell-element", "element"]) {
  rule(`${p}/src`, ["src/element"])
  rule(`${p}/tools`, ["src/element-tools"])
  rule(`${p}/test-helpers`, ["src/test-helpers"])
  rule(`${p}/bin`, ["bin"])
}
rule(["packages/spell-element", "packages/spell-solid", "spell-element"], ["src/element"])
// `cli/`:  the kit's (P13);  the monorepo's `packages/cli/` was spell-app's, much of it in the kit since P13
rule("cli/src", ["src/cli", "spell-app/src/cli"])
rule("cli/bin", ["bin"])
const ANY_CLI = ["spell-app/src/cli", "src/cli", "spell-parser/src/cli", "spell-ui/src/cli", "spell-epic/src/cli"]
rule(["packages/cli/src", "packages/cli"], ANY_CLI)
rule("packages/cli/bin", ["bin", "spell-epic/bin", "spell-app/bin"])
// the kit's tests:  `tests/<folder>/src/` -> `tests/<folder>/`
for (const f of ["util", "server", "element", "cli", "toolchain", "element-tools"])
  rule(`tests/${f}/src`, [`tests/${f}`])
rule("tests/assembler/src", ["tests/server"])
rule(
  ["tests/spell-solid/src", "tests/spell-element/src", "tests/spell-solid", "tests/spell-element"],
  ["tests/element"]
)
// the monorepo's root configs:  the toolchain's now
rule("tsconfig.base.json", ["src/toolchain/tsconfig.base.json"])
// the kit's folders before P14, whole
rule("cli", ["src/cli"])
rule(["server", "assembler"], ["src/server"])
rule("element", ["src/element"])
rule("util", ["src/util"])
// the monorepo's root is spell-app's:  its Claude and VS Code settings, its worktrees
rule(".claude", ["spell-app/.claude"])
rule(".vscode", ["spell-app/.vscode"])

// spell-parser:  `<folder>/src/` -> `src/<folder>/`;  py's `ts/` too
for (const f of ["parser", "markdown", "core", "spell", "cli"]) {
  if (f !== "cli") rule([`packages/${f}/src`, `${f}/src`], [`spell-parser/src/${f}`])
  rule(`spell-parser/${f}/src`, [`spell-parser/src/${f}`])
  rule(`spell-parser/${f}`, [`spell-parser/src/${f}`])
  rule(`spell-parser/tests/${f}/src`, [`spell-parser/tests/${f}`])
  if (f !== "cli") rule(`packages/${f}`, [`spell-parser/src/${f}`])
}
rule(["packages/py/ts", "spell-parser/py/ts", "py/ts"], ["spell-parser/src/py"])
rule(["packages/py/core", "spell-parser/py/core"], ["spell-parser/src/py/core"])
rule(["packages/py", "spell-parser/py"], ["spell-parser/src/py"])
rule("spell-parser/tests/py/ts", ["spell-parser/tests/py"])
// the monorepo's root `tests/<package>/` (and its `src/`)
rule("tests/ui/src", ["spell-ui/tests"])
rule("tests/ui/test", ["spell-ui/tests/test-helpers", "spell-ui/tests"])
rule("tests/brand/src", ["spell-brand/tests"])
rule("tests/epics/src", ["spell-epic/tests"])
rule("tests/spaces/src", ["spell-app/tests/spaces"])
rule("tests/spaces", ["spell-parser/tests/spaces", "spell-app/tests/spaces"])
rule("tests/cli/src", ["tests/cli", "spell-app/tests/cli", "spell-parser/tests/cli", "spell-ui/tests/cli"])
for (const f of ["parser", "markdown", "core", "spell", "py"]) rule(`tests/${f}/src`, [`spell-parser/tests/${f}`])
for (const f of ["app", "lsp", "page-server"]) rule(`tests/${f}/src`, [`spell-app/tests/${f}`])
rule("tests/ui", ["spell-ui/tests"])
rule("tests/brand", ["spell-brand/tests"])
rule("tests/epics", ["spell-epic/tests"])
for (const f of ["parser", "markdown", "core", "spell", "py"]) rule(`tests/${f}`, [`spell-parser/tests/${f}`])
for (const f of ["app", "lsp", "page-server"]) rule(`tests/${f}`, [`spell-app/tests/${f}`])

// spell-app:  `app/src/` -> `src/app/` (`app/` stays:  the app's build folder);  `spaces/src/` -> `src/spaces/` ...
for (const p of ["packages/app", "spell-app/app"]) {
  rule(`${p}/src`, ["spell-app/src/app"])
  rule(`${p}/components`, ["spell-app/src/app/components"])
  rule(`${p}/tools`, ["spell-app/src/app/tools"])
}
rule("app/src", ["spell-app/src/app"])
rule("packages/app", ["spell-app/app"])
for (const f of ["spaces", "lsp", "page-server", "cli"]) {
  rule(`spell-app/${f}/src`, [`spell-app/src/${f}`])
  rule(`spell-app/tests/${f}/src`, [`spell-app/tests/${f}`])
  if (f !== "cli") rule(`packages/${f}/src`, [`spell-app/src/${f}`])
  if (f !== "cli") rule(`${f}/src`, [`spell-app/src/${f}`])
}
rule("spell-app/tests/app/src", ["spell-app/tests/app"])
rule("spell-app/cli", ["spell-app/src/cli"])
rule("spell-app/lsp", ["spell-app/src/lsp"])
rule("spell-app/page-server", ["spell-app/src/page-server"])
rule("packages/spaces", ["spell-app/spaces", "spell-app/src/spaces"])
rule("packages/lsp", ["spell-app/src/lsp", "spell-app/lsp"])
rule("packages/page-server", ["spell-app/src/page-server", "spell-app/page-server"])
rule("packages/vscode", ["spell-app/vscode"])
// spell-app's own folders, from the monorepo's root:  `vscode/` (its extension)
rule("vscode", ["spell-app/vscode"])

// longest prefix first
PATH_RULES.sort((a, b) => b[0].length - a[0].length)

/** File names too common to find a moved file by. */
const GENERIC_NAMES = new Set([
  "index.ts",
  "index.tsx",
  "index.js",
  "index.html",
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "package.json",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "vitest.config.ts",
  "types.ts",
  "main.ts",
  "cli.ts",
  "commands.ts",
  "hooks.ts",
  "setup.ts",
  "utils.ts",
  "util.ts"
])

/** The child repos' folders, by their first path segment:  a moved file is looked for in its own repo. */
const REPO_FOLDER = /^spell-(?:parser|ui|brand|epic|app)$/

/** Where kit-relative `old` is today, and how it was found;  `undefined` when it can't be placed. */
export type MappedPath = { path: string; byName?: boolean }

/**
 * Kit-relative `old` (no `../`, may end in `/`) -> its place in today's layout, or `undefined`.
 * - a path that exists as written:  `undefined` (nothing to change)
 * - by the rename tables first, then a FILE (never a folder or a common name) by its one namesake:
 *   in the repo the tables point at, or the one the path starts with (`spell-ui/src/x/Moved.ts`)
 */
export function mapPath(layout: Layout, old: string): MappedPath | undefined {
  const slash = old.endsWith("/") ? "/" : ""
  const clean = old.replace(/\/+$/, "")
  if (!clean || layout.exists(clean)) return undefined
  const matched = PATH_RULES.find(([prefix]) => clean === prefix || clean.startsWith(`${prefix}/`))
  if (matched) {
    const rest = clean.slice(matched[0].length)
    for (const to of matched[1]) {
      const candidate = `${to}${rest}`.replace(/^\//, "")
      if (candidate && layout.exists(candidate)) return { path: candidate + slash }
    }
  }
  const name = clean.split("/").pop()!
  if (slash || !/\.[a-z0-9]+$/i.test(name) || GENERIC_NAMES.has(name)) return undefined
  const first = (matched ? matched[1][0]! : clean).split("/")[0]!
  const repo = REPO_FOLDER.test(first) ? first : matched ? "" : undefined
  if (repo === undefined) return undefined
  const hits = layout.namesakes(repo, name)
  if (hits.length === 1) return { path: hits[0]!, byName: true }
  // moved to another repo (`packages/ui/tools/HotElements.ts` is the kit's now):  its one namesake in them all
  const anywhere = ["", ...REPOS].flatMap((each) => layout.namesakes(each, name))
  return anywhere.length === 1 ? { path: anywhere[0]!, byName: true } : undefined
}

/** Every child repo's folder, for a file that moved between repos. */
const REPOS = ["spell-parser", "spell-ui", "spell-brand", "spell-epic", "spell-app"]

/** The tab name the link check gives kit-relative `rel`:  `Linker.targetFor()`'s formula. */
export function targetFor(rel: string): string {
  const slug = rel
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
  return `src-${slug.slice(0, 80)}`
}

////////////////
// ## Links
////////////////

/** What became of one link:  its new `href`, and why. */
export type LinkFix = { href: string; target: string; why: "part-depth" | "renamed" | "by-name" | "into-kit" }

/**
 * `href`, in a page whose links resolve from kit-relative folder `dir`, re-pointed when it leads nowhere;
 * `undefined` when it stays (fine already, not a path, or nowhere to point it), with `left` told why.
 * - `partOf`:  for a part, its epic page's folder (where the content rewrite resolved it from)
 */
export function fixHref(
  layout: Layout,
  href: string,
  dir: string,
  { partOf, left }: { partOf?: string; left?: (href: string) => void } = {}
): LinkFix | undefined {
  if (/^(?:[a-z][\w+.-]*:|#|\/|\{|\$)/i.test(href)) return undefined
  const cut = href.search(/[#?]/)
  const path = cut >= 0 ? href.slice(0, cut) : href
  const suffix = cut >= 0 ? href.slice(cut) : ""
  if (!path) return undefined
  let decoded = path
  try {
    decoded = decodeURIComponent(path.replace(/&amp;/g, "&"))
  } catch {
    // a stray `%`:  as written
  }
  const here = kitRelative(dir, decoded)
  if (here !== undefined && layout.exists(here)) return undefined
  const slash = path.endsWith("/") ? "/" : ""
  const point = (rel: string, why: LinkFix["why"]): LinkFix => {
    const clean = rel.replace(/\/$/, "")
    const next = posix(relative(join("/", dir), join("/", clean))) || "."
    return { href: next + (slash || rel.endsWith("/") ? "/" : "") + suffix, target: targetFor(clean), why }
  }
  // 1. a part's link written from its epic page's folder
  if (partOf !== undefined) {
    const fromPage = kitRelative(partOf, decoded)
    if (fromPage !== undefined && layout.exists(fromPage)) return point(fromPage + slash, "part-depth")
  }
  // 2. an old path, from where it resolves;  else its words after the `../` chain, from the kit's root
  const tail = decoded.replace(/^(?:\.\.?\/)+/, "")
  for (const old of [here, tail]) {
    if (old === undefined) continue
    const mapped = mapPath(layout, old)
    if (mapped) return point(mapped.path, mapped.byName ? "by-name" : "renamed")
  }
  // 3. out of the kit, to a repo that's inside it now
  if (here === undefined && layout.exists(tail)) return point(tail + slash, "into-kit")
  left?.(href)
  return undefined
}

/** `href` from kit-relative folder `dir`, kit-relative;  `undefined` when it climbs out of the kit. */
function kitRelative(dir: string, href: string): string | undefined {
  const rel = posix(relative("/", resolve("/", dir, href)))
  return posix(join(dir, href)).startsWith("..") ? undefined : rel
}

/** `path` with `/` separators. */
function posix(path: string): string {
  return path.split(sep).join("/")
}

/** A tag (attribute values may hold `>`), or a comment. */
const TAG = /<!--[\s\S]*?-->|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/g
/** One attribute of a tag. */
const ATTR = /(\s+)([^\s=>/"']+)(?:(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g
/** Elements never looked inside. */
const RAW = /^(?:script|style|pre)$/i

/** One page's changes:  counts by why, and the links it left. */
export type PageReport = { counts: Record<string, number>; left: string[] }

/**
 * `html`, a page whose links resolve from kit-relative `dir`, with its links fixed;  `report` counted into.
 * - `<a href>` (and its `target`), a path `title` or `file` (`<code title="packages/ui/x.ts">`, a choice row);
 *   nothing inside `<script>`, `<style>` or `<pre>`;  never text
 */
export function fixPage(layout: Layout, html: string, dir: string, report: PageReport, partOf?: string): string {
  let out = ""
  let last = 0
  TAG.lastIndex = 0
  for (let m = TAG.exec(html); m; m = TAG.exec(html)) {
    const [tag, name, attrs] = m
    out += html.slice(last, m.index)
    last = m.index + tag.length
    if (!name) {
      out += tag
      continue
    }
    out += attrs ? fixTag(layout, tag, name.toLowerCase(), attrs, dir, report, partOf) : tag
    if (RAW.test(name)) {
      const end = html.indexOf(`</${name}`, last)
      const stop = end < 0 ? html.length : end
      out += html.slice(last, stop)
      last = stop
      TAG.lastIndex = stop
    }
  }
  return out + html.slice(last)
}

/** One opening tag, its link attributes fixed. */
function fixTag(
  layout: Layout,
  tag: string,
  name: string,
  attrs: string,
  dir: string,
  report: PageReport,
  partOf?: string
): string {
  let target: string | undefined
  const bump = (why: string) => (report.counts[why] = (report.counts[why] ?? 0) + 1)
  let body = attrs.replace(
    ATTR,
    (whole, space: string, key: string, eq?: string, dq?: string, sq?: string, bare?: string) => {
      const value = dq ?? sq ?? bare
      if (value === undefined) return whole
      const quote = dq !== undefined ? '"' : sq !== undefined ? "'" : ""
      const put = (next: string) => `${space}${key}${eq}${quote}${next}${quote}`
      const k = key.toLowerCase()
      if (k === "href" && name === "a") {
        const fix = fixHref(layout, value, dir, { partOf, left: (href) => report.left.push(href) })
        if (!fix) return whole
        bump(fix.why)
        target = fix.target
        return put(fix.href)
      }
      // a path tooltip, or a choice row's `file`:  kit-relative, maybe with a `:line`
      if ((k === "title" || k === "file") && /^[\w@.+~/-]+(?::\d+)?$/.test(value) && value.includes("/")) {
        const line = /:\d+$/.exec(value)?.[0] ?? ""
        const mapped = mapPath(layout, value.slice(0, value.length - line.length))
        // only an old path the tables know:  a tooltip is often words with a slash
        const known = PATH_RULES.some(([prefix]) => value === prefix || value.startsWith(`${prefix}/`))
        if (!mapped || !known || mapped.byName) return whole
        bump("title")
        return put(mapped.path + line)
      }
      return whole
    }
  )
  if (target) {
    if (/\starget\s*=/.test(body)) body = body.replace(/(\starget\s*=\s*)("[^"]*"|'[^']*'|[^\s>"']+)/, `$1"${target}"`)
    else body += ` target="${target}"`
  }
  return body === attrs ? tag : tag.replace(attrs, body)
}

////////////////
// ## The epics
////////////////

/** One page to fix:  its file, the kit-relative folder its links resolve from, and (a part) its page's folder. */
type Page = { file: string; dir: string; partOf?: string }

/** Every page of the content repo's epics (`only`:  epics whose name matches):  epic pages, parts, details pages. */
function epicPages(layout: Layout, only?: RegExp): Page[] {
  const epics = join(layout.content, "epics")
  const pages: Page[] = []
  for (const entry of readdirSync(epics, { withFileTypes: true })) {
    if (!entry.isDirectory() || (only && !only.test(entry.name))) continue
    const dir = `epics/${entry.name}`
    for (const [folder, partOf] of [[dir], [`${dir}/parts`, dir], [`${dir}/details`]] as const) {
      const abs = join(layout.content, folder)
      if (!existsSync(abs) || !statSync(abs).isDirectory()) continue
      for (const name of readdirSync(abs).sort())
        if (name.endsWith(".html")) pages.push({ file: join(abs, name), dir: folder, partOf })
    }
  }
  return pages
}

/** Run over the epics:  a report per file changed, then the totals;  writes only with `apply`. */
function main(argv: string[]): number {
  const option = (name: string) => {
    const at = argv.indexOf(`--${name}`)
    return at >= 0 ? argv[at + 1] : undefined
  }
  const apply = argv.includes("--apply")
  const kit = resolve(option("kit") ?? join(dirname(fileURLToPath(import.meta.url)), ".."))
  const content = realpathSync(resolve(option("content") ?? join(kit, "spell.epics")))
  const only = option("only")
  const layout = new Layout(kit, content)
  const totals: Record<string, number> = {}
  const left = new Map<string, number>()
  let files = 0
  for (const page of epicPages(layout, only ? new RegExp(only) : undefined)) {
    const html = readFileSync(page.file, "utf8")
    const report: PageReport = { counts: {}, left: [] }
    const fixed = fixPage(layout, html, page.dir, report, page.partOf)
    for (const href of report.left) left.set(href, (left.get(href) ?? 0) + 1)
    if (fixed === html) continue
    files++
    for (const [why, n] of Object.entries(report.counts)) totals[why] = (totals[why] ?? 0) + n
    console.log(`${relative(content, page.file)}  ${JSON.stringify(report.counts)}`)
    if (apply) writeFileSync(page.file, fixed)
  }
  console.log(`\n${apply ? "changed" : "would change"} ${files} files:  ${JSON.stringify(totals)}`)
  console.log(`left (no place for them today):  ${[...left.values()].reduce((a, b) => a + b, 0)} links`)
  if (argv.includes("--left"))
    for (const [href, n] of [...left].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${href}`)
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = main(process.argv.slice(2))
