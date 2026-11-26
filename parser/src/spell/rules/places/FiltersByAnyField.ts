import type { P } from "spell/parser/parser"
import { collectionNameFor } from "./places.shared"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/**
 * `filters_by_any_field` rule:  a web server's list filters by any field, asked the field and the value as two
 * questions.
 * - e.g., one step in under its `live at` line, `jobs can be filtered by any field, with "field" and "value"`:
 *   `every job where its status is "open"` asks `?field=status&value=open`.
 * - One field at a time:  a `where` naming more sends the first, and the rest is checked on the Spell server, over
 *   what came back.
 * - Or `it can be filtered by any field, with "field" and "value"`:  under a list's line, `it` is that list;  under
 *   the place's, every list.
 * - Spanish:  `los trabajos se pueden filtrar por cualquier campo, con "field" y "value"`, `se puede filtrar por ...`.
 * - Compiles to the list's `filters: "every field"` and `filteredWith`.
 */
export class FiltersByAnyField extends PlaceDetail<"collection?|type?|field|value"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const filteredWith = { field: textIn(match.groups.field), value: textIn(match.groups.value) }
    const asks = { filters: "every field" as const, filteredWith }
    const { collection } = match.groups
    // `it`:  the list it's under, or every list
    if (!collection) return asks
    return { collections: { [collectionNameFor(`${collection.raw}`.replace(/s$/, ""))]: asks } }
  }
}
