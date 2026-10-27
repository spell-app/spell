import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `does_not_include` rule:  `{lhs} does not include`/`contain {rhs}`, e.g. `theList does not include thing`.
 * - Always negates via `shouldNegateOutput()`, then delegates to same `core.includes()` as `includes`.
 */
export class DoesNotInclude extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison

  shouldNegateOutput(): boolean {
    return true
  }
  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "includes",
      args: [lhs!, rhs!]
    })
  }
}
