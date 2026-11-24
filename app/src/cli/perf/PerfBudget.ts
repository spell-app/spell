import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, posix } from "node:path"

import { json5Edited, readJSON5File } from "spell/util/node/json5"
import { SRV } from "spell/server"
import type { BudgetEntry, BudgetResult } from "./perf.types"
import { BUILT_AT, type PerfBuild, type PerfBuilds } from "./PerfBuilds"

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

  /** each build made, by its name, made once for every check and explanation:  its folder */
  private readonly built = new Map<PerfBuild, string>()

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
   * - `builds`:  where the app's builds are made (each one once);  `measured`:  a `run` entry's number, from the newest
   *   run that measured it (`PerfResults.latestMeasuring()`)
   *   - none ever did:  it FAILS, unsized (`isUnmeasured`):  a limit nobody measures mustn't pass (epic `solid-2-final` J28)
   *   - an older run than the newest:  judged, and said to be stale (`staleSince`)
   * - before a `folder` is sized, its stale bundles are built (`spell bundle --stale`):  a worktree's site bundle
   */
  check(
    builds: PerfBuilds,
    measured: (number: string) => MeasuredNumber | undefined,
    say: (line: string) => void
  ): BudgetResult[] {
    const built = this.built
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
        const number = measured(entry.run)
        if (!number) return { ...skipped(entry, `no spell perf run has measured ${entry.run}`), isUnmeasured: true }
        const result = PerfBudget.judged(entry, number.value / 1024)
        return number.isNewest ? result : { ...result, staleSince: number.when }
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
            ? `${result.isUnmeasured ? "NOT MEASURED" : "not sized"}:  ${result.skipped}`
            : "within budget"
      const stale = result.staleSince
        ? `  (stale:  measured ${result.staleSince.slice(0, 10)}, before the newest run)`
        : ""
      lines.push(
        `${entry.name.slice(0, 47).padEnd(48)}${(size === undefined ? "-" : size.toFixed(0)).padStart(10)}` +
          `${String(entry.budget).padStart(10)}${String(entry.ceiling).padStart(10)}  ${verdict}${stale}`
      )
    }
    const over = results.filter((result) => result.isOverBudget)
    const broken = results.filter((result) => result.isOverCeiling)
    const unmeasured = results.filter((result) => result.isUnmeasured)
    lines.push("")
    if (over.length) lines.push(`Over budget:  ${over.map((result) => result.entry.id).join(", ")}`)
    if (broken.length) lines.push(`Past its ceiling (it grew):  ${broken.map((result) => result.entry.id).join(", ")}`)
    if (unmeasured.length)
      lines.push(
        `Not measured (spell perf run measures them):  ${unmeasured.map((result) => result.entry.id).join(", ")}`
      )
    return { lines, isPassing: !broken.length && !unmeasured.length }
  }

  /**
   * WHY each of the budgets `ids` weighs what it does (`spell perf budget --why`;  epic `solid-2-final` P19):  the lines
   * that say it.
   * - per file it counts (the biggest first, at most `FILES_SHOWN`):  its size, who loads it, and what's in it by where
   *   it's from (`SRV.BundleContents`), raw
   * - then the modules built into more than one of them, and for a lazy piece, into it and the page's first load too:
   *   what a page downloads twice
   * - the editor is built WITH its source maps for this (`editor-mapped`:  the same files);  a `run` entry is a number a
   *   browser measured, so it's said and skipped
   * - throws a `TypeError` naming an id the file hasn't got
   */
  explain(ids: string[], builds: PerfBuilds, say: (line: string) => void): string[] {
    const built = this.built
    const lines: string[] = []
    for (const id of ids) {
      const entry = this.entries.find((each) => each.id === id)
      if (!entry) {
        const known = this.entries.map((each) => each.id).join(", ")
        throw new TypeError(`PerfBudget.explain():  no budget ${id};  the budgets are ${known}`)
      }
      lines.push("", `${entry.id}:  ${entry.name}`)
      if (entry.run) {
        lines.push(`  a number spell perf run measured in a browser (${entry.run}):  nothing to open here`)
        continue
      }
      const build = entry.build === "editor" ? "editor-mapped" : entry.build
      if (build && !built.has(build)) {
        say(`Building ${build} into a temporary folder ...`)
        built.set(build, builds.build(build))
      }
      const folder = build ? built.get(build)! : join(this.kitRoot, entry.folder!)
      const builtAt = build ? join(builds.appBuildFolder, BUILT_AT[build]) : folder
      lines.push(...PerfBudget.explainIn(entry, folder, { root: this.kitRoot, builtAt }))
    }
    return lines
  }

  /** `explain()`'s lines for `entry`, built in `folder`;  `root` and `builtAt` as `SRV.BundleContents` takes them. */
  static explainIn(entry: BudgetEntry, folder: string, { root, builtAt }: { root: string; builtAt: string }): string[] {
    const entries = (entry.entries ?? []).flatMap((file) =>
      file.endsWith(".html") ? PerfBudget.loadsOf(join(folder, file)) : [file]
    )
    const only = entry.only ? new RegExp(entry.only) : undefined
    const load = SRV.Bundle.firstLoad({ folder, entries, only })
    const isLazy = entry.measure === "lazy"
    const eager = load.files.filter((file) => file.file.endsWith(".js"))
    const counted = isLazy ? load.lazy.filter((file) => file.file.endsWith(".js")).slice(0, 1) : eager
    const contents = new SRV.BundleContents(folder, { root, builtAt })
    const lines: string[] = []
    for (const size of [...counted].sort((a, b) => b.brotli - a.brotli).slice(0, FILES_SHOWN)) {
      const file = contents.of(size.file)
      const named = file.importedBy.slice(0, LOADERS_SHOWN).map((each) => `${each.file} (${each.how})`)
      const more = file.importedBy.length - named.length
      const loaders = named.length ? `${named.join(", ")}${more > 0 ? ` and ${more} more` : ""}` : "the page itself"
      lines.push(`  ${size.file}  ${kbOf(size.brotli)} brotli, ${kbOf(size.raw)} raw;  loaded by ${loaders}`)
      if (!file.isMapped) {
        lines.push("    (no source map beside it:  what's in it can't be said)")
        continue
      }
      for (const group of SRV.BundleContents.grouped(file.modules).slice(0, GROUPS_SHOWN)) {
        lines.push(`    ${kbOf(group.bytes).padStart(9)}  ${group.module}`)
      }
    }
    if (counted.length > FILES_SHOWN) lines.push(`  ... and ${counted.length - FILES_SHOWN} smaller files`)
    const compared = [...new Set([...counted, ...(isLazy ? eager : [])].map((size) => size.file))]
    const twice = contents.duplicates(compared)
    if (!twice.length) lines.push("  built in twice:  nothing")
    else {
      const extra = twice.reduce((sum, each) => sum + each.bytes - Math.max(...each.files.map((one) => one.bytes)), 0)
      lines.push(`  built in twice:  ${twice.length} modules, ${kbOf(extra)} raw more than one copy each`)
      for (const each of twice.slice(0, GROUPS_SHOWN)) {
        lines.push(
          `    ${kbOf(each.bytes).padStart(9)}  ${each.module}  (${each.files.map((one) => one.file).join(", ")})`
        )
      }
    }
    return lines
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

/** How many of a budget's files `explain()` opens, biggest first. */
const FILES_SHOWN = 8

/** How many of the files that load a file `explain()` names. */
const LOADERS_SHOWN = 4

/** How many of a file's sources (or of the modules built in twice) `explain()` lists. */
const GROUPS_SHOWN = 8

/** `bytes` as KB, one decimal:  `12.3 KB`. */
function kbOf(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** A ceiling's room over today's size:  2%. */
const CEILING_SHARE = 0.02

/** A page's first loads:  `<script src>`, `<link rel="modulepreload" href>`, `<link rel="stylesheet" href>`. */
const LOADS = /<(?:script[^>]*\ssrc|link[^>]*rel="(?:modulepreload|stylesheet)"[^>]*\shref)="([^"]+)"/g

/** A `run` entry's number, as `PerfResults.latestMeasuring()` finds it. */
type MeasuredNumber = { value: number; when: string; isNewest: boolean }

/** The budgets' file:  its list. */
type BudgetFile = { budgets: BudgetEntry[] }

/** A budget that couldn't be sized, and why. */
function skipped(entry: BudgetEntry, why: string): BudgetResult {
  return { entry, skipped: why, isOverBudget: false, isOverCeiling: false }
}
