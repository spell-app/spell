import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `rows_in` rule:  where a web server's list keeps its rows, when it doesn't answer with the list itself.
 * - e.g. `- its rows are its "results"`, with the second `its` or without;  a dotted path reaches further in, `"data.items"`
 * - For every collection of that place.
 */
export class RowsIn extends PlaceDetail<"type|field"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { rowsIn: textIn(match.groups.field) }
  }
}
