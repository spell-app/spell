import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `includes` rule:  `{lhs} includes`/`contains {rhs}`, e.g. `theList includes thing`.
 * - Compiles to `core.includes(lhs, rhs)`.
 */
export class Includes extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "includes",
      args: [lhs!, rhs!]
    })
  }
}
