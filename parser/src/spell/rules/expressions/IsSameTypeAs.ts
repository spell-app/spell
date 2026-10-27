import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_same_type_as` rule:  `{lhs} is [not] the same type as {rhs}`, e.g. `thing is the same type as other`.
 * - Negated by its word rule's `negated` forms, e.g. `isn't` -- see `Negatable`.
 * - Compiles to `core.matchesType(lhs, rhs)`.
 */
export class IsSameTypeAs extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "matchesType",
      args: [lhs!, rhs!]
    })
  }
}
