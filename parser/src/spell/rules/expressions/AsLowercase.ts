import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `as_lowercase` rule:  `as lower case`/`lowercase` postfix, e.g. `"foo" as lower case`.
 * - Compiles to `core.lowerCase(lhs)`.
 */
export class AsLowercase extends PostfixOperatorSuffix {
  @proto static precedence = Precedence.comparison
  @proto static datatype = "text"

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "lowerCase",
      args: [lhs!]
    })
  }
}
