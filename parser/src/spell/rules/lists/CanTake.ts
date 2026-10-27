import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { InfixOperatorSuffix, Precedence } from "spell-parser/spell/rules/expressions"
import { type GuardOperands } from "./lists.shared"

/**
 * `can_take` rule:  `{list} can take {thing}` -- would the list take it, moved there?
 * - Its guard says:  `a tableau can take a card if: ...`.  Yes, if it has none.
 * - `add` ~== `take`;  `can't`, `cannot` for the opposite.
 * - Compiles to `core.canTake(tableau, card)`.
 */
export class CanTake extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.Match, { lhs, rhs }: GuardOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "canTake", args: [lhs!, rhs!] })
  }
}
