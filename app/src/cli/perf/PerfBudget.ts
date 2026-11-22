import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, posix } from "node:path"

import { json5Edited, readJSON5File } from "spell/util/node/json5"
import { SRV } from "spell/server"
import type { BudgetEntry, BudgetResult, PerfRecord } from "./perf.types"
import type { PerfBuilds } from "./PerfBuilds"

/**
 * The bundles' SIZE BUDGETS (epic `solid-2-final` P1, Q14):  `app/perf-budgets.json5`, brotli on the wire, KB.
 * - Each entry has its BUDGET, what it should weigh, and its CEILING, today's size plus 2%.
 *   - The check fails when a bundle grows past its ceiling, or past its budget once it has met it.
 *   - So it fails from now on, without turning red for weeks:  a bundle can only get smaller.
 *   - A phase that shrinks a bundle lowers its ceiling in the same change:  `spell perf budget --tighten`.
 * - Sizes don't move with a busy machine:  this check can't go flaky the way timings do.
 * - Each bundle is sized ONE way, the kit's `SRV.Bundle.firstLoad()`:  what a page loads first, each file brotli'd.
 * - Named by its build (the app folder's own, made into a temporary folder) or by its folder from the kit's root,
 *   so the app imports nothing of the other folders;  `run` entries are numbers `spell perf run` measured in a browser.
 */
export class PerfBudget {
  /** the budgets' file, `app/perf-budgets.json5` */
  readonly file: string

  /** the kit's root, where `folder`s are from */
  readonly kitRoot: string

  constructor(file: string, kitRoot: string) {
    this.file = file
    this.kitRoot = kitRoot
  }

  /** the budgets, as the file has them */
  get entries(): BudgetEntry[] {
    return readJSON5File<BudgetFile>(this.file).budgets
  }

  /**
   * Size every budget's bundle, and say how each stands.
   * - `builds`:  where the app's builds are made (each one once);  `lastRun`:  where a `run` entry's number is from
   * - before a `folder` is sized, its stale bundles are built (`spell bundle --stale`):  a worktree's site bundle
   */
  check(builds: PerfBuilds, lastRun: PerfRecord | undefined, say: (line: string) => void): BudgetResult[] {
    const built = new Map<string, string>()
    const folderOf = (entry: BudgetEntry): string => {
      if (entry.folder) return join(this.kitRoot, entry.folder)
      const build = entry.build!
      if (!built.has(build)) {
        say(`Building ${build} into a temporary folder ...`)
        built.set(build, builds.build(build))
      }
      return built.get(build)!
    }
    if (this.entries.some((entry) => entry.folder)) this.buildStaleBundles(say)
    return this.entries.map((entry) => {
      if (entry.run) {
        const value = lastRun?.numbers[entry.run]
        if (value === undefined) return skipped(entry, `no spell perf run has measured ${entry.run} yet`)
        return PerfBudget.judged(entry, value / 1024)
      }
      const folder = folderOf(entry)
      if (!existsSync(folder)) return skipped(entry, `${folder} isn't there`)
      return PerfBudget.judged(entry, PerfBudget.sizeOf(entry, folder) / 1024)
    })
  }

  /**
   * The lines that report `results`, and whether they pass:  every bundle with its size, budget and ceiling;
   * each over its budget named.
   */
  static report(results: BudgetResult[]): { lines: string[]; isPassing: boolean } {
    const lines = [
      `${"bundle".padEnd(48)}${"now".padStart(10)}${"budget".padStart(10)}${"ceiling".padStart(10)}  (KB, brotli)`
    ]
    for (const result of results) {
      const { entry, size } = result
      const verdict = result.isOverCeiling
        ? "OVER ITS CEILING"
        : result.isOverBudget
          ? "over budget"
          : result.skipped
            ? `not sized:  ${result.skipped}`
            : "within budget"
      lines.push(
        `${entry.name.slice(0, 47).padEnd(48)}${(size === undefined ? "-" : size.toFixed(0)).padStart(10)}` +
          `${String(entry.budget).padStart(10)}${String(entry.ceiling).padStart(10)}  ${verdict}`
      )
    }
    const over = results.filter((result) => result.isOverBudget)
    const broken = results.filter((result) => result.isOverCeiling)
    lines.push("")
    if (over.length) lines.push(`Over budget:  ${over.map((result) => result.entry.id).join(", ")}`)
    if (broken.length) lines.push(`Past its ceiling (it grew):  ${broken.map((result) => result.entry.id).join(", ")}`)
    return { lines, isPassing: !broken.length }
  }

  /**
   * SIDE EFFECT:  lower each ceiling to its bundle's size now plus 2%, where that's lower;  returns the ids lowered.
   * - never raises one:  a bundle can only get smaller
   * - a bundle within its budget:  never past the budget either
   */
  tighten(results: BudgetResult[]): string[] {
    const lowered: string[] = []
    const data = readJSON5File<BudgetFile>(this.file)
    for (const entry of data.budgets) {
      const size = results.find((result) => result.entry.id === entry.id)?.size
      if (size === undefined) continue
      // one that has met its budget never passes it again
      const ceiling = Math.min(PerfBudget.ceilingFor(size), size <= entry.budget ? entry.budget : Infinity)
      if (ceiling < entry.ceiling) {
        entry.ceiling = ceiling
        lowered.push(entry.id)
      }
    }
    if (lowered.length) writeFileSync(this.file, json5Edited(readFileSync(this.file, "utf8"), data))
    return lowered
  }

  /** A bundle of `size` KB's ceiling:  its size plus 2%, whole KB up. */
  static ceilingFor(size: number): number {
    return Math.ceil(size * (1 + CEILING_SHARE))
  }

  /** How `entry` stands at `size` KB. */
  static judged(entry: BudgetEntry, size: number): BudgetResult {
    const rounded = +size.toFixed(1)
    return { entry, size: rounded, isOverBudget: rounded > entry.budget, isOverCeiling: rounded > entry.ceiling }
  }

  /**
   * `entry`'s size in `folder`, brotli bytes:  its first load (`SRV.Bundle.firstLoad()`), or its biggest lazy file
   * (`measure: "lazy"`).
   * - an `.html` entry stands for what it loads:  its scripts, module preloads and stylesheets
   */
  static sizeOf(entry: BudgetEntry, folder: string): number {
    const entries = (entry.entries ?? []).flatMap((file) =>
      file.endsWith(".html") ? PerfBudget.loadsOf(join(folder, file)) : [file]
    )
    const only = entry.only ? new RegExp(entry.only) : undefined
    const load = SRV.Bundle.firstLoad({ folder, entries, only })
    if (entry.measure === "lazy") return Math.max(0, ...load.lazy.map((file) => file.brotli))
    return load.brotli
  }

  /** What the page `html` loads first, from its folder:  its scripts, module preloads and stylesheets. */
  static loadsOf(html: string): string[] {
    const text = readFileSync(html, "utf8")
    const loads = new Set<string>()
    for (const match of text.matchAll(LOADS)) {
      const href = match[1]!
      if (/^[a-z]+:|^\/\//i.test(href)) continue
      loads.add(posix.normalize(href.replace(/^\.?\//, "")))
    }
    return [...loads]
  }

  /**
   * Build the stale bundles the budgets' folders are (`spell bundle <name> --stale`):  a folder sized must be current.
   * - only those:  never every bundle the page server lists (a peer's, which may not build here)
   * - NEVER throws:  a build that fails is said, and what's there is sized
   */
  private buildStaleBundles(say: (line: string) => void): void {
    const folders = new Set(this.entries.map((entry) => entry.folder).filter(Boolean))
    const names = SRV.Bundle.all(this.kitRoot)
      .filter((bundle) => folders.has(bundle.output))
      .map((bundle) => bundle.name)
    if (!names.length) return
    const result = spawnSync(
      process.execPath,
      [join(this.kitRoot, "bin", "spell.mjs"), "bundle", ...names, "--stale"],
      { cwd: this.kitRoot, encoding: "utf8" }
    )
    if (result.status !== 0) say(`spell bundle --stale failed;  sizing what's there:\n${result.stderr.trim()}`)
  }
}

/** A ceiling's room over today's size:  2%. */
const CEILING_SHARE = 0.02

/** A page's first loads:  `<script src>`, `<link rel="modulepreload" href>`, `<link rel="stylesheet" href>`. */
const LOADS = /<(?:script[^>]*\ssrc|link[^>]*rel="(?:modulepreload|stylesheet)"[^>]*\shref)="([^"]+)"/g

/** The budgets' file:  its list. */
type BudgetFile = { budgets: BudgetEntry[] }

/** A budget that couldn't be sized, and why. */
function skipped(entry: BudgetEntry, why: string): BudgetResult {
  return { entry, skipped: why, isOverBudget: false, isOverCeiling: false }
}
