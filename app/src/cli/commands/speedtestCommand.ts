import { spawn } from "child_process"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { fileURLToPath, pathToFileURL } from "url"

import { CLI } from "spell/app/cli"
import { addCheckout, git, linkInstall, removeCheckout } from "spell/app/cli/tempCheckout"
import environment from "spell/app/spaces/server/node/environment"

/** cli's own folder, `src/cli/`. */
const CLI_SRC_DIR = resolve(fileURLToPath(import.meta.url), "..", "..")
/** The child process that times one run -- see its header. */
const RUNNER = resolve(CLI_SRC_DIR, "runner", "speedTest.mts")
/** The parser folder in a checkout of the kit, from its root (epic `repo-split` P20). */
const PARSER_FOLDER = "parser"
/** Where spell's source is in the parser folder (a ref from before P14 has none:  `checkSpellSource()`). */
const SPELL_SRC = "src/spell"
/** The tsconfig `tsx` compiles spell's source with (its decorators, its JSX), from the parser folder. */
const SPELL_TSCONFIG = "tsconfig.json"

/** A run whose average is this much over the others' median is a fluke, e.g. the machine was busy. */
const FLUKE_RATIO = 1.25
/**
 * The saved baseline `--budget` times against:  a commit and its numbers, written by `--baseline save`
 * (epic `language` P21, Q24).
 */
const BASELINE_FILE = resolve(CLI_SRC_DIR, "runner", "speedBaseline.json")
/** How many of the rules that grew most `--by-module` lists, and `--budget` names. */
const TOP_RULES = 10

/**
 * `spell speedtest [module]`:  time the parser's rule tests, `SP.spellParser.speedTest()` -- warm-up, then 20 runs --
 * in `--runs` fresh processes (default 3), and print the combined times as a table.
 * - `module`:  only that module's rules, e.g. `if`.
 * - `--against <ref>`, e.g. `HEAD`:  time that commit too, as "Previous", in a temp git worktree
 *   -- see `checkoutOf()`.
 *   The two sides take turns, run by run, so a busy moment hits both alike.
 * - Combining a side's runs -- see `combined()`:  the mean of their averages, the lowest min, the highest max;
 *   with 3 or more runs, one fluke (an average 25% over the median) is dropped.
 * - `--json`:  each side's combined results instead.
 * - `--by-module`:  each test timed on its own too, then a table by module and the rules that grew most --
 *   over the tests BOTH sides have, so a module that only gained tests isn't called slower (`byModule()`).
 * - `--baseline save`:  time this checkout, and save its commit and numbers as the baseline (`BASELINE_FILE`).
 * - `--budget <percent>`, e.g. `5`:  time against the baseline's commit (unless `--against`), by module, and fail
 *   (`EXIT.ERRORS`) when the tests both sides have take more than that much longer, naming the modules that grew most.
 *   Compiler speed is epic `language`'s to watch:  its phases run it (Q24).
 * - Returns the exit code:  `EXIT.ERRORS` if a run crashed, or the budget is blown.
 */
export async function speedtestCommand(
  session: CLI.CliSession,
  args: string[],
  options: CLI.SpeedtestOptions
): Promise<number> {
  const [module = ""] = args
  const runs = options.runs ?? 3
  if (!Number.isInteger(runs) || runs < 1) throw new CLI.CliError(`--runs must be a whole number, 1 or more`)

  const budget = options.budget === undefined ? undefined : Number(String(options.budget).replace(/%$/, ""))
  if (budget !== undefined && !(budget >= 0)) throw new CLI.CliError(`--budget must be a percent, e.g. 5`)
  if (options.baseline !== undefined && options.baseline !== "save") {
    throw new CLI.CliError(`--baseline takes one word, save`)
  }
  const against = options.against ?? (budget === undefined ? undefined : savedBaseline().commit)
  const byTest = !!(options.byModule || budget !== undefined || options.baseline)

  const status = new CLI.StatusReporter(session.isInteractive)
  const current: Side = {
    label: "Current",
    checkout: environment.packageFolder("spell-parser")
  }
  const sides = [current]
  let checkout: string | undefined
  try {
    if (against) {
      const row = status.start(`Checking out ${against}`)
      checkout = checkoutOf(against)
      status.done(row, "ok", session.relative(checkout))
      sides.unshift({ label: "Previous", checkout: resolve(checkout, PARSER_FOLDER) })
    }
    for (let run = 1; run <= runs; run++) {
      for (const side of sides) {
        const row = status.start(`${side.label}  run ${run} of ${runs}`)
        const result = await timeOnce(side, module, byTest)
        ;(side.results ??= []).push(result)
        status.done(row, "ok", `average ${Math.round(result.average)}`)
      }
    }
  } catch (error) {
    status.done(status.rows.at(-1)!, "failed", error instanceof Error ? error.message : String(error))
    return CLI.EXIT.ERRORS
  } finally {
    status.finish()
    if (checkout) removeCheckout(kitRepo(), checkout)
  }

  const totals = sides.map((side) => ({ label: side.label, ...combined(side.results!) }))
  const modules = byTest ? byModule(sides) : undefined
  if (options.baseline) saveBaseline(totals.at(-1)!)
  if (options.json) {
    session.out(JSON.stringify(Object.fromEntries(totals.map(({ label, ...rest }) => [label, rest])), null, 2))
  } else {
    session.out(speedTable(totals))
    session.out(totals.map((it) => `${it.label}:  ${it.pass} passed, ${it.fail} failed`).join(";  "))
    if (modules) session.out(`\n${moduleTable(modules)}`)
    if (options.baseline) session.out(`\nBaseline saved:  ${currentCommit()}, in ${session.relative(BASELINE_FILE)}`)
  }
  if (budget !== undefined && modules?.previous) {
    const change = percentChange(modules.total.now, modules.total.was)
    const verdict = change > budget ? "OVER" : "within"
    session.out(`\nBudget ${budget}%:  the tests both sides have take ${signed(change)}, ${verdict} budget`)
    if (change > budget) {
      session.out(
        `Grew most:  ${modules.rows
          .slice(0, 3)
          .map((it) => `${it.module} ${signed(it.change)}`)
          .join(", ")}`
      )
      return CLI.EXIT.ERRORS
    }
  }
  return CLI.EXIT.OK
}

////////////////
// ## Timing
////////////////

/**
 * One side of the comparison.
 * - `checkout`:  the parser folder `speedTest.mts` times:  ours (`spell/parser/spell`'s), or the temp checkout's
 * - `results`:  each run's, so far
 */
type Side = {
  label: "Current" | "Previous"
  checkout: string
  results?: RunResult[]
}

/** What one run of `speedTest.mts` prints:  `P.SpeedTestResults`, with `failed` as a count. */
type RunResult = {
  pass: number
  fail: number
  failed: number
  initialTime: number
  average: number
  min: number
  max: number
  /** with `--by-test`:  each test's own time */
  tests?: TestTime[]
}

/** One test's own time, as `speedTest.mts --by-test` prints it:  its average in milliseconds. */
type TestTime = { module: string; rule: string; input: string; ms: number }

/** A side's runs, combined -- see `combined()`.  `average` is NOT rounded. */
type SideTotal = Omit<RunResult, "failed" | "initialTime"> & { label: string; runs: number; dropped: number }

/**
 * Run `side`'s `speedTest.mts` once, for `module`, in a fresh node process.  Rejects if it fails.
 * - `byTest`:  each test's own time too (`--by-test`).
 */
function timeOnce(side: Side, module: string, byTest: boolean): Promise<RunResult> {
  const { checkout } = side
  const spell = `${pathToFileURL(resolve(checkout, SPELL_SRC)).href}/`
  const args = [
    "--import",
    import.meta.resolve("tsx/esm"),
    RUNNER,
    spell,
    ...(module ? [module] : []),
    ...(byTest ? ["--by-test"] : [])
  ]
  // spell's own settings for `tsx` (its decorators, its JSX), from that side's checkout
  const env = { ...process.env, TSX_TSCONFIG_PATH: resolve(checkout, SPELL_TSCONFIG) }
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"], env })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (data) => (stdout += data))
    child.stderr.on("data", (data) => (stderr += data))
    child.on("error", fail)
    child.on("exit", (code) => {
      const last = stdout.trim().split("\n").at(-1) ?? ""
      if (code === 0 && last.startsWith("{")) return done(JSON.parse(last) as RunResult)
      const why = stderr.trim().split("\n").slice(-3).join("\n") || `exit code ${code}`
      fail(new Error(`${side.label} side failed:  ${why}`))
    })
  })
}

/**
 * `runs` combined:  the mean of their averages, the lowest min, the highest max.
 * - With 3 or more runs, ONE fluke is dropped first:
 *   the slowest, if its average is over `FLUKE_RATIO` times the median.
 */
export function combined(runs: RunResult[]): Omit<SideTotal, "label"> {
  let kept = runs
  if (runs.length >= 3) {
    const sorted = [...runs].sort((a, b) => a.average - b.average)
    const median = sorted[Math.floor(sorted.length / 2)]!.average
    const slowest = sorted.at(-1)!
    if (slowest.average > median * FLUKE_RATIO) kept = runs.filter((it) => it !== slowest)
  }
  const { pass, fail } = kept.at(-1)!
  return {
    pass,
    fail,
    average: kept.reduce((total, it) => total + it.average, 0) / kept.length,
    min: Math.min(...kept.map((it) => it.min)),
    max: Math.max(...kept.map((it) => it.max)),
    runs: runs.length,
    dropped: runs.length - kept.length
  }
}

/**
 * Markdown table of `totals` -- with a "Change" row when there are two, `(current - previous) / previous` as a
 * whole %, the averages' from their unrounded values.
 * - Owen's format:  bold row headers, no units, value columns right-aligned and all as wide as "Average".
 */
export function speedTable(totals: Pick<SideTotal, "label" | "average" | "min" | "max">[]): string {
  const headers = ["Average", "&nbsp;&nbsp;&nbsp;Min", "&nbsp;&nbsp;&nbsp;Max"]
  const rows = totals.map((it) => [`**${it.label}**`, ...[it.average, it.min, it.max].map((n) => `${Math.round(n)}`)])
  const [previous, current] = totals
  if (previous && current) {
    const change = (now: number, was: number) => {
      const percent = Math.round(((now - was) / was) * 100)
      return `${percent > 0 ? "+" : ""}${percent}%`
    }
    rows.push([
      "**Change**",
      change(current.average, previous.average),
      change(current.min, previous.min),
      change(current.max, previous.max)
    ])
  }
  const labelWidth = Math.max(...rows.map((row) => row[0]!.length))
  const line = (cells: string[]) =>
    `| ${cells[0]!.padEnd(labelWidth)} | ${cells
      .slice(1)
      .map((cell, index) => cell.padStart(headers[index]!.length))
      .join(" | ")} |`
  return [
    line(["", ...headers]),
    `|${"-".repeat(labelWidth + 2)}|${headers.map((it) => `${"-".repeat(it.length + 1)}:`).join("|")}|`,
    ...rows.map(line)
  ].join("\n")
}

////////////////
// ## By module, and the budget
////////////////

/** A module's time on each side, over the tests both sides have. */
type ModuleRow = { module: string; tests: number; was: number; now: number; change: number; added: number }

/**
 * What `--by-module` found:  a row per module, the rules that grew most, and the total over the tests both sides have.
 * - `previous`:  there was a second side to compare with.
 */
type ModuleTimes = {
  previous: boolean
  rows: ModuleRow[]
  rules: Array<{ rule: string; module: string; was: number; now: number }>
  total: { was: number; now: number; tests: number }
}

/**
 * Each side's tests, at their best run, then compared module by module (and rule by rule).
 * - Only the tests BOTH sides have count toward `was` and `now`:  a module that gained tests isn't slower for it.
 *   A test is the same test when its module, rule and input are.
 * - `added`:  the time of tests only the current side has, shown apart.
 * - Sorted by what grew most, in milliseconds.
 */
export function byModule(sides: Pick<Side, "results">[]): ModuleTimes {
  const averaged = sides.map((side) => bestTimes(side.results!))
  const now = averaged.at(-1)!
  const was = averaged.length > 1 ? averaged[0]! : now
  const modules = new Map<string, ModuleRow>()
  const rules = new Map<string, { rule: string; module: string; was: number; now: number }>()
  const total = { was: 0, now: 0, tests: 0 }
  for (const [key, test] of now) {
    const row = modules.get(test.module) ?? { module: test.module, tests: 0, was: 0, now: 0, change: 0, added: 0 }
    modules.set(test.module, row)
    const before = was.get(key)
    if (!before) {
      row.added += test.ms
      continue
    }
    row.tests++
    row.was += before.ms
    row.now += test.ms
    total.tests++
    total.was += before.ms
    total.now += test.ms
    const ruleKey = `${test.module}/${test.rule}`
    const rule = rules.get(ruleKey) ?? { rule: test.rule, module: test.module, was: 0, now: 0 }
    rules.set(ruleKey, rule)
    rule.was += before.ms
    rule.now += test.ms
  }
  const rows = [...modules.values()]
  for (const row of rows) row.change = percentChange(row.now, row.was)
  return {
    previous: averaged.length > 1,
    rows: rows.sort((a, b) => b.now - b.was - (a.now - a.was)),
    rules: [...rules.values()].sort((a, b) => b.now - b.was - (a.now - a.was)).slice(0, TOP_RULES),
    total
  }
}

/**
 * Each test's time over `runs`:  its BEST run's, by `module/rule/input`.
 * - The best, not the mean:  a run a busy machine slowed (other sessions' tests) only ever adds time.
 */
function bestTimes(runs: RunResult[]): Map<string, TestTime> {
  const best = new Map<string, TestTime>()
  for (const run of runs) {
    for (const test of run.tests ?? []) {
      const key = `${test.module}/${test.rule}/${test.input}`
      const sofar = best.get(key)
      if (!sofar || test.ms < sofar.ms) best.set(key, test)
    }
  }
  return best
}

/**
 * Markdown tables of `times`:  each module's milliseconds per pass over its rule tests, before and now, and the change;
 * then the rules that grew most.  One side:  its modules, slowest first.
 */
export function moduleTable(times: ModuleTimes): string {
  const round = (ms: number) => ms.toFixed(1)
  if (!times.previous) {
    const rows = [...times.rows].sort((a, b) => b.now - a.now)
    return [
      "| Module | Tests | ms |",
      "|---|--:|--:|",
      ...rows.map((it) => `| ${it.module} | ${it.tests} | ${round(it.now)} |`)
    ].join("\n")
  }
  const { total } = times
  return [
    "| Module | Tests both have | Before | Now | Change | New tests' ms |",
    "|---|--:|--:|--:|--:|--:|",
    ...times.rows.map(
      (it) =>
        `| ${it.module} | ${it.tests} | ${round(it.was)} | ${round(it.now)} | ${signed(it.change)} | ${round(it.added)} |`
    ),
    `| **All** | ${total.tests} | ${round(total.was)} | ${round(total.now)} | ` +
      `${signed(percentChange(total.now, total.was))} | |`,
    "",
    "| Rule that grew most | Module | Before | Now |",
    "|---|---|--:|--:|",
    ...times.rules.map((it) => `| ${it.rule} | ${it.module} | ${round(it.was)} | ${round(it.now)} |`)
  ].join("\n")
}

/** `(now - was) / was`, as a whole percent;  0 when `was` is. */
function percentChange(now: number, was: number): number {
  return was ? Math.round(((now - was) / was) * 100) : 0
}

/** A percent with its sign:  `+5%`, `-3%`, `0%`. */
function signed(percent: number): string {
  return `${percent > 0 ? "+" : ""}${percent}%`
}

/** The saved baseline:  its commit and numbers.  throws if there's none yet. */
function savedBaseline(): { commit: string } {
  if (!existsSync(BASELINE_FILE)) {
    throw new CLI.CliError(`no saved baseline:  run spell speedtest --baseline save first`)
  }
  return JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as { commit: string }
}

/**
 * SIDE EFFECT:  save this checkout's commit and `total` as the baseline `--budget` times against.
 * - Its numbers are only a record:  the budget times the commit again, beside this one, on the same machine.
 */
function saveBaseline(total: Omit<SideTotal, "label">): void {
  const { average, min, max, pass, fail } = total
  const saved = { commit: currentCommit(), saved: new Date().toISOString(), average, min, max, pass, fail }
  writeFileSync(BASELINE_FILE, `${JSON.stringify(saved, null, 2)}\n`)
}

/** This checkout's commit. */
function currentCommit(): string {
  return git(["rev-parse", "HEAD"], environment.srcDir)
}

////////////////
// ## The other checkout
////////////////

/**
 * A temp git worktree of the kit at `ref`, ready to time:  it runs its own source (`linkInstall()`).
 * - A `ref` with different dependencies may not run.
 * - `removeCheckout()` when done.
 */
function checkoutOf(ref: string): string {
  const kit = kitRepo()
  return addCheckout(kit, ref, "spell-speed-", (folder) => {
    linkInstall(kit, folder)
    checkSpellSource(folder, ref)
  })
}

/**
 * Make sure checkout `folder` (at `ref`) has spell's source where we run it.
 * - throws if not:  `ref` is from before epic `repo-split` P20, when spell-parser was its own repo
 */
function checkSpellSource(folder: string, ref: string): void {
  if (existsSync(resolve(folder, PARSER_FOLDER, SPELL_SRC))) return
  throw new CLI.CliError(
    `${ref} has no ${PARSER_FOLDER}/${SPELL_SRC}:  --against needs a ref from after epic repo-split P20 (one repo)`
  )
}

/** The kit's checkout:  the git repo our spell's source is in. */
function kitRepo(): string {
  return git(["rev-parse", "--show-toplevel"], environment.srcDir)
}
