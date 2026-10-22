import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { InfixOperatorSuffix, Precedence } from "spell-lang/spell/rules/expressions"
import { type GuardOperands } from "./lists.shared"

/**
 * `can_give_up` rule:  `{list} can give up {thing}` -- would the list give it up, moved elsewhere?  Its guard says:
 * `a stock-pile can give up a card if: ...`.  Yes, if it has none.
 * - `release` ~== `remove` ~== `give up` ~== `let go of`;  `can't`, `cannot` for the opposite.
 * - Compiles to `core.canGiveUp(stock, card)`.
 */
export class CanGiveUp extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.Match, { lhs, rhs }: GuardOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "canGiveUp", args: [lhs!, rhs!] })
  }
}
