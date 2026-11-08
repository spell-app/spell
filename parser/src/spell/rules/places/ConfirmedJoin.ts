import { snakeCase } from "spell/util"
import type { P } from "spell/parser/parser"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/**
 * `confirmed_join` rule:  a confirmed row puts its guest in a space, an event's attendees' space (epic `atmosphere`
 * P31).
 * - e.g. `- confirmed tickets join "picnic@rs/__attendees"`:  once a manager sets a ticket's `status` to `"confirmed"`,
 *   its `guest` (else its `person`) reads the attendees' space
 * - Only a manager confirms:  someone signing up can't set a row's `status`.
 * - Compiles to `sheet: { joins: { collection: "tickets", address: "picnic@rs/__attendees" } }`.
 */
export class ConfirmedJoin extends PlaceDetail<"collection|address"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return {
      sheet: {
        joins: { collection: snakeCase(textIn(match.groups.collection)), address: textIn(match.groups.address) }
      }
    }
  }
}
