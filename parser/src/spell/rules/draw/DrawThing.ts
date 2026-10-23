import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `draw_thing` rule:  draw a single thing, e.g. `draw the card`.
 * - `core.drawThing(card)`, its drawing in its own error boundary, in javascript and TypeScript alike.
 *   Its `draw()` re-runs when what it read changes:  the card's node is drawn again, nothing else.
 *   - A drawable thing draws as its element, e.g. `<solitaire-card>`:  so never a bare `card.draw()` (epic `spanish`
 *     J100).
 *   - TypeScript's `@drawn` `draw()` brings its own boundary:  `core.drawThing()` calls it straight.
 */
export class DrawThing extends SpellStatement<"expression"> {
  /** An expression (JSX `{draw …}`) AND a statement:  as a statement, a project's own `draw` method would win. */
  @proto static alias = ["statement", "expression"]
  /**
   * Beats a call to the project's own `to draw (a card)` (`Priority.normal`):
   * in javascript, which has no `@drawn`, `card.draw()` would skip the re-rendering.
   */
  @proto static priority = Priority.preferred

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "drawThing",
      args: [P.asAST<P.ASTExpression>(match.groups.expression.AST)]
    })
  }
}
