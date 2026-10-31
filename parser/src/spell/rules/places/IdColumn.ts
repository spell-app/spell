import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `id_column` rule:  the column that says which row is which, on a sheet.
 * - e.g. `- its ids are in "id"`
 * - Without it, rows share no identity.
 */
export class IdColumn extends PlaceDetail<"type|column"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { idColumn: textIn(match.groups.column) }
  }
}
