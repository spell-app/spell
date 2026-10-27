import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_in` rule:  `{lhs} is [not] in`/`one of`/`either`/`neither ... nor {list}`.
 * - e.g. `thing is in theList`, `thing is neither red nor green`
 * - `expression` group accepts either an `operand` (a list variable)
 *   or an inline `identifier_list`, e.g. `either red or green`.
 * - Negated by its word rules' `negated` forms, e.g. `is not in`, `is neither` -- see `Negatable`.
 * - Compiles to `core.includes(list, lhs)` -- NOTE argument order is reversed from `lhs`/`rhs`.
 */
export class IsIn extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "includes",
      args: [rhs!, lhs!]
    })
  }
}
