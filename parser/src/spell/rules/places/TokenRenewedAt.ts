import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `token_renewed_at` rule:  a place's secret is a token that renews itself, at its server's refresh route.
 * - e.g. `its token is renewed at "/api/auth/refresh"`, under `it is authenticated with the secret "ACME_TOKEN"`
 * - The address is under the place's own, or whole:  asked with a `GET`, the token as `Authorization: Bearer`,
 *   and its answer holds the new one (`token` or `access_token`).
 * - Spell's page server renews it before it runs out, keeps the new one where secrets are kept, and says how each
 *   token is (`PlaceToken`, `AuthenticatedPlaces`, in `spell/server/places`):  a sign-in token, copied once, lasts.
 * - Compiles to `renewsAt`, for the page server;  a program reads its place as it always does.
 */
export class TokenRenewedAt extends PlaceDetail<"type|address"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { renewsAt: textIn(match.groups.address) }
  }
}
