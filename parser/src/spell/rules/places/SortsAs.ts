import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `sorts_as` rule:  an order a web server has a name of its own for, sent as its sort.
 * - e.g. `- it sorts newest first by created at as "recency"`:  `every job, sorted by its created at, newest first`
 *   asks the server `?sort=recency`;  with `it sorts by created at with "order_by"`, `?order_by=recency`.
 * - e.g. `- it sorts oldest first by created at as "created_at", with "order_by"`:  the question's name on the line itself.
 * - Each line one order, one way round:  the other way round goes to the server only if a line names it too, or
 *   `it sorts by` names the field, which sends it `-created_at`.
 * - Under a list's `live at` line, that list's alone (`CollectionAt`);  else every list's.
 * - Compiles to `sortOrders: [{ field: "createdAt", descending: true, as: "recency" }]`, on the place's `core.place()`.
 */
export class SortsAs extends PlaceDetail<"type|descending?|ascending?|field|name|param?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { descending, field, name, param } = match.groups
    const order = { field: fieldNamed(textIn(field)), descending: !!descending, as: textIn(name) }
    return { sortOrders: [order], ...(param && { sortedWith: textIn(param) }) }
  }
}
