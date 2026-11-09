import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `searches_everything` rule:  a web server that searches all of each thing for text, not one field,
 * and the query parameter it takes (epic `data` P34).
 * - e.g. `- it searches everything with "q"`
 * - e.g. `- it searches everything with "q" at "/v1.1/search"`:
 *   the Met Museum's, at an address of its own, not its list's
 * - Then `every artwork matching the search` asks the server, and takes what it answers as it is:
 *   nothing says where it matched, a title or a tag, so nothing here checks.
 * - Compiles to `searches: { param: "q", fields: [], at: "/v1.1/search" }`, on the place's `core.place()`.
 */
export class SearchesEverything extends PlaceDetail<"type|param|path?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { param, path } = match.groups
    return { searches: { param: textIn(param), fields: [], ...(path && { at: textIn(path) }) } }
  }
}
