import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `data_is_private` rule:  a place's real rows stay on this machine, out of the project (epic `data` P49, Q55 C).
 * - e.g. `its data is private, located in "~/.spell/places/netbox"`
 * - `spell place ingest`, `update` and `verify` keep to it:  no real value goes in its description, `<Name>.api.json5`;
 *   the rows they read go in that folder, as `spell place read-page`'s samples files do.
 * - Left out, `located in ...` is `~/.spell/places/<the place's name>`.
 * - Compiles to the folder, for whatever shows a place's rows while designing (`privateDataIn`);  a program reads its place
 *   as it always does.
 */
export class DataIsPrivate extends PlaceDetail<"type|path?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const path = match.groups.path ? textIn(match.groups.path) : ""
    return { privateDataIn: path }
  }
}
