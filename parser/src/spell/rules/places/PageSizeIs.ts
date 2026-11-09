import { PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `page_size_is` rule:  how many a web server gives at a time, when asked (epic `data` P27).
 * - e.g. `- it gives up to 2000 at a time`:  PokéAPI's `?limit=2000`, every pokemon's name in one request
 * - Its first page is asked for that many;  its next link says the rest, as it did.
 */
export class PageSizeIs extends PlaceDetail<"type|size"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { pageSize: Number(match.groups.size.raw) }
  }
}
