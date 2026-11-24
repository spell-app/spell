/**
 * Types shared across `spell/server`, the constants that go with them (`BUNDLES`), and its small error classes.
 * - MUST stay runtime-light:  `import type` only, so nothing here loads a class module (WWOD §8).
 * - Plain `node` loads it, its types stripped (`FileLock`, `Git`):  NEVER an `enum` or a parameter property.
 */
import type { SRV } from "spell/server"

////////////////
// ## Handlers
////////////////

/**
 * One step of handling a request:  answer through `reply`, or call `next()` to pass it on.
 * - `next(error)` skips to the server's error answer
 * - may be async:  a rejection ~== `next(error)`
 */
export type Handler = (request: SRV.Request, reply: SRV.Reply, next: Next) => unknown

/** Pass a request on to the next handler;  with `error`, straight to the error answer. */
export type Next = (error?: unknown) => void

/** Named parts of a matched route, e.g. `{ projectId: "Solitaire" }`;  a bare `*` lands in `"0"`. */
export type RouteParams = Record<string, string>

/** Query string values:  one string, or several when the key repeats. */
export type Query = Record<string, string | string[]>

////////////////
// ## Static files
////////////////

/**
 * Rewrite an `.html` page on its way out, e.g. inject an import map or `window.SPELL_SERVER`.
 * - `path`:  the URL path asked for
 * - `file`:  the file on disk
 */
export type HtmlTransform = (html: string, context: ServedFile) => string

/**
 * Turn a file into something else on its way out, e.g. `.ts` -> JavaScript.
 * - returns the new body and its content type
 */
export type FileTransform = (source: string, context: ServedFile) => { body: string | Uint8Array; type: string }

/** The file a static request resolved to. */
export type ServedFile = {
  /** URL path asked for, decoded, e.g. `/pages/index.html` */
  path: string
  /** absolute file on disk */
  file: string
  /** the request, for headers or query */
  request: SRV.Request
}

/**
 * A folder served under a URL prefix.
 * - `prefix`:  e.g. `/element/`;  `/` serves the folder at the root
 * - `dotFiles`:  serve names starting with `.` (default:  403)
 * - `index`:  file a folder resolves to (default `index.html`);  `false`:  folders 404
 * - `skip`:  how many folders of the path after `prefix` to drop before looking in `dir` (default 0)
 *   - e.g. `{ prefix: "/worktrees/", dir: content, skip: 1 }`:  `/worktrees/<w>/epics/x.html` is `<content>/epics/x.html`,
 *     for EVERY `<w>` (the page server's epic folder, `PageServer.serveContent()`)
 *   - a catch-all:  at one prefix, it comes after the folders that look the path up as it is (`StaticHandler`)
 * - `hashed`:  the files whose names carry a build's hash, by their path inside `dir` (`assets/x-Bq3xZ9aP.js`):
 *   with `caching: "normal"`, kept a year, never asked about again (`StaticHandler`;  `hashedIn()` makes one)
 *   - only a BUILT folder's:  a name that looks hashed but isn't would be kept stale for a year
 */
export type Mount = {
  prefix: string
  dir: string
  dotFiles?: boolean
  index?: string | false
  skip?: number
  hashed?: RegExp
}

/**
 * How a `StaticHandler` (and so a `WebServer`) lets browsers keep copies of its files (epic `solid-2-final` P2).
 * - `"never"`:  `Cache-Control: no-store`:  every load fetches every file;  every worktree's page server, so
 *   development never sees a stale file;  the default
 * - `"normal"`:  a file whose name carries a build's hash (`Mount.hashed`) is kept a year, `immutable`;
 *   everything else, pages above all, is `no-cache`:  checked each time by its `ETag`, a "not modified" answer
 *   (304, a few hundred bytes) when the browser's copy is current
 */
export type Caching = "never" | "normal"

/**
 * A file name as Vite writes a hashed build's (`[name]-[hash].[ext]`):  `-`, 8 letters, digits, `_` or `-`, then its
 * extension, e.g. `CodeEngine-DrT7xrSW.js`.
 * - at least one of the 8 an upper-case letter, a digit or `_`:  a plain word (`ui-settings.js`) never matches;
 *   a real hash of only lower-case letters (about 1 in 1,500) is merely checked each time instead
 */
export const HASHED_NAME = "[^/]+-(?=[\\w-]{0,7}[A-Z0-9_])[\\w-]{8}\\.[a-z0-9]+"

/**
 * `Mount.hashed` for hashed names (`HASHED_NAME`) anywhere under any of `folders`, each a path inside the mount's
 * folder (`assets`, `ui/site/_assets`;  `*` for any one folder, e.g. a worktree's name:  `* /ui/site/_assets`).
 */
export function hashedIn(...folders: string[]): RegExp {
  const each = folders.map((folder) => folder.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]+"))
  return new RegExp(`^(?:${each.join("|")})/(?:[^/]+/)*${HASHED_NAME}$`)
}

////////////////
// ## Servers
////////////////

/**
 * What a running server writes to its pid file, and answers `/api/server` (`SERVER_API`) with.
 * - `root`:  the folder it serves;  a pid file whose server answers for another root is stale
 */
export type ServerInfo = {
  pid: number
  port: number
  root: string
  /** ISO time it started */
  started: string
  /** branch checked out at `root`, if any */
  branch?: string
  /** worktree name, when `root` is a worktree of a main checkout (`SRV.checkoutOf()`) */
  worktree?: string
  /**
   * the first folder its `/worktrees/<w>/` serves, when it serves worktrees (`PageServer.serveWorktrees()`):
   * the main checkout's server, once epics' running-epics route module has told it where they are
   * - the place new worktrees go;  every folder:  `worktreesFolders`
   */
  worktrees?: string
  /**
   * every folder its `/worktrees/<w>/` serves, in order:  `worktrees` first, then the old places still holding some
   * (epic `epic-eject` J28);  a `<w>` in two is served from the first
   */
  worktreesFolders?: string[]
  /**
   * the epic folder it serves at `/`, after the checkout's own files, once a route module has said where it
   * is (`PageServer.serveContent()`, epic `epic-eject` P12):  epics, guides, pages, sagas, brand ...
   */
  contentFolder?: string
  /**
   * the spaces it serves, when they aren't the kit's own spell.spaces:  a project's page server on the kit
   * (`--spaces`), whose record is its own (`PidFile.forPageServer()`)
   */
  spaces?: string
  /**
   * its HTTPS address, for people's browsers, once this machine trusts its certificate (`SRV.LocalCertificate`):
   * `https://localhost:4747`;  the same port still answers plain HTTP, which the tools use (epic `solid-2-final` P14)
   */
  https?: string
  /** when it last answered a request but `/api/server`, ISO:  the server keeper's idle stop (epic `epic-engine` P82) */
  lastRequest?: string
  /** how many pages hold its live socket open now:  a page open is use, so no idle stop */
  pages?: number
}

////////////////
// ## Links
////////////////

/** What `Linker.link()` did to a page's text. */
export type LinkResult = {
  /** the page's text, its code spans linked and every link given a target */
  text: string
  /** how many code spans became links */
  linked: number
  /** path-like code spans that resolve to nothing, sorted */
  unresolved: string[]
}

/**
 * One URL `Linker.rootLinks()` rewrote (or dropped) in a page's text.
 * - `from` / `to`:  as written, and as written now (`to` is `""` for a dropped `<spell-site-header root>`)
 * - `kind`:
 *   - `rooted`:  the root path of the file it reached
 *   - `mended`:  it reached nothing, and a move's one new home was found (`spell-lang/` is `parser/` ...);
 *     or it's a link to a site's old page (`Linker`'s `sites`), a root path too, at the page's address now
 *   - `broken`:  it reaches nothing, then or now:  written as the browser reads it, for a person to fix
 *   - `dropped`:  a `<spell-site-header root>`, which only served pages opened from disk
 *   - `outside`:  it climbs above the root:  left as written
 */
export type RootLinkChange = {
  from: string
  to: string
  kind: "rooted" | "mended" | "broken" | "dropped" | "outside"
}

/**
 * A site the page server shows at an address with NO FILE per page, `Linker`'s `sites`:
 * the Spell UI site, a Spell site in a viewer at `/components/ui/` (epic `editor` P43).
 * - Its pages' addresses (`/components/ui/button`) check as found, file or none.
 * - A link written for its old pages (`/components/ui/ui-button.html`) is mended to its page's address.
 * - Handed in by whoever makes the linker (the epic tools:  spell-epic's `ServedFolders.sites`):
 *   the kit knows no site's pages.
 */
export type LinkSite = {
  /** its address on the page server, with no `/` at its end:  `/components/ui` */
  address: string
  /**
   * the address a link to one of its old pages is now, its `?query` and `#hash` kept
   * (`/components/ui/ui-button.html#api` => `/components/ui/button#api`);  `undefined`:  not one of them
   */
  mendedPath(path: string): string | undefined
}

/** What `Linker.rootLinks()` did to a page's text. */
export type RootLinksResult = {
  /** the page's text, its relative URLs root paths, every other byte as it was */
  text: string
  /** each URL it rewrote, dropped or couldn't place, in page order */
  changes: RootLinkChange[]
}

/** What `Linker.check()` found in a page's links, outside `<pre>`. */
export type LinkCheck = {
  /** how many distinct destinations the targeted links have */
  destinations: number
  /**
   * one line per problem, e.g. `missing:  nope.html`, `relative:  ../x.ts -- write /spell-ui/x.ts`;
   * empty when the page passes
   */
  problems: string[]
}

////////////////
// ## Bundles
////////////////

/**
 * A file the checkout's pages need that is BUILT from its source (`Bundle`):  a bundle the page server serves, or a
 * committed generated file (`committed`).
 * - a bundle:  `output` is git-ignored;  its build clears it first, then `Bundle.build()` records the sources' hash in it
 *   - Why not committed:  its chunk names carry content hashes,
 *     so every Spell UI change deleted and re-added most of its files in every diff and merge
 *     (Owen, epic `epic-components`, 2026-10-07)
 * - a committed one (epic `epic-engine` P54):  Spell UI's root catalog (the epics pack and the docs bundle until epic
 *   `solid-2-final` P7)
 */
export type BundleSpec = {
  /** what the command line calls it, e.g. `ui-site` */
  name: string
  /** what it is, for people */
  title: string
  /**
   * the package it's built in, by its npm name, e.g. `spell-ui`:  found through the checkout's `node_modules`,
   * wherever its repo is (epic `repo-split` P8)
   */
  package: string
  /** the folder its build runs in, relative to `package`'s folder */
  cwd: string
  /** the build, run in `cwd` */
  run: string[]
  /** the folder the build writes, relative to `package`'s folder */
  output: string
  /** a file every build writes in `output`:  missing => stale, as is every other the last build made (`BundleRecord`) */
  entry: string
  /**
   * files and folders the build reads:  a change to one makes the bundle stale
   * - a package's, by its npm name and a path in it:  `ui/src`
   * - anything else, from the install's root (the folder holding `yarn.lock`):  `yarn.lock`
   */
  sources: string[]
  /**
   * its output is COMMITTED, a generated file (epic `epic-engine` P54;  Owen, Q61:  "Only in a worktree"):
   * - rebuilt by `--stale` only in a WORKTREE;  the main checkout writes nothing, it logs what to run (`fixLine`)
   * - its record kept in the install's git-ignored cache (`node_modules/.cache/spell-bundles/`), never beside it
   */
  committed?: true
  /**
   * a command, run in `cwd`, exiting 0 while a committed output is current (`yarn pack:check`):
   * - how the main checkout tells, and how a worktree with no record yet tells before building
   * - none:  the main checkout takes it as current;  a worktree builds it once
   */
  check?: string[]
  /**
   * the files and folders its build writes, relative to `package`'s folder, that are no build's source:
   * left out of EVERY bundle's sources, so a build writing beside another's sources never makes it stale
   * - its own `entry` is always left out of its own sources
   * - those there after its build are required, as its `output`'s files are (`BundleRecord.files`)
   */
  generated?: string[]
}

/** What `Bundle.check()` found. */
export type BundleCheck = {
  /** the bundle's `name` */
  name: string
  /** its `output` folder, relative to the checkout:  as the settings' `bundles` name it (`../ui/site/_assets`) */
  output: string
  /** the hash of its sources now */
  sources: string
  /** why it needs a build, e.g. `never built`;  left out when current */
  stale?: string
  /** a committed one, stale in the main checkout:  what to run, and where (`run yarn gen:root in ui/`) */
  fix?: string
}

/** What `Bundle.build()` did. */
export type BundleBuilt = {
  /** the bundle's `name` */
  name: string
  /** the hash of the sources it was built from */
  sources: string
  /** how long the build took */
  seconds: number
}

/** What `Bundle.sizeReport()` reports on:  a build script's output, as it ends. */
export type BundleSizeParams = {
  /** what the report calls it, e.g. `site` */
  name: string
  /** the output folder, absolute */
  folder: string
  /** how long the build took, s */
  seconds: number
  /** the files a page loads first, relative to `folder`, e.g. `["site.css", "site.js"]` */
  entries: readonly string[]
  /** count only the files this matches, e.g. `/\.(js|css)$/` */
  only?: RegExp
}

/** A file's size in bytes:  raw, gzipped and brotli, each on its own (`Bundle.sizesOf()`). */
export type CompressedSizes = { raw: number; gzip: number; brotli: number }

/** One file's sizes, by its path in its bundle's folder. */
export type FileSizes = CompressedSizes & { file: string }

/**
 * What a page loads first of a bundle, and the rest (`Bundle.firstLoad()`).
 * - `files`:  the eager files, biggest first;  `raw`, `gzip`, `brotli`:  their sums
 * - `lazy`:  every other file, biggest first;  `all`:  both
 */
export type BundleLoad = CompressedSizes & { files: FileSizes[]; lazy: FileSizes[]; all: FileSizes[] }

/** What one module adds to a built file, raw bytes (`BundleContents`). */
export type ModuleBytes = { module: string; bytes: number }

/** A file that loads another:  `static` with it, `dynamic` later (`import()`, a worker, a URL). */
export type FileImporter = { file: string; how: "static" | "dynamic" }

/**
 * What a built file holds and who loads it (`BundleContents.of()`).
 * - `raw`:  its size;  `isMapped`:  a source map was beside it, so `modules` say what's in it, biggest first
 */
export type BuiltFileContents = {
  file: string
  raw: number
  isMapped: boolean
  modules: ModuleBytes[]
  importedBy: FileImporter[]
}

/** A module built into more than one file (`BundleContents.duplicates()`):  each file's bytes of it, and their sum. */
export type DuplicateModule = { module: string; bytes: number; files: Array<{ file: string; bytes: number }> }

/** What a build records in its `output` folder (`BUNDLE_RECORD`), for `Bundle.check()` to compare. */
export type BundleRecord = {
  /** the hash of the sources it was built from */
  sources: string
  /** when, as an ISO date */
  built: string
  /**
   * every file and link the build made, from its package's folder:  one missing makes it stale
   * - none for a committed one, or a record from before epic `epic-engine` I364
   */
  files?: string[]
  /**
   * the hash of the entry's bytes as built:  written again with the same ones, it's still current
   * - none for a committed one, or a record from before epic `epic-engine` I363
   */
  entry?: string
}

/** The record's file name in each `output` folder:  a dot file, so the page server neither serves nor reloads it. */
export const BUNDLE_RECORD = ".bundle.json"

/**
 * What both bundles read of Spell UI:
 * - its source (`Bundle.sourceFiles()` skips the icon packs, which each bundle LINKS, never bundles)
 * - its families (`src/components/`, since epic `repo-split` P14)
 * - the element layer they're written on (`spell/element`)
 * - its Vite config (`baseConfig()`)
 * - the site header (`spell/server/site`)
 * - the lock file
 */
const SPELL_UI_SOURCES = [
  "spell/ui/src",
  "spell/src/element",
  "spell/ui/vite.config.ts",
  "spell/src/server/site",
  "yarn.lock"
]

/**
 * What spell-epic's pack and docs bundle read:  the `epic/` folder's code, Spell UI's (the shared modules a page
 * hands its packs), the element layer, the kit's util, the site header, the lock file.
 */
const EPIC_SOURCES = [
  "spell/epic/src",
  "spell/ui/src",
  "spell/src/element",
  "spell/src/util",
  "spell/src/server/site",
  "yarn.lock"
]

/**
 * How each bundle built on demand is built.
 * - WHICH are built:  the ones whose `output` folders the page server's settings name
 *   (`"bundles"`, in spell-ui's part:  `Bundle.specs()`), the list the page server reads too
 * - the page server builds the stale ones when it starts (`spell bundle --stale`)
 * - `sources`:  generous, so a change never leaves one stale unnoticed
 *   - `Bundle.sourceFiles()` skips tests, snapshots, dot files and the icon packs
 * - their `output` folders are in their own repos' `.gitignore`;  but the COMMITTED ones' (`committed`), first in
 *   their folders' lists, so what's built from them builds after (epic `epic-engine` P54)
 * - each by its PACKAGE, never by the checkout's layout (epic `repo-split` P8):  `sources` by the package's npm name
 *   and a path in it (`spell/ui/src`:  the ONE package's `ui/src/`, epic `repo-split` P20);  a project beside the
 *   kit found as one of the page server's settings parts (`Bundle.packageDirFor()`)
 */
export const BUNDLES: BundleSpec[] = [
  {
    name: "ui-root",
    title: "Spell UI's root catalog",
    package: "spell-ui",
    cwd: ".",
    // the script alone, not `yarn gen:root`:  its type check first would stop it on any type error in Spell UI's node code
    run: ["yarn", "tsx", "scripts/gen-root.ts"],
    check: ["yarn", "tsx", "scripts/gen-root.ts", "--check"],
    output: "src/components/ui-root",
    entry: "UIRoot.catalog.ts",
    committed: true,
    sources: [
      "spell/ui/src/components",
      "spell/ui/src/docs-components",
      "spell/ui/scripts/gen-root.ts",
      "spell/src/element-tools/RootCatalog.ts"
    ]
  },
  {
    name: "ui-site",
    title: "Spell UI's docs site bundle",
    package: "spell-ui",
    cwd: ".",
    run: ["yarn", "site:bundle"],
    output: "site/_assets",
    entry: "site.js",
    sources: [
      ...SPELL_UI_SOURCES,
      "spell/ui/site/_src",
      "spell/ui/vite.site.config.ts",
      "spell/ui/scripts/site-bundle.ts"
    ]
  },
  {
    name: "epics-pack",
    title: "the epics component pack",
    package: "spell-epic",
    cwd: ".",
    run: ["yarn", "pack:build"],
    output: "src/components/__pack",
    entry: "epics.pack.js",
    // its catalog and entry (committed), its script and its families' chunks (`epics/`), and Epic UI's data
    generated: ["src/components/__pack", "src/docs/__data"],
    sources: [...EPIC_SOURCES, "spell/src/element-tools"]
  },
  {
    name: "epic-docs",
    title: "spell-epic's docs bundle",
    package: "spell-epic",
    cwd: ".",
    run: ["node", "src/tools/bundle-spell-ui.js"],
    output: "src/tools/_assets/spell-ui",
    entry: "main.js",
    // what its build writes beside its sources, in `_assets/`:  the docs bundle's folder (`spell-ui/`), the scripts
    // beside the page's Spell UI, and the folders of the build before epic `solid-2-final` P7 (`emoji/`, `lazy/`)
    generated: [
      "src/tools/_assets/spell-ui",
      "src/tools/_assets/spell-comments.js",
      "src/tools/_assets/commands.js",
      "src/tools/_assets/core-reference.js",
      "src/tools/_assets/spell-syntax.js",
      "src/tools/_assets/emoji",
      "src/tools/_assets/lazy"
    ],
    sources: EPIC_SOURCES
  }
]

////////////////
// ## Drawings
////////////////

/**
 * Something a page shows that a DRAWER can draw ahead, on the server (`SRV.Drawings`):
 * a diagram's text, a block of code, and what it's drawn with.
 * - `kind`:  what draws it in a page, the drawer's `kind`:  `mermaid`, `code`
 * - `settings`:  JSON, everything the drawing depends on besides the text (`{ language: "js", drawing: true }`)
 * - `text`:  as the element reads it
 * - `hints`:  what a page that asks for it knows that the server can't, NOT part of its key:
 *   `<ui-mermaid-diagram>`'s Mermaid settings, its colours read from the page's tokens
 * - Its KEY names it in a page and on the server alike:  `Drawings.keyFor()`, a hash of the first three.
 */
export type DrawingItem = {
  readonly kind: string
  readonly settings: Readonly<Record<string, unknown>>
  readonly text: string
  readonly hints?: Readonly<Record<string, unknown>>
}

/**
 * A finished drawing:  `markup` (an SVG, coloured code), and what else the element needs to show it.
 * - `sheet`:  the CSS it's drawn in, when the element doesn't have it (spell's bubbly look)
 * - `data`:  anything else the element reads, JSON (`{ diagramType }`, `{ language, detected }`)
 */
export type Drawing = {
  markup: string
  sheet?: string
  data?: Record<string, unknown>
}

/**
 * A DRAWER:  one way to draw a kind of item ahead, on the server, which a folder hands the page server
 * (`RouteContext.drawings.add()`, from its route module).
 * - `kind`:  the items it draws, `mermaid`, `code`;  several may draw one kind (`takes()`), the one added last asked
 *   first
 * - `name`:  its own, a folder name:  its cache's folder (`~/.spell/cache/drawings/<name>/`)
 * - `version`:  what it draws with now, e.g. its code's hash:  a new one starts its cache empty;  asked at each
 *   read and write, so it may change while the server runs
 * - `takes(item)`:  does it draw this one?  none:  every item of its kind
 * - `find(page)`:  the items a page's HTML holds, as the page's elements will read them (none:  it finds none);
 *   a page server fills in each one it has drawn already (`Drawings.fill()`)
 * - `draw(item)`:  the drawing;  `undefined` when it can't (a page then draws it itself)
 * - `replaces`:  URLs of page scripts (`"pageScripts"`) only there to draw what it draws:  a page whose items it
 *   takes are ALL filled in doesn't get them (spell's `/element/spell-language.js`)
 * - `stop()`:  when the page server stops, e.g. to close its browser
 */
export type Drawer = {
  readonly kind: string
  readonly name: string
  readonly version: string
  takes?(item: DrawingItem): boolean
  find?(page: string): DrawingItem[]
  draw(item: DrawingItem): Promise<Drawing | undefined>
  readonly replaces?: readonly string[]
  stop?(): unknown
}

/**
 * The table of drawings a page server puts in a page it fills in (`Drawings.fill()`), as JSON in a
 * `<script type="application/json" data-spell-drawings>`.
 * - `drawings`:  each by its key;  its `sheet` is a key of `sheets`, so a sheet many share is in the page once
 * - `sheets`:  each sheet by its key (`textHash()` of it)
 */
export type DrawingsTable = {
  drawings: Record<string, Omit<Drawing, "sheet"> & { sheet?: string }>
  sheets: Record<string, string>
}

/**
 * What a page is told of the drawings, as `SPELL_SERVER.drawings` (`Drawings.pageConfig()`).
 * - `api`:  `POST <api>/<kind>`, `{ text, settings }`:  a `Drawing`, or 204 when none came in time
 * - `kinds`:  the kinds it draws
 * - `table`:  the selector of a page's tables (`DrawingsTable`)
 */
export type DrawingsConfig = { api: string; kinds: string[]; table: string }

////////////////
// ## Errors
////////////////

/**
 * An error with the HTTP status to answer it with, e.g. `new HttpError(413, "body too big")`.
 * - a handler throws it (or `next(it)`s it);  the server answers `status` with `{ error: message }`
 * - `body`:  answered instead of `{ error: message }`, when set
 */
export class HttpError extends Error {
  /** status to answer with */
  readonly status: number
  /** answered instead of `{ error: message }`, when set */
  readonly body?: unknown

  // Fields set by hand, not as parameter properties:  plain `node` strips this file's types (`FileLock`, `Git`)
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/** A `FileLock` that stayed held past its wait. */
export class FileLockError extends Error {}

/**
 * What `Git.run()` returns.
 * - `out`, `err`:  trimmed
 * - `code`:  git's exit status;  `-1` when it didn't run (no `git`, a timeout)
 */
export type GitResult = { ok: boolean; out: string; err: string; code: number }

/**
 * `Git.run()` options.
 * - `input`:  written to git's stdin (`git apply`, `git hash-object --stdin`)
 * - `timeout`:  ms, default 15s;  `0`:  none (a clone, a fetch)
 * - `env`:  git's environment, default this process's
 * - `trim`:  `false` keeps `out` as git printed it (`git status --porcelain` starts with a space)
 */
export type GitOptions = { input?: string; timeout?: number; env?: NodeJS.ProcessEnv; trim?: boolean }

/** Thrown by `Git.mustRun()`:  git failed;  its message names the command, the folder and git's own words. */
export class GitError extends Error {
  declare cause: GitResult | undefined
}
GitError.prototype.name = "GitError"
