import { readFileSync } from "fs"
import { resolve } from "path"
import JSON5 from "json5"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CalendarSettings, type CalendarHost } from "spell/util/measures/CalendarSettings"
import { core } from "spell/parser/core"
import { spanishMessages } from "spell/parser/spell/languages/es/messages"

/**
 * Dates in the core (epic `language` P63):  a date's parts and names, said the person's way, how long ago, and working
 * with dates.  Python's core says the same, `dates.expected.json5`.
 */

/** What both cores must say:  each case's method, date, language, region and clock => its text or number. */
const EXPECTED = JSON5.parse(readFileSync(resolve(import.meta.dirname, "dates.expected.json5"), "utf8")) as {
  now: string
  cases: Array<{
    method: string
    args: unknown[]
    lang: string
    region: string
    clock?: "12" | "24"
    expected: unknown
  }>
}

/** `"2026-11-17T21:05:07"`, or `{ date: ... }` in a case's arguments, as a date where it's read. */
function argument(arg: unknown): unknown {
  return typeof arg === "object" && arg && "date" in arg ? new Date((arg as { date: string }).date) : arg
}

/** `date`'s local time as text, to the second:  `2026-11-17T21:05:07`. */
function localText(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** Run as a program in `lang`, its person in `host`. */
function speaking(lang: string, host: CalendarHost): void {
  core.useMessages(lang === "es" ? spanishMessages : undefined)
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- `CalendarSettings.use()` is no React hook (as `MeasureSystem.use()`)
  CalendarSettings.use(host)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(EXPECTED.now))
})

afterEach(() => {
  vi.useRealTimers()
  core.useMessages(undefined)
  CalendarSettings.use({})
})

describe("the cases both cores say alike", () => {
  test.each(EXPECTED.cases.map((it) => [`${it.method}(${JSON.stringify(it.args)}) ${it.lang}-${it.region}`, it]))(
    "%s",
    (_, { method, args, lang, region, clock, expected }) => {
      speaking(lang, { region, clock })
      const run = (core as unknown as Record<string, (...args: unknown[]) => unknown>)[method]!
      const answer = run(...args.map(argument))
      expect(answer instanceof Date ? localText(answer) : answer).toEqual(expected)
    }
  )
})

describe("the person's settings", () => {
  test("their region's first day of the week, clock and weekend", () => {
    speaking("en", { region: "US" })
    expect([CalendarSettings.firstDay, CalendarSettings.uses24HourClock, CalendarSettings.weekend]).toEqual([
      7,
      false,
      [6, 7]
    ])
    speaking("en", { region: "ES" })
    expect([CalendarSettings.firstDay, CalendarSettings.uses24HourClock]).toEqual([1, true])
    speaking("en", { region: "IL" })
    expect(CalendarSettings.weekend).toEqual([5, 6])
  })

  test("what they chose wins over their region's", () => {
    speaking("en", { region: "US", firstDay: 1, clock: "24" })
    const tuesday = new Date("2026-11-17T21:05:07")
    expect([core.weekdayNumberOf(tuesday), core.shortTime(tuesday)]).toEqual([2, "21:05"])
  })

  test("a short date leaves out this year only", () => {
    speaking("en", { region: "US" })
    expect([core.shortDate(new Date("2026-11-07T09:00")), core.shortDate(new Date("2025-11-07T09:00"))]).toEqual([
      "11/7",
      "11/7/25"
    ])
  })

  test("the time zone, three ways:  this machine's", () => {
    speaking("en", { region: "US" })
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(core.timeZone("city")).toBe(zone.includes("/") ? zone.split("/").pop()!.replace(/_/g, " ") : zone)
    expect(core.timeZone("short")).toMatch(/^[A-Z]{2,5}$|^GMT|^UTC/)
    expect(core.timeZone("long").length).toBeGreaterThan(3)
  })

  test("nothing, or what isn't a date, stays as it is", () => {
    expect([core.minuteOf(undefined), core.monthOf("x"), core.twoDigits("x"), core.dateFrom("not a date")]).toEqual([
      undefined,
      "x",
      "x",
      undefined
    ])
  })
})
