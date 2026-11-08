import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Through the folder:  read only when called, once the folder has loaded
import { DrawSlotOf } from "spell/parser/spell/rules/classes"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `draw_items` rule:  draw each / all of a collection of items.
 * - e.g. `draw each card in the deck`, `draw all cards of the deck`
 * - Only the trailing `{expression}` (the container) is compiled:
 *   - `draw each card in the deck` => `core.drawItems(deck)`, each item in its own error boundary
 *   - the same in javascript and TypeScript:  a viewable list's items are its element's children (epic `spanish` J100)
 * - The `each {variable}` / `(the|all)? {plural_identifier}` part is purely for readability:
 *   it's matched, but never read in `getAST()`.
 * - A drawing of the thing's with that name is drawn instead, `draw_slot_of`'s (epic `data` I94):
 *   `draw the fields of its new recipe`, with `- to draw its fields:` on a recipe, or `<draw "fields">`.
 * - Else a thing that isn't a list has no items, so it won't compile:  `draw the parts of its new recipe`.
 */
export class DrawItems extends SpellStatement<"variable?|plural_identifier?|expression"> {
  /** An expression (JSX `{draw …}`) AND a statement:  as a statement, a project's own `draw` method would win. */
  @proto static alias = ["statement", "expression"]
  /**
   * Beats `draw_thing` (`Priority.preferred`), which also matches `draw the cards of the deck`:
   * that's each card, not one thing.
   */
  @proto static priority = Priority.specific

  /** A thing of a type that holds no list refuses, saying so:  see the class. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const type = scope.getType(match.groups.expression.datatype)
    // a drawing of that name is `draw_slot_of`'s, plural or not (epic `data` I94):  `draw the results of it`
    const { plural_identifier } = match.groups
    if (type && plural_identifier && DrawSlotOf.isDrawingOf(type, `${plural_identifier.value}`)) return undefined
    const isThing = !!type && !type.stub && !SP.isBuiltInTypeScope(type)
    if (!isThing || type.isA("List") || scope.getItemType(type.name)) return match
    const message = SP.Language.of(scope).parserMessage("draw-items-of-a-thing", { type: `${type.name}` })
    return SpellStatement.refuse(match, message)
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "drawItems",
      args: [P.asAST<P.ASTExpression>(match.groups.expression.AST)]
    })
  }
}
