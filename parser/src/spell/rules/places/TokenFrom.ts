import { KeyIsSecret } from "./KeyIsSecret"
import { textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `token_from` rule:  a place's key is a short-lived token, made from a secret at a token service
 * (epic `data` P49, Q50 A).
 * - e.g. `its token comes from "https://auth.acme.test/api-keys/{key id}/token", made with the secret "ACME_API_KEY"`
 * - The secret holds `<key id>:<secret>`, sent to the token service with Basic sign-in;  a brace there is filled from
 *   the key id.
 * - Spell makes the token, keeps it, and makes another before it runs out:  on a server side, as a key is kept
 *   (`PlaceToken`, in `spell/server/places`).  So it needs a server side, and says so, as `its key is the secret` does.
 * - The secret is named, never written:  what looks like the secret itself won't compile.
 */
export class TokenFrom extends KeyIsSecret {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { ...super.detailOf(match), tokenFrom: textIn((match.groups as unknown as { address: P.Match }).address) }
  }
}
