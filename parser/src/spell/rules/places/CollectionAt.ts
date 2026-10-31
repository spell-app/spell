import { collectionNameFor } from "./places.shared"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `collection_at` rule:  where a place keeps a type's things, when it's not where anyone would look.
 * - e.g. `- recipes are at "/dishes"`:  a web service's address for them
 * - On any other kind of place, the name they go by there.
 */
export class CollectionAt extends PlaceDetail<"collection|path"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const name = collectionNameFor(`${match.groups.collection.raw}`.replace(/s$/, ""))
    return { collections: { [name]: { at: textIn(match.groups.path) } } }
  }
}
