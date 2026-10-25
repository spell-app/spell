import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { Wording } from "spell-parser/spell/rules/expressions"
// Through the folder:  read only when called, once the folder has loaded
import { DrawIt } from "spell-parser/spell/rules/classes"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `draw_part` rule:  PLACE one of a view's parts in its drawing (epic `elemental-spell` P5, Q55, Q56).
 * - e.g. `draw its front`, Spanish's `dibujar su frente`:  `this.drawFront()`, the part's own drawing
 *   (`to draw its front:`, `draw_it`)
 * - As a line of a drawing it IS what it draws (`drawn_markup`), and inside markup it's a value:
 *   `<div>{draw its front}</div>`.
 * - Only inside a drawing, about its own view (`DrawIt.drawingIn()`).
 * - A name that isn't a part, but a property of the view's, is `draw_thing`'s:  `draw its card` draws its card.
 *   A name that's neither is taken as a part drawn further down, or by a type built on this one.
 * - Beats `draw_thing` (`Priority.specific`), which would read `draw its front` as drawing a `front`.
 * - NOT a list's `draw its placeholder` (`draw_method`):  that's its own drawing, `drawItsPlaceholder()`.
 */
export class DrawPart extends SpellStatement<"part", { part?: string }> {
  @proto static alias = "expression"
  @proto static priority = Priority.specific

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (!DrawIt.drawingIn(scope)) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const words = match.inputText.trim()
    if (Wording.reads(scope, "draw_method", words, "draw_its_placeholder")) return undefined
    const part = DrawIt.partName(`${match.groups.part.value}`)
    const type = DrawPart.viewIn(scope)
    if (type && !type.hasPart(part) && type.getMember(`${match.groups.part.value}`)) return undefined
    match.data.part = part
    return match
  }

  /** The view whose drawing `scope` is in:  what `it` is in its method. */
  private static viewIn(scope: P.Scope): P.TypeScope | undefined {
    let current: P.Scope | undefined = scope
    while (current && !(current instanceof P.MethodScope)) current = current.parentScope
    const datatype = (current as P.MethodScope | undefined)?.itDatatype
    return typeof datatype === "string" ? scope.getType(SP.typeName(datatype)) : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTScopedMethodInvocation {
    return new P.ASTScopedMethodInvocation(match, {
      thing: new P.ASTSelfLiteral(match),
      methodName: DrawIt.partMethodName(match.data.part!)
    })
  }
}
