// Import directly:  a leaf with no imports, where Spell UI's barrel would load every component
import { SpellUIGuide } from "spell/ui/util/SpellUIGuide"

/**
 * The pages and profiles `spell perf run` measures, and the shapes of what it keeps (epic `solid-2-final` P1).
 * - Taken from the research scripts that made the first numbers (the epic's `research/perf-scripts/`), as they were.
 * - Types and plain data only:  no Playwright, no spell.
 */

////////////////
// ## Pages
////////////////

/** The pages measured, by name. */
export const PERF_PAGE_NAMES = ["editor", "docs", "epic", "run", "site", "cloud", "programs"] as const

/** One of `PERF_PAGE_NAMES`. */
export type PerfPageName = (typeof PERF_PAGE_NAMES)[number]

/**
 * Where a page's addresses start:  the editor build being measured, and the page server.
 * - `trustedKey`:  with `--https`, the editor build's throwaway certificate's key (its SPKI hash), which Chromium
 *   is told to trust:  so it speaks HTTP/2 and caches as it would with a trusted certificate
 */
export type PerfServers = { editor: string; pageServer: string; trustedKey?: string }

/**
 * A page measured.
 * - `url`:  its address, from the servers
 * - `ready`:  a page function's SOURCE, true once the page is usable;  polled from the page, after its first paint
 * - `storage`:  `localStorage` set before the page's own scripts run
 * - `blockWrites`:  the page's writes to the server are answered `{}` and go nowhere, so nothing on disk changes
 * - `isEditorBuild`:  served by the editor build `spell perf run` makes, not by the page server
 */
export type PerfPage = {
  name: PerfPageName
  url: (servers: PerfServers) => string
  ready: string
  storage?: Record<string, string>
  blockWrites?: boolean
  isEditorBuild?: boolean
}

/** Editor settings for the standard heavy case:  the Program panel (Debug) and the Inspector open, autosave off. */
const EDITOR_STORAGE = {
  "spellEditor:programPanel": "true",
  "spellEditor:inspector": "true",
  "spellEditor:autoSave": "false"
}

/** A page function's SOURCE that finds a selector's first match through shadow roots:  `(root, selector) => Element`. */
const DEEP_QUERY = `(function find(root, selector) { const it = root.querySelector(selector); if (it) return it; for (const each of root.querySelectorAll("*")) { const found = each.shadowRoot && find(each.shadowRoot, selector); if (found) return found } return null })`

/** Every element is defined:  `<ui-tooltip>` left out, as it stays undefined on the epic page (2026-11-20). */
const ALL_DEFINED = `!document.querySelector(":not(:defined):not(ui-tooltip)")`

/**
 * The pages, as the research measured them.
 * - `editor`:  Solitaire, Debug and the Inspector open;  ready once its cards are drawn and the code pane has a line
 *   (at phone width the editor shows the app alone:  the cards alone)
 * - `docs`:  Spell UI's kitchen sink;  `epic`:  epic-engine's epic page, the biggest;  both ready once every element
 *   is defined
 * - `run`:  Solitaire running alone, the editor's Run mode
 * - the kinds epic `solid-2-final` P19 added, not in a quick run's default pages (`--page site,cloud,programs`):
 *   - `site`:  a built site on the run page, the Spell UI site's guide;  ready once its layout has drawn
 *   - `cloud`:  a cloud app, one program on a plain page in a `<spell-viewer>` (the view elements demo:  Solitaire,
 *     its own tags);  ready once its tags are defined
 *   - `programs`:  several programs on one plain page, a viewer each (Counter, Task List, Solitaire);  ready once the
 *     last one's tags are defined
 */
export const PERF_PAGES: Record<PerfPageName, PerfPage> = {
  editor: {
    name: "editor",
    url: ({ editor }) => `${editor}edit/@spell/examples/Solitaire`,
    storage: EDITOR_STORAGE,
    blockWrites: true,
    isEditorBuild: true,
    ready: `() => !!document.querySelector("solitaire-card") && (innerWidth < 800 || !!document.querySelector(".InputEditor .cm-editor .cm-line"))`
  },
  docs: {
    name: "docs",
    // the Spell UI site's Kitchen Sink page, every component on one page
    url: ({ pageServer }) => `${pageServer}${SpellUIGuide.addressOf("/kitchen-sink")}`,
    ready: `() => document.readyState === "complete" && ${ALL_DEFINED}`
  },
  epic: {
    name: "epic",
    url: ({ pageServer }) => `${pageServer}/epics/epic-engine/epic-engine.plan.html`,
    ready: `() => document.readyState === "complete" && !!document.querySelector("epic-page, .spell-toolbar") && ${ALL_DEFINED}`
  },
  run: {
    name: "run",
    url: ({ editor }) => `${editor}run/@spell/examples/Solitaire`,
    storage: EDITOR_STORAGE,
    blockWrites: true,
    isEditorBuild: true,
    ready: `() => !!document.querySelector("solitaire-card")`
  },
  site: {
    name: "site",
    url: ({ editor }) => `${editor}run/@spell/guides/SpellUI`,
    blockWrites: true,
    isEditorBuild: true,
    ready: `() => !!${DEEP_QUERY}(document, "ui-page-layout ui-header, ui-page-layout h1")`
  },
  cloud: {
    name: "cloud",
    url: ({ pageServer }) => `${pageServer}/app/app/demo/drawable-elements.html`,
    blockWrites: true,
    ready: `() => !!customElements.get("solitaire-card") && !!document.querySelector("solitaire-card")`
  },
  programs: {
    name: "programs",
    url: ({ pageServer }) => `${pageServer}/app/app/demo/several-programs.html`,
    blockWrites: true,
    ready: `() => document.readyState === "complete" && !!customElements.get("solitaire-card")`
  }
}

////////////////
// ## Profiles
////////////////

/** The profiles a page is measured under, by name. */
export const PERF_PROFILE_NAMES = ["desktop", "phone", "phonewide"] as const

/** One of `PERF_PROFILE_NAMES`. */
export type PerfProfileName = (typeof PERF_PROFILE_NAMES)[number]

/** A network to emulate, as Chrome's `Network.emulateNetworkConditions` takes it:  ms, bytes a second. */
export type PerfNetwork = { offline: false; latency: number; downloadThroughput: number; uploadThroughput: number }

/**
 * A profile:  the browser's window, its CPU slowed `cpu` times, its network.
 * - `device`:  a Playwright device to start from (`Pixel 7`);  `viewport` over it
 * - `isMobile`:  `false` turns a device's mobile mode off (a tablet-like width)
 */
export type PerfProfile = {
  name: PerfProfileName
  device?: string
  viewport?: { width: number; height: number }
  isMobile?: boolean
  cpu: number
  network?: PerfNetwork
}

/** ~5G:  20ms, 50 Mbps down, 20 Mbps up. */
const PHONE_NETWORK: PerfNetwork = {
  offline: false,
  latency: 20,
  downloadThroughput: (50e6 / 8) | 0,
  uploadThroughput: (20e6 / 8) | 0
}

/**
 * The profiles, as the research measured them.
 * - `phone`:  Playwright's Pixel 7 (412 x 839, touch), the CPU slowed 4x, ~5G
 *   - 4x on this Mac stands in for a 2023 mid-range phone (Pixel 7a, Galaxy A54) (estimated)
 * - `phonewide`:  the phone's CPU and network at 1280 x 800, where the editor shows its code pane and Inspector
 */
export const PERF_PROFILES: Record<PerfProfileName, PerfProfile> = {
  desktop: { name: "desktop", viewport: { width: 1600, height: 1000 }, cpu: 1 },
  phone: { name: "phone", device: "Pixel 7", cpu: 4, network: PHONE_NETWORK },
  phonewide: {
    name: "phonewide",
    device: "Pixel 7",
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    cpu: 4,
    network: PHONE_NETWORK
  }
}

////////////////
// ## Runs
////////////////

/** The measurements a run can take:  `load` by default, every one with `--full`. */
export const PERF_STEPS = [
  "load",
  "leaks",
  "lists",
  "typing",
  "a11y",
  "listeners",
  "sheets",
  "cpu",
  "pipeline"
] as const

/** One of `PERF_STEPS`. */
export type PerfStep = (typeof PERF_STEPS)[number]

/**
 * What `spell perf run` was asked for.
 * - `pages`, `profiles`, `steps`:  what to measure
 * - `runs`:  cold loads per page and profile, medians reported
 * - `waitMinutes`:  how long to wait for a quiet machine;  `force`:  don't
 * - `out`:  write there instead of the dated file
 * - `baseline`:  `save`, this run is the new baseline too
 * - `https`:  the editor build served over HTTPS, so HTTP/2, with a throwaway certificate (epic `solid-2-final` P14)
 */
export type PerfRunOptions = {
  pages: PerfPageName[]
  profiles: PerfProfileName[]
  steps: PerfStep[]
  runs: number
  waitMinutes: number
  force: boolean
  out?: string
  baseline?: "save"
  https?: boolean
}

/** The machine as a run saw it:  load averages, memory, the CPUs. */
export type MachineState = { load: number[]; freeMemoryGB: number; totalMemoryGB: number; cpus: number }

/**
 * One run's record:  a dated JSON file in the kit's `.perf-results/`.
 * - `numbers`:  every number worth comparing, by `<step> <page>/<profile> <metric>`, flat
 * - `data`:  each step's whole result, by page and profile
 * - `busyMachine`:  the 1-minute load went over half the CPUs:  times are noisy, bytes and counts aren't
 */
export type PerfRecord = {
  when: string
  busyMachine: boolean
  warning?: string
  machine: {
    before: MachineState
    after: MachineState
    loadsSeen: number[]
    waitedSeconds: number
    model?: string
    platform: string
  }
  gitSha: string
  gitBranch: string
  chromeVersion: string
  options: PerfRunOptions
  failures: string[]
  numbers: Record<string, number>
  data: Record<string, Record<string, unknown>>
}

/** What `perfBaseline.json` holds besides its commit:  a run's numbers, and the speed test's pipeline's. */
export type PerfBaselineNumbers = { numbers: Record<string, number>; when?: string }

////////////////
// ## Budgets
////////////////

/**
 * One bundle's size budget, an entry of `app/perf-budgets.json5`:  brotli on the wire, KB (1024 bytes).
 * - `id`, `name`:  how the check names it, and what it is in words
 * - `budget`:  what it should weigh;  `ceiling`:  today's size plus 2%, which it must never pass
 *   (a phase that shrinks it lowers its ceiling:  `spell perf budget --tighten`)
 * - how it's sized, one of:
 *   - `build`:  a build of the app folder's (`editor`, `element`), made into a temporary folder;  `folder` for anything
 *     already on disk, from the kit's root (`ui/site/_assets`)
 *     - `entries`:  what a page loads first, from that folder;  an `.html` file's scripts, preloads and stylesheets;
 *       `only`:  count only the files this matches (`\\.js$`)
 *     - `measure`:  `eager` (default:  what a page loads first), or `lazy` (the biggest single file it may load later)
 *   - `run`:  a number `spell perf run` measured in a browser (`load editor/desktop brotliLoaded`), from the last run
 */
export type BudgetEntry = {
  id: string
  name: string
  budget: number
  ceiling: number
  build?: "editor" | "element"
  folder?: string
  entries?: string[]
  only?: string
  measure?: "eager" | "lazy"
  run?: string
}

/** One budget checked (`PerfBudget.check()`):  its size now, and how it stands. */
export type BudgetResult = {
  entry: BudgetEntry
  /** KB, brotli;  `undefined` when it couldn't be sized (a run number with no run yet) */
  size?: number
  /** why it couldn't be sized */
  skipped?: string
  /** a browser-measured number no `spell perf run` has measured:  it fails the check (epic `solid-2-final` J28) */
  isUnmeasured?: boolean
  /** a browser-measured number from a run older than the newest:  when that run was */
  staleSince?: string
  isOverBudget: boolean
  isOverCeiling: boolean
}
