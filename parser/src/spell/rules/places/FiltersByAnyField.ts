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
 * - Spanish:  `los trabajos se pueden filtrar por cualquier campo, con "field" y "value"`.
 * - Compiles to the list's `filters: "every field"` and `filteredWith`.
 */
export class FiltersByAnyField extends PlaceDetail<"collection|field|value"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const name = collectionNameFor(`${match.groups.collection.raw}`.replace(/s$/, ""))
    const filteredWith = { field: textIn(match.groups.field), value: textIn(match.groups.value) }
    return { collections: { [name]: { filters: "every field", filteredWith } } }
  }
}
