import { existsSync, lstatSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative, resolve as resolvePath } from "node:path"

import { parseHTML } from "linkedom"

import { escapeHTML, slug } from "spell/util/string"
import { packageRootFor } from "spell/toolchain/sourceNames"
import type { SRV } from "spell/server"

import { contentFolderOf } from "./contentFolder"
import { Git } from "./Git"

/**
 * Links source references in a page of the spell-app checkout at `root`:
 * one named target per destination, so re-clicks reuse a tab.
 * - Rules:  spell-epic's `src/AGENTS.md`, "Links".
 * - `link()`:  `<code>path</code>` outside `<pre>` / `<a>` / `<head>` becomes a link,
 *   when the path resolves to a real file or folder
 *   - an existing `<a href>` without a target gets one (external:  per URL;  sibling docs:  per file)
 *   - a name with its path as its tooltip, `<code title="path">name</code>`, links to that path the same way
 * - `check()`:
 *   - every local href resolves INSIDE the repo
 *   - every non-anchor link has a target
 *   - one target per destination (`target="_self"`, a same-tab link, is exempt)
 *   - a SHORT ADDRESS (`href="SAGA:/drawable-spell/python-target#T1"`, epic `epic-workflow` P15) is neither linked
 *     nor checked here:  the docs runtime turns it into the page, and the epics tool, which knows the sagas, checks it
 *     (`EpicTargets.problemsIn()`, run beside this by `doc-links.js --check` and `epic lint`)
 *   - a missing target version control IGNORES is fine:
 *     runtime files and local clones exist only on some machines, or while a server runs (`isGitIgnored()`)
 * - Works on the page's TEXT with regexes, never a parsed DOM:  the edits touch only what they link, byte for byte.
 * - Knows the checkout's LAYOUT as folder names only:
 *   `packages/*`, and the shared areas `pages/`, `guides/`, `epics/`, `templates/`.
 *   It imports no other package, so spell-epic's docs tools and its `epic` tool both import it.
 * - The REPOS beside the checkout (epic `repo-split` P8):  inside the top repo `spell`, the folder holding the ONE
 *   install (`yarn.lock`, `top`), each package is in a repo of its own there.
 *   - `spell-ui/tools/SiteCheck.ts` resolves from `top`, and links as `../../../spell-ui/tools/SiteCheck.ts`.
 *   - `packages/<name>/...` (the old monorepo's spelling, in every page written before P8) is package
 *     package `<name>`'s folder, found through `top`'s `node_modules` (`spellPackagesIn()`):  `packages/ui/tools` is
 *     spell-ui's `tools/`, `packages/parser/src` spell-parser's `parser/src`.
 *   - A file anywhere under `top` counts as inside the repo (`check()`);  its target is its path from `top`.
 *   - With no `yarn.lock` above the checkout, `top` is the checkout itself:  the monorepo layout, as before.
 * - SERVED folders (`served`, epic `epic-workflow` P10):  a folder the page server serves at another address.
 *   - E.g. a component set:  `packages/ui/docs/` at `/components/ui/`.
 *   - Its pages' links are written as from that address, so they hold under `/worktrees/<w>/` too.
 *   - Give such a page `servedDir()` of its folder as its `pageDir`:  links then resolve, and are written, from there.
 * - The SHARED CONTENT folder (`content`, epic `epic-eject` P12):  laid under the checkout, as the page server serves it.
 *   - Its folders the checkout doesn't have (`epics/`, `guides/`, `pages/` ...) are served folders too:
 *     `<root>/epics/` is `<content>/epics/`, with no link at the checkout's root.
 *   - So a page there links `../../packages/...` as before, and a link into it is "inside the repo".
 *   - A page's folder is taken from where it's served, whichever way it's given (`link()`, `check()`).
 * - From the docs tools' `doc-links.js` (epic `epic-components`, P7;  spell-epic's `src/tools/` now), which runs its
 *   command line on this.
 */
export class Linker {
  /** the checkout's root:  links resolve inside it, and a target is a slug of the path relative to it */
  readonly root: string

  /** `packages/`:  the old monorepo's packages, when the checkout has the folder */
  readonly packages: string

  /**
   * the folder holding the install, and every repo beside the checkout:  the nearest folder up with a `yarn.lock`
   * (the top repo `spell`);  the checkout itself without one
   */
  readonly top: string

  /** each of our packages' folders by its old short name (`ui` => `<top>/spell-ui`), through `top`'s `node_modules` */
  readonly packageDirs: ReadonlyMap<string, string>

  /** Spell UI's folder:  `spell-ui`'s, else `packages/ui` */
  readonly ui: string

  /** the home page's folder, `pages/`:  what `resolve()` resolves against when no page folder is given */
  readonly home: string

  /** where `solid-js/...` references are looked up */
  readonly nodeModules: string[]

  /** code spans that aren't paths but still have a home:  text -> path or URL */
  readonly special: Map<string, string>

  /**
   * the served folders, absolute, each `[address folder, the folder it serves]`
   * - e.g. `[<root>/components/ui, <root>/packages/ui/docs]`
   * - and the content folder's, e.g. `[<root>/epics, <content>/epics]`
   */
  readonly served: readonly (readonly [string, string])[]

  /** the shared content folder, laid under the checkout;  `undefined` when the repo names none */
  readonly content?: string

  /** the content folder's served folders alone (`served`'s last), each `[<root>/<name>, <content>/<name>]` */
  private contentAreas: readonly (readonly [string, string])[]

  /** basename -> paths under `indexRoots`, built on first use (`fileIndex`) */
  private index?: Map<string, string[]>

  /**
   * - `served`:  the address folder => the folder it serves, both relative to `root`,
   *   e.g. `{ "components/ui": "packages/ui/docs" }`
   *   (the page server's `componentSets` setting, in the root `package.json`)
   * - `content`:  the shared content folder, absolute;  default the repo's (`contentFolderOf()`)
   */
  constructor(
    root: string,
    {
      served = {},
      content = contentFolderOf(root)
    }: { served?: Readonly<Record<string, string>>; content?: string } = {}
  ) {
    this.root = root
    this.content = content
    this.contentAreas = content
      ? contentAreasOf(root, content).map((name) => [join(root, name), join(content, name)] as const)
      : []
    this.served = [
      ...Object.entries(served).map(([address, dir]) => [join(root, address), join(root, dir)] as const),
      ...this.contentAreas
    ]
    this.packages = join(root, "packages")
    this.top = installRoot(root)
    this.packageDirs = spellPackagesIn(this.top)
    this.ui = this.packageDirs.get("ui") ?? join(this.packages, "ui")
    this.home = join(root, "pages")
    this.nodeModules = [
      ...new Set([join(this.ui, "node_modules"), join(root, "node_modules"), join(this.top, "node_modules")])
    ]
    this.special = new Map([
      ["solidjs/solid", "https://github.com/solidjs/solid/tree/next"],
      ["solidjs/solid-docs", "https://github.com/solidjs/solid-docs/tree/v2-rebuild"],
      ["documentation/solid-2.0/", "https://github.com/solidjs/solid/tree/next/documentation/solid-2.0"],
      ["spell-ui", join(this.ui, "README.md")]
    ])
  }

  ////////////////
  // ## Linking
  ////////////////

  /**
   * `text` (a page in `pageDir`) with its code spans linked and every link given a target.
   * - idempotent:  a second run changes nothing
   */
  link(text: string, _pageDir: string): SRV.LinkResult {
    const pageDir = this.servedDir(_pageDir)
    const spans = PROTECTED.flatMap((pattern) =>
      Array.from(text.matchAll(pattern), (m) => [m.index, m.index + m[0].length])
    )
    const out: string[] = []
    let last = 0
    let linked = 0
    const unresolved = new Set<string>()
    for (const m of text.matchAll(CODE_SPAN)) {
      if (spans.some(([start, end]) => start <= m.index && m.index < end)) continue
      // a name with its path as its tooltip (`<code title="path">name</code>`) links to that path, never its text
      const path = m[1] ?? m[2]
      let dest = this.resolve(path, pageDir)
      // a path outside the repo (a handoff in a sibling folder) works only on this machine:  leave it as text
      if (dest && !URL_START.test(dest) && !this.isInside(dest)) dest = undefined
      if (!dest) {
        if (path.includes("/") || PATH_LIKE.test(path.trim())) unresolved.add(path)
        continue
      }
      // `|| "."`:  the page's own folder;  a served page's links are written from where it's served
      let href = URL_START.test(dest) ? dest : relative(pageDir, this.virtual(dest)) || "."
      if (isDir(dest) && !href.endsWith("/")) href += "/"
      out.push(text.slice(last, m.index))
      out.push(`<a href="${escapeHTML(href)}" target="${this.targetFor(dest)}">${m[0]}</a>`)
      last = m.index + m[0].length
      linked++
    }
    out.push(text.slice(last))
    const result = out.join("").replace(A_HREF, (tag, href: string) => this.addTarget(tag, href, pageDir))
    return { text: result, linked, unresolved: [...unresolved].sort((a, b) => a.localeCompare(b)) }
  }

  /**
   * The tab name for `dest`, an absolute path or URL:  re-clicks reuse that tab.
   * - URLs:  `ext-<slug>`
   * - an epic page:  its `<name>`, since the page sets `window.name` to it,
   *   and `epic open <name>` reuses it
   * - anything else:  `src-<slug of the repo-relative path>`
   * - at most 80 characters after the prefix
   */
  targetFor(dest: string): string {
    if (URL_START.test(dest)) return `ext-${slug(dest.replace(/^https?:\/\/(www\.)?/, "")).slice(0, 80)}`
    const inCheckout = this.inCheckout(dest)
    // a file in a repo beside the checkout:  its path from `top` (`spell-ui/tools/SiteCheck.ts`)
    const rel = relative(isUnder(inCheckout, this.root) ? this.root : this.top, inCheckout)
    const plan = PLAN_DOC.exec(rel)
    if (plan) return plan[1]
    return `src-${slug(rel).slice(0, 80)}`
  }

  /**
   * `tag`, an `<a href>` in a page in `pageDir`, with a target:
   * - in-page anchors (`#id`) and short addresses (`SAGA:/...`) are left alone
   * - a tag with a target keeps it, except an epic page's:  renamed to its `<name>` (pre-2026-10-01 targets)
   */
  private addTarget(tag: string, href: string, pageDir: string): string {
    if (href.startsWith("#") || SAGA_ADDRESS.test(href)) return tag
    const dest = URL_START.test(href) ? href : this.real(resolvePath(pageDir, href.split("#")[0]))
    if (tag.includes("target=")) {
      if (URL_START.test(dest) || !PLAN_DOC.test(relative(this.root, this.inCheckout(dest)))) return tag
      return tag.replace(/target="[^"]*"/g, () => `target="${this.targetFor(dest)}"`)
    }
    return `${tag.slice(0, -1)} target="${this.targetFor(dest)}">`
  }

  ////////////////
  // ## Served folders
  ////////////////

  /**
   * The folder a page in `dir` is SERVED from:  in a served folder, its place under the address folder
   * (`<root>/packages/ui/docs` => `<root>/components/ui`, `<content>/epics/x` => `<root>/epics/x`);  else `dir`.
   * - What `link()` / `check()` take a page's folder as:  they ask it themselves, so either may be given.
   */
  servedDir(dir: string): string {
    return this.swap(resolvePath(dir), 1, 0)
  }

  /**
   * The file a LOCAL `href` in a page in `pageDir` points at, absolute, whether or not it exists:  resolved from where
   * the page is served, as the file it is (`../../spell-ui/x.ts` from `<content>/epics/seo` => `<top>/spell-ui/x.ts`).
   * - its `#hash` dropped;  `href` decoded already (no `&amp;`)
   * - what `check()` checks a link against
   */
  fileFor(href: string, _pageDir: string): string {
    return this.real(resolvePath(this.servedDir(_pageDir), href.split("#")[0]))
  }

  /** `path`, resolved from a served place, as the file it is:  `<root>/components/ui/x` => `<root>/packages/ui/docs/x`. */
  private real(path: string): string {
    return this.swap(path, 0, 1)
  }

  /** `path`, a file, as the place it's served at:  `real()` turned round. */
  private virtual(path: string): string {
    return this.swap(path, 1, 0)
  }

  /**
   * `path`, a file, as the checkout's:  a content folder's file at its place in the checkout
   * (`<content>/epics/x` => `<root>/epics/x`);  any other file as it is
   * - so its target is the one it had through an old link
   */
  private inCheckout(path: string): string {
    return this.swap(path, 1, 0, this.contentAreas)
  }

  /** `path` with the first of `pairs` whose side `from` starts it swapped for side `to`;  else `path`. */
  private swap(path: string, from: 0 | 1, to: 0 | 1, pairs = this.served): string {
    for (const pair of pairs) {
      if (path === pair[from]) return pair[to]
      if (path.startsWith(`${pair[from]}/`)) return pair[to] + path.slice(pair[from].length)
    }
    return path
  }

  ////////////////
  // ## Resolving
  ////////////////

  /**
   * A code span's text -> an existing absolute path or `https://` URL, else `undefined`.
   * - tries, in order:
   *   - `special`
   *   - `solid-js/...` in `nodeModules`
   *   - `solidjs.com` pages
   *   - the path against the page's folder, its `experiments/`, the repo root, `packages/`,
   *     the home page's folder (`pages/`) and UI
   *   - a bare file name last, when ONE file outside a `test/` folder has it
   * - `file.ts:75` drops its line number
   * - NOTE:  the oldest pages' alias form, `#name/...`, still resolves (`ALIAS`)
   */
  resolve(raw: string, pageDir = this.home): string | undefined {
    const text = decodeEntities(raw).trim()
    const special = this.special.get(text)
    if (special) return special
    if (SOLID_FILE.test(text)) {
      for (const folder of this.nodeModules) if (existsSync(join(folder, text))) return join(folder, text)
    }
    if (SOLID_SITE.test(text)) return `https://${text}`
    let path = text.replace(/:\d+$/, "")
    // `/`, `./`, `..`:  operators and punctuation, not paths (`/` resolved to the filesystem root)
    if (!/[A-Za-z0-9]/.test(path)) return undefined
    if (!PATH_CHARS.test(path) || (!path.includes("/") && !path.includes("."))) return undefined
    const alias = ALIAS.exec(path)
    if (alias) path = join("packages", alias[1], "src", alias[2])
    // `packages/<name>/...` and `<name>/...`:  that package's folder, wherever its repo is (epic `repo-split` P8)
    const inPackage = this.inPackage(path)
    // `resolvePath`, not `join`:  an absolute `path` stands on its own
    const bases = path.startsWith("node_modules/")
      ? [this.root, this.ui]
      : [this.root, this.packages, this.top, this.home, this.ui]
    const candidates = [
      ...[pageDir, join(pageDir, "experiments"), ...bases].map((base) => this.real(resolvePath(base, path))),
      ...(inPackage ? [inPackage] : [])
    ]
    const found = candidates.find((candidate) => existsSync(candidate))
    if (found) return found
    if (!path.replace(/\/+$/, "").includes("/")) {
      const hits = (this.fileIndex.get(path) ?? []).filter((hit) => !hit.includes("/test/"))
      if (hits.length === 1) return hits[0]
    }
    return undefined
  }

  /**
   * `path` as a file of a package found by its short name (`packageDirs`):  `packages/ui/tools/x.ts` or
   * `ui/tools/x.ts` => `<spell-ui>/tools/x.ts`;  `undefined` when its first folder names no package.
   * - a folder now in its repo's one `src/` (epic `repo-split` P14) has no `src/` of its own:
   *   `packages/server/src/x.ts` => `<kit>/src/server/x.ts`
   */
  private inPackage(path: string): string | undefined {
    const [first, ...rest] = path.replace(/^packages\//, "").split("/")
    const dir = first ? this.packageDirs.get(first) : undefined
    if (!dir) return undefined
    return join(dir, ...(rest[0] === "src" && !isDir(join(dir, "src")) ? rest.slice(1) : rest))
  }

  /**
   * Where bare file names (`withSolid.ts`) are looked up:
   * - every package's `src/`, and its `components/` (a component set's elements:  `UIButton.tsx`);  a folder in its
   *   repo's one `src/`, itself
   *   - the old monorepo's `packages/*`, and every one of our packages in `top`'s install (`spellPackagesIn()`)
   *   - none in a repo without either:  a plain one, spell-epic's own (epic `epic-engine` I14)
   * - a plain repo's own `src/`, when it has one (spell-epic's:  `PlanDocFiles.ts`)
   * - the repo's `tests/`, where every package's tests live (`List.test.ts`)
   * - the docs' pages (every area:  `pages/`, `guides/`, `epics/`, `templates/`), the content folder's when it has them
   * - the epic engine's code, its docs tools included:  spell-epic's `src/`, through the checkout's `spell-epic` link
   *   (epic `epic-eject` I5), when the checkout has it
   * - UI's design notes, `notes/`
   */
  private get indexRoots(): string[] {
    return [
      ...[
        ...new Set([
          ...(isDir(this.packages) ? readdirSync(this.packages).map((name) => join(this.packages, name)) : []),
          ...this.packageDirs.values()
        ])
      ]
        // a folder in its repo's one `src/` (epic `repo-split` P14) has no `src/` of its own:  itself
        .flatMap((dir) => (isDir(join(dir, "src")) ? [join(dir, "src"), join(dir, "components")] : [dir]))
        .filter(isDir),
      ...[join(this.root, "src"), join(this.root, "tests")].filter(isDir),
      ...AREAS.map((area) => this.real(join(this.root, area))),
      ...[...new Set([join(this.root, "spell-epic", "src"), join(this.top, "spell-epic", "src")])].filter(isDir),
      join(this.ui, "notes")
    ]
  }

  /** Basename -> paths, for bare file names like `withSolid.ts`;  walks `indexRoots` once, on first use. */
  private get fileIndex(): Map<string, string[]> {
    if (!this.index) {
      this.index = new Map()
      for (const root of this.indexRoots) walk(root, this.index)
    }
    return this.index
  }

  ////////////////
  // ## Checking
  ////////////////

  /**
   * The links of `text` (a page in `pageDir`), outside `<pre>`:
   * - `destinations`:  how many distinct destinations the targeted links have
   * - `problems`:
   *   - nested links
   *   - missing or outside-the-repo files
   *   - links with no target
   *   - a destination with several targets, or a target shared by several destinations
   * - SIDE EFFECT:  runs `git check-ignore` once per missing local file
   */
  check(text: string, _pageDir: string): SRV.LinkCheck {
    const pageDir = this.servedDir(_pageDir)
    const byDest = new Map<string, Set<string>>()
    const byTarget = new Map<string, Set<string>>()
    const body = text.replace(PRE, "")
    const nested = Array.from(body.matchAll(NESTED)).length
    const problems = nested ? [`${nested} nested links`] : []
    for (const m of body.matchAll(A_TAG)) {
      const attrs = m[1]
      const hrefMatch = /href="([^"]+)"/.exec(attrs)
      const target = /target="([^"]+)"/.exec(attrs)?.[1]
      if (!hrefMatch || hrefMatch[1].startsWith("#") || SAGA_ADDRESS.test(hrefMatch[1])) continue
      const href = decodeEntities(hrefMatch[1])
      const local = !URL_START.test(href)
      const dest = local ? this.fileFor(href, pageDir) : href
      if (local && !existsSync(dest)) {
        if (!this.isGitIgnored(dest + (href.split("#")[0].endsWith("/") ? "/" : ""))) problems.push(`missing:  ${href}`)
      } else if (local && !this.isInside(dest)) problems.push(`outside repo:  ${href}`)
      if (!target) {
        problems.push(`no target:  ${href}`)
        continue
      }
      // `_self`:  a page that reads like a site (the master plan) navigates in place, on purpose.
      // `github`:  an epic page's commit links (`<epic-commit>`) share ONE GitHub tab,
      // on purpose (P3 of `review-review`)
      if (target === "_self" || target === SHARED_TAB) continue
      if (!byDest.has(dest)) byDest.set(dest, new Set())
      byDest.get(dest)!.add(target)
      if (!byTarget.has(target)) byTarget.set(target, new Set())
      byTarget.get(target)!.add(dest)
    }
    for (const [dest, targets] of byDest)
      if (targets.size > 1) problems.push(`several targets for ${dest}:  ${[...targets].join(", ")}`)
    for (const [target, dests] of byTarget)
      if (dests.size > 1) problems.push(`target ${target} shared by ${[...dests].join(", ")}`)
    return { destinations: byDest.size, problems }
  }

  /**
   * Whether version control ignores `path`:  a local-only or runtime file, fine to be missing here.
   * - e.g. `.spell-server.json`, a local clone in `packages/ui/reference/`
   * - a folder MUST keep its trailing `/`:  a missing path can't match a folder-only rule (`ongoing/`) without it
   * - in the content folder:  ITS repo's rules (`pages/details/` ...), never the checkout's,
   *   which ignores the old links' names
   */
  private isGitIgnored(path: string): boolean {
    const repo = this.content && isUnder(path, this.content) ? this.content : this.root
    return Git.run(["check-ignore", "-q", path], repo).ok
  }

  /**
   * Whether `path`, absolute and normalised, is the repo root or inside it:
   * - a content folder's file counts, at its place in the checkout (`inCheckout()`)
   * - and a file of a repo beside it, in the top repo (`top`)
   */
  private isInside(path: string): boolean {
    const inCheckout = this.inCheckout(path)
    return isUnder(inCheckout, this.root) || isUnder(inCheckout, this.top)
  }
}

////////////////
// ## Constants
////////////////

/**
 * The shared content areas, folders at the checkout's root (or the content folder's), whose pages the bare-name index
 * walks.
 */
const AREAS = ["pages", "guides", "epics", "templates"]

/** Folders the bare-name index never walks into (nor any `.folder`). */
const SKIP_DIRS = new Set([
  "icons",
  "glyphs",
  "node_modules",
  ".git",
  "dist",
  "dist-element",
  "dist-runner",
  "build",
  ".cache",
  "graphify-out",
  "worktrees"
])

/**
 * An epic page, `epics/<name>/<name>.plan.html`, relative to the repo root:  `[1]` is its name.
 * - and its old places:  `<name>.html` before 2026-10-04;
 *   under `packages/docs/content/` or `packages/docs/` before 2026-10-05
 * - same as the docs tools' `relocate.js` `PLAN_DOC` (spell-epic's `src/tools/`)
 */
const PLAN_DOC = /(?:^|\/)(?:packages\/docs\/(?:content\/)?)?epics\/([^/]+)\/\1(?:\.plan)?\.html$/

/** The one target several destinations may share:  an epic page's commits, each opened in the same GitHub tab. */
const SHARED_TAB = "github"

/** An absolute URL. */
const URL_START = /^https?:\/\//

/**
 * A short address, `SAGA:/<saga>[/<epic>][#<id>]`:  the epics tool's (spell-epic's `spell-epic/links` `SAGA_SCHEME`),
 * which this package can't import.
 */
const SAGA_ADDRESS = /^saga:\//i

/**
 * A code span:  `[2]` its text;
 * `[1]` its `title`, when that's its only attribute:
 * a name with its path as its tooltip (WWOD §6 › "Plain text, plain paths")
 */
const CODE_SPAN = /<code(?:\s+title="([^"]+)")?\s*>([^<]+)<\/code\s*>/g

/** A `<pre>` block:  `link()` never links inside one, `check()` ignores it. */
const PRE = /<pre\b[\s\S]*?<\/pre\s*>/g

/** Ranges `link()` must not touch:  head, pre, script, style, existing links. */
const PROTECTED = [
  /<head>[\s\S]*?<\/head>/g,
  PRE,
  /<script\b[\s\S]*?<\/script\s*>/g,
  /<style\b[\s\S]*?<\/style\s*>/g,
  /<a\b[\s\S]*?<\/a\s*>/g
]

/** An `<a>` whose first attribute is `href`:  `[1]` the href. */
const A_HREF = /<a\s+href="([^"]+)"[^>]*>/g

/** A link opening right inside another:  nested links. */
const NESTED = /<a\b[^>]*>\s*<a\b/g

/** An `<a>` tag, `[1]` its attributes. */
const A_TAG = /<a\b([^>]*)>/g

/** A code span text that looks like a path, so not resolving it is worth reporting. */
const PATH_LIKE = /\.(ts|tsx|md|mjs|js|html|json)(:\d+)?$/

/** `solid-js/...` or `@solidjs/<pkg>/...` with an extension:  looked up in `node_modules`. */
const SOLID_FILE = /^(solid-js|@solidjs\/[\w-]+)\/.+\.\w+$/

/** A `solidjs.com` page. */
const SOLID_SITE = /^(v2\.)?solidjs\.com\/|^v2\.solidjs\.com/

/** Characters a path may hold, with an optional extension and trailing slash. */
const PATH_CHARS = /^[#~.@\w/-]+(\.\w+)?\/?$/

/** An old-style alias, `#name/rest`:  `[1]` the package, `[2]` the rest. */
const ALIAS = /^#([\w-]+)\/(.+)$/

////////////////
// ## Helpers
////////////////

/**
 * Add every file under `dir` to `index`:
 * - skips `SKIP_DIRS` and `.folders`
 * - never follows a symlinked folder;  a symlinked file (or a broken link) counts as a file
 * - an unreadable folder adds nothing
 */
function walk(dir: string, index: Map<string, string[]>): void {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) walk(path, index)
    } else if (!entry.isSymbolicLink() || !isDir(path)) {
      if (!index.has(entry.name)) index.set(entry.name, [])
      index.get(entry.name)!.push(path)
    }
  }
}

/** Whether `path`, absolute and normalised, is folder `dir` or inside it. */
function isUnder(path: string, dir: string): boolean {
  return path === dir || path.startsWith(`${dir}/`)
}

/**
 * The content folder's folders laid under checkout `root` (`Linker.content`):  each one the checkout has no folder of
 * its own by that name (none, or an old link to it), but dot folders;  none when `content` can't be read.
 * - so the content repo's `packages/` (old-path links) never stands for the checkout's
 */
function contentAreasOf(root: string, content: string): string[] {
  let entries
  try {
    entries = readdirSync(content, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .filter((name) => {
      const own = lstatSync(join(root, name), { throwIfNoEntry: false })
      return !own || own.isSymbolicLink()
    })
}

/** Whether `path` is a folder (following symlinks);  `false` when it doesn't exist. */
function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * `text` with its character references (`&amp;`, `&#47;` ...) decoded, by linkedom's HTML parser.
 * - NOTE:  `<` is escaped first, so the text can't open a tag
 */
function decodeEntities(text: string): string {
  if (!text.includes("&")) return text
  const { document } = parseHTML(`<html><body><p>${text.replaceAll("<", "&lt;")}</p></body></html>`)
  return document.querySelector("p")?.textContent ?? text
}

/** The nearest folder up from `root` holding a `yarn.lock` (its install's root);  `root` itself without one. */
function installRoot(root: string): string {
  for (let at = resolvePath(root); ; at = dirname(at)) {
    if (existsSync(join(at, "yarn.lock"))) return at
    if (dirname(at) === at) return resolvePath(root)
  }
}

/**
 * Each of our packages installed in `top`'s `node_modules`, its real folder by its old short name (the monorepo's
 * `packages/<name>/`, in old pages):
 * - a one-package repo (`ONE_PACKAGE_REPOS`) by its old name:  `ui` => `<top>/spell-ui`
 * - a package of several folders (`FOLDERS_OF`, epic `repo-split` P9 and P11:  the kit, spell-parser, spell-app), each
 *   folder by its old package's name:  `server` => `<kit>/src/server`, `spell-element` => `<kit>/src/element`,
 *   `parser` => `<spell-parser>/parser`
 *   - a folder at the package's root, or in its one `src/` (epic `repo-split` P14)
 */
function spellPackagesIn(top: string): Map<string, string> {
  const found = new Map<string, string>()
  const installed = (name: string): string | undefined => packageRootFor(name, top)
  for (const [name, short] of Object.entries(ONE_PACKAGE_REPOS)) {
    const dir = installed(name)
    if (dir) found.set(short, dir)
  }
  for (const [name, folders] of Object.entries(FOLDERS_OF)) {
    const root = installed(name)
    if (!root) continue
    for (const [short, folder] of Object.entries(folders)) {
      const dir = [join(root, folder), join(root, "src", folder)].find(isDir)
      if (dir) found.set(short, dir)
    }
  }
  return found
}

/** The repos that are ONE package of no folders of its own, by npm name:  the short name of the package each was. */
const ONE_PACKAGE_REPOS: Readonly<Record<string, string>> = {
  "spell-ui": "ui",
  "spell-brand": "brand",
  "spell-epic": "epics"
}

/**
 * The packages of several folders, by npm name:  each folder by the short name of the package it was
 * (`packages/<name>/` in old pages).
 */
const FOLDERS_OF: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  spell: {
    util: "util",
    toolchain: "toolchain",
    server: "server",
    // merged into the server (epic `repo-split` P14, Q43)
    assembler: "server",
    "spell-element": "element"
  },
  "spell-parser": { parser: "parser", markdown: "markdown", core: "core", py: "py", spell: "spell" },
  "spell-app": { app: "app", spaces: "spaces", lsp: "lsp", cli: "cli", "page-server": "page-server" }
}
