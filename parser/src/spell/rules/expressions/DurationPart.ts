import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"
import { Wording } from "./Wording"

/**
 * `duration_part` rule:  one part of a duration, a whole number -- `the hours of its time left`, for a countdown
 * (epic `language` P63).
 * - `days`, all of them;  `hours`, 0 to 23;  `minutes` and `seconds`, 0 to 59:  2 days 3 hours is days 2, hours 3.
 * - Only of a DURATION, a measure (`SP.measureOf()`):  `its "delay" is a duration`, `the next weekend - now`.
 *   Of a date, `the seconds of now` is the date's own part, a member of the date.
 * - Compiles to `core.durationPartOf(seconds, "hours")`, the measure in seconds first (`SP.durationInSeconds()`).
 * - `Priority.specific`:  over a loose property read of the same words, `the hours of x` => `x.hours`.
 */
export class DurationPart extends SpellExpression<"part|expression"> {
  @proto static datatype = "number"
  @proto static priority = Priority.specific

  /** Only of a duration. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match?.is(DurationPart)) return match
    return SP.measureOf(match.groups.expression)?.dimension === SP.DURATION ? match : undefined
  }

  getAST(match: P.MatchFor<this>) {
    const { expression } = match.groups
    const part = new P.ASTStringLiteral(match, { value: Wording.meaningOf(match.groups.part)!, quote: '"' })
    const seconds = SP.durationInSeconds(expression, expression.AST as P.ASTExpression)
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "number",
      methodName: "durationPartOf",
      args: [seconds, part]
    })
  }
}
