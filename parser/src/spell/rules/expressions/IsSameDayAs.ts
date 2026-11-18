import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_same_day_as` rule:  are two dates on the same day, whatever their times -- `if its due is the same day as now`
 * (epic `language` P63).
 * - Compiles to `core.isSameDay(lhs, rhs)`, negated for `is not`.
 */
export class IsSameDayAs extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "isSameDay", args: [lhs!, rhs!] })
  }
}
