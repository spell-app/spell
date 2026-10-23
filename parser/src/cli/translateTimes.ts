/**
 * `spell lang translate-time`'s work (epic `spanish` P29):  how long `spell lang translate` takes, and how well it does,
 * run after run, on scratch copies of projects -- never the projects themselves.
 * - Each run:
 *   1. copies the project to a fresh scratch folder, without its own dictionary and record
 *   2. translates the copy, as its mode says (`TimingMode`):
 *      - `cold`:  `--cold`, nothing pre-calculated
 *      - `glossary`:  the language's shared glossary, as a project translated for the first time has
 *      - `update`:  translated once (untimed), then one English line edited, then `--update` (timed)
 *   3. keeps what the translation did in numbers (`TranslationResult`):  each pass's time, its calls, the problems
 *      left, lint, tests, shape, and how many drafted names agree with a person's translation, when there's one
 *   4. deletes the scratch folder, even when the run throws
 * - Then a table for each project, mode and tier:  the min, median and max over its runs;  `--json` writes it all.
 * - spell-app's `translateTimeCommand` finds the projects and does each translation (`TranslateRun`), the app's way,
 *   as `spell lang translate` does:  this file only copies, times, tabulates and cleans up.
 * - Loaded only when it runs (`commands.ts` reaches it through the hook).
 */
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"

import { CLI } from "spell-kit/cli"
import type { TranslateOptions, TranslateTimeOptions } from "spell-lang/cli"
import { askingFor, type TranslationResult } from "spell-lang/cli/translateProject"

/**
 * What a timed run starts from:
 * - `cold`:  nothing pre-calculated (`--cold`)
 * - `glossary`:  the language's shared glossary, no dictionary of the project's yet
 * - `update`:  a translation already made, then one English line changed, and `--update`
 */
export type TimingMode = "cold" | "glossary" | "update"

/** Every mode, in the order the table shows them. */
export const TIMING_MODES: TimingMode[] = ["cold", "glossary", "update"]

/** One project to time:  its name, its folder, and a translation a person made of it, to compare names with. */
export type TimedProject = {
  /** Its name, e.g. `Solitaire`:  the scratch copy's folder name. */
  projectName: string
  /** Its folder on disk:  copied, never written. */
  folder: string
  /** A person's translation of it, as `TranslateRun` takes it (an address, e.g. `@spell/examples/Solitario`). */
  reference?: string
}

/**
 * Translate the project in `folder` (a scratch copy) with `options`, and say what it did:
 * spell-app's, which finds and parses it the app's way;  a test's fake.
 * - `reference`:  `TimedProject.reference`, to compare the drafted names with
 * - throws as `translationOf()` does
 */
export type TranslateRun = (folder: string, options: TranslateOptions, reference?: string) => Promise<TranslationResult>

/** One timed run:  which, and what it did -- or why it failed. */
export type TimedRun = {
  /** The project's name. */
  projectName: string
  mode: TimingMode
  /** The effort tier every pass asked at, e.g. `balanced`. */
  tier: string
  /** Which run of its project, mode and tier, from 1. */
  run: number
  /** What the translation did:  missing when it threw. */
  result?: TranslationResult
  /** Why it failed, when it threw. */
  error?: string
}

/** One line of the table:  a measure's least, median and most over a group's runs. */
export type TimingStats = { min: number; median: number; max: number }

/** One table:  a project, mode and tier, over its runs. */
export type TimingSummary = {
  projectName: string
  mode: TimingMode
  tier: string
  /** How many runs, and how many of them failed. */
  runs: number
  failed: number
  /** Each measure's stats, by its key (`TIMING_MEASURES`), over the runs that have it. */
  measures: Record<string, TimingStats>
  /** What a measure counts out of, the most of its runs', by its key:  `tests` out of 42. */
  outOf: Record<string, number>
}

/** Everything `timeTranslations()` found:  what `--json` writes. */
export type TimingReport = {
  /** When it ran, ISO. */
  when: string
  /** The language, e.g. `es`. */
  to: string
  runs: TimedRun[]
  table: TimingSummary[]
  /** `EXIT.ERRORS` if any run threw;  a translation's own problems are measured, not failures. */
  exitCode: number
}

/**
 * Time translating each of `projects`, as `options` says (`TranslateTimeOptions`), each translation by `translate`;
 * print a line per run and a table per project, mode and tier;  write `--json`.
 * - `scratch`:  where each run's scratch folder goes -- the system's temp folder by default;  a test's own
 * - throws `CliError` for a mode or tier there isn't, or `--runs` that isn't a whole number from 1
 */
export async function timeTranslations(
  projects: TimedProject[],
  options: TranslateTimeOptions,
  translate: TranslateRun,
  { scratch = tmpdir() }: { scratch?: string } = {}
): Promise<TimingReport> {
  const modes = listOf(options.mode, "cold,glossary").map(modeFor)
  const tiers = listOf(options.effort, "balanced")
  // checked before anything runs:  `askingFor()` throws for a tier there isn't
  for (const tier of tiers) askingFor({ to: options.to, effort: tier }, "names")
  const runs = options.runs ?? 1
  if (!Number.isInteger(runs) || runs < 1) throw new CLI.CliError(`--runs ${runs}:  a whole number, 1 or more`)

  const timed: TimedRun[] = []
  for (const project of projects) {
    for (const mode of modes) {
      for (const tier of tiers) {
        for (let run = 1; run <= runs; run++) {
          const each = await timeOne(project, mode, { to: options.to, effort: tier }, translate, scratch)
          timed.push({ projectName: project.projectName, mode, tier, run, ...each })
          CLI.out(runLine(timed.at(-1)!, runs))
        }
      }
    }
  }

  const table = summariesOf(timed)
  CLI.out("")
  for (const summary of table) for (const line of tableLines(summary)) CLI.out(line)
  const report: TimingReport = {
    when: new Date().toISOString(),
    to: options.to,
    runs: timed,
    table,
    exitCode: timed.some((each) => each.error) ? CLI.EXIT.ERRORS : CLI.EXIT.OK
  }
  if (options.json) {
    writeFileSync(options.json, `${JSON.stringify(report, null, 2)}\n`)
    CLI.out(`Written:  ${CLI.relativePath(options.json)}`)
  }
  return report
}

////////////////
// ## One run
////////////////

/**
 * One run of `project` in `mode`:  copied to a scratch folder of its own, translated, the folder deleted.
 * - `update`:  translated once first, untimed, then one English line edited (`editOneLine()`), then `--update`.
 * - NEVER throws:  a run that throws is `{ error }`;  the scratch folder goes either way.
 */
async function timeOne(
  project: TimedProject,
  mode: TimingMode,
  asked: Pick<TranslateOptions, "to" | "effort">,
  translate: TranslateRun,
  scratch: string
): Promise<Pick<TimedRun, "result" | "error">> {
  const folder = mkdtempSync(join(scratch, "spell-translate-time-"))
  try {
    const copy = join(folder, project.projectName)
    // its own dictionary and record stay behind:  a first translation's start, but for the glossary
    cpSync(project.folder, copy, { recursive: true, filter: (path) => !OWN_LISTS.test(basename(path)) })
    const options: TranslateOptions = { ...asked, out: join(folder, `${project.projectName}-${asked.to}`) }
    if (mode === "cold") return { result: await translate(copy, { ...options, cold: true }, project.reference) }
    if (mode === "glossary") return { result: await translate(copy, options, project.reference) }
    await translate(copy, options)
    editOneLine(copy)
    return { result: await translate(copy, { ...options, update: true }, project.reference) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

/** A project's own pre-calculated lists, left out of its scratch copy:  its dictionaries and records. */
const OWN_LISTS = /\.names\.json5$|\.translated\.json5$/

/**
 * Change one English line of the project in `folder`, as a person would before `--update`:
 * its first spell file's first comment, a few words added;  a comment added at its end if it has none.
 * - SIDE EFFECT:  writes that file.
 */
export function editOneLine(folder: string): void {
  const file = readdirSync(folder)
    .filter((name) => name.endsWith(".spell"))
    .sort()[0]
  if (!file) throw new CLI.CliError(`${folder} has no spell file to edit`)
  const path = join(folder, file)
  const text = readFileSync(path, "utf8")
  const edited = COMMENT.test(text) ? text.replace(COMMENT, `$& -- ${EDIT}`) : `${text.trimEnd()}\n// ${EDIT}\n`
  writeFileSync(path, edited)
}

/** A comment's line, to the end of its words. */
const COMMENT = /^[ \t]*\/\/ .*\S/m

/** What `editOneLine()` adds. */
const EDIT = "and checked again"

////////////////
// ## The table
////////////////

/**
 * The measures the table shows, a row each, in order:
 * - `of`:  its value in a result -- `undefined` when the result hasn't it
 * - `outOf`:  what it counts out of, for a measure shown as `40/42`
 * - `show`:  a value, as the table shows it
 */
const TIMING_MEASURES: Array<{
  key: string
  label: string
  of: (result: TranslationResult) => number | undefined
  outOf?: (result: TranslationResult) => number | undefined
  show: (value: number, outOf: number) => string
}> = [
  { key: "total", label: "total", of: (result) => result.timings.total, show: seconds },
  { key: "names", label: "names pass", of: (result) => result.timings.names, show: seconds },
  { key: "lines", label: "lines pass", of: (result) => result.timings.lines, show: seconds },
  { key: "fixUps", label: "fix-ups pass", of: (result) => result.timings.fixUps, show: seconds },
  { key: "calls", label: "calls", of: (result) => result.calls.names + result.calls.fixUps, show: count },
  { key: "namesCalls", label: "  names", of: (result) => result.calls.names, show: count },
  { key: "fixUpCalls", label: "  fix-ups", of: (result) => result.calls.fixUps, show: count },
  { key: "written", label: "lines written", of: (result) => result.lines.written, show: count },
  {
    key: "problems",
    label: "problems left",
    of: (result) => result.problems.lint + result.problems.test + result.problems.shape + result.todo,
    show: count
  },
  { key: "lint", label: "  lint", of: (result) => result.problems.lint, show: count },
  { key: "todo", label: "  TODO", of: (result) => result.todo, show: count },
  {
    key: "tests",
    label: "tests passed",
    // a project with no tests:  no row
    of: (result) => (result.tests && result.tests.passed + result.tests.failed ? result.tests.passed : undefined),
    outOf: (result) => result.tests && result.tests.passed + result.tests.failed,
    show: (value, outOf) => `${count(value)}/${outOf}`
  },
  {
    key: "shape",
    label: "same shape",
    of: (result) => result.shape?.same,
    outOf: (result) => result.shape?.statements,
    show: (value, outOf) => `${count(value)}/${outOf}`
  },
  {
    key: "agreement",
    label: "names agree",
    of: (result) => result.agreement && (result.agreement.same / (result.agreement.compared || 1)) * 100,
    outOf: (result) => result.agreement?.compared,
    show: (value, outOf) => `${Math.round(value)}% of ${outOf}`
  }
]

/** Every project, mode and tier's runs, summed up:  in the order they ran. */
function summariesOf(runs: TimedRun[]): TimingSummary[] {
  const groups = new Map<string, TimedRun[]>()
  for (const run of runs) {
    const key = `${run.projectName}\n${run.mode}\n${run.tier}`
    groups.set(key, [...(groups.get(key) ?? []), run])
  }
  return [...groups.values()].map((group) => {
    const results = group.flatMap((run) => (run.result ? [run.result] : []))
    const measures: Record<string, TimingStats> = {}
    const outOf: Record<string, number> = {}
    for (const measure of TIMING_MEASURES) {
      const values = results.map(measure.of).filter((value) => value !== undefined)
      if (values.length) measures[measure.key] = statsOf(values)
      const totals = measure.outOf ? results.map(measure.outOf).filter((value) => value !== undefined) : []
      if (totals.length) outOf[measure.key] = Math.max(...totals)
    }
    const { projectName, mode, tier } = group[0]!
    return { projectName, mode, tier, runs: group.length, failed: group.length - results.length, measures, outOf }
  })
}

/** `summary` as lines to print:  a heading, then a row per measure it has, min, median and max. */
function tableLines(summary: TimingSummary): string[] {
  const failed = summary.failed ? `, ${summary.failed} failed` : ""
  const lines = [
    `${summary.projectName} · ${summary.mode} · ${summary.tier} · ${summary.runs} run${summary.runs === 1 ? "" : "s"}${failed}`
  ]
  const rows: string[][] = [["", "min", "median", "max"]]
  for (const measure of TIMING_MEASURES) {
    const stats = summary.measures[measure.key]
    if (!stats) continue
    const outOf = summary.outOf[measure.key] ?? 0
    rows.push([measure.label, ...[stats.min, stats.median, stats.max].map((value) => measure.show(value, outOf))])
  }
  if (rows.length === 1) return [...lines, "  no run finished", ""]
  const widths = rows[0]!.map((_, at) => Math.max(...rows.map((row) => row[at]!.length)))
  for (const row of rows) {
    lines.push(
      `  ${row.map((cell, at) => (at === 0 ? cell.padEnd(widths[at]!) : cell.padStart(widths[at]!))).join("   ")}`
    )
  }
  return [...lines, ""]
}

/** The line printed as each run finishes. */
function runLine(run: TimedRun, runs: number): string {
  const which = `${run.projectName} · ${run.mode} · ${run.tier} · run ${run.run} of ${runs}`
  if (!run.result) return `${which}:  failed:  ${run.error}`
  const { result } = run
  const problems = result.problems.lint + result.problems.test + result.problems.shape + result.todo
  return (
    `${which}:  ${seconds(result.timings.total)}, ${result.calls.names + result.calls.fixUps} calls (${result.via}), ` +
    `${problems} problems left`
  )
}

////////////////
// ## Helpers
////////////////

/** `value`, a comma-separated list, else `fallback`'s. */
function listOf(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback)
    .split(",")
    .map((each) => each.trim())
    .filter(Boolean)
}

/**
 * `name` as a mode.
 * - throws `CliError` for a mode there isn't
 */
function modeFor(name: string): TimingMode {
  if (TIMING_MODES.includes(name as TimingMode)) return name as TimingMode
  throw new CLI.CliError(`No mode '${name}':  try ${TIMING_MODES.join(", ")}`)
}

/** `values`' least, median (the middle two's mean, for an even count) and most. */
function statsOf(values: number[]): TimingStats {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length / 2
  const median = sorted.length % 2 ? sorted[Math.floor(middle)]! : (sorted[middle - 1]! + sorted[middle]!) / 2
  return { min: sorted[0]!, median, max: sorted.at(-1)! }
}

/** Milliseconds as seconds:  `33.0 s`. */
function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`
}

/** A count, whole, or to one place for a median between two. */
function count(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
