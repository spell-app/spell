import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import type { JSXMatchData } from "./JSX.shared"

/**
 * `example_block` rule:  a notebook's EXAMPLE, in a drawing (epic `elemental-spell` P16):
 * a title, then its live result, drawn by the editor app's `<spell-example>`.
 *
 * ```spellx
 * <example "one counter">
 * 	<counter/>
 * </example>
 * ```
 *
 * - Its word is the language's (`exampleTag`):  `<example>`, Spanish's `<ejemplo>`.
 * - Named as spellx names its tags, by a quoted name after its word:  the tokenizer reads that as `name="..."`
 *   (`P.Tokenizer.quotedNameTags`).  `name="one counter"` works too.
 * - The same in code spell and spellx:  so a `.spell` notebook and its `.spellml` twin compile the same.
 * - What's inside is drawn as any drawing's markup is:  `<counter/>` is the project's view in a spellx file.
 * - Compiles to `h("spell-example", { name: "one counter" }, ...)`:  the result alone.
 *   Its code isn't compiled in:  the notebook shows it from the file (`SX.NotebookPage`), in spellx or html.
 *   - A page with no `<spell-example>` defined (a `<spell-viewer>` elsewhere) shows the result as it is.
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
    return match
  }

  /** `h("spell-example", { name }, ...children)`. */
  getAST(match: P.MatchFor<this>): P.ASTJSXElement {
    const attrs = match.data.attributes?.map((attr) => P.asAST<P.ASTJSXAttribute>(attr?.AST)).filter(Boolean)
    const children =
      match.data.children
        ?.map((child) => P.asAST<P.ASTJSXElement | P.ASTJSXEndTag | P.ASTJSXText | P.ASTJSXExpression>(child?.AST))
        .filter(Boolean) ?? []
    return new P.ASTJSXElement(match, { tagName: EXAMPLE_ELEMENT, attrs, children })
  }

  /** Is `tagName` an example's tag, in `scope`'s language:  `example`, `ejemplo`? */
  static isExampleTag(scope: P.Scope, tagName: string): boolean {
    return tagName === SP.Language.of(scope).words.exampleTag
  }
}

/** The editor app's element an example draws as:  its title, its result, its code. */
export const EXAMPLE_ELEMENT = "spell-example"
