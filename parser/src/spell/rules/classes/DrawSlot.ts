import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { Wording } from "spell/parser/spell/rules/expressions"
// Through the folder:  read only when called, once the folder has loaded
import { DrawIt } from "spell/parser/spell/rules/classes"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `draw_slot_of` rule:  draw ANOTHER thing's slot, in place of its usual drawing (epic `data` P19).
 * - e.g. `draw the page of its showing`, for a thing that draws as a card here, and as a whole page there.
 * - Compiles to `showing.drawPage()`:  in the drawing of whatever's placing it, so it has no element of its own.
 * - Or as a possessive, in English (epic `language` T49):  `draw its showing's page`.
 * - A property of that name is `draw_thing`'s:  `draw the card of the player` draws the player's card.
 */
export class DrawSlotOf extends SpellStatement<"slot|thing|possessive_mark?"> {
  @proto static alias = "expression"
  @proto static priority = Priority.specific

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !DrawIt.drawingIn(scope)) return undefined
    const { slot, thing } = match.groups
    const type = scope.getType(thing.datatype)
    if (!type) return undefined
    // a drawing of that name is drawn, whatever it's called (epic `data` I94, I95):  `draw the results of it`
    const word = `${slot.value}`
    if (DrawSlotOf.isDrawingOf(type, word)) return match
    // else a word for many is `draw_items`'s, `draw the items of the pile`;  a property's, `draw_thing`'s
    if (type.getMember(word) || P.pluralize(word) === word) return undefined
    return match
  }

  /**
   * Does `type` have a drawing called `words`, `<draw "results">` (`to draw its results:`)?
   * - Its own, or a type's it's built on:  only one declared so far, as a slot is (`P.TypeScope.hasSlot()`).
   * - Then `draw the results of it` draws it, though the name reads as many (`draw_items`) or names a property
   *   (`draw_thing`, epic `data` I94, I95).
   */
  static isDrawingOf(type: P.TypeScope, words: string): boolean {
    return type.hasSlot(type.slotOutput(DrawIt.slotName(words)))
  }

  /** `thing.drawPage()`. */
  getAST(match: P.MatchFor<this>): P.ASTScopedMethodInvocation {
    const { slot, thing } = match.groups
    return new P.ASTScopedMethodInvocation(match, {
      thing: P.matchAST(thing),
      methodName: DrawIt.slotMethodName(DrawIt.slotName(`${slot.value}`))
    })
  }
}

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
    const member = type?.getMember(`${match.groups.slot.value}`)
    if (type && !type.hasSlot(slot) && member) return undefined
    // a view's own data called `thumbnail`, a thing of its own (`its "thumbnail" is a thumbnail`), is `draw_thing`'s
    if (member instanceof P.ScopeVariable && member.datatype !== "text") {
      if (SP.builtInStoredMember(type, `${match.groups.slot.value}`)?.member.anyDatatype) return undefined
    }
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
