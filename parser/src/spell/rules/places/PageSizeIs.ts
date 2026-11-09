import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `page_size_is` rule:  how many a web server gives at a time, when asked (epic `data` P27).
 * - e.g. `- it gives up to 2000 at a time`:  PokéAPI's `?limit=2000`, every pokemon's name in one request
 * - e.g. `- it gives up to 100 at a time, asked for with "per_page"`:  what it calls that, when it isn't `limit` (T112),
 *   GitHub's `?per_page=100`.
 * - Its first page is asked for that many;  its next link says the rest, as it did.
 */
export class PageSizeIs extends PlaceDetail<"type|size|param?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { size, param } = match.groups
    return { pageSize: Number(size.raw), ...(param && { pageSizeAskedWith: textIn(param) }) }
  }
}
