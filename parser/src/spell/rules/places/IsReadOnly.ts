import { PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `is_read_only` rule:  a place takes no writes, whatever its kind can do (epic `data` I35).
 * - e.g. `- it is read only`:  a web server that takes only `GET`
 * - A write to anything saved there won't compile (`isReadOnlyPlace()`), as with a CSV file at an address.
 * - A web server also says so while it runs (`write: "none"`).
 */
export class IsReadOnly extends PlaceDetail<"type"> {
  detailOf(_match: P.MatchFor<this>): PlaceDetailValue {
    return { readOnly: true }
  }
}
