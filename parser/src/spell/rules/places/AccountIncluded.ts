import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `account_included` rule:  whose records a shared atmosphere account puts together, one line per account.
 * - e.g. `- it includes the account "did:plc:abc123"`
 * - With none, whoever holds its records, up to a limit:  anyone can add themselves, so a family's cookbook says who it means.
 * - The person signed in is always one of them.
 */
export class AccountIncluded extends PlaceDetail<"type|account"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { accounts: [textIn(match.groups.account)] }
  }
}
