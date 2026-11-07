import type { P } from "spell/parser/parser"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/**
 * `sign_ups_from` rule:  who signs up on a sign-up sheet, though they can't read it (epic `atmosphere` P27).
 * - e.g. `- open to sign-ups from "picnic@rs"`, under the master sheet in the picnic's private space
 * - Anyone who reads that space adds rows here, and changes or removes only their own;  the organizers' notes stay
 *   private, as nobody but the space's own members reads it.
 * - Compiles to `sheet: { signUpsFrom: "picnic@rs" }`;  a manager's page tells the space as it opens it.
 */
export class SignUpsFrom extends PlaceDetail<"address"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { sheet: { signUpsFrom: textIn(match.groups.address) } }
  }
}
