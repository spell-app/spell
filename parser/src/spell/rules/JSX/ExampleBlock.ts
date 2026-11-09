import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import type { JSXMatchData } from "./JSX.shared"
// Read only when compiling:  SpellJSX imports this file
import { SpellJSX } from "./SpellJSX"

/**
 * `example_block` rule:  an EXAMPLE on a page, in a drawing (epic `elemental-spell` P16):
 * a title, then its live result, drawn by the editor app's `<spell-example>`.
 *
 * ```spellx
 * <example "one counter">
 * 	<counter/>
 * </example>
 * ```
 *
 * - Its word is the language's (`exampleTag`):  `<example>`, Spanish's `<ejemplo>`.
 * - Named as spellx names its tags, by a quoted name after its word:
 *   the tokenizer reads that as `name="..."` (`P.Tokenizer.quotedNameTags`).
 *   `name="one counter"` works too.
 * - The same in code spell and spellx:  so a `.spell` page and its `.spellml` twin compile the same.
 * - What's inside is drawn as any drawing's markup is:  `<counter/>` is the project's view in a spellx file.
 * - Compiles to `h("spell-example", { name: "one counter" }, ...)`:  the result alone.
 *   - Its code isn't compiled in:  the editor shows it from the file (the app's `NotebookPage`), in spellx or html.
 *   - A page with no `<spell-example>` defined (a `<spell-viewer>` elsewhere) shows the result as it is.
 *   - In javascript, a part of its own (`drawnApart`, epic `notebook` P4):
 *     so an edit to one example draws that one again, not the page.
 *     It's `core.drawPart(this, () => h("spell-example", ...))`.
 * - One with a parse error in it draws that error in place of its result (epic `notebook` I5):
 *   the example's own problem, in its own place, the rest of the page as it was.
 */
export class ExampleBlock extends P.TokenType<never, JSXMatchData> {
  @proto static alias = ["jsxChild", "expression"]
  @proto static tokenType = P.JSXElementToken
  // beats `jsxElement`, which would look for an `<example>` component
  @proto static priority = Priority.preferred

  /** An element named by our language's example word:  its attributes and children, parsed. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const [element] = tokens
    if (!(element instanceof P.JSXElementToken) || !ExampleBlock.isExampleTag(scope, element.tagName)) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { parser } = scope
    match.data.children = element.children?.map(
      (child) => parser?.parse(child, "jsxChild", scope) || parser?.parse(child, "parse_error", scope)
    )
    match.data.attributes = element.attributes?.map((attribute) => parser?.parse(attribute, "jsxAttribute", scope))
    SpellJSX.noteUnreadable(scope, match, element)
    return match
  }

  /** `h("spell-example", { name }, ...children)`, drawn apart:  `core.drawPart(this, () => ...)`. */
  getAST(match: P.MatchFor<this>): P.ASTJSXElement {
    const attrs = match.data.attributes?.map((attr) => P.asAST<P.ASTJSXAttribute>(attr?.AST)).filter(Boolean)
    const children =
      match.data.children
        ?.map((child) => P.asAST<P.ASTJSXElement | P.ASTJSXEndTag | P.ASTJSXText | P.ASTJSXExpression>(child?.AST))
        .filter(Boolean) ?? []
    const error = ExampleBlock.firstErrorIn(match)
    return new P.ASTJSXElement(match, {
      tagName: EXAMPLE_ELEMENT,
      attrs,
      children: error ? [ExampleBlock.errorStandIn(error)] : children,
      drawnApart: true
    })
  }

  /** The first parse error inside example `match` that keeps it from drawing as written, if any. */
  private static firstErrorIn(match: P.MatchFor<ExampleBlock>): P.Match | undefined {
    return SpellJSX.parseErrorsIn(match).find((error) => !error.data.drawnAnyway)
  }

  /** `error`, as the drawing's stand-in for what can't be drawn:  a `<span class="spell-draw-error">` saying it. */
  private static errorStandIn(error: P.Match): P.ASTJSXElement {
    const message = `⚠ ${P.asAST<P.ASTParseError>(error.AST)!.value}`
    const attribute = (name: string, value: string) =>
      new P.ASTJSXAttribute(error, { name, value: new P.ASTStringLiteral(error, { value, quote: '"' }) })
    return new P.ASTJSXElement(error, {
      tagName: "span",
      attrs: [attribute("class", ERROR_STAND_IN_CLASS), attribute("role", "alert")],
      children: [new P.ASTJSXText(error, { value: message })]
    })
  }

  /** Is `tagName` an example's tag, in `scope`'s language:  `example`, `ejemplo`? */
  static isExampleTag(scope: P.Scope, tagName: string): boolean {
    return tagName === SP.Language.of(scope).words.exampleTag
  }
}

/** What the drawing's own stand-in for a thing that can't be drawn is marked with -- see `core`'s `drawingFailed()`. */
const ERROR_STAND_IN_CLASS = "spell-draw-error"

/** The editor app's element an example draws as:  its title, its result, its code. */
export const EXAMPLE_ELEMENT = "spell-example"
