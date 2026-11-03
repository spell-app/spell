import { CHECK_UNIT_SECONDS } from "./CheckedEvery"
import { PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import type { P } from "spell/parser/parser"

/**
 * `checked_at` rule:  ask a place once a day, at a time of day if one is said.
 * - e.g. `- check it once a day`, `- check it once a day at 5am`, `- check it every day at 5:30am`,
 *   `- check it once a day at 17:00 UTC`
 * - The time is the person's own clock, unless `UTC` follows it:  for a server that changes on its own clock.
 * - What's read counts as fresh until the next one:  a page open across 5am reads again then
 *   (`pollWhileVisible()`'s `at`).
 * - Compiles to `checkedEvery: 86400`, and with a time, `checkedAt: { hour: 5, minute: 0 }`.
 * - Refuses an hour or a minute no clock has (`at 25`, `at 13pm`).
 */
export class CheckedAt extends PlaceDetail<"type|hour?|minute?|half?|zone?"> {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !match.groups) return match
    const { hour, minute, half } = match.groups
    if (hour && !CheckedAt.timeOf(match)) {
      const time = `${hour.raw}${minute ? `:${minute.raw}` : ""}${half ? ` ${half.raw}` : ""}`
      return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("check-time-not-a-time", { time }))
    }
    return match
  }

  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const checkedAt = CheckedAt.timeOf(match)
    return { checkedEvery: CHECK_UNIT_SECONDS.day!, ...(checkedAt && { checkedAt }) }
  }

  /** The time of day its words say, on a 24-hour clock:  `undefined` with none, or one no clock has. */
  static timeOf(match: P.MatchFor<CheckedAt>): PlaceDetailValue["checkedAt"] {
    const { hour, minute, half, zone } = match.groups
    if (!hour) return undefined
    let hours = Number(hour.raw)
    const minutes = minute ? Number(minute.raw) : 0
    const meaning = half ? Wording.meaningOf(half) : undefined
    if (meaning) {
      if (hours < 1 || hours > 12) return undefined
      hours = (hours % 12) + (meaning === "pm" ? 12 : 0)
    }
    if (!Number.isInteger(hours) || hours > 23 || !Number.isInteger(minutes) || minutes > 59) return undefined
    return { hour: hours, minute: minutes, ...(zone && Wording.meaningOf(zone) === "utc" && { utc: true }) }
  }
}
