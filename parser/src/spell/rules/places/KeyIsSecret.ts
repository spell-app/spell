import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"

/** What the name of a secret looks like:  a name, not a key (a key is long, and has no words in it). */
const SECRET_NAME = /^[\p{Lu}][\p{Lu}\p{N}_]*$/u

/** The longest name a secret goes by:  anything longer is the key itself. */
const LONGEST_SECRET_NAME = 40

/**
 * `key_is_secret` rule:  the NAME of the key a place needs, never the key (epic `data` Q11).
 * - e.g. `- its key is the secret "COOKBOOK_KEY"`
 * - What looks like the key itself, rather than a name, won't compile.
 * - A browser program can't read one:  the place needs a small server side, and it says so.
 */
export class KeyIsSecret extends PlaceDetail<"type|name"> {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const name = textIn(match.groups.name)
    const language = SP.Language.of(scope)
    if (!SECRET_NAME.test(name) || name.length > LONGEST_SECRET_NAME) {
      return SpellStatement.refuse(match, language.parserMessage("key-not-a-name", { name }))
    }
    SP.SpellWarnings.note(match, language.parserMessage("key-needs-server-side", { name }))
    return match
  }

  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { keyNamed: textIn(match.groups.name) }
  }
}
