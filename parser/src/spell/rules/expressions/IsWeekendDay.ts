import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_weekend_day` rule:  is a date on the weekend -- `if now is a weekend day` (epic `language` P63).
 * - The person's region says which days:  Saturday and Sunday in most places, Friday and Saturday in some.
 * - Compiles to `core.isWeekendDay(lhs)`, negated for `is not`.
 */
export class IsWeekendDay extends PostfixOperatorSuffix<"operator"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "isWeekendDay", args: [lhs!] })
  }
}
