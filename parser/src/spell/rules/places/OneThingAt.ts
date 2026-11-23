import { collectionNameFor } from "./places.shared"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `one_thing_at` rule:  a web server answers ONE thing at an address of its own, not a list:  its status, its version.
 * - e.g. `- the server status lives at "/api/status"`:  read, it's a list of that one thing
 * - Asked for with no page:  it has none.
 * - One under each thing of another type is `a system's snapshot lives at "..."` (`ListsUnder`).
 */
export class OneThingAt extends PlaceDetail<"type|path"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const name = collectionNameFor(`${match.groups.type.raw}`)
    return { collections: { [name]: { at: textIn(match.groups.path), isOne: true } } }
  }
}
