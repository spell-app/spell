import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `exists` rule:  `{lhs} exists`/`does not exist` postfix, e.g. `thing exists`.
 * - Same underlying `core.isDefined()` as `is_defined`, just different surface syntax.
 */
export class Exists extends PostfixOperatorSuffix {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "isDefined",
      args: [lhs!]
    })
  }
}
