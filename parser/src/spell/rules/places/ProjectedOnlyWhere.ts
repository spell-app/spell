import type { P } from "spell/parser/parser"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/**
 * `projected_only_where` rule:  which things a projection shows, by one field's text (epic `atmosphere` P17).
 * - e.g. `- only where its "status" is "confirmed"`
 * - A thing whose field changes away from it leaves the projection;  one that changes to it joins.
 * - Several lines:  a thing must match each.
 * - Compiles to `projection: { where: { status: "confirmed" } }`.
 */
export class ProjectedOnlyWhere extends PlaceDetail<"field|value"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const field = fieldNamed(textIn(match.groups.field))
    return { projection: { where: { [field]: textIn(match.groups.value) } } }
  }
}
