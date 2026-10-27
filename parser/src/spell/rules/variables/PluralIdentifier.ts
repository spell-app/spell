import { P } from "spell-parser/parser"
import { SpellIdentifier } from "./SpellIdentifier"

/**
 * `plural_identifier` rule:  possibly-unknown variable identifier which MUST be plural, WITHOUT `the`
 *   -- fails on singular input.
 */
export class PluralIdentifier extends SpellIdentifier {
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    // Anything but a definite singular will do:
    // uncountable words (`"either"`) match here AND in `singular_identifier`.
    if (!match || super.getPlurality(match) === "singular") return undefined
    return match
  }

  /** Whatever the word, a match of ours IS plural as far as anyone downstream is concerned. */
  getPlurality(_match: P.MatchFor<this>): P.Plurality {
    return "plural"
  }
}
