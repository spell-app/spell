import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_in_a_type` rule:  `{lhs} is [not] in a {list type}` -- is it in any list of that type?
 * - e.g. `the card is in a column`, `the card isn't in a foundation` (epic `language` P55)
 * - Spanish:  `la carta está en una columna`.
 * - Any of the program's lists of that type, or of a sub-type:  as `every column` finds them.
 * - Compiles to `core.isInA(card, Column)`;  Python's `core.is_in_a(card, Column)`.
 * - `is in the stock`, one list, is `is_in`'s.
 */
export class IsInAType extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "isInA", args: [lhs!, rhs!] })
  }
}
