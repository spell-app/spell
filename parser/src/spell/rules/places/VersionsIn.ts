import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `versions_in` rule:  the field that says a row's version, on a web server that keeps one.
 * - e.g. `- its version is its "version"`, with the second `its` or without
 * - Then a change says what it was made from, and two people's changes merge, each field on its own.
 */
export class VersionsIn extends PlaceDetail<"type|field"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { versionsIn: textIn(match.groups.field) }
  }
}
