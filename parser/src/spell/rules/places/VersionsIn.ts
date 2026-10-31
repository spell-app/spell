import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `versions_in` rule:  the field that says a row's version, on a web service that keeps one.
 * - e.g. `- its versions are in "version"`
 * - Then a change says what it was made from, and two people's changes merge, each field on its own.
 */
export class VersionsIn extends PlaceDetail<"type|field"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { versionsIn: textIn(match.groups.field) }
  }
}
