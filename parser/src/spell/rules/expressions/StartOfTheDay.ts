import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"

/**
 * `start_of_the_day` rule:  the moment a date's day starts or ends -- `the start of the day of now` (midnight),
 * `the end of the day of its due` (11:59:59 PM) (epic `language` P63).
 * - Compiles to `core.startOfDay(date)` or `core.endOfDay(date)`.
 * - `Priority.mostSpecific`:  over `the start of (the day of now)`, a read of the day's number.
 */
export class StartOfTheDay extends SpellExpression<"start?|end?|expression"> {
  @proto static datatype = "date"
  @proto static priority = Priority.mostSpecific

  getAST(match: P.MatchFor<this>) {
    const { end, expression } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "date",
      methodName: end ? "endOfDay" : "startOfDay",
      args: [expression.AST as P.ASTExpression]
    })
  }
}
