import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Through the folder:  read only when called, once the folder has loaded
import { DrawIt } from "spell/parser/spell/rules/classes"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import type { DrawnDeclaration } from "spell/parser/spell/rules/JSX/JSX.shared"

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
 * - The spell lines around it decide which:  `if`, `otherwise`, loops.
 * - So does a slot placed on a line of its own, `draw its front` (`draw_slot`).
 * - Several draw all of them, in order, and a loop draws one each time round:  `DrawnLines.gather()` (C28).
 * - Only in a drawing (`DrawIt.drawingIn()`):  `to draw it`, `to draw each item`, a slot's own `to draw its front`,
 *   and a loop in one.
 * - In a slot's drawing, its element carries the slot's name as a CSS part (J6):  see `DrawIt.withPart()`.
 *   - In a list's placeholder, `part="placeholder"` (`DrawIt.partOf()`).
 * - `return <...>` still works, as before.
 * - A tag in the thing's own drawing may DECLARE the member it draws (epic `language` P55, Q52):
 *   `<column "C1"/>` ~== `"C1" is a new column`, `<number "score"/>` ~== `"score" is a number` (`SpellJSX`);
 *   this line declares them on the thing (`mutateScope()`), and its drawing compiles them as members
 *   (`membersDeclared()`).
 */
export class DrawnMarkup extends SpellStatement<"markup", { slot?: string }> {
  /** Beats `draw_thing` (`Priority.preferred`), which reads `draw its front` as drawing a `front`, and does nothing. */
  @proto static priority = Priority.specific
  @proto static alias = "statement"

  /**
   * Only in a drawing;  notes the part its markup carries, a slot's or a placeholder's, for `getAST()`.
   * - The tokens first (`test()`):  they turn down nearly every line at once,
   *   while `drawingIn()` asks the method around it for its signature.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const drawing = DrawIt.drawingIn(scope)
    if (!drawing) return undefined
    const part = DrawIt.partOf(drawing)
    if (part) match.data.slot = part
    return match
  }

  /**
   * Our one slot's own test:  a line that can't start markup, or `draw its`, is turned down at once.
   * - A sequence's quick test can't look inside a slot, so without this, every line of every program would be
   *   parsed as markup, three times (epic `elemental-spell` I3).
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0): boolean | undefined {
    if (this.rules[0]?.test(scope, tokens, start) === false) return false
    return super.test(scope, tokens, start)
  }

  /** SIDE EFFECT:  each member a tag of ours declares, on its thing (`declaredIn()`). */
  mutateScope(match: P.MatchFor<this>) {
    for (const { declares, at } of DrawnMarkup.declaredIn(match)) {
      const owner = match.scope.getType(declares.owner)
      if (!owner || owner.getMember(declares.name)) continue
      owner.declareProperty(declares.name, at, { datatype: declares.view ?? declares.datatype })
    }
  }

  /** A line that declares members changes what the rest of the program reads;  any other, nothing. */
  getScopeChanges(match?: P.MatchFor<this>): P.ScopeChanges | undefined {
    return match && DrawnMarkup.declaredIn(match).length ? "global" : undefined
  }

  /**
   * Each member the tags in `match`'s markup declare, with the tag's match -- see `JSXMatchData.declares`.
   * - Reads only matches and their `data`:  pure, for `getAST()` too.
   */
  static declaredIn(match: P.Match): Array<{ declares: DrawnDeclaration; at: P.Match }> {
    const found: Array<{ declares: DrawnDeclaration; at: P.Match }> = []
    const visit = (each: P.Match | undefined) => {
      if (!each) return
      const { declares, children } = each.data as { declares?: DrawnDeclaration; children?: Array<P.Match | undefined> }
      if (declares && !declares.drawnOnly) found.push({ declares, at: each })
      for (const child of each.matched) if (child instanceof P.Match) visit(child)
      for (const child of children ?? []) visit(child)
    }
    visit(match)
    return found
  }

  /**
   * The members the drawing lines of `body` declare, as their own lines would compile them (Q52):
   * - a view:  `static { this.declareProp("C1", { init: () => new Column({ id: "C1" }), early: true }) }`,
   *   its tag's attributes its starting values
   * - a value:  `static { this.declareProp("score", { type: "number" }) }`
   * - What `draw_it` and English's `to draw it` (a method named `draw`) write beside the drawing.
   */
  static membersDeclared(body: P.Match | undefined, type: P.ASTTypeExpression): P.ASTStatement[] {
    if (!body) return []
    const seen = new Set<string>()
    const members: P.ASTStatement[] = []
    const lines: P.Match[] = []
    const gather = (each: P.Match) => {
      if (each.is(DrawnMarkup)) lines.push(each)
      else for (const child of each.matched) if (child instanceof P.Match) gather(child)
    }
    gather(body)
    for (const line of lines) {
      for (const { declares, at } of DrawnMarkup.declaredIn(line)) {
        if (seen.has(declares.name)) continue
        seen.add(declares.name)
        // its `SPELL: DECLARES` comment, as its own line would have:  the Inspector, hover and other projects read it
        const declared = SP.SpellDeclarations.commentFor(at)
        const member = DrawnMarkup.memberAST(declares, at, type)
        members.push(declared ? new P.ASTStatementGroup(at, { statements: [declared, member] }) : member)
      }
    }
    return members
  }

  /** One member `declares` says, declared by the tag `at` -- see `membersDeclared()`. */
  private static memberAST(declares: DrawnDeclaration, at: P.Match, type: P.ASTTypeExpression): P.ASTReactiveProperty {
    const check = new P.ASTObjectLiteral(at)
    if (declares.datatype) {
      check.addProp("type", new P.ASTTypeNameLiteral(at, { value: declares.datatype, quote: "'" }))
      return new P.ASTReactiveProperty(at, { type, property: declares.name, check })
    }
    // its id, the member's name, then its tag's other attributes:  `{ id: "clubs", suit: "clubs" }`
    const id = new P.ASTStringLiteral(at, { value: declares.name, quote: '"' })
    const props = new P.ASTObjectLiteral(at, {
      properties: [new P.ASTObjectLiteralProperty(at, { property: "id", value: id })]
    })
    for (const attribute of (at.data as { attributes?: Array<P.Match | undefined> }).attributes ?? []) {
      const ast = attribute?.AST
      if (!(ast instanceof P.ASTJSXAttribute) || ast.name === "id" || !(ast.value instanceof P.ASTExpression)) continue
      props.properties.push(new P.ASTObjectLiteralProperty(attribute!, { property: ast.name, value: ast.value }))
    }
    const made = new P.ASTNewInstanceExpression(at, {
      type: new P.ASTTypeExpression(at, { name: declares.view! }),
      props
    })
    return new P.ASTReactiveProperty(at, { type, property: declares.name, initializer: made })
  }

  getAST(match: P.MatchFor<this>): P.ASTReturnStatement {
    const markup = P.matchAST<P.ASTExpression>(match.groups.markup)
    const { slot } = match.data
    return new P.ASTReturnStatement(match, { value: slot ? DrawIt.withPart(markup, slot) : markup })
  }
}
