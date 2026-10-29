import { describe, expect, test } from "vite-plus/test"

import { PlanDates } from "spell/epic/dates/PlanDates"

describe("PlanDates.format()", () => {
  test("a day and a time:  month and day WITHOUT leading zeros, a two-digit year, 24-hour `HH:MM`", () => {
    expect(
      ["2026-10-08 14:34", "2026-10-07 10:50", "2026-01-05 09:05", "2009-03-04 00:00", "2026-10-08T23:59"].map(
        PlanDates.format
      )
    ).toEqual(["10/8/26 14:34", "10/7/26 10:50", "1/5/26 09:05", "3/4/09 00:00", "10/8/26 23:59"])
  })

  test("a day alone:  just the date", () => {
    expect(["2026-10-08", "2026-12-31", " 2026-10-06 "].map(PlanDates.format)).toEqual([
      "10/8/26",
      "12/31/26",
      "10/6/26"
    ])
  })

  test("seconds and fractions are dropped;  without an offset the time is as written", () => {
    expect(["2026-10-08T14:34:05", "2026-10-08 14:34:05.123"].map(PlanDates.format)).toEqual([
      "10/8/26 14:34",
      "10/8/26 14:34"
    ])
  })

  test("with an offset (`-04:00`, `-0400`, `Z`):  that moment, shown in LOCAL time", () => {
    const moment = new Date(Date.UTC(2026, 9, 8, 18, 34, 5))
    const local = `${moment.getMonth() + 1}/${moment.getDate()}/26 ${pad(moment.getHours())}:${pad(moment.getMinutes())}`
    expect(
      ["2026-10-08T14:34:05-04:00", "2026-10-08T14:34-0400", "2026-10-08T18:34:05Z", "2026-10-08T18:34:05.000Z"].map(
        PlanDates.format
      )
    ).toEqual([local, local, local, local])
  })

  test('returns what it can\'t read UNCHANGED;  `""` for none', () => {
    expect(
      ["...", "Owen, 2026-10-04", "10-06", "2026-02-30", "2026-10-08 25:00", "2026-13-01", "", undefined, null].map(
        PlanDates.format
      )
    ).toEqual(["...", "Owen, 2026-10-04", "10-06", "2026-02-30", "2026-10-08 25:00", "2026-13-01", "", "", ""])
  })
})

describe("PlanDates.read()", () => {
  test("the moment, and whether it named a time;  `undefined` when it won't parse", () => {
    expect([PlanDates.read("2026-10-08"), PlanDates.read("2026-10-08 14:34"), PlanDates.read("soon")]).toEqual([
      { date: new Date(2026, 9, 8), hasTime: false },
      { date: new Date(2026, 9, 8, 14, 34), hasTime: true },
      undefined
    ])
  })
})

describe("PlanDates.clock()", () => {
  test("a time alone, 24-hour, hours padded:  the format's time half", () => {
    expect([new Date(2026, 9, 8, 14, 34), new Date(2026, 9, 8, 9, 5)].map(PlanDates.clock)).toEqual(["14:34", "09:05"])
  })
})

// epic `epic-engine` I168:  the change marks' 3-day rule, lifted out so update blocks and the pen share it
describe("PlanDates.isQuiet()", () => {
  test("more than `QUIET_DAYS` (3) after `at`:  quiet;  no `at`, or one that won't parse:  never", () => {
    const at = "2026-10-11 14:30"
    expect(PlanDates.QUIET_DAYS).toBe(3)
    expect(
      [new Date(2026, 9, 14, 14, 30), new Date(2026, 9, 14, 14, 31), new Date(2026, 9, 11, 9, 0)].map((now) =>
        PlanDates.isQuiet(at, now)
      )
    ).toEqual([false, true, false])
    // the `to-see` form, with a `T`
    expect(PlanDates.isQuiet("2026-10-08T08:00", new Date(2026, 9, 12))).toBe(true)
    expect([undefined, null, "", "soon"].map((each) => PlanDates.isQuiet(each, new Date(2030, 0, 1)))).toEqual([
      false,
      false,
      false,
      false
    ])
  })
})

/** `7` -> `07`. */
function pad(value: number): string {
  return String(value).padStart(2, "0")
}
