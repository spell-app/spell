import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { Wording } from "spell/parser/spell/rules/expressions"
// Through the folder:  read only when called, once the folder has loaded
import { DrawIt } from "spell/parser/spell/rules/classes"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `draw_slot` rule:  PLACE one of a view's slots in its drawing (epic `elemental-spell` P5, Q55, Q56;  P27).
 * - e.g. `draw its front`, Spanish's `dibujar su frente`;  spellx's `<draw "front" />`.
 * - Compiles to the web's own slot, holding the slot's drawing (`to draw its front:`, `draw_it`):
 *   `<slot name="front">{this.drawFront()}</slot>`.
 *   - In the view's element (its shadow root), what the page puts in it with `slot="front"` takes the drawing's
 *     place, for that one element:  `<card><text slot="front">Ace</text></card>`.
 *     Nothing put in it:  the slot's own drawing shows, a type built on this one's if it draws it again.
 *   - The `<slot>` takes no box of its own, so it moves nothing on the page.
 *   - Anywhere else, e.g. an app's page, drawn in its children:  just the slot's own drawing.
 * - As a line of a drawing it IS what it draws (`drawn_markup`), and inside markup it's a value:
 *   `<div>{draw its front}</div>`.
 * - Only inside a drawing, about its own view (`DrawIt.drawingIn()`).
 * - A name that isn't a slot, but a property of the view's, is `draw_thing`'s:  `draw its card` draws its card.
 *   A name that's neither is taken as a slot drawn further down, or by a type built on this one.
 * - Beats `draw_thing` (`Priority.specific`), which would read `draw its front` as drawing a `front`.
 * - NOT a list's `draw its placeholder` (`draw_method`):  that's its own drawing, `drawItsPlaceholder()`.
 */
export class DrawSlot extends SpellStatement<"slot", { slot?: string }> {
  @proto static alias = "expression"
  @proto static priority = Priority.specific

  /**
   * Only in a drawing, and never a list's `draw its placeholder`.
   * - Its words first:  as an expression, it's tried wherever one starts (epic `elemental-spell` I3).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !DrawIt.drawingIn(scope)) return undefined
    const words = match.inputText.trim()
    if (Wording.reads(scope, "draw_method", words, "draw_its_placeholder")) return undefined
    const slot = DrawIt.slotName(`${match.groups.slot.value}`)
    const type = DrawSlot.viewIn(scope)
    if (type && !type.hasSlot(slot) && type.getMember(`${match.groups.slot.value}`)) return undefined
    // by the name it compiles by:  a two sided view's Spanish `frente` is its `front` (`P.TypeScope.slotOutputs`)
    match.data.slot = type?.slotOutput(slot) ?? slot
    return match
  }

  /** The view whose drawing `scope` is in:  what `this` is in its method, through any loop. */
  static viewIn(scope: P.Scope): P.TypeScope | undefined {
    return P.MethodScope.thingTypeOf(scope)
  }

  /** `<slot name="front">{this.drawFront()}</slot>` -- see the class's docs. */
  getAST(match: P.MatchFor<this>): P.ASTJSXElement {
    const slot = match.data.slot!
    const drawing = new P.ASTScopedMethodInvocation(match, {
      thing: new P.ASTSelfLiteral(match),
      methodName: DrawIt.slotMethodName(slot)
    })
    const name = new P.ASTStringLiteral(match, { value: slot, quote: '"' })
    return new P.ASTJSXElement(match, {
      tagName: "slot",
      attrs: [new P.ASTJSXAttribute(match, { name: "name", value: name })],
      children: [new P.ASTJSXExpression(match, { expression: drawing })]
    })
  }
}
