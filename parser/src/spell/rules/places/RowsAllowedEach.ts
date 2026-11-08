import { snakeCase } from "spell/util"
import type { P } from "spell/parser/parser"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/**
 * `rows_allowed_each` rule:  how many rows each person may add, as their row on the sheet's list says (epic `atmosphere`
 * P31).
 * - e.g. `- each person asks for at most their "invitations" tickets`:  Bo's attendee row says 3, so his fourth ticket
 *   is refused, in his own language (`write-refused-used-up`)
 * - Their row:  the list `only its attendees add rows` names, by its `person`;  a manager isn't held to it.
 * - Each change to their rows sends them their count, an update in their inbox:  "You've asked for 2 of your 3".
 * - Compiles to `sheet: { allowance: { collection: "tickets", field: "invitations" } }`.
 */
export class RowsAllowedEach extends PlaceDetail<"field|collection"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const collection = snakeCase(textIn(match.groups.collection))
    return { sheet: { allowance: { collection, field: fieldNamed(textIn(match.groups.field)) } } }
  }
}
