import { PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `checked_every` rule:  how often to ask a place that can't announce what changed.
 * - e.g. `- it is checked every 30 seconds`
 */
export class CheckedEvery extends PlaceDetail<"type|number"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { checkedEvery: Number(match.groups.number.raw) }
  }
}
