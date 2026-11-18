import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Wording } from "./Wording"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/** The units a duration is said in, biggest first, by id:  `in days and months` is said `in months and days`. */
const SAID_UNITS = ["year", "month", "week", "day", "hour", "minute", "second"]

/**
 * `as_a_duration` rule:  how long ago a date was, or how long until it is, as text -- `its added as a duration`,
 * `30 minutes ago`, `in 2 days`, `tomorrow` (epic `language` P63).
 * - It rounds by itself:  its two biggest parts, `in 2 days, 3 hours`.
 *   - `as a short duration`:  one part, rounded to the scale, `1 day ago` for 23 hours 46 minutes, `in 2 weeks`
 *   - `as a long duration`:  every part, to the second, `23 hours, 46 minutes, 35 seconds ago`
 *   - `as a duration in days`:  in that unit, `in 3 days`
 *   - `as a duration in months and days`:  in those, biggest first whatever the order they're named in,
 *     `in 1 month, 3 days` (epic `language` J253);  any of years, months, weeks, days, hours, minutes, seconds
 * - On a date:  `core.timeFromNow(lhs, "short")`.
 * - On a duration, a measure (`its "delay" is a duration`, `its due - now`):  how long, `2 days, 3 hours` --
 *   `core.durationText(seconds, ...)`, the measure in seconds first.  A plain number is seconds.
 * - A month has no fixed length:  from a date it's the calendar's, in a duration alone 30 days (a year 365).
 */
export class AsADuration extends PostfixOperatorSuffix<"style?|units?"> {
  @proto static precedence = Precedence.comparison
  @proto static datatype = "text"

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    const text = (value: string) => new P.ASTStringLiteral(match, { value, quote: '"' })
    const style = text(Wording.meaningOf(match.groups.style) ?? "normal")
    const units = AsADuration.unitsOf(match)
    const unit =
      units.length > 1
        ? new P.ASTArrayLiteral(match, { items: units.map(text), wrap: false })
        : units[0] && text(units[0])
    const said = unit ? [style, unit] : match.groups.style ? [style] : []
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

  /** The units named, by id, each once, biggest first:  `in days and months` => `["month", "day"]`. */
  static unitsOf(match: P.Match): string[] {
    const named = (match.groups.units as P.Match | undefined)?.matched ?? []
    const ids = named.flatMap((item) => (item instanceof P.Match ? [Wording.meaningOf(item)] : []))
    return SAID_UNITS.filter((unit) => ids.includes(unit))
  }
}
