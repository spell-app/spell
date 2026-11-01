import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `id_column` rule:  the field that says which row is which.
 * - e.g. `- its id is its "id"`, with the second `its` or without
 * - On a sheet or an airtable:  without it, rows share no identity.
 * - On a web server:  for every collection, when it isn't called `id`;  an id can be a whole address, `its id is its "url"`.
 */
export class IdColumn extends PlaceDetail<"type|column"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { idColumn: textIn(match.groups.column) }
  }
}
