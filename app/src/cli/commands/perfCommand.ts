import { spawnSync } from "node:child_process"
import { join, resolve } from "node:path"

import { CLI } from "spell/cli"
import { commaList } from "spell/util/string"
import {
  PERF_PAGE_NAMES,
  PERF_PROFILE_NAMES,
  PERF_STEPS,
  type PerfPageName,
  type PerfProfileName,
  type PerfRunOptions,
  type PerfStep
} from "spell/app/cli/perf/perf.types"

/** The app folder, `app/`:  this file is its `src/cli/commands/`. */
const APP_FOLDER = resolve(import.meta.dirname, "..", "..", "..")

/** The kit's root, the app folder's parent. */
const KIT_ROOT = resolve(APP_FOLDER, "..")

/** The bundles' size budgets. */
const BUDGETS_FILE = join(APP_FOLDER, "perf-budgets.json5")

/** The quick default's steps:  load only. */
const QUICK_STEPS: PerfStep[] = ["load"]

/** The quick default's profiles:  each page on a desktop and an emulated phone. */
const QUICK_PROFILES: PerfProfileName[] = ["desktop", "phone"]

/** `epic turns`' environment variable:  the kinds of turn this process holds (epic's `Turns.ENV`). */
const TURNS_ENV = "SPELL_EPIC_TURNS"

/**
 * `spell perf run | report | budget`:  how fast and how big Spell's pages are, measured the same way every time
 * (epic `solid-2-final` P1).
 * - `run`:  the editor, a docs page, an epic page and run mode, on a desktop and an emulated phone (CPU slowed 4x,
 *   a 5G-like network), in headless Chromium (`PerfRun`);  then the report
 *   - quick by default, about 5 minutes:  each page once, load only;  `--full`:  every measurement, 5 loads each
 *   - in the machine's TEST TURN (`epic turns run test`), so it never measures during another session's full test run
 *   - `--baseline save`:  this run is the baseline too (`perfBaseline.json`)
 * - `report`:  the last run against the one before it and the baseline;  "WORSE" past 10%
 * - `budget`:  every bundle's size, brotli, against its budget and its ceiling (`PerfBudget`);  exits 1 when one
 *   grew past its ceiling;  `--tighten` lowers the ceilings to today's sizes plus 2%
 * - Loads no spell:  only the measuring's own files, by name.
 */
export async function perfCommand(verb: "run" | "report" | "budget", options: PerfOptions): Promise<number> {
  if (verb === "run") return perfRun(options)
  if (verb === "report") return perfReport()
  return perfBudget(options)
}

/** `spell perf run`, in the machine's test turn. */
async function perfRun(options: PerfOptions): Promise<number> {
  const runOptions = runOptionsOf(options)
  if (!heldTurn() && hasEpic()) {
    // again, inside the test turn:  epic waits for it, saying who holds it
    const result = spawnSync("epic", ["turns", "run", "test", "--", ...process.argv], { stdio: "inherit" })
    return result.status ?? CLI.EXIT.ERRORS
  }
  const { PerfRun } = await import("spell/app/cli/perf/PerfRun")
  const { PerfResults } = await import("spell/app/cli/perf/PerfResults")
  const run = new PerfRun(KIT_ROOT, runOptions, say)
  const { record, file } = await run.run()
  const results = new PerfResults(KIT_ROOT)
  say(`\nWrote ${file}`)
  if (runOptions.baseline === "save") say(`Saved as the baseline:  ${PerfResults.baseline.file}`)
  for (const line of PerfResults.report(record, results.latest(file), PerfResults.baseline.saved)) say(line)
  if (record.failures.length) say(`\nFailed:  ${record.failures.join(";  ")}`)
  return record.failures.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** `spell perf report`:  the last run against the one before it and the baseline. */
async function perfReport(): Promise<number> {
  const { PerfResults } = await import("spell/app/cli/perf/PerfResults")
  const results = new PerfResults(KIT_ROOT)
  const files = results.files
  const now = results.latest()
  if (!now) throw new CLI.CliError("no runs yet:  spell perf run measures one")
  for (const line of PerfResults.report(now, results.latest(files.at(-1)), PerfResults.baseline.saved)) say(line)
  return CLI.EXIT.OK
}

/** `spell perf budget [--tighten]`. */
async function perfBudget(options: PerfOptions): Promise<number> {
  const { PerfBudget } = await import("spell/app/cli/perf/PerfBudget")
  const { PerfBuilds } = await import("spell/app/cli/perf/PerfBuilds")
  const { PerfResults } = await import("spell/app/cli/perf/PerfResults")
  const budget = new PerfBudget(BUDGETS_FILE, KIT_ROOT)
  const builds = new PerfBuilds(join(APP_FOLDER, "app"))
  try {
    const results = budget.check(builds, new PerfResults(KIT_ROOT).latest(), say)
    const { lines, isPassing } = PerfBudget.report(results)
    for (const line of lines) say(line)
    if (options.tighten) {
      const lowered = budget.tighten(results)
      say(lowered.length ? `Ceilings lowered:  ${lowered.join(", ")}` : "No ceiling to lower")
    }
    return isPassing ? CLI.EXIT.OK : CLI.EXIT.ERRORS
  } finally {
    await builds.dispose()
  }
}

/**
 * What `spell perf run` was asked for, its flags read;  throws `CliError` for a page, profile or step it doesn't
 * know, or runs that aren't a whole number.
 */
export function runOptionsOf(options: PerfOptions): PerfRunOptions {
  const listOf = <T extends string>(value: string | undefined, all: readonly T[], what: string, fallback: T[]) => {
    if (value === undefined) return fallback
    const names = commaList(value)
    const unknown = names.filter((name) => !all.includes(name as T))
    if (unknown.length) throw new CLI.CliError(`--${what} takes ${all.join(", ")};  not ${unknown.join(", ")}`)
    return names as T[]
  }
  const runs = options.runs === undefined ? (options.full ? 5 : 1) : Number(options.runs)
  if (!Number.isInteger(runs) || runs < 1) throw new CLI.CliError("--runs must be a whole number, 1 or more")
  if (options.baseline !== undefined && options.baseline !== "save") {
    throw new CLI.CliError("--baseline takes one word, save")
  }
  const wait = Number(options.wait ?? 10)
  if (!(wait >= 0)) throw new CLI.CliError("--wait must be minutes, 0 or more")
  return {
    pages: listOf<PerfPageName>(options.page, PERF_PAGE_NAMES, "page", ["editor", "docs", "epic", "run"]),
    profiles: listOf<PerfProfileName>(options.profile, PERF_PROFILE_NAMES, "profile", QUICK_PROFILES),
    steps: listOf<PerfStep>(options.steps, PERF_STEPS, "steps", options.full ? [...PERF_STEPS] : QUICK_STEPS),
    runs,
    waitMinutes: wait,
    force: !!options.force,
    ...(options.out && { out: resolve(options.out) }),
    ...(options.baseline && { baseline: "save" as const })
  }
}

/** Does this process hold the machine's test turn already (`epic turns run test -- ...` started it)? */
function heldTurn(): boolean {
  return commaList(process.env[TURNS_ENV] ?? "").includes("test")
}

/** Is the `epic` command here to take the turn with?  Without it (an install with no plugin), the run just runs. */
function hasEpic(): boolean {
  return spawnSync("epic", ["--help"], { stdio: "ignore" }).status === 0
}

/** A line to the terminal. */
function say(line: string): void {
  process.stdout.write(`${line}\n`)
}

/**
 * `spell perf`'s flags.
 * - `page`, `profile`, `steps`:  comma lists of what to measure
 * - `full`:  every step, 5 loads each;  `runs`:  loads per page and profile
 * - `wait`:  minutes to wait for a quiet machine;  `force`:  don't wait
 * - `out`:  a file to write instead of the dated one;  `baseline`:  `save`
 * - `tighten`:  `budget`'s:  lower the ceilings
 */
export type PerfOptions = {
  page?: string
  profile?: string
  steps?: string
  full?: boolean
  runs?: string | number
  wait?: string | number
  force?: boolean
  out?: string
  baseline?: string
  tighten?: boolean
}
