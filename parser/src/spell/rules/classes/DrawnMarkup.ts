import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
// Through the folder:  read only when called, once the folder has loaded
import { DrawIt } from "spell-parser/spell/rules/classes"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `drawn_markup` rule:  in a drawing's body, a line of markup IS what it draws -- no `return`
 * (epic `elemental-spell` P5, Q14).
 *
 * ```spell
 * - to draw it:
 * 	if it is face up
 * 		<ui-text part="face">{its rank}</ui-text>
 * 	otherwise
 * 		<ui-image source="card-back.svg" />
 * ```
 * - The spell lines around it decide which:  `if`, `otherwise`, loops.  The first markup line reached is the drawing.
 * - So does a part placed on a line of its own, `draw its front` (`draw_part`).
 * - Only in a drawing (`DrawIt.drawingIn()`):  `to draw it`, `to draw each item`, a part's own `to draw its front`.
 * - In a part's drawing, its element carries the part's name as a CSS part (J6):  see `DrawIt.withPart()`.
 * - `return <...>` still works, as before.
 */
export class DrawnMarkup extends SpellStatement<"markup", { part?: string }> {
  /** Beats `draw_thing` (`Priority.preferred`), which reads `draw its front` as drawing a `front`, and does nothing. */
  @proto static priority = Priority.specific
  @proto static alias = "statement"

  /** Only in a drawing;  notes which part's, if a part's, for `getAST()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const drawing = DrawIt.drawingIn(scope)
    if (!drawing) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match && drawing.part) match.data.part = drawing.part
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTReturnStatement {
    const markup = P.matchAST<P.ASTExpression>(match.groups.markup)
    const { part } = match.data
    return new P.ASTReturnStatement(match, { value: part ? DrawIt.withPart(markup, part) : markup })
  }
}
