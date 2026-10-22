import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_empty` rule:  `{lhs} is [not] empty` postfix, e.g. `thing is empty`.
 * - Compiles to `core.isEmpty(lhs)`, negated for `is not empty`.
 */
export class IsEmpty extends PostfixOperatorSuffix<"operator"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "isEmpty",
      args: [lhs!]
    })
  }
}
