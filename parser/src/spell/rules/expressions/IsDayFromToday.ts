import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_day_from_today` rule:  is a date today, tomorrow or yesterday, whatever its time -- `if its due is tomorrow`
 * (epic `language` P63).
 * - Compiles to `core.isDaysFromToday(lhs, 1)`:  0 today, 1 tomorrow, -1 yesterday;  negated for `is not`.
 */
export class IsDayFromToday extends PostfixOperatorSuffix<"operator|today?|tomorrow?|yesterday?"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    const { tomorrow, yesterday } = match.groups
    const offset = new P.ASTNumericLiteral(match, { value: tomorrow ? 1 : yesterday ? -1 : 0 })
    return new P.ASTCoreMethodInvocation(match, { methodName: "isDaysFromToday", args: [lhs!, offset] })
  }
}
