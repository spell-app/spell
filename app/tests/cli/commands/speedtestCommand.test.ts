import { describe, test, expect } from "vite-plus/test"

import { byModule, combined, moduleTable, speedTable } from "spell/app/cli/commands/speedtestCommand"

/** One run's results, as `speedTest.mts` prints them. */
function run(average: number, min: number, max: number) {
  return { pass: 600, fail: 0, failed: 0, initialTime: 100, average, min, max }
}

describe("combined()", () => {
  test("mean of the averages, lowest min, highest max", () => {
    expect(combined([run(70, 68, 75), run(72, 66, 80)])).toEqual({
      pass: 600,
      fail: 0,
      average: 71,
      min: 66,
      max: 80,
      runs: 2,
      dropped: 0
    })
  })

  test("with 3 or more runs, drops ONE fluke:  an average 25% over the median", () => {
    const total = combined([run(70, 68, 75), run(100, 90, 140), run(71, 69, 76)])
    expect(total).toMatchObject({ average: 70.5, min: 68, max: 76, dropped: 1 })
  })

  test("keeps a slow run that isn't a fluke", () => {
    expect(combined([run(70, 68, 75), run(80, 70, 90), run(71, 69, 76)]).dropped).toBe(0)
  })
})

describe("speedTable()", () => {
  test("Owen's format:  bold rows, right-aligned equal columns, a whole-% Change row", () => {
    const table = speedTable([
      { label: "Previous", average: 71.4, min: 69, max: 75 },
      { label: "Current", average: 64.2, min: 61, max: 75 }
    ])
    expect(table).toBe(
      [
        "|              | Average | &nbsp;&nbsp;&nbsp;Min | &nbsp;&nbsp;&nbsp;Max |",
        "|--------------|--------:|----------------------:|----------------------:|",
        "| **Previous** |      71 |                    69 |                    75 |",
        "| **Current**  |      64 |                    61 |                    75 |",
        "| **Change**   |    -10% |                  -12% |                    0% |"
      ].join("\n")
    )
  })

  test("one side:  no Change row", () => {
    expect(speedTable([{ label: "Current", average: 64, min: 61, max: 75 }]).split("\n")).toHaveLength(3)
  })
})

describe("byModule()", () => {
  /** One run, each test's time:  `[module, rule, input, ms]`. */
  function timed(...tests: Array<[string, string, string, number]>) {
    return { ...run(70, 68, 75), tests: tests.map(([module, rule, input, ms]) => ({ module, rule, input, ms })) }
  }

  test("only the tests both sides have count;  a new test's time is shown apart", () => {
    const previous = { results: [timed(["if", "if", "if x: y", 1], ["math", "plus", "1 + 2", 2])] }
    const current = {
      results: [timed(["if", "if", "if x: y", 1.5], ["math", "plus", "1 + 2", 2], ["math", "plus", "1 + 3", 4])]
    }
    const times = byModule([previous, current])
    expect(times.total).toEqual({ was: 3, now: 3.5, tests: 2 })
    expect(times.rows.map(({ module, change, added }) => ({ module, change, added }))).toEqual([
      { module: "if", change: 50, added: 0 },
      { module: "math", change: 0, added: 4 }
    ])
    expect(times.rules[0]).toEqual({ rule: "if", module: "if", was: 1, now: 1.5 })
  })

  test("each test's best run:  a run a busy machine slowed doesn't count", () => {
    const side = { results: [timed(["if", "if", "if x: y", 5]), timed(["if", "if", "if x: y", 1])] }
    expect(byModule([side, side]).total).toEqual({ was: 1, now: 1, tests: 1 })
  })
})

describe("moduleTable()", () => {
  test("a row per module, the total, then the rules that grew most", () => {
    const table = moduleTable({
      previous: true,
      rows: [{ module: "if", tests: 1, was: 1, now: 1.5, change: 50, added: 0 }],
      rules: [{ rule: "if", module: "if", was: 1, now: 1.5 }],
      total: { was: 1, now: 1.5, tests: 1 }
    })
    expect(table.split("\n")).toEqual([
      "| Module | Tests both have | Before | Now | Change | New tests' ms |",
      "|---|--:|--:|--:|--:|--:|",
      "| if | 1 | 1.0 | 1.5 | +50% | 0.0 |",
      "| **All** | 1 | 1.0 | 1.5 | +50% | |",
      "",
      "| Rule that grew most | Module | Before | Now |",
      "|---|---|--:|--:|",
      "| if | if | 1.0 | 1.5 |"
    ])
  })
})
