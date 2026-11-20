import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `show_tour_step` rule:  go straight to one step of the tour showing, by its number or its name (epic `editor` P40).
 * - e.g. `show step 3`, `show tour step 3`, `show the tour step 3`, `show step "drag"`;
 *   Spanish `muestra el paso 3`, `muestra el paso "arrastrar" del recorrido`
 * - Its number counts from 1;  its name is the step's `<ui-tour-step name>`.
 * - Beats a site's part and a method of the program's own of the same words (`Priority.specific`).
 * - Compiles to `core.showTourStep(3)`, `core.showTourStep("drag")`.
 */
export class ShowTourStep extends SpellStatement<"step"> {
  @proto static alias = "statement"
  @proto static priority = Priority.specific

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "showTourStep",
      args: [P.asAST<P.ASTExpression>(match.groups.step.AST)]
    })
  }
}
