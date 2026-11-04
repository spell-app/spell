import { PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"
import { Wording } from "spell/parser/spell/rules/expressions"
import type { P } from "spell/parser/parser"

/** How many seconds each of a check's units is. */
export const CHECK_UNIT_SECONDS: Readonly<Record<string, number>> = { second: 1, minute: 60, hour: 3600, day: 86400 }

/**
 * `checked_every` rule:  how often to ask a place that can't announce what changed.
 * - e.g. `- check it every 30 seconds`, `- check it every 5 minutes`, `- check it every day`
 * - One of a unit drops its number:  `every day`, `every hour`, `every minute`.  A number alone is seconds.
 * - Compiles to seconds, `checkedEvery: 86400`.
 */
export class CheckedEvery extends PlaceDetail<"type|number?|unit?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { number, unit } = match.groups
    const each = CHECK_UNIT_SECONDS[Wording.meaningOf(unit) ?? "second"] ?? 1
    return { checkedEvery: (number ? Number(number.raw) : 1) * each }
  }
}

/**
 * How often to check, as a person says it:  the largest whole unit, `once a day`, `every 5 minutes`, `every 30 seconds`.
 * - A day is `once a day`, which takes a time (`once a day at 5am`):  the ingest knows none, so writes none.
 * - What `spell place ingest` writes (epic `data` P23).
 */
export function checkEveryInWords(seconds: number): string {
  const units = Object.entries(CHECK_UNIT_SECONDS).reverse()
  const [unit, size] = units.find(([, size]) => seconds >= size && seconds % size === 0) ?? ["second", 1]
  const count = seconds / size
  if (count === 1) return unit === "day" ? "once a day" : `every ${unit}`
  return `every ${count} ${unit}s`
}
