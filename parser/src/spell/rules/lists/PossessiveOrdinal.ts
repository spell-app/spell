import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { PossessiveMark, PossessiveProperty } from "spell/parser/spell/rules/properties"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { OrdinalPositionExpression } from "./OrdinalPositionExpression"

/**
 * `possessive_ordinal` rule:  `the deck's first card` ~== `the first card of the deck` (epic `language`, P16).
 * - Its owner is a possessive's (`possessive_owner`):  any operand ending at the `'s`, not a call.
 *   - `it's first card` is refused, as `it's name` is:  `it's` means "it is".
 * - `Priority.specific`:  above a loose possessive taking one word (`the deck's first`),
 *   below a member the owner's type declares by these words, e.g. a deck's own `last card` (`possessive_property`).
 * - English only, as `possessive_property` is:  a translation writes `the first card of the deck`.
 */
export class PossessiveOrdinal extends OrdinalPositionExpression {
  @proto static priority = Priority.specific
  /** Another language writes it as `the first card of the deck`, its groups the same:  see `Translator`. */
  @proto static writtenAs = "ordinal_position_expression"

  /** Quick test:  an `'s` after our first token. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return PossessiveMark.isIn(tokens, start) && super.test(scope, tokens, start)
  }

  /** Not after a call;  refuse `it's`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { expression: owner, ordinal, arg } = match.groups
    if (SP.SpellStatement.statementRuleOf(owner.rule) !== owner.rule) return undefined
    if (PossessiveProperty.isIt(scope, owner)) {
      const property = P.Tokenizer.join([...ordinal.tokens, ...arg.tokens])
      const message = SP.Language.of(scope).parserMessage("its-not-it-is", { property })
      SP.SpellWarnings.refuseIf(match, message, () => true, owner)
    }
    return match
  }

  /** None:  our owner comes before the `'s`, not after an `of`. */
  ofObject(match: P.Match): P.Match | undefined {
    return undefined
  }
}
