import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"

/**
 * `now` rule:  this moment, as a date, e.g. `set the added of the note to now` => `core.now()`.
 * - A date, so its parts read as any date's:  `the hour of now`, `the short time of now`.
 * - A program's own `now` wins (`Priority.overridable`).
 * - As text, today:  `the date`, `the time` (`the_date` rule).
 */
export class Now extends SpellExpression {
  @proto static datatype = "date"
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, { datatype: "date", methodName: "now" })
  }
}
