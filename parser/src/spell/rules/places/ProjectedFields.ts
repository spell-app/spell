import type { P } from "spell/parser/parser"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/**
 * `projected_fields` rule:  which of each thing's fields a projection shows (epic `atmosphere` P17).
 * - e.g. `- showing each row's person and shift`
 * - Only these:  a field added to the source later stays private until someone names it here.
 * - The thing's word (`row`) is for the reader:  every thing in the source is shown the same way.
 * - Compiles to `projection: { fields: ["person", "shift"] }`, each by the name compiled code gives it.
 */
export class ProjectedFields extends PlaceDetail<"thing|fields"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const fields = match.groups.fields.items.map((item: P.Match) => fieldNamed(textIn(item)))
    return { projection: { fields } }
  }
}
