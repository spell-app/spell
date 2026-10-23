import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Priority } from "spell-lang/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `draw_items` rule:  draw each / all of a collection of items.
 * - e.g. `draw each card in the deck`, `draw all cards of the deck`
 * - Only the trailing `{expression}` (the container) is compiled:
 *   - `draw each card in the deck` => `core.drawItems(deck)`, each item in its own error boundary
 *   - the same in javascript and TypeScript:  a drawable list's items are its element's children (epic `spanish` J100)
 * - The `each {variable}` / `(the|all)? {plural_identifier}` part is purely for readability:
 *   it's matched, but never read in `getAST()`.
 */
export class DrawItems extends SpellStatement<"variable?|plural_identifier?|expression"> {
  /** An expression (JSX `{draw …}`) AND a statement:  as a statement, a project's own `draw` method would win. */
  @proto static alias = ["statement", "expression"]
  /**
   * Beats `draw_thing` (`Priority.preferred`), which also matches `draw the cards of the deck`:
   * that's each card, not one thing.
   */
  @proto static priority = Priority.specific

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "drawItems",
      args: [P.asAST<P.ASTExpression>(match.groups.expression.AST)]
    })
  }
}
