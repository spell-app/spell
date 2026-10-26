import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { compactTime } from "spell/util/time"
import {
  changeInWords,
  compareSnapshots,
  improvementCell,
  ScoreSnapshots,
  type MechanismScore,
  type ScoreSnapshot
} from "spell/cli/coherence"

const FOLDER = mkdtempSync(join(tmpdir(), "spell-scores-"))
afterAll(() => rmSync(FOLDER, { recursive: true, force: true }))

/** A snapshot of `copies` per mechanism (each a file's), with `score`. */
function snapshot(time: string, score: number, mechanisms: Array<[string, number]>): ScoreSnapshot {
  const scored: MechanismScore[] = mechanisms.map(([name, copies]) => ({
    name,
    copies,
    users: 10,
    score,
    files: copies ? { [`src/${name}.ts`]: copies } : {}
  }))
  return {
    at: { time, commits: { spell: "2e925ee0abcd", "spell-ui": "a9896e16" } },
    measuredAt: time,
    usersFrom: "map",
    score,
    copies: mechanisms.reduce((sum, [, copies]) => sum + copies, 0),
    users: 10 * mechanisms.length,
    mechanisms: scored,
    words: [{ name: "open / close", count: 31 }],
    tests: { spell: 800, "spell-ui": 3889 }
  }
}

const BEFORE = snapshot("2026-10-25T13:54:11-04:00", 81, [
  ["git", 100],
  ["numbers", 25]
])
const AFTER = {
  ...snapshot("2026-10-25T19:44:31-04:00", 88, [
    ["git", 46],
    ["numbers", 28]
  ]),
  words: [{ name: "open / close", count: 15 }],
  tests: { spell: 838, "spell-ui": 3889 }
}

describe("comparing two snapshots", () => {
  const comparison = compareSnapshots(BEFORE, AFTER)

  test("copies fell:  an improvement;  the score rose:  one too", () => {
    expect(comparison.copies).toEqual({ name: "copies", before: 125, after: 74, improvement: 41 })
    expect(comparison.score).toEqual({ name: "score", before: 81, after: 88, improvement: 9 })
  })

  test('a sentence says "N% better" or "N% worse", what of, and never a signed percent', () => {
    expect(changeInWords(comparison.copies, "copies", "fewer")).toBe("41% better (fewer copies)")
    expect(changeInWords(comparison.score, "score", "more")).toBe("9% better (score up)")
    const [git, numbers] = comparison.mechanisms
    expect(changeInWords(git!, "copies", "fewer")).toBe("54% better (fewer copies)")
    expect(changeInWords(numbers!, "copies", "fewer")).toBe("12% worse (more copies)")
    const down = compareSnapshots(AFTER, BEFORE).score
    expect(changeInWords(down, "score", "more")).toBe("8% worse (score down)")
  })

  test('a table\'s Improvement cell is the bare percent:  "54%", a worse one "−12%"', () => {
    const [git, numbers] = comparison.mechanisms
    expect(improvementCell(git!)).toBe("54%")
    expect(improvementCell(numbers!)).toBe("−12%")
    expect(improvementCell({ name: "new", after: 3 })).toBe("new")
    expect(improvementCell({ name: "none", before: 0, after: 0 })).toBe("--")
  })

  test("new copies, by file;  the words' and tests' rows", () => {
    expect(comparison.mechanisms[1]!.newCopies).toEqual({ "src/numbers.ts": 3 })
    expect(comparison.mechanisms[0]!.newCopies).toEqual({})
    expect(comparison.words[0]).toMatchObject({ before: 31, after: 15, improvement: 52 })
    expect(comparison.tests[0]).toMatchObject({ name: "spell", before: 800, after: 838 })
    expect(comparison.sameUsers).toBe(true)
  })
})

describe("ScoreSnapshots", () => {
  const snapshots = new ScoreSnapshots(FOLDER)

  // local time, as the names are:  `20261025-1354` west of Greenwich at -4
  const first = `${compactTime(new Date(BEFORE.at.time))}-2e925ee`
  const second = `${compactTime(new Date(AFTER.at.time))}-2e925ee`

  test("saved by the code's time and the kit's commit, found by name or as the last", () => {
    const file = snapshots.save(BEFORE)
    snapshots.save(AFTER)
    expect(ScoreSnapshots.label(file)).toBe(first)
    expect(snapshots.names).toEqual([`${first}.json5`, `${second}.json5`])
    expect(snapshots.find(first).snapshot).toEqual(BEFORE)
    expect(snapshots.find("last").snapshot.score).toBe(88)
  })

  test("a snapshot that isn't there names the ones that are", () => {
    expect(() => snapshots.find("nope")).toThrow(new RegExp(`no snapshot 'nope'.*${first}`))
  })
})
