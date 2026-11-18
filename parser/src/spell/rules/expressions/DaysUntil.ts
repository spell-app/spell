import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"

/**
 * `days_until` rule:  how many days until a date, or since one, counting midnights -- `the days until its due`,
 * `the days since its added` (epic `language` P63).
 * - 11 PM to 1 AM is 1 day:  calendar days, not 24-hour stretches.
 * - Compiles to `core.daysUntil(date)` or `core.daysSince(date)`.
 * - `Priority.specific`:  over a property read of `days`.
 */
export class DaysUntil extends SpellExpression<"until?|since?|expression"> {
  @proto static datatype = "number"
  @proto static priority = Priority.specific

  getAST(match: P.MatchFor<this>) {
    const { since, expression } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "number",
      methodName: since ? "daysSince" : "daysUntil",
      args: [expression.AST as P.ASTExpression]
    })
  }
}
