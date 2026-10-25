/**
 * Dates and times as we write them:  LOCAL time, the day it is where the person is.
 * - `localDate()`:  `2026-10-25`;  `clockTime()`:  `21:05`;  `compactTime()`:  `20261025-2105`, for file names
 * - with the offset, for machines:  `localTime()` to the second, `localMinutes()` to the minute
 * - NEVER `new Date().toISOString().slice(0, 10)` for a day:  that's the UTC date,
 *   tomorrow already in California from 5pm (4pm in winter)
 * - Standalone:  no imports, so plain `node` loads it too (`spell/util/time.ts`).
 * - Moved down from spell-epic's `PlanTime` and `PlanDates` (epic `coherence` I5).
 */

/** `date`'s local day, `YYYY-MM-DD`. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}

/** `date`'s local time of day, 24-hour:  `14:34`, `09:05`. */
export function clockTime(date = new Date()): string {
  return `${two(date.getHours())}:${two(date.getMinutes())}`
}

/** `date`, local, to the minute, with no separators but one:  `20261025-1434`, for a name that sorts by time. */
export function compactTime(date = new Date()): string {
  return `${localDate(date).replaceAll("-", "")}-${clockTime(date).replace(":", "")}`
}

/**
 * `date` as ISO local time with its offset, to the second:  `2026-10-04T12:46:05-04:00`.
 * - the same form as git's commit times (`git log --format=%cI`), so the two compare
 */
export function localTime(date = new Date()): string {
  return `${localDate(date)}T${clockTime(date)}:${two(date.getSeconds())}${offsetOf(date)}`
}

/** `date` as ISO local time with its offset, to the minute:  `2026-09-30T23:30-07:00`. */
export function localMinutes(date = new Date()): string {
  return `${localDate(date)}T${clockTime(date)}${offsetOf(date)}`
}

/** `YYYY-MM-DD` as a `Date`:  local midnight that day. */
export function localMidnight(day: string): Date {
  const [year, month, date] = day.split("-").map(Number)
  return new Date(year!, month! - 1, date)
}

/** `date`'s time-zone offset, `-07:00`, `+05:30`. */
function offsetOf(date: Date): string {
  const minutes = -date.getTimezoneOffset()
  const sign = minutes < 0 ? "-" : "+"
  return `${sign}${two(Math.floor(Math.abs(minutes) / 60))}:${two(Math.abs(minutes) % 60)}`
}

/** `7` => `07`. */
function two(value: number): string {
  return String(value).padStart(2, "0")
}
