import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/** What a question in an address looks like. */
const QUESTION_NAME = /^[A-Za-z0-9_.~-]+$/

/**
 * `key_goes_in_address` rule:  the question a server wants its key asked as, in the address (epic `data` T73).
 * - e.g. `- its key goes in the address as "api_key"`:  `?api_key=...`, Google's `?key=` and the like
 * - Only the question's name is ever written:  the key is `its key is the secret "..."`'s, added on a server side.
 * - It's hidden from every message and log that names the address (`keyHidden()`).
 * - A name no question can have won't compile.
 */
export class KeyGoesInAddress extends PlaceDetail<"type|name"> {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const name = textIn(match.groups.name)
    if (QUESTION_NAME.test(name)) return match
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("key-goes-bad-question", { name }))
  }

  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { keyGoes: { inAddress: textIn(match.groups.name) } }
  }
}
