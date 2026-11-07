import type { P } from "spell/parser/parser"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/**
 * `projected_into` rule:  the space a projection is written into, by its address (epic `atmosphere` P17).
 * - e.g. `- into "@rs/picnic"`, under `the published sheet is a projection of the sign up sheet`
 * - Whoever that space's list says reads it:  its members, or anyone, when it's public.
 * - Compiles to `projection: { into: "@rs/picnic" }`, and the place's own address, that space's folder.
 */
export class ProjectedInto extends PlaceDetail<"address"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { projection: { into: textIn(match.groups.address) } }
  }
}
