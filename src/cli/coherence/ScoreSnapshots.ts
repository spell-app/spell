import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"

import { readJSON5File, json5Edited } from "spell/util/node/json5"
import { compactTime } from "spell/util/time"
import { contentFolderOf } from "spell/server/contentFolder"
import { CLI } from "spell/cli"

import {
  LAST_SNAPSHOT,
  SCORES_FOLDER,
  type CompareRow,
  type ScoreComparison,
  type ScoreSnapshot
} from "./coherence.types"

/****************
 * ### `ScoreSnapshots`
 * The score's snapshots:  one JSON5 file per saved run, in the coherence epic's folder of the epic repo
 * (`epics/coherence/details/scores/`;  epic `coherence` Q11), so the score is a trend.
 * - Named by the time of the code they counted (`compactTime()`), then the kit's commit:
 *   `20261025-1400-2e925ee.json5`;  so they sort by when the code was, not when it was counted.
 * - NEVER committed by a tool:  the epic repo's turn hook commits them.
 ****************/
export class ScoreSnapshots {
  /** - `folder`:  where they are;  `ScoreSnapshots.of(checkout)` finds the epic folder's */
  constructor(readonly folder: string) {}

  /**
   * The snapshots of the checkout at `checkout`, in its epic folder.
   * - throws `CliError` when the checkout names no epic folder
   */
  static of(checkout: string): ScoreSnapshots {
    const content = contentFolderOf(checkout)
    if (!content) throw new CLI.CliError("no epic folder:  .epic/config.json5 names none (contentFolder)")
    return new ScoreSnapshots(join(content, SCORES_FOLDER))
  }

  /** Every snapshot's file name, oldest first. */
  get names(): string[] {
    if (!existsSync(this.folder)) return []
    return readdirSync(this.folder)
      .filter((name) => name.endsWith(".json5"))
      .sort()
  }

  /** Save `snapshot`;  its file's path.  SIDE EFFECT:  makes the folder. */
  save(snapshot: ScoreSnapshot): string {
    mkdirSync(this.folder, { recursive: true })
    const file = join(this.folder, ScoreSnapshots.nameOf(snapshot))
    writeFileSync(file, json5Edited("", snapshot))
    return file
  }

  /**
   * The snapshot `name` names:  a file name (with or without `.json5`), a path, or `last`, the newest.
   * - throws `CliError` when there's none
   */
  find(name: string): { file: string; snapshot: ScoreSnapshot } {
    const file =
      name === LAST_SNAPSHOT
        ? this.names.at(-1) && join(this.folder, this.names.at(-1)!)
        : [name, join(this.folder, name), join(this.folder, `${name}.json5`)].find((each) => existsSync(each))
    if (!file) {
      const saved = this.names.length ? `:  ${this.names.join(", ")}` : ", and none is saved yet (--save)"
      throw new CLI.CliError(`no snapshot '${name}' in ${this.folder}${saved}`)
    }
    return { file, snapshot: readJSON5File<ScoreSnapshot>(file) }
  }

  /** The file name `snapshot` is saved as:  its code's time, then the kit's commit, and `-dirty` for a changed tree. */
  static nameOf(snapshot: ScoreSnapshot): string {
    const kit = Object.values(snapshot.at.commits)[0]?.slice(0, 7) ?? "none"
    return `${compactTime(new Date(snapshot.at.time))}-${kit}${snapshot.at.dirty ? "-dirty" : ""}.json5`
  }

  /** `file`'s name without its folder and `.json5`. */
  static label(file: string): string {
    return basename(file, ".json5")
  }
}

////////////////
// ## Comparing two
////////////////

/**
 * `after` against `before`:  every total and row, then and now, and how much better.
 * - copies, words:  fewer is better;  the score, users, tests:  more is
 */
export function compareSnapshots(before: ScoreSnapshot, after: ScoreSnapshot): ScoreComparison {
  return {
    before,
    after,
    copies: row("copies", before.copies, after.copies, "fewer"),
    score: row("score", before.score, after.score, "more"),
    users: row("users", before.users, after.users, "more"),
    mechanisms: rowsOf(before.mechanisms, after.mechanisms, (each) => each.copies).map((each) => ({
      ...each,
      newCopies: newCopiesOf(
        before.mechanisms.find((mechanism) => mechanism.name === each.name)?.files ?? {},
        after.mechanisms.find((mechanism) => mechanism.name === each.name)?.files ?? {}
      )
    })),
    words: rowsOf(before.words, after.words, (each) => each.count),
    tests: Object.keys({ ...before.tests, ...after.tests }).map((name) =>
      row(name, before.tests[name], after.tests[name], "more")
    ),
    sameUsers: before.usersFrom === after.usersFrom
  }
}

/**
 * A change in words, as a sentence says it:  "29% better (fewer copies)", "12% worse (score down)";
 * never a signed percent (Owen, 2026-10-25).
 * - `what`:  what the number counts, plural:  `copies`, `score`
 * - `better`:  `fewer` when fewer is better (copies), `more` when more is (the score)
 * - "no change" when it's the same;  "new" when there was none before
 */
export function changeInWords(change: CompareRow, what: string, better: "fewer" | "more"): string {
  const { before, after, improvement } = change
  if (before === after) return "no change"
  if (improvement === undefined) return before === undefined ? "new" : "gone"
  const up = (after ?? 0) > (before ?? 0)
  const direction = better === "more" ? (up ? "up" : "down") : up ? "more" : "fewer"
  const why = better === "more" ? `${what} ${direction}` : `${direction} ${what}`
  if (improvement === 0) return `about the same (${why})`
  return `${Math.abs(improvement)}% ${improvement > 0 ? "better" : "worse"} (${why})`
}

/**
 * The cell of an "Improvement" column:  the bare percent, `17%`;  a worse one `−12%` (a minus sign, U+2212);
 * `--` when there's nothing to compare (Owen, 2026-10-25:  "Header IMPROVEMENT, drop the better from the cells").
 */
export function improvementCell(change: CompareRow): string {
  if (change.improvement === undefined) return change.before === change.after ? "--" : change.before ? "--" : "new"
  return change.improvement < 0 ? `−${-change.improvement}%` : `${change.improvement}%`
}

/** One row:  `before` and `after`, and how much better, by `better`'s rule. */
function row(
  name: string,
  before: number | undefined,
  after: number | undefined,
  better: "fewer" | "more"
): CompareRow {
  const improvement =
    before === undefined || after === undefined || before === 0
      ? undefined
      : Math.round(((better === "fewer" ? before - after : after - before) / before) * 100)
  return { name, before, after, improvement }
}

/** A row for each name in `before` or `after`, by `count`;  fewer is better. */
function rowsOf<T extends { name: string }>(before: T[], after: T[], count: (each: T) => number): CompareRow[] {
  const names = [...new Set([...after.map((each) => each.name), ...before.map((each) => each.name)])]
  return names.map((name) => {
    const then = before.find((each) => each.name === name)
    const now = after.find((each) => each.name === name)
    return row(name, then && count(then), now && count(now), "fewer")
  })
}

/** Each file with more copies in `after` than in `before`, and how many more. */
function newCopiesOf(before: Record<string, number>, after: Record<string, number>): Record<string, number> {
  const added: Record<string, number> = {}
  for (const [file, count] of Object.entries(after)) {
    const more = count - (before[file] ?? 0)
    if (more > 0) added[file] = more
  }
  return added
}
