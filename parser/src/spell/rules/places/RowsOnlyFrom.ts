import { snakeCase } from "spell/util"
import type { P } from "spell/parser/parser"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/**
 * `rows_only_from` rule:  a sign-up sheet takes rows only from the people its list names (epic `atmosphere` P27, J101).
 * - e.g. `- only its attendees add rows`:  each of its attendees names one, by their `person`
 * - Anyone else is refused, in their own language (`write-refused-not-listed`);  a manager isn't held to it.
 * - Checked where the write lands, after the role check:  never in the page, which anyone can change.
 * - Compiles to `sheet: { onlyFrom: "attendees" }`, the list's collection.
 */
export class RowsOnlyFrom extends PlaceDetail<"list"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { sheet: { onlyFrom: snakeCase(textIn(match.groups.list)) } }
  }
}
