import { collectionNameFor } from "./places.shared"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `collection_searched_with` rule:  how ONE collection of a web server is searched, at an address of its own,
 * when its collections don't all search the same way (epic `data` P41).
 * - e.g. GitHub's:
 *   - `- users are searched with "q" at "/search/users"`:  found by name at `/users/{name}` too
 *   - `- repositories are searched with "q" at "/search/repositories"`:  given only to a search,
 *     as nothing else says where they are (`CreatePlace.detailsOf()` marks it `searchedOnly`)
 * - It searches all of each thing, as `- it searches everything with "q"` does:
 *   `every user matching the search` asks the server, and takes what it answers as it is.
 * - Compiles to `collections: { users: { searches: { param: "q", fields: [], at: "/search/users" } } }`.
 */
export class CollectionSearchedWith extends PlaceDetail<"collection|param|path?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { collection, param, path } = match.groups
    const name = collectionNameFor(`${collection.raw}`.replace(/s$/, ""))
    const searches = { param: textIn(param), fields: [], ...(path && { at: textIn(path) }) }
    return { collections: { [name]: { searches } } }
  }
}
