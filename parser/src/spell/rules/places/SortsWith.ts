import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `sorts_with` rule:  what a web server calls its sort, said once, for a list's named sorts (`NamedSorts`).
 * - e.g. `- it sorts with "order_by"`:  `?order_by=recency`.
 * - The same question `it sorts by created at with "order_by"` names;  left unsaid, it's called `sort`.
 * - Under a list's `live at` line, that list's alone (`CollectionAt`);  else every list's.
 */
export class SortsWith extends PlaceDetail<"type|param"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { sortedWith: textIn(match.groups.param) }
  }
}
