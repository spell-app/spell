import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/** What a header's name looks like:  HTTP's token characters. */
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/

/**
 * `key_goes_in_header` rule:  the header a server wants its secret in, as it is (epic `data` T73).
 * - e.g. `- its secret goes in its "X-Api-Key" header`
 * - The old words, `its key goes in its "..." header`, still read, with a warning (`OLD_KEY_GOES_IN_HEADER`).
 * - Says only where it goes, its name is `it is authenticated with the secret "..."`'s:  with neither line, nothing's sent.
 * - Without this line, or `KeyGoesInAddress`, a key goes as `Authorization: Bearer`.
 * - A name no header can have won't compile.
 */
export class KeyGoesInHeader extends PlaceDetail<"type|name"> {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const name = textIn(match.groups.name)
    if (HEADER_NAME.test(name)) return match
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("key-goes-bad-header", { name }))
  }

  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { keyGoes: { header: textIn(match.groups.name) } }
  }
}

/** `key_goes_in_header` in its old words, `its key goes in its "..." header`:  the same, with a warning. */
export const OLD_KEY_GOES_IN_HEADER = KeyGoesInHeader.specialize({ oldWords: true })
