import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `stop_tour` rule:  stop the tour showing now (epic `editor` P40).
 * - e.g. `stop tour`, `stop the tour`;  Spanish `para el recorrido`
 * - "The tour" is ALWAYS the tour showing:  it beats `stop the deal`'s reading, an action named `tour`
 *   (`cancel_action`), and `stop its sound`'s (`Priority.specific`).
 * - Compiles to `core.stopTour()`;  no tour showing:  nothing happens.
 */
export class StopTour extends SpellStatement {
  @proto static alias = "statement"
  @proto static priority = Priority.specific

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, { methodName: "stopTour", args: [] })
  }
}
