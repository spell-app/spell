import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { rawTextOf } from "spell/parser/spell/rules/JSX/JSX.shared"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { isViewType } from "./classes.shared"

/**
 * `css_block` rule:  a view type's own styles, in its outline (epic `drawable-thing`, P4).
 *
 * ```spell
 * a card is a view
 *   - it has a rank as a number
 *   <css>
 *     :host { display: inline-block }
 *     .red { color: crimson }
 *   </css>
 * ```
 *
 * - The CSS is never read as spell:  the tokenizer takes a `<css>` element's contents as raw text (`rawTextTags`).
 * - Compiles to its class's `static css = css`...``, `@spell/core`'s tag.
 *   - Its element adopts it in its shadow root, after the page's theme -- see app's `SpellElement`.
 * - Only in a VIEW type's outline:  anywhere else, a parse error that says where it goes.
 * - Editors colour it, complete it and check it as CSS:  see lsp's `SpellCSS`.
 */
export class CSSBlock extends P.TokenType<never, CSSBlockData> {
  @proto static alias = "statement"
  @proto static tokenType = P.JSXElementToken
  @proto static priority = Priority.declaration

  /** A `<css>` element, alone on its line -- refused outside a view type's outline. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const [element] = tokens
    if (!(element instanceof P.JSXElementToken) || element.tagName !== CSS_TAG) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const type = scope instanceof P.SubjectScope ? scope.subjectType : undefined
    if (!type || !isViewType(type)) {
      const language = SP.Language.of(scope)
      const message = type
        ? language.parserMessage("css-not-a-view", { type: type.name })
        : language.parserMessage("css-outside-outline")
      return SpellStatement.refuse(match, message)
    }
    match.data.typeName = type.name
    match.data.css = rawTextOf(element)
    return match
  }

  /**
   * `static css = css`...`` in the type's class:  its own style sheet, as `@spell/core`'s `css` tag hands it back.
   * - The sheet starts on a line of its own, indented a step:  the tag takes that indent off again.
   */
  getAST(match: P.MatchFor<this>) {
    const { typeName = "", css = "" } = match.data
    const indented = css
      .split("\n")
      .map((line) => (line ? `${CSS_INDENT}${line}` : line))
      .join("\n")
    return new P.ASTStaticDefinition(match, {
      type: new P.ASTTypeExpression(match, { name: typeName }),
      name: "css",
      value: new P.ASTTaggedTemplate(match, { tag: "css", parts: [`\n${indented}\n`] })
    })
  }
}

/** What `css_block` keeps on its match. */
type CSSBlockData = {
  /** Name of the type it styles, e.g. `Card`. */
  typeName?: string
  /** Its CSS, e.g. `.red { color: crimson }`. */
  css?: string
}

/** The tag of a type's own styles. */
const CSS_TAG = "css"

/** How far a type's sheet is indented inside its `css` template, under `static css = ...`. */
const CSS_INDENT = "  "
