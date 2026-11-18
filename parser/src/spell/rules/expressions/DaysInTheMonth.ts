import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"

/**
 * `days_in_the_month` rule:  how many days a date's month has, 28 to 31 -- `the days in the month of now`, for a
 * calendar (epic `language` P63).
 * - Compiles to `core.daysInMonth(date)`.
 * - `Priority.mostSpecific`:  over `the days in <a list>`, the items of a list.
 */
export class DaysInTheMonth extends SpellExpression<"expression"> {
  @proto static datatype = "number"
  @proto static priority = Priority.mostSpecific

  getAST(match: P.MatchFor<this>) {
    const args = [match.groups.expression.AST as P.ASTExpression]
    return new P.ASTCoreMethodInvocation(match, { datatype: "number", methodName: "daysInMonth", args })
  }
}
