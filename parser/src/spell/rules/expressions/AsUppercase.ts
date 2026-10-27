import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `as_uppercase` rule:  `as upper case`/`uppercase` postfix, e.g. `"foo" as upper case`.
 * - Compiles to `core.upperCase(lhs)`.
 */
export class AsUppercase extends PostfixOperatorSuffix {
  @proto static precedence = Precedence.comparison
  @proto static datatype = "text"

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "upperCase",
      args: [lhs!]
    })
  }
}
