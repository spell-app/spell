import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Wording } from "./Wording"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `as_a_date` rule:  a date said one of HyperTalk's ways, or as a timestamp, e.g. `its time as a short date`.
 * - Compiles to `core.dateAs(lhs, "short")`:  `11/7/26`
 *   - `as a long date`, `as an abbreviated date`, `as a short time`, `as a long time`
 *   - `as a date and time`:  `Nov 7, 2026, 9:14 AM`
 *   - `as a timestamp`:  ISO 8601, in UTC, `2026-11-07T17:14:42.000Z`
 * - The same as reading the date's member, `the short date of its time`.
 * - Text, so nothing's a date any more;  nothing stays nothing.
 */
export class AsADate extends PostfixOperatorSuffix<"style"> {
  @proto static precedence = Precedence.comparison
  @proto static datatype = "text"

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    const style = Wording.meaningOf(match.groups.style)!.replace(/_/g, " ")
    const name = new P.ASTStringLiteral(match, { value: style, quote: '"' })
    return new P.ASTCoreMethodInvocation(match, { datatype: "text", methodName: "dateAs", args: [lhs!, name] })
  }
}
