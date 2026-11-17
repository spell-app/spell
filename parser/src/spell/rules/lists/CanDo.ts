import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { Negatable, SpellExpression } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Through the folder:  read only when parsing
import { DynamicMethodRule } from "spell/parser/spell/rules/methods"

/**
 * `can_do` rule:  does an action say yes, asked of each item in a `where` (epic `language` T146) --
 * `the first card in the columns where it is face up and can play the card`.
 * - `can` then a call of one of the program's actions, written as a step is:  `play the card`.
 *   - `it` before `can` is optional:  `where it can play the card`, `... and can play the card`.
 *   - Spanish:  `donde puede jugar la carta`, its subject left out.
 * - It RUNS the action, and reads its yes or no:  `card.play()`.
 *   - So `the first card ... where it can play the card` asks one card at a time, stopping at the first yes:
 *     the cards after it aren't played (`OrdinalWhereExpression`, `core.itemWhere()`).
 * - `cannot` / `can't`:  its no.
 * - Only a call:  `it can take the card` is still `can_take`, a list's guard asked.
 * - An action KNOWN to give back something other than yes or no is refused (`can-do-yes-or-no`):
 *   asked when the errors are gathered, as an action's `returns` is set once its body has parsed.
 */
export class CanDo extends SpellExpression<"operator|call"> {
  @proto static datatype = "choice"
  // as `implied_it`'s:  in Spanish, `puede jugarla` in an action of a thing is ours, not `it` left out before `puede`
  @proto static priority = Priority.preferred

  /** Only a call of an action:  anything else is some other rule's (`can take`). */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { call } = match.groups
    if (!CanDo.isActionCall(call)) return undefined
    SP.SpellWarnings.refuseIf(
      match,
      () => SP.Language.of(scope).parserMessage("can-do-yes-or-no", { call: call.inputText.trim() }),
      () => CanDo.answersOtherThanYesOrNo(call)
    )
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { operator, call } = match.groups
    const asked = P.matchAST<P.ASTExpression>(call)
    return Negatable.isNegated(operator) ? new P.ASTNotExpression(match, { expression: asked }) : asked
  }

  /** Is `call` a call of one of the program's actions, as a statement or an operand? */
  static isActionCall(call: P.Match): boolean {
    return SpellStatement.statementRuleOf(call.rule) instanceof DynamicMethodRule
  }

  /** Does `match`, a condition, ask an action anywhere in it? */
  static isIn(match: P.Match): boolean {
    if (match.rule instanceof CanDo) return true
    return match.matched.some((item) => item instanceof P.Match && CanDo.isIn(item))
  }

  /** Does `call`'s action KNOW it gives back something other than yes or no? */
  static answersOtherThanYesOrNo(call: P.Match): boolean {
    const { datatype } = call
    return datatype !== undefined && datatype !== "choice"
  }
}
