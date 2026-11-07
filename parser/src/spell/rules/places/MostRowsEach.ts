import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `most_rows_each` rule:  how many rows a sign-up sheet takes with the same field (epic `atmosphere` P27).
 * - e.g. `- at most 2 rows for each shift`:  each shift's places
 * - Two asking for the last place at once:  one gets it, the other is told it's gone (`write-refused-full`).
 * - Compiles to `sheet: { mostEach: { field: "shift", most: 2 } }`, the field by the name compiled code gives it.
 */
export class MostRowsEach extends PlaceDetail<"most|field"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return {
      sheet: { mostEach: { field: fieldNamed(textIn(match.groups.field)), most: Number(match.groups.most.raw) } }
    }
  }
}
