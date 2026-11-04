import { fieldPathOf, PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `rows_in` rule:  where a web server's list keeps its rows, when it doesn't answer with the list itself.
 * - e.g. `- its rows are its "results"`, with the second `its` or without
 * - Further in, in words:  `- its rows are the "items" of its "data"`.
 * - For every collection of that place.
 */
export class RowsIn extends PlaceDetail<"type|field|inner?|outer?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { rowsIn: fieldPathOf(match.groups) }
  }
}
