import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `id_column` rule:  the column that says which row is which, on a sheet or an airtable.
 * - e.g. `- its id is its "id"`, with the second `its` or without
 * - Without it, rows share no identity.
 */
export class IdColumn extends PlaceDetail<"type|column"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { idColumn: textIn(match.groups.column) }
  }
}
