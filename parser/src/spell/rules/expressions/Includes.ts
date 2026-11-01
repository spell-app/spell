import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `includes` rule:  `{lhs} includes`/`contains {rhs}`, e.g. `theList includes thing`.
 * - Compiles to `core.includes(lhs, rhs)`:  text ignores capitals, a list's items don't.
 * - `includes exactly`:  capitals count, `core.includesExactly(lhs, rhs)`.
 */
export class Includes extends InfixOperatorSuffix<"operator|exactly?|expression"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: match.groups.exactly ? "includesExactly" : "includes",
      args: [lhs!, rhs!]
    })
  }
}
