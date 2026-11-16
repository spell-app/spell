import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"

/** How many seconds each of the units `check it every` is written in by `checkEveryInWords()`. */
export const CHECK_UNIT_SECONDS: Readonly<Record<string, number>> = { second: 1, minute: 60, hour: 3600, day: 86400 }

/**
 * `checked_every` rule:  how often to ask a place that can't announce what changed.
 * - e.g. `- check it every 30 seconds`, `- check it every 5 minutes`, `- check it every 1 hour 30 minutes`,
 *   `- check it every day`
 * - How often is a DURATION, the built-in dimension (epic `language` T140):  a measure written out, or one of a unit,
 *   its number dropped (`every day`, `every hour`).  A number alone is seconds;  anything else is refused.
 * - Compiles to seconds, `checkedEvery: 86400`.
 */
export class CheckedEvery extends PlaceDetail<"type|interval?|number?|unit?"> {
  /** Works out its seconds, refusing what isn't a duration. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const parsed = super.parse(scope, tokens)
    // refused already, a dotted field
    if (!parsed?.is(CheckedEvery)) return parsed
    const match = parsed as P.MatchFor<this>
    const { interval, number, unit } = match.groups
    const data = match.data as CheckedEveryData
    if (number) {
      data.seconds = Number(number.raw)
      return match
    }
    const said = (interval ?? unit)!
    const durationUnit = SP.durationUnitOf(said, unit ? said : undefined)
    if (!durationUnit) {
      const message = SP.Language.of(scope).parserMessage("not-a-duration", { said: `${said.raw}` })
      return SpellStatement.refuse(match, message)
    }
    const amount = interval ? Number(interval.value) : 1
    data.seconds = Math.round(amount * durationUnit.factor * 1000) / 1000
    return match
  }

  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { checkedEvery: (match.data as CheckedEveryData).seconds ?? 1 }
  }
}

/** What `checked_every` worked out:  how often, in seconds. */
export type CheckedEveryData = { seconds?: number }

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
