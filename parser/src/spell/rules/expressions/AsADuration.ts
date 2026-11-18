import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Wording } from "./Wording"
import { Precedence, type OperatorOperands } from "./expressions.shared"
import { type UnitWordsData } from "./UnitWords"

/**
 * `as_a_duration` rule:  how long ago a date was, or how long until it is, as text -- `its added as a duration`,
 * `30 minutes ago`, `in 2 days`, `tomorrow` (epic `language` P63).
 * - It rounds by itself:  its two biggest parts, `in 2 days, 3 hours`.
 *   - `as a short duration`:  one part, rounded to the scale, `1 day ago` for 23 hours 46 minutes, `in 2 weeks`
 *   - `as a long duration`:  every part, to the second, `23 hours, 46 minutes, 35 seconds ago`
 *   - `as a duration in days`:  in that unit, `in 3 days`
 * - On a date:  `core.timeFromNow(lhs, "short")`.
 * - On a duration, a measure (`its "delay" is a duration`, `its due - now`):  how long, `2 days, 3 hours` --
 *   `core.durationText(seconds, ...)`, the measure in seconds first.  A plain number is seconds.
 * - Weeks, months and years are only words it says:  a month has no fixed length, so it's never a unit a duration is in.
 */
export class AsADuration extends PostfixOperatorSuffix<"style?|unit?"> {
  @proto static precedence = Precedence.comparison
  @proto static datatype = "text"

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    const text = (value: string) => new P.ASTStringLiteral(match, { value, quote: '"' })
    const style = text(Wording.meaningOf(match.groups.style) ?? "normal")
    const unit = (match.groups.unit?.data as UnitWordsData | undefined)?.unit?.id
    const said = unit ? [style, text(unit)] : match.groups.style ? [style] : []
    if (SP.isDateAST(lhs!)) {
      return new P.ASTCoreMethodInvocation(match, {
        datatype: "text",
        methodName: "timeFromNow",
        args: [lhs!, ...said]
      })
    }
    const seconds = SP.durationInSeconds(lhs!.match, lhs!)
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "text",
      methodName: "durationText",
      args: [seconds, ...said]
    })
  }
}
