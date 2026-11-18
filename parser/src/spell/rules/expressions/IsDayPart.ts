import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Wording } from "./Wording"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_day_part` rule:  is a date's time in a part of its day -- `if now is in the morning`, `if its due is at night`,
 * Spanish `si ahora es por la mañana` (epic `language` J252).
 * - The parts, Owen's hours:  morning 5 AM to noon, afternoon noon to 5 PM, early evening 5 to 7 PM, evening 5 to 9 PM,
 *   late evening 9 PM to midnight, night 9 PM to 5 AM.
 * - `this morning`:  today's too, `core.isDayPart(due, "morning", "today")`.
 * - Compiles to `core.isDayPart(lhs, "morning")`, negated for `is not`.
 * - Spanish `es la mañana` is the morning, `es mañana` tomorrow (`is_day_from_today`):  the part needs its `la`.
 */
export class IsDayPart extends PostfixOperatorSuffix<"operator|today?|part"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    const text = (value: string) => new P.ASTStringLiteral(match, { value, quote: '"' })
    const part = text(Wording.meaningOf(match.groups.part)!)
    const args = match.groups.today ? [lhs!, part, text("today")] : [lhs!, part]
    return new P.ASTCoreMethodInvocation(match, { methodName: "isDayPart", args })
  }
}
