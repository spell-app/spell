/**
 * Types shared by the spike tooling:  spike config, measurement / perf / smoke / LOC result shapes, and the
 * per-library adapters (perf `settle`, the Solid identity hook).
 * - Runtime-light:  `import type` only, so `PerfRun.ts` (browser) and the node-side classes can both use it.
 * - Every `*-results.json` a spike writes has one of these shapes;  `ReportTables` reads them.
 */

////////////////
// ## Spike config
////////////////

/**
 * What a spike hands `SpikeMeasure` / `PeerVendor`:  where it lives and how to read its build.
 * - Paths are absolute, or relative to `root`.
 */
export type SpikeConfig = {
  /** display name in reports, e.g. `Lit` */
  name: string
  /** spike package root, absolute */
  root: string
  /** the spike's own `vite` module:  its config file and plugins run on it, not on `spike/shared`'s copy */
  vite: ViteLike
  /** Vite config file, relative to `root`;  default `vite.config.ts` */
  configFile?: string
  /** family name => entry file, e.g. `{ button: "src/components/button/index.ts" }` */
  entries: Record<string, string>
  /**
   * Shared entries, in load order, e.g. `[{ name: "core", entry: "src/core.ts" }, { name: "forms", entry: ... }]`.
   * - Each is built as `<name>.js`;  the FIRST is the one every family imports (its "core").
   * - A family's scenarios add only the shared entries its chunk actually imports (statically).
   * - Required unless `coreEntry` is given.
   */
  shared?: SharedEntry[]
  /**
   * DEPRECATED shorthand for `shared: [{ name: "core", entry: coreEntry }]` -- the one-entry layout the Lit spike
   * started with.
   */
  coreEntry?: string
  /** true for module ids the library build leaves EXTERNAL (the base library, subpaths included) */
  external: (id: string) => boolean
  /**
   * A module re-exporting every peer subpath the spike's `dist/` imports, one `export * as <name> from "<spec>"`
   * line each.
   * - `PeerVendor` builds one file per specifier from it;  `SpikeMeasure` bundles it once IN FULL as
   *   `libraryFull` (`library` is only the bindings `dist/` imports).
   */
  peerEntry: string
  /** bucket of a module id;  `SpikeMeasure.foundationBucket()` covers the shared `src/` */
  groups: (moduleId: string) => Bucket
  /** family that "a page with one button" loads;  default `button` */
  pageFamily?: string
}

/**
 * The part of a `vite` module the tooling calls.
 * - Structural, `config: any`:  the spike's `vite` is a different install than `spike/shared`'s (and vitest
 *   augments its config types), so neither `typeof import("vite")` nor a typed parameter matches across the
 *   two.  Callers write the config `satisfies InlineConfig`, so it's still type-checked.
 */
export type ViteLike = {
  build: (config: any) => Promise<unknown>
  loadConfigFromFile: (
    env: { command: "build" | "serve"; mode: string },
    file: string,
    root: string
  ) => Promise<{ config: unknown } | null>
  version: string
}

/** One shared lib entry (`SpikeConfig.shared`). */
export type SharedEntry = {
  /** output name, e.g. `core` => `core.js`;  also its bucket (`shared:<name>`, or `core`) */
  name: string
  /** source file, relative to `root` */
  entry: string
  /** what it holds, for the report's tier table, e.g. `form base, validation, menu options` */
  description?: string
}

/** Which kind of an own family module it is;  `fallback` ~== its native fallback (`<name>.fallback.ts`). */
export type OwnKind = "classes" | "css" | "vocabulary" | "fallback"

/**
 * Bucket a module's bytes are counted in.
 * - `library` -- the base library (should never appear:  it's external;  a check flags it)
 * - `core` -- element core + foundation JS, the `core.js` chunk;  ~== `shared:core`
 * - `shared:<name>` -- a module of shared entry `<name>` (`shared:forms` => `forms.js`)
 * - `runtime` / `icons` -- the lazy `UIRuntime` chunk and icon data
 * - `own:<family>:<kind>` -- one family's classes, sheet or vocabulary
 * - `other` -- unattributed;  reported by a check so nothing is silently dropped
 */
export type Bucket =
  | "library"
  | "core"
  | `shared:${string}`
  | "runtime"
  | "icons"
  | "other"
  | `own:${string}:${OwnKind}`

////////////////
// ## Measurement results (`measure-results.json`)
////////////////

/**
 * Size of some code, in BYTES.
 * - `min` -- esbuild `transform({ minify: true })`
 * - `gzip` -- gzip level 9 of `min`
 */
export type Size = { min: number; gzip: number }

/**
 * One family's own cost, split by kind.
 * - `fallback` is optional:  results written before it existed lack it (read as 0).
 */
export type OwnSize = Size & { classes: Size; css: Size; vocabulary: Size; fallback?: Size; modules: string[] }

/** One shared entry's cost. */
export type SharedSize = Size & { entry: string; description?: string }

/** What one family loads besides its own code. */
export type FamilyNeeds = {
  /** shared entries its chunk imports (statically, directly or through another chunk), in load order */
  shared: string[]
  /** a page with ONLY this family:  library + `shared` + own, min+gz bytes */
  page: number
}

/** A named sum of tiers, e.g. "page with one button". */
export type Scenario = {
  /** what it adds up, e.g. `["library", "core", "own:button"]` */
  parts: string[]
  /** Σ `gzip` of the parts, each gzipped on its own (a page fetches them as separate files) */
  gzip: number
}

/** One emitted chunk. */
export type ChunkSize = Size & {
  file: string
  /** only reachable through dynamic `import()` */
  lazy: boolean
  /** static imports:  sibling chunks and external specifiers */
  imports: string[]
}

/** Everything `SpikeMeasure` writes. */
export type MeasureResults = {
  spike: string
  date: string
  units: string
  /** installed versions of the peer packages and the measuring toolchain */
  versions: Record<string, string>
  /**
   * The peer set AS USED:  exactly the bindings `dist/` imports from each specifier (`bindings`), bundled once and
   * tree-shaken -- what an app bundler (or `yarn vendor`) ships.  The scenarios add this one.
   * - `bindings`:  specifier => imported names, `"*"` for a namespace import;  absent in older results (then
   *   `library` is the full peer set).
   */
  library: Size & { specifiers: string[]; bindings?: Record<string, string[]> }
  /** The FULL peer set, every export of every specifier (untree-shaken);  absent in older results. */
  libraryFull?: Size
  /** the FIRST shared entry (`shared.core`), kept so older readers still find it */
  core: Size
  /** every shared entry, by name, in load order;  absent in results written before multi-entry support */
  shared?: Record<string, SharedSize>
  own: Record<string, OwnSize>
  /** per family:  which shared entries it imports;  absent in older results (then:  `core` only) */
  families?: Record<string, FamilyNeeds>
  scenarios: Record<ScenarioName, Scenario>
  /**
   * Each family built ALONE with the library bundled and tree-shaken (eager chunks, each min+gz, summed), plus
   * `all families` in one such build:  the pre-shared-runtime measure, for comparison.
   */
  standalone: Record<string, Size>
  lazy: { runtime: Size; icons: Size }
  chunks: ChunkSize[]
  checks: MeasureChecks
}

/** Scenario keys, in report order. */
export type ScenarioName = "page with one button" | "all families" | "app already ships the library"

/** Structural checks of `dist/`:  each is `[]` / `true` when healthy. */
export type MeasureChecks = {
  /** family entries that DON'T statically import the first shared entry's chunk (`core.js`) */
  entriesMissingCore: string[]
  /** shared-entry module ids found outside that entry's own chunk (e.g. hoisted into a common chunk) */
  coreOutsideCore: string[]
  /** `library`-bucket module ids found anywhere in the build (should be external) */
  libraryBundled: string[]
  /** `runtime` / `icons` module ids found in an eager chunk */
  lazyInEager: string[]
  /** `other`-bucket module ids */
  unattributed: string[]
  /** external specifiers `dist/` imports that `peerEntry` doesn't list (an import map would miss them) */
  peersMissing: string[]
}

////////////////
// ## Perf results (`perf-results.json`, smoke `perf`)
////////////////

/**
 * Per-library "wait until the DOM reflects the last change".
 * - Lit:  `(el) => el.updateComplete`
 * - Solid:  `() => flush()` (Solid 2 batches writes to a microtask;  `flush()` applies them now)
 */
export type PerfAdapter = {
  /** may return a promise (awaited) or nothing (a synchronous flush) */
  settle(element: HTMLElement): unknown
}

/** min / avg / max, ms. */
export type PerfStats = { min: number; avg: number; max: number }

/** One timed step (open, or a keystroke). */
export type PerfStep = {
  /** query after it (`""` for open) */
  query: string
  /** `[role=option]` rows after it */
  rows: number
  /** ms, event => DOM updated (`settle`) */
  update: number
  /** ms, + a forced reflow (`offsetHeight`) */
  layout: number
  /** ms, + the next animation frame (60 Hz vsync in headless chromium) */
  frame: number
}

/** `PerfRun.run()` result. */
export type PerfResult = {
  count: number
  query: string
  open: PerfStep
  keystrokes: PerfStep[]
  update: PerfStats
  layout: PerfStats
  frame: PerfStats
}

/** `perf-results.json`:  one run, labelled with where it ran. */
export type PerfRecord = {
  spike: string
  /** e.g. `vitest browser mode` */
  where: string
  /** e.g. `dev` (Vite dev server) or `production` (`dist/` + vendored peers) */
  build: string
  date: string
  result: PerfResult
}

////////////////
// ## Smoke results (`smoke-results.json`)
////////////////

/** What each smoke page leaves in `window.smokeResult`. */
export type PageResult = {
  ok: boolean
  /** e.g. `react 19.2.0` */
  label: string
  /** named checks;  `true` / values, `false` for a failed one */
  checks: Record<string, unknown>
  /** perf pages only */
  perf?: PerfResult
}

/** One page, as the runner saw it. */
export type SmokePage = PageResult & {
  /** served path, e.g. `/shared/frameworks/react.html` */
  path: string
  title: string
  /** `host` (a framework page), `compat` (a COMPATIBILITY check), `check` (spike extra), `perf` */
  kind: SmokePageKind
  errors: string[]
  warnings: string[]
}

/** How a smoke page is reported. */
export type SmokePageKind = "host" | "compat" | "check" | "perf"

/** `smoke-results.json`. */
export type SmokeResults = {
  spike: string
  date: string
  browser: string
  pages: SmokePage[]
}

/** An `<script type="importmap">` body. */
export type ImportMap = { imports: Record<string, string> }

////////////////
// ## Solid host app
////////////////

/**
 * Contract a SOLID-based spike fulfils so the shared Solid 2 host app (`frameworks/solid/app.tsx`) can prove
 * app and components share one runtime.  Set it as `globalThis.__uiSolidIdentity` from the spike's core,
 * at module evaluation, BEFORE the app mounts.  Absent on other spikes:  those checks report `n/a`.
 */
export type SolidIdentityHook = {
  /** `import * as` namespace of the `solid-js` the components run on */
  solidJs: object
  /** same, for `@solidjs/web` */
  web?: object
  /** a context (`createContext()`) the components read;  the app provides a value around the dropdown */
  context?: unknown
  /** what `context` resolved to inside `element` (e.g. read in its render and stored) */
  read?: (element: Element) => unknown
}

////////////////
// ## LOC (`loc-results.json`)
////////////////

/**
 * LOC groups, identical in every spike so the tables line up.
 * - `element core` -- the library-specific element layer (+ `core.ts`)
 * - `components` -- component classes, no tests
 * - `tests` -- test files and test-only helpers
 * - `demo & tooling` -- demo pages, scripts, configs
 */
export type LocGroup = "element core" | "components" | "tests" | "demo & tooling"

/** One counted file. */
export type LocFile = {
  /** relative to the spike root */
  path: string
  group: LocGroup
  /** every line */
  lines: number
  /** non-blank, non-comment lines */
  code: number
}

/** `LocCount.count()` result. */
export type LocResults = {
  spike: string
  files: LocFile[]
  groups: Record<LocGroup, { files: number; lines: number; code: number }>
}
