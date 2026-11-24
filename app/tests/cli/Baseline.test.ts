import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { Baseline } from "spell/app/cli/Baseline"

describe("Baseline", () => {
  const dir = mkdtempSync(join(tmpdir(), "spell-baseline-"))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  test("nothing saved:  undefined, and savedOrDie() names the command that saves one", () => {
    const baseline = new Baseline<{ average: number }>(join(dir, "none.json"), "spell speedtest --baseline save")
    expect(baseline.saved).toBeUndefined()
    expect(() => baseline.savedOrDie()).toThrow("run spell speedtest --baseline save first")
  })

  test("save():  the numbers with their commit and time;  merge keeps what else the file held", () => {
    const baseline = new Baseline<{ numbers?: Record<string, number>; when?: string }>(join(dir, "b.json"), "x")
    baseline.save({ numbers: { a: 1 }, when: "then" }, "abc")
    expect(baseline.saved).toMatchObject({ commit: "abc", numbers: { a: 1 }, when: "then" })
    baseline.save({ numbers: { a: 2 } }, "def", { merge: true })
    expect(baseline.saved).toMatchObject({ commit: "def", numbers: { a: 2 }, when: "then" })
    baseline.save({ numbers: { a: 3 } }, "ghi")
    expect(baseline.saved?.when).toBeUndefined()
  })

  test("compare():  each number's change;  worse past 10%, lower for what's better higher, never for a count", () => {
    const rows = Baseline.compare(
      { tti: 120, heap: 105, tabsVisiblyMarked: 8, runs: 9, added: 1 },
      { tti: 100, heap: 100, tabsVisiblyMarked: 10, runs: 1 },
      { higherIsBetter: /tabsVisiblyMarked/, neutral: /runs/ }
    )
    expect(rows.map((row) => [row.name, row.change, row.isWorse])).toEqual([
      ["tti", 20, true],
      ["heap", 5, false],
      ["tabsVisiblyMarked", -20, true],
      ["runs", 800, false],
      ["added", undefined, false]
    ])
    expect(rows.at(-1)!.added).toBe(true)
  })

  test("change() and signed():  a whole percent with its sign;  from nothing, new", () => {
    expect(Baseline.signed(Baseline.change(105, 100))).toBe("+5%")
    expect(Baseline.signed(Baseline.change(97, 100))).toBe("-3%")
    expect(Baseline.signed(Baseline.change(0, 0))).toBe("0%")
    expect(Baseline.signed(Baseline.change(3, 0))).toBe("new")
  })
})
