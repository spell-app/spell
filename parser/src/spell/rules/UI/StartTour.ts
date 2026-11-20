import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `start_tour` rule:  start one of the page's tours, by its name (epic `editor` P40).
 * - e.g. `start tour "first game"`, `start the "first game" tour`;  Spanish `empieza el recorrido "primera partida"`
 * - At a given step, by its number (from 1) or its name (epic `editor` T128):
 *   `start tour "first game" at step 3`, `start the "first game" tour at step "drag"`;
 *   Spanish `empieza el recorrido "primera partida" en el paso 3`
 * - The quoted name is the tour's, its `<ui-tour name>`:  never a property, "the first game tour".
 * - Compiles to `core.startTour("first game")`, `core.startTour("first game", 3)` at a step;
 *   it finds Spell UI's tours on the page:
 *   none there, or none of that name:  it says so on the console, and goes on.
 * - In a handler too, as every tour line is (epic `editor` T128):  `<ui-button onClick={start tour "first game"}>`.
 * - Beats any other reading of the same words (`Priority.specific`):  `start the "x" tour` is always a tour.
 */
export class StartTour extends SpellStatement<"name|step?"> {
  @proto static alias = "statement"
  @proto static priority = Priority.specific

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "startTour",
      args: [match.groups.name, match.groups.step]
        .filter((group) => group !== undefined)
        .map((group) => P.asAST<P.ASTExpression>(group.AST))
    })
  }
}
