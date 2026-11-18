import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"

/**
 * `next_weekend` rule:  when the next weekend starts, a date -- `the next weekend - now` is how long until it
 * (epic `language` P63).
 * - The midnight its first day begins, after today:  Saturday in most places, Friday where the person's region rests
 *   Friday and Saturday.  On a weekend day, the weekend after.
 * - Compiles to `core.nextWeekend()`.
 * - A program's own `next weekend` wins (`Priority.overridable`).
 */
export class NextWeekend extends SpellExpression {
  @proto static datatype = "date"
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, { datatype: "date", methodName: "nextWeekend" })
  }
}
