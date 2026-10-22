import { P } from "spell-lang/parser"
import { SpellIdentifier } from "./SpellIdentifier"

/**
 * `singular_identifier` rule:  possibly-unknown variable identifier which MUST be singular, WITHOUT `the`
 *   -- fails on plural input.
 */
export class SingularIdentifier extends SpellIdentifier {
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    // Anything but a definite plural will do -- uncountable words (`"either"`) match here AND in `plural_identifier`.
    if (!match || super.getPlurality(match) === "plural") return undefined
    return match
  }

  /** Whatever the word, a match of ours IS singular as far as anyone downstream is concerned. */
  getPlurality(_match: P.MatchFor<this>): P.Plurality {
    return "singular"
  }
}
