import chalk from "chalk"

import { CLI } from "spell/cli"
import {
  changeInWords,
  CoherenceScore,
  compareSnapshots,
  improvementCell,
  ScoreSnapshots,
  type CompareRow,
  type ScoreComparison,
  type ScoreSnapshot
} from "spell/cli/coherence"

/**
 * `spell coherence score`:  how coherent the code is, over every installed repo (epic `coherence` P15).
 * The work:  `spell/cli/coherence`.
 * - prints each catalog mechanism's copies, users and score, then the code's;  the words' counts;  each repo's tests
 * - `--json`:  the snapshot, or the comparison, as JSON
 * - `--save`:  writes a snapshot to the epic repo's `epics/coherence/details/scores/`
 * - `--compare <snapshot | last>`:  each row then and now, its improvement, and the files with new copies
 * - `--at <revision | time>`:  the code as it was then (users by search:  the map is today's)
 * - Which checkout:  the nearest kit from the current folder (`findCheckout(KIT_MARKER)`).
 * - Throws `CliError` for an unknown verb, an `--at` that's neither a commit nor a time, or a snapshot not there.
 */
export async function coherenceCommand(verb = "score", options: CLI.CoherenceOptions = {}): Promise<number> {
  if (verb !== "score") throw new CLI.CliError(`unknown verb '${verb}':  score`)
  const checkout = CLI.findCheckout(CLI.KIT_MARKER)
  const snapshots = ScoreSnapshots.of(checkout)
  // read the snapshot first:  a wrong name fails before the counting
  const before = options.compare ? snapshots.find(options.compare) : undefined
  const snapshot = new CoherenceScore(checkout, { at: options.at }).measure((problem) => CLI.err(problem))
  const saved = options.save ? snapshots.save(snapshot) : undefined
  const comparison = before && compareSnapshots(before.snapshot, snapshot)
  if (options.json) {
    CLI.out(JSON.stringify(comparison ? withoutSnapshots(comparison) : snapshot, null, 2))
    return CLI.EXIT.OK
  }
  printScore(snapshot, options, comparison, before && ScoreSnapshots.label(before.file))
  if (saved) CLI.out(`\nsaved:  ${CLI.relativePath(saved)}`)
  return CLI.EXIT.OK
}

/** The score, as a table:  each mechanism, the total, the words and the tests;  compared, when there's `comparison`. */
function printScore(
  snapshot: ScoreSnapshot,
  options: CLI.CoherenceOptions,
  comparison?: ScoreComparison,
  label?: string
): void {
  const users =
    snapshot.usersFrom === "map"
      ? "users from the code map"
      : `users from a search:  ${options.at ? "the code map is today's" : "no code map (spell map build)"}`
  CLI.out(chalk.bold(`Coherence score:  ${snapshot.score} / 100`) + `  (${users})`)
  CLI.out(chalk.dim(`the code at ${snapshot.at.time}${snapshot.at.dirty ? ", with uncommitted changes" : ""}`))
  CLI.out("")
  if (comparison) printComparison(comparison, label!)
  else
    printTable(
      ["Mechanism", "Copies", "Users", "Score"],
      [
        ...snapshot.mechanisms.map((each) => [each.name, number(each.copies), number(each.users), String(each.score)]),
        ["Total", number(snapshot.copies), number(snapshot.users), String(snapshot.score)]
      ]
    )
  if (snapshot.words.length) {
    CLI.out("\nWords to replace, still in the code (not scored):")
    printTable(
      ["Word", "Count", ...(comparison ? ["Improvement"] : [])],
      (comparison?.words ?? snapshot.words.map((each) => ({ name: each.name, after: each.count }))).map((each) => [
        each.name,
        number(each.after),
        ...(comparison ? [improvementCell(each)] : [])
      ])
    )
  }
  CLI.out("\nTests (counted, not scored):")
  const tests = comparison?.tests ?? Object.entries(snapshot.tests).map(([name, after]) => ({ name, after }))
  CLI.out(`  ${tests.map((each) => `${each.name} ${number(each.after)}${testChange(each)}`).join(" · ")}`)
}

/** The mechanisms then and now, the totals' change in words, and each new copy by file. */
function printComparison(comparison: ScoreComparison, label: string): void {
  CLI.out(`Compared with ${label}:`)
  printTable(
    ["Mechanism", "Copies then", "Now", "Improvement", "Score"],
    [
      ...comparison.mechanisms.map((each) => {
        const score = comparison.after.mechanisms.find((mechanism) => mechanism.name === each.name)?.score
        return [
          each.name,
          number(each.before),
          number(each.after),
          improvementCell(each),
          score === undefined ? "" : String(score)
        ]
      }),
      [
        "Total",
        number(comparison.copies.before),
        number(comparison.copies.after),
        improvementCell(comparison.copies),
        String(comparison.after.score)
      ]
    ]
  )
  CLI.out("")
  CLI.out(`Copies:  ${changeLine(comparison.copies)}, ${changeInWords(comparison.copies, "copies", "fewer")}`)
  CLI.out(`Score:  ${changeLine(comparison.score)}, ${changeInWords(comparison.score, "score", "more")}`)
  if (!comparison.sameUsers)
    CLI.out(
      chalk.yellow(
        `  users counted from a ${comparison.before.usersFrom} then, from the ${comparison.after.usersFrom} now:  the copies compare exactly, the score roughly`
      )
    )
  const added = comparison.mechanisms.filter((each) => Object.keys(each.newCopies ?? {}).length)
  if (!added.length) return
  CLI.out("\nNew copies:")
  for (const each of added) {
    CLI.out(`  ${each.name}`)
    for (const [file, count] of Object.entries(each.newCopies!)) CLI.out(`    ${file}${count > 1 ? ` (${count})` : ""}`)
  }
}

/** `then → now`, both numbers. */
function changeLine(change: CompareRow): string {
  return `${number(change.before)} → ${number(change.after)}`
}

/** A repo's tests' change:  ` (+12)`, ` (−3)`;  nothing when the same or not compared. */
function testChange(change: CompareRow): string {
  if (change.before === undefined || change.before === change.after) return ""
  const more = (change.after ?? 0) - change.before
  return ` (${more > 0 ? "+" : "−"}${Math.abs(more)})`
}

/** `rows` under `headers`, the first column left-aligned and the rest right-aligned. */
function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((header, at) => Math.max(header.length, ...rows.map((each) => (each[at] ?? "").length)))
  const line = (cells: string[]) =>
    cells.map((cell, at) => (at ? cell.padStart(widths[at]!) : cell.padEnd(widths[at]!))).join("  ")
  CLI.out(chalk.dim(line(headers)))
  for (const each of rows) CLI.out(line(each))
}

/** `count` with thousands separated, `1,149`;  `--` when there's none. */
function number(count: number | undefined): string {
  return count === undefined ? "--" : count.toLocaleString("en-US")
}

/** `comparison` for `--json`:  the rows, without both snapshots in full (`--save` has them). */
function withoutSnapshots(
  comparison: ScoreComparison
): Omit<ScoreComparison, "before" | "after"> & { score: CompareRow } {
  const { before: _before, after: _after, ...rows } = comparison
  return rows
}
