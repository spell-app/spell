import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `move_tour_step` rule:  one step on, or one step back, in the tour showing (epic `editor` P40).
 * - e.g. `go to the next step`, `show the next step`, `show the next step of the tour`;
 *   Spanish `ve al siguiente paso`, `muestra el siguiente paso del recorrido`
 * - e.g. `go back a step`;  Spanish `retrocede un paso`
 *   - A bare `go back` is NOT this:  in HyperTalk, it's the browser's Back.
 * - Its syntax marks the step on with a `next` group;  without one, it's a step back.
 * - Beats a site's page named "next step" (`show_site_part`) and a method of the program's own (`Priority.specific`).
 * - Compiles to `core.nextTourStep()`, `core.previousTourStep()`.
 */
export class MoveTourStep extends SpellStatement<"next?"> {
  @proto static alias = "statement"
  @proto static priority = Priority.specific

  getAST(match: P.MatchFor<this>) {
    const methodName = match.groups.next ? "nextTourStep" : "previousTourStep"
    return new P.ASTCoreMethodInvocation(match, { methodName, args: [] })
  }
}
