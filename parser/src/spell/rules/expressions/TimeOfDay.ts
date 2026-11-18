import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"

/**
 * `time_of_day` rule:  noon or midnight today, as a date -- `if now is after noon`, `antes de la medianoche`
 * (epic `language` J252).
 * - Compiles to `core.todayAt(12)` or `core.todayAt(0)`:  midnight is the one today STARTS at.
 * - A program's own `noon` wins (`Priority.overridable`), as `now` does.
 * - A time written as people write it, `9am`, `9:30 PM`, is `time_literal`'s.
 */
export class TimeOfDay extends SpellExpression<"noon?|midnight?"> {
  @proto static datatype = "date"
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>) {
    const hour = new P.ASTNumericLiteral(match, { value: match.groups.noon ? 12 : 0 })
    return new P.ASTCoreMethodInvocation(match, { datatype: "date", methodName: "todayAt", args: [hour] })
  }
}
