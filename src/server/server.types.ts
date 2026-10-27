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
 *     for EVERY `<w>` (the page server's content folder, `PageServer.serveContent()`)
 *   - a catch-all:  at one prefix, it comes after the folders that look the path up as it is (`StaticHandler`)
 */
export type Mount = {
  prefix: string
  dir: string
  dotFiles?: boolean
  index?: string | false
  skip?: number
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
   * the shared content folder it serves at `/`, after the checkout's own files, once a route module has said where it
   * is (`PageServer.serveContent()`, epic `epic-eject` P12):  epics, guides, pages, sagas, brand ...
   */
  contentFolder?: string
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
 *   - `mended`:  it reached nothing, and a move's one new home was found (`spell-lang/` is `parser/` ...)
 *   - `broken`:  it reaches nothing, then or now:  written as the browser reads it, for a person to fix
 *   - `dropped`:  a `<spell-site-header root>`, which only served pages opened from disk
 *   - `outside`:  it climbs above the root:  left as written
 */
export type RootLinkChange = {
  from: string
  to: string
  kind: "rooted" | "mended" | "broken" | "dropped" | "outside"
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
 * A bundle the page server serves, BUILT on demand from the checkout's source instead of committed (`Bundle`).
 * - `output` is git-ignored;  its build clears it first, then `Bundle.build()` records the sources' hash in it
 * - Why not committed:  its chunk names carry content hashes,
 *   so every Spell UI change deleted and re-added most of its files in every diff and merge
 *   (Owen, epic `epic-components`, 2026-10-07)
 */
export type BundleSpec = {
  /** what the command line calls it, e.g. `brand` */
  name: string
  /** what it is, for people */
  title: string
  /**
   * the package it's built in, by its npm name, e.g. `spell-brand`:  found through the checkout's `node_modules`,
   * wherever its repo is (epic `repo-split` P8:  Spell UI's and the brand's are repos beside spell-app's)
   */
  package: string
  /** the folder its build runs in, relative to `package`'s folder */
  cwd: string
  /** the build, run in `cwd` */
  run: string[]
  /** the folder the build writes, relative to `package`'s folder */
  output: string
  /** a file every build writes in `output`:  missing => stale */
  entry: string
  /**
   * files and folders the build reads:  a change to one makes the bundle stale
   * - a package's, by its npm name and a path in it:  `ui/src`
   * - anything else, from the install's root (the folder holding `yarn.lock`):  `yarn.lock`
   */
  sources: string[]
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
  /** what the report calls it, e.g. `site`, `brand` */
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

/** What a build records in its `output` folder (`BUNDLE_RECORD`), for `Bundle.check()` to compare. */
export type BundleRecord = {
  /** the hash of the sources it was built from */
  sources: string
  /** when, as an ISO date */
  built: string
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
  "ui/src",
  "spell/src/element",
  "spell/ui/vite.config.ts",
  "spell/src/server/site",
  "yarn.lock"
]

/**
 * How each bundle built on demand is built.
 * - WHICH are built:  the ones whose `output` folders the page server's settings name
 *   (`"bundles"`, in spell-ui's and spell-brand's parts:  `Bundle.specs()`), the list the page server reads too
 * - the page server builds the stale ones when it starts (`spell bundle --stale`)
 * - `sources`:  generous, so a change never leaves one stale unnoticed
 *   - `Bundle.sourceFiles()` skips tests, snapshots, dot files and the icon packs
 * - their `output` folders are in their own repos' `.gitignore`
 * - each by its PACKAGE, never by the checkout's layout (epic `repo-split` P8)
 */
export const BUNDLES: BundleSpec[] = [
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
      "ui/site/_src",
      "spell/ui/vite.site.config.ts",
      "ui/scripts/site-bundle.ts"
    ]
  },
  {
    name: "brand",
    title: "brand pages' bundle",
    package: "spell-brand",
    cwd: ".",
    run: ["yarn", "build"],
    output: "_assets/ui",
    entry: "brand-ui.js",
    sources: [...SPELL_UI_SOURCES, "spell-brand/src", "spell-brand/vite.config.ts", "spell-brand/scripts/build.ts"]
  }
]

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
