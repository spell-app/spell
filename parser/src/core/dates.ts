/**
 * Dates and times in a running program (epic `language` P63):  a date's parts, a date said as text the person's way,
 * the time zone, how long ago or from now, and working with dates.
 * - Names follow the PROGRAM's language (`core.message("language")`):  `November`, Spanish `noviembre`.
 * - Formats follow the PERSON's region, first day of the week and clock (the kit's `CalendarSettings`):
 *   `11/17` in the US, `17/11` in Spain;  `9:05 PM` or `21:05`.
 * - The browser's `Intl` does the wording:  nothing here knows a month's name.
 * - A part is a NUMBER with no leading zero:  `the minute of 9:05` is 5;  `as two digits` makes it `05`.
 * - Anything that isn't a date stays as it is, so nothing stays nothing.
 * - A duration is a number of seconds here:  the compiler converts a measure in another unit first.
 * - Python's core has the twin, `spell_core/date_methods.py`;  both say `tests/core/dates.expected.json5`.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import { CalendarSettings, type WeekdayNumber } from "spell/util/measures/CalendarSettings"
import { core } from "./core"
import { defineCoreModule } from "./core.types"

/** Seconds in each unit a duration is said in, biggest first. */
const PART_SECONDS = { days: 86_400, hours: 3600, minutes: 60, seconds: 1 } as const
/** A part of a duration:  `days`, `hours`, `minutes` or `seconds`. */
export type DurationPart = keyof typeof PART_SECONDS

/**
 * Each unit a duration may be said in, `as a duration in months and days` (epic `language` J253), biggest first =>
 * its seconds in a duration that's only a number of seconds.
 * - A month is 30 days there, and a year 365:  from a DATE they're the calendar's, `in 1 month, 3 days`.
 */
const SAID_UNIT_SECONDS: Readonly<Record<string, number>> = {
  year: 365 * 86_400,
  month: 30 * 86_400,
  week: 7 * 86_400,
  day: 86_400,
  hour: 3600,
  minute: 60,
  second: 1
}
/** The units that follow the calendar from a date:  a month is 28 to 31 days, a year 365 or 366. */
const CALENDAR_MONTHS: Readonly<Record<string, number>> = { year: 12, month: 1 }

/**
 * The parts of a day, by name => the hour each starts and the hour it ends, 0 to 24 (epic `language` J252, Owen's):
 * - `evening` holds `early evening`;  `night` runs past midnight, 9 PM to 5 AM.
 */
const DAY_PARTS: Readonly<Record<DayPart, readonly [number, number]>> = {
  morning: [5, 12],
  afternoon: [12, 17],
  earlyEvening: [17, 19],
  evening: [17, 21],
  lateEvening: [21, 24],
  night: [21, 5]
}
/** A part of a day:  `if now is in the morning`. */
export type DayPart = "morning" | "afternoon" | "earlyEvening" | "evening" | "lateEvening" | "night"

/** How a date or a duration is said as text:  `as a duration`, `as a short duration`, `as a long duration`. */
/** `core.twoDigits()`'s answer:  text for a number, anything else as it came. */
export type TwoDigits<T> = T extends number ? string : T
/** `core.durationPartOf()`'s answer:  a number for a number, anything else as it came. */
export type NumberOr<T> = T extends number ? number : T
export type DurationStyle = "normal" | "short" | "long"

/** Milliseconds in a day. */
const DAY_MSEC = 86_400_000

/** A day alone, `2026-12-25`:  that day's midnight where it's read, not UTC's. */
const DAY_ALONE = /^\d{4}-\d{2}-\d{2}$/

/** The core's name for each duration unit (`SP.CORE_TIME_UNITS`'s ids) => its seconds. */
const UNIT_SECONDS: Readonly<Record<string, number>> = {
  millisecond: 0.001,
  tick: 1 / 60,
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86_400
}

/** `core`'s date methods:  what compiled code calls for a date's parts and words. */
export const dateMethods = defineCoreModule({
  ////////////////
  // ## Parts:  numbers
  ////////////////

  /** A date's year, e.g. `2026`:  `the year of now`. */
  yearOf(date: unknown): unknown {
    return isDate(date) ? date.getFullYear() : date
  },
  /** A date's year in two digits' worth, e.g. `26`, `5` for 2005:  `the short year of now`. */
  shortYearOf(date: unknown): unknown {
    return isDate(date) ? date.getFullYear() % 100 : date
  },
  /** A date's month, counting January as 1:  `the month number of now`. */
  monthNumberOf(date: unknown): unknown {
    return isDate(date) ? date.getMonth() + 1 : date
  },
  /** A date's day of the month, 1 to 31:  `the day of now`. */
  dayOf(date: unknown): unknown {
    return isDate(date) ? date.getDate() : date
  },
  /** A date's hour, 0 to 23, whatever clock the person reads:  `the hour of now`. */
  hourOf(date: unknown): unknown {
    return isDate(date) ? date.getHours() : date
  },
  /** A date's minute, 0 to 59:  `the minute of now`. */
  minuteOf(date: unknown): unknown {
    return isDate(date) ? date.getMinutes() : date
  },
  /** A date's second, 0 to 59:  `the second of now`. */
  secondOf(date: unknown): unknown {
    return isDate(date) ? date.getSeconds() : date
  },
  /** A date's week of the year, ISO's way, the same for everyone:  `the week of now`, 1 to 53. */
  weekOf(date: unknown): unknown {
    if (!isDate(date)) return date
    // the week's Thursday says the year it's in
    const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 4 - isoWeekday(date))
    const yearStart = new Date(thursday.getFullYear(), 0, 1)
    return Math.floor(daysBetween(yearStart, thursday) / 7) + 1
  },
  /**
   * A date's day of the week as a number, 1 to 7, counted from the person's first day of the week:
   * `the weekday number of now`, Tuesday is 3 in the US and 2 in Spain.
   */
  weekdayNumberOf(date: unknown): unknown {
    if (!isDate(date)) return date
    return ((isoWeekday(date) - CalendarSettings.firstDay + 7) % 7) + 1
  },

  ////////////////
  // ## Parts:  names
  ////////////////

  /** A date's month, by name in the program's language:  `November`, `noviembre` -- `the month of now`. */
  monthOf(date: unknown): unknown {
    return isDate(date) ? formatted(date, { month: "long" }) : date
  },
  /** A date's month, its name cut short:  `Nov`, `nov` -- `the short month of now`. */
  shortMonthOf(date: unknown): unknown {
    return isDate(date) ? formatted(date, { month: "short" }) : date
  },
  /** A date's day of the week, by name:  `Tuesday`, `martes` -- `the weekday of now`, `the day of the week of now`. */
  weekdayOf(date: unknown): unknown {
    return isDate(date) ? formatted(date, { weekday: "long" }) : date
  },
  /** A date's day of the week, its name cut short:  `Tue`, `mar` -- `the short weekday of now`. */
  shortWeekdayOf(date: unknown): unknown {
    return isDate(date) ? formatted(date, { weekday: "short" }) : date
  },
  /** Whether a date's time is before noon or after, `AM` or `PM` (Spanish `a. m.`, `p. m.`):  `the meridiem of now`. */
  meridiemOf(date: unknown): unknown {
    if (!isDate(date)) return date
    const parts = new Intl.DateTimeFormat(dateLocale(), { hour: "numeric", hourCycle: "h12" }).formatToParts(date)
    return spaced(parts.find((part) => part.type === "dayPeriod")?.value ?? (date.getHours() < 12 ? "AM" : "PM"))
  },
  /** Is a date's time before noon:  `if now is AM`. */
  isAM(date: unknown): boolean {
    return isDate(date) && date.getHours() < 12
  },
  /** Is a date's time noon or after:  `if now is PM`. */
  isPM(date: unknown): boolean {
    return isDate(date) && date.getHours() >= 12
  },

  ////////////////
  // ## Times of day (epic `language` J252)
  ////////////////

  /** Today at `hour` and `minute`, 0 seconds:  `noon` is `todayAt(12)`, `9:30pm` `todayAt(21, 30)`. */
  todayAt(hour: number, minute: number = 0): Date {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute)
  },
  /**
   * Is `date`'s time in part `part` of its day:  `if now is in the morning` -- `DAY_PARTS` has their hours.
   * - `day`:  `"today"`, only if `date` is today too -- `if its due is this morning`.
   */
  isDayPart(date: unknown, part: DayPart, day: "any day" | "today" = "any day"): boolean {
    if (!isDate(date) || !(part in DAY_PARTS)) return false
    if (day === "today" && !dateMethods.isDaysFromToday(date, 0)) return false
    const [starts, ends] = DAY_PARTS[part]
    const hour = date.getHours()
    return starts < ends ? hour >= starts && hour < ends : hour >= starts || hour < ends
  },

  ////////////////
  // ## The time zone
  ////////////////

  /**
   * The person's time zone, said one of three ways:
   * - `city`:  `New York` -- `the time zone`
   * - `short`:  `EST`, or `GMT-5` where the browser has no letters for it -- `the short time zone`
   * - `long`:  `Eastern Standard Time`, in the program's language -- `the long time zone`
   * - A JavaScript date has no zone of its own:  this is the person's, now.
   */
  timeZone(form: "city" | "short" | "long" = "city"): string {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (form === "city") return zone === "UTC" || !zone.includes("/") ? zone : zone.split("/").pop()!.replace(/_/g, " ")
    const parts = new Intl.DateTimeFormat(dateLocale(), { timeZoneName: form }).formatToParts(new Date())
    return spaced(parts.find((part) => part.type === "timeZoneName")?.value ?? zone)
  },

  ////////////////
  // ## Leading zeros
  ////////////////

  /**
   * A whole number in at least two digits, as text:  `5` is `05`, `12` stays `12` -- `the minute of now as two digits`,
   * `with a leading zero`.
   * - A negative one keeps its sign in front:  `-5` is `-05`.
   * - Anything that isn't a number stays as it is.
   */
  twoDigits<T>(number: T): TwoDigits<T> {
    if (typeof number !== "number" || !Number.isFinite(number)) return number as TwoDigits<T>
    const digits = String(Math.trunc(Math.abs(number))).padStart(2, "0")
    return (number < 0 ? `-${digits}` : digits) as TwoDigits<T>
  },

  ////////////////
  // ## How long ago, or from now
  ////////////////

  /**
   * `date` said as how long ago it was or how long until it is:  `<date> as a duration`.
   * - `normal`:  its two biggest parts, `in 2 days, 3 hours`, `30 minutes ago`;  one part alone as `tomorrow`,
   *   `yesterday`, `in 2 days`
   * - `short`:  rounded to the scale, one part:  `1 day ago` for 23 hours 46 minutes, `in 2 weeks`, `in 3 months`
   * - `long`:  every part, exact to the second:  `23 hours, 46 minutes and 35 seconds ago`
   * - `unit`:  in that unit, rounded:  `in 3 days`, `tomorrow` (a unit's id:  `month`, `day`, `hour` ...)
   *   - several, biggest first:  `in 1 month, 3 days` (`as a duration in months and days`, epic `language` J253)
   *   - months and years by the calendar:  November 17 to January 20 is 2 months, 3 days
   */
  timeFromNow(date: unknown, style: DurationStyle = "normal", unit?: string | string[]): unknown {
    if (!isDate(date)) return date
    const seconds = (date.getTime() - Date.now()) / 1000
    const units = typeof unit === "string" ? [unit] : unit
    if (units?.length === 1 && !(units[0]! in CALENDAR_MONTHS)) return relativeIn(seconds, units[0]!)
    if (units?.length) {
      const parts = calendarParts(new Date(), date, units)
      if (!parts.length) return relativeIn(seconds, "second")
      if (parts.length > 1) return saidIn(parts, seconds < 0, true)
      // one unit, a month or a year:  `next month`, `in 3 months`
      const [[said, amount]] = parts as [[string, number]]
      return relative(seconds < 0 ? -amount : amount, said as Intl.RelativeTimeFormatUnit)
    }
    if (style === "short" || Math.abs(seconds) >= 26 * PART_SECONDS.days) return roughlyFromNow(date, seconds)
    const parts = partsOf(Math.abs(seconds), style === "long" ? 4 : 2)
    if (parts.length < 2) return roughlyFromNow(date, seconds)
    const key = seconds < 0 ? "duration-ago" : "duration-from-now"
    return core.message(key, { time: durationWords(parts) })
  },

  /**
   * A duration said as text:  `(its due - now) as a duration`, `2 days, 3 hours`.
   * - `seconds`:  how long, in seconds -- the compiler converts a measure in another unit first.
   * - `normal`, its two biggest parts;  `short`, one part, rounded;  `long`, every part to the second;
   *   `unit`, in that unit (`in days`:  `3 days`), or several, biggest first (`in hours and minutes`:  `1 hour, 30
   *   minutes`;  epic `language` J253) -- a month 30 days, a year 365.
   */
  durationText(seconds: unknown, style: DurationStyle = "normal", unit?: string | string[]): unknown {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) return seconds
    const sign = seconds < 0 ? "-" : ""
    const units = typeof unit === "string" ? [unit] : unit
    if (units?.some((each) => each in SAID_UNIT_SECONDS)) return sign + saidIn(fixedParts(Math.abs(seconds), units))
    const parts = partsOf(Math.abs(seconds), style === "long" ? 4 : style === "short" ? 1 : 2)
    return sign + durationWords(parts.length ? parts : [["seconds", 0]])
  },

  ////////////////
  // ## Working with dates
  ////////////////

  /**
   * `date` moved by `amount` of duration unit `unit`:  `now + 2 days`, `its due - 1 hour` (`amount` negative).
   * - Days move the calendar, so a day is still a day across a change of clocks;  the rest move the time.
   */
  addToDate(date: unknown, amount: unknown, unit: string = "second"): unknown {
    if (!isDate(date) || typeof amount !== "number") return date
    const moved = new Date(date.getTime())
    if (unit === "day" && Number.isInteger(amount)) moved.setDate(moved.getDate() + amount)
    else moved.setTime(moved.getTime() + amount * (UNIT_SECONDS[unit] ?? 1) * 1000)
    return moved
  },
  /** `date` moved back by `amount` of duration unit `unit`:  `its due - 1 hour` -- see `addToDate()`. */
  subtractFromDate(date: unknown, amount: unknown, unit: string = "second"): unknown {
    return typeof amount === "number" ? dateMethods.addToDate(date, -amount, unit) : date
  },
  /** How long from `earlier` to `later`, in seconds:  `the next weekend - now`, a duration. */
  secondsBetween(later: unknown, earlier: unknown): unknown {
    if (!isDate(later) || !isDate(earlier)) return undefined
    return (later.getTime() - earlier.getTime()) / 1000
  },
  /**
   * One part of a duration of `seconds`, a whole number:  `the hours of its time left`.
   * - `days`, all of them;  `hours`, 0 to 23;  `minutes` and `seconds`, 0 to 59.
   * - A duration that's gone by (negative) gives parts below 0.
   */
  durationPartOf<T>(seconds: T, part: DurationPart): NumberOr<T> {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) return seconds as NumberOr<T>
    const whole = Math.trunc(Math.abs(seconds))
    const value = part === "days" ? Math.floor(whole / PART_SECONDS.days) : partWithin(whole, part)
    return (seconds < 0 && value ? -value : value) as NumberOr<T>
  },
  /** Is `date` a day of the person's region's weekend:  `if now is a weekend day`. */
  isWeekendDay(date: unknown): boolean {
    return isDate(date) && CalendarSettings.weekend.includes(isoWeekday(date) as WeekdayNumber)
  },
  /**
   * When the next weekend starts:  the midnight its first day begins, after today -- `the next weekend`.
   * - On a weekend day it's the weekend after.
   */
  nextWeekend(): Date {
    const { weekend } = CalendarSettings
    // the weekend's first day:  the one whose day before isn't a weekend day
    const first = weekend.find((day) => !weekend.includes((((day + 5) % 7) + 1) as WeekdayNumber)) ?? weekend[0] ?? 6
    const today = startOf(new Date())
    for (let ahead = 1; ahead <= 7; ahead++) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + ahead)
      if (isoWeekday(day) === first) return day
    }
    return today
  },
  /** Is `date` earlier than `other`:  `if its due is before now`. */
  isBefore(date: unknown, other: unknown): boolean {
    return isDate(date) && isDate(other) && date.getTime() < other.getTime()
  },
  /** Is `date` later than `other`:  `if its due is after now`. */
  isAfter(date: unknown, other: unknown): boolean {
    return isDate(date) && isDate(other) && date.getTime() > other.getTime()
  },
  /** Are `date` and `other` on the same day, whatever their times:  `if its due is the same day as now`. */
  isSameDay(date: unknown, other: unknown): boolean {
    return isDate(date) && isDate(other) && startOf(date).getTime() === startOf(other).getTime()
  },
  /** Is `date` `offset` days from today:  `is today` (0), `is tomorrow` (1), `is yesterday` (-1). */
  isDaysFromToday(date: unknown, offset: number): boolean {
    return isDate(date) && daysBetween(startOf(new Date()), startOf(date)) === offset
  },
  /** How many days until `date`, counting midnights:  11 PM to 1 AM is 1 -- `the days until its due`. */
  daysUntil(date: unknown): unknown {
    return isDate(date) ? daysBetween(startOf(new Date()), startOf(date)) : date
  },
  /** How many days since `date`, counting midnights -- `the days since its added`. */
  daysSince(date: unknown): unknown {
    return isDate(date) ? daysBetween(startOf(date), startOf(new Date())) : date
  },
  /** The midnight `date`'s day starts at:  `the start of the day of now`. */
  startOfDay(date: unknown): unknown {
    return isDate(date) ? startOf(date) : date
  },
  /** The last moment of `date`'s day, 11:59:59.999 PM:  `the end of the day of now`. */
  endOfDay(date: unknown): unknown {
    return isDate(date) ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999) : date
  },
  /** How many days `date`'s month has, 28 to 31:  `the days in the month of now`. */
  daysInMonth(date: unknown): unknown {
    return isDate(date) ? new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() : date
  },
  /**
   * `text` read as a date:  `"2026-12-25" as a date`.
   * - A day alone is that day's midnight where it's read, not UTC's (as a saved date is, `valueAsDeclared()`).
   * - A date stays itself;  nothing, or text that isn't a date, is nothing.
   */
  dateFrom(text: unknown): Date | undefined {
    if (isDate(text)) return text
    if (typeof text !== "string" && typeof text !== "number") return undefined
    const date = new Date(typeof text === "string" && DAY_ALONE.test(text.trim()) ? `${text.trim()}T00:00` : text)
    return Number.isNaN(date.getTime()) ? undefined : date
  },

  ////////////////
  // ## Formats
  ////////////////

  /**
   * The locale dates are said in:  the program's language in the person's region, `en-US`, `es-ES`, `es-US`
   * -- so names follow the program, and the order of day and month the person.
   */
  dateLocale(): string {
    return dateLocale()
  },
  /** `Intl`'s options for a time of day on the person's clock:  `hourCycle` `h23` for a 24-hour clock, else `h12`. */
  clockOptions(): Intl.DateTimeFormatOptions {
    return { hourCycle: CalendarSettings.uses24HourClock ? "h23" : "h12" }
  }
})
Object.assign(core, dateMethods)

////////////////
// ## Helpers
////////////////

/** Is `value` a date with a time in it? */
function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

/** The locale dates are said in -- see `core.dateLocale()`. */
function dateLocale(): string {
  return CalendarSettings.localeFor(core.message("language"))
}

/** `date` said by `Intl` with `options`, in the date locale, its odd spaces plain. */
export function formatted(date: Date, options: Intl.DateTimeFormatOptions): string {
  return spaced(new Intl.DateTimeFormat(dateLocale(), options).format(date))
}

/**
 * `text` with `Intl`'s no-break spaces plain:  `9:05 PM` has a narrow one before `PM`, which a person can't type and
 * Python's core doesn't write.
 */
function spaced(text: string): string {
  return text.replace(/[  ]/g, " ")
}

/** `date`'s day of the week, ISO's way:  1 is Monday, 7 is Sunday. */
function isoWeekday(date: Date): number {
  return date.getDay() || 7
}

/** The midnight `date`'s day starts at. */
function startOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Whole days from `from` to `to`, two midnights:  rounded, so a change of clocks between them doesn't count. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MSEC)
}

/** Part `part` of `whole` seconds, within the part above it:  `hours` 0 to 23. */
function partWithin(whole: number, part: DurationPart): number {
  const size = PART_SECONDS[part]
  const above = part === "hours" ? PART_SECONDS.days : part === "minutes" ? PART_SECONDS.hours : PART_SECONDS.minutes
  return Math.floor((whole % above) / size)
}

/**
 * `seconds` cut into its biggest `count` parts, the last rounded:  2 parts of 95,000 seconds are `1 day, 2 hours`.
 * - Parts that are 0 are left out, but never one between two others.
 */
function partsOf(seconds: number, count: number): Array<[DurationPart, number]> {
  const units = Object.keys(PART_SECONDS) as DurationPart[]
  const first = units.findIndex((unit) => seconds >= PART_SECONDS[unit])
  if (first < 0) return []
  const last = Math.min(first + count - 1, units.length - 1)
  const smallest = PART_SECONDS[units[last]!]
  let left = Math.round(seconds / smallest) * smallest
  // rounding up may reach the unit above:  23 hours 46 minutes, in one part, is `1 day`
  const biggest = units.findIndex((unit) => left >= PART_SECONDS[unit])
  const parts: Array<[DurationPart, number]> = []
  for (const unit of units.slice(biggest, last + 1)) {
    const amount = Math.floor(left / PART_SECONDS[unit])
    left -= amount * PART_SECONDS[unit]
    parts.push([unit, amount])
  }
  // what rounded away to nothing at the end isn't said:  `1 day`, not `1 day, 0 hours`
  while (parts.length > 1 && parts.at(-1)![1] === 0) parts.pop()
  return parts
}

/** `parts` in words, in the program's language:  `1 day, 2 hours`, Spanish `1 día y 2 horas`. */
function durationWords(parts: Array<[string, number]>): string {
  const DurationFormat = (Intl as unknown as { DurationFormat?: DurationFormatClass }).DurationFormat
  const duration = Object.fromEntries(parts)
  if (DurationFormat) return spaced(new DurationFormat(core.message("language"), { style: "long" }).format(duration))
  // a browser without it:  each part said by `Intl.NumberFormat`'s units, joined as a list
  const words = parts.map(([unit, amount]) =>
    new Intl.NumberFormat(core.message("language"), {
      style: "unit",
      unit: unit.slice(0, -1),
      unitDisplay: "long"
    }).format(amount)
  )
  return spaced(new Intl.ListFormat(core.message("language"), { type: "unit", style: "long" }).format(words))
}

/** `Intl.DurationFormat`, which TypeScript's own types don't have yet. */
type DurationFormatClass = new (
  locale: string,
  options: { style: "long" | "short" | "narrow" }
) => { format(duration: Record<string, number>): string }

/**
 * `seconds` cut into `units` (their ids, any order), biggest first, the last rounded:  `1 hour, 30 minutes`.
 * - Each unit its fixed size, `SAID_UNIT_SECONDS`:  a month 30 days, a year 365.
 */
function fixedParts(seconds: number, units: string[]): Array<[string, number]> {
  const sizes = sortedUnits(units).map((unit) => [unit, SAID_UNIT_SECONDS[unit] ?? 1] as const)
  const smallest = sizes.at(-1)![1]
  let left = Math.round(seconds / smallest) * smallest
  return sizes.map(([unit, size]) => {
    const amount = Math.floor(left / size)
    left -= amount * size
    return [unit, amount]
  })
}

/**
 * The time between `from` and `to`, either way round, cut into `units`, biggest first, the last rounded:
 * November 17 to January 20 in months and days is `2 months, 3 days`.
 * - Months and years by the calendar, a month on from January 31 its last day, February 28;  the rest fixed.
 */
function calendarParts(from: Date, to: Date, units: string[]): Array<[string, number]> {
  const [earlier, later] = from <= to ? [from, to] : [to, from]
  const sorted = sortedUnits(units)
  const parts: Array<[string, number]> = []
  let at = earlier
  for (const [index, unit] of sorted.entries()) {
    const months = CALENDAR_MONTHS[unit]
    if (!months) {
      // the rest are fixed:  cut what's left as a number of seconds
      return [...parts, ...fixedParts((later.getTime() - at.getTime()) / 1000, sorted.slice(index))]
    }
    let amount = Math.floor(monthsBetween(at, later) / months)
    // the last unit rounds:  half way to the next one or more counts it
    if (index === sorted.length - 1) {
      const reached = plusMonths(at, amount * months).getTime()
      const next = plusMonths(at, (amount + 1) * months).getTime()
      if (later.getTime() - reached >= (next - reached) / 2) amount++
    }
    parts.push([unit, amount])
    at = plusMonths(at, amount * months)
  }
  return parts
}

/** `units`' ids, each once, biggest first:  `["day", "month"]` is `["month", "day"]`. */
function sortedUnits(units: string[]): string[] {
  return Object.keys(SAID_UNIT_SECONDS).filter((unit) => units.includes(unit))
}

/** `date` moved on `months` months, its day kept, or its month's last:  a month after January 31 is February 28. */
function plusMonths(date: Date, months: number): Date {
  const month = date.getMonth() + months
  const last = new Date(date.getFullYear(), month + 1, 0).getDate()
  const moved = new Date(date.getTime())
  moved.setFullYear(date.getFullYear(), month, Math.min(date.getDate(), last))
  return moved
}

/** How many whole months from `earlier` to `later`, by the calendar (`plusMonths()`). */
function monthsBetween(earlier: Date, later: Date): number {
  let months = (later.getFullYear() - earlier.getFullYear()) * 12 + later.getMonth() - earlier.getMonth()
  while (months > 0 && plusMonths(earlier, months) > later) months--
  return Math.max(months, 0)
}

/**
 * `parts` said:  `1 month, 3 days`;  from a date (`fromDate`), how long ago or until, `in 1 month, 3 days`.
 * - Parts that are 0 aren't said;  all 0 is the last unit's, `0 days`, `today`.
 */
function saidIn(parts: Array<[string, number]>, ago = false, fromDate = false): string {
  const said = parts.filter(([, amount]) => amount)
  if (!said.length) {
    const unit = parts.at(-1)![0]
    if (fromDate) return relative(0, unit as Intl.RelativeTimeFormatUnit)
    return spaced(
      new Intl.NumberFormat(core.message("language"), { style: "unit", unit, unitDisplay: "long" }).format(0)
    )
  }
  const words = durationWords(said.map(([unit, amount]) => [`${unit}s`, amount]))
  if (!fromDate) return words
  return core.message(ago ? "duration-ago" : "duration-from-now", { time: words })
}

/** `seconds` from now, in `unit`, rounded:  `in 3 days`, `tomorrow`. */
function relativeIn(seconds: number, unit: string): string {
  const size = SAID_UNIT_SECONDS[unit] ?? UNIT_SECONDS[unit] ?? 1
  const word = (unit in SAID_UNIT_SECONDS ? unit : "second") as Intl.RelativeTimeFormatUnit
  return relative(Math.round(seconds / size), word)
}

/**
 * `date`, `seconds` from now, rounded to its scale, as Moment.js rounds:  under 45 seconds in seconds (`now`), under 45
 * minutes in minutes, under 22 hours in hours;  then days by the calendar (`today`, `tomorrow`, `yesterday`), weeks
 * under 26 days, months under 320, then years.
 */
function roughlyFromNow(date: Date, seconds: number): string {
  const away = Math.abs(seconds)
  if (away < 45) return relative(Math.round(seconds), "second")
  if (away < 45 * 60) return relative(Math.round(seconds / 60), "minute")
  if (away < 22 * 3600) return relative(Math.round(seconds / 3600), "hour")
  const days = daysBetween(startOf(new Date()), startOf(date))
  if (Math.abs(days) < 7) return relative(days, "day")
  if (Math.abs(days) < 26) return relative(Math.round(days / 7), "week")
  if (Math.abs(days) < 320) return relative(Math.round(days / 30.44), "month")
  return relative(Math.round(days / 365.25), "year")
}

/** `amount` of `unit` from now, in the program's language:  `in 2 days`, `tomorrow`, `hace 3 horas`. */
function relative(amount: number, unit: Intl.RelativeTimeFormatUnit): string {
  return spaced(new Intl.RelativeTimeFormat(core.message("language"), { numeric: "auto" }).format(amount, unit))
}
