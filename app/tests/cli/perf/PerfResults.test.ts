import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { PerfResults, datedName } from "spell/app/cli/perf/PerfResults"
import type { PerfRecord } from "spell/app/cli/perf/perf.types"

/** A run's record, with `numbers`. */
function record(when: string, numbers: Record<string, number>): PerfRecord {
  return {
    when,
    busyMachine: false,
    machine: {
      before: { load: [1], freeMemoryGB: 1, totalMemoryGB: 2, cpus: 2 },
      after: { load: [1], freeMemoryGB: 1, totalMemoryGB: 2, cpus: 2 },
      loadsSeen: [1],
      waitedSeconds: 0,
      platform: "test"
    },
    gitSha: "abc",
    gitBranch: "b",
    chromeVersion: "1",
    options: { pages: ["docs"], profiles: ["desktop"], steps: ["load"], runs: 1, waitMinutes: 0, force: true },
    failures: [],
    numbers,
    data: {}
  }
}

describe("PerfResults", () => {
  const dir = mkdtempSync(join(tmpdir(), "spell-perf-results-"))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  test("write():  a dated file in .perf-results/;  latest() the newest, or the newest before one", () => {
    const results = new PerfResults(dir)
    expect(results.latest()).toBeUndefined()
    const first = results.write(record("2026-11-20T10:00:00", { a: 1 }))
    const second = results.write(record("2026-11-21T10:00:00", { a: 2 }))
    expect(first).toBe(join(dir, ".perf-results", `${datedName(new Date("2026-11-20T10:00:00"))}.json`))
    expect(results.latest()?.numbers.a).toBe(2)
    expect(results.latest(second)?.numbers.a).toBe(1)
  })

  test("report():  each number beside the last run's and the baseline's;  WORSE past 10% against either", () => {
    const now = record("now", { "load docs/desktop tti": 130, "load docs/desktop jsBrotli": 100 })
    const last = record("last", { "load docs/desktop tti": 125, "load docs/desktop jsBrotli": 100 })
    const lines = PerfResults.report(now, last, { numbers: { "load docs/desktop tti": 100 }, when: "base" })
    const tti = lines.find((line) => line.startsWith("load docs/desktop tti"))!
    expect(tti).toMatch(/100\s+125\s+130\s+\+4%\s+\+30%\s+WORSE$/)
    expect(lines.at(-1)).toBe("1 number(s) worse by more than 10%")
  })

  test("numbersOf():  a load's medians, bytes and census, flat by step, page and profile", () => {
    const numbers = PerfResults.numbersOf({
      load: {
        "docs/desktop": {
          median: { tti: 812.34, fcp: undefined },
          bytes: { jsBrotli: 2048 },
          census: { elements: 10, shadowRoots: 2, uniqueAdopted: 3 },
          errors: 0,
          liveMessages: 4
        }
      },
      pipeline: { Solitaire: { median: { parse: 12.5 } } }
    })
    expect(numbers).toMatchObject({
      "load docs/desktop tti": 812.3,
      "load docs/desktop jsBrotli": 2048,
      "load docs/desktop elements": 10,
      "load docs/desktop liveMessages": 4,
      "pipeline Solitaire parse": 12.5
    })
    expect(numbers).not.toHaveProperty("load docs/desktop fcp")
  })
})
