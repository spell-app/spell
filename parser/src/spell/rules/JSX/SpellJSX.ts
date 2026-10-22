import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { SPELL_TAG_NAMES, type JSXMatchData } from "./JSX.shared"
import { MarkdownBlock } from "./MarkdownBlock"
import { SpellJSXContent } from "./SpellJSXContent"

/**
 * `jsxElement` rule:  match a JSX element (`<tag attr=.../>` or `<tag>...</tag>`) as an `expression`/`jsxChild`.
 * - e.g. `<a/>`
 * - `P.JSXElementToken` does all the tokenizing.
 *   `parse()` re-parses each attribute / child token through `jsxAttribute` / `jsxChild`,
 *   falling back to `parse_error` for a child that doesn't parse.
 * - Compiles to `h(tag, props, ...children)` in javascript, JSX in TypeScript:  see `P.JSWriter`, `P.TSWriter`.
 *   - Both write the page's own attribute names, decided when it compiles (`attributeName()`):
 *     `className` => `class`, `colSpan` => `colspan`.
 *   - On a `ui-*` tag, a value that can change is a property, `prop:value`.
 * - A dotted tag, `<UI.Form>`, is an error:  `P.ASTJSXElement.tagError()`.
 * - Spell's own words become the web's as the AST is built, so both writers write the web's:
 *   - `<children/>` => `h("slot")`
 *   - `<children name="header"/>` => `h("slot", { name: "header" })`
 *   - `<h3 in="header">` => `h("h3", { slot: "header" })`, in `SpellJSXAttribute`
 *   - see `SPELL_TAG_NAMES`, `SPELL_ATTRIBUTE_NAMES`
 * - NOTE: rule name is `jsxElement`, kept distinct from class name `SpellJSX` (pre-existing convention).
 */
export class SpellJSX extends P.TokenType<never, JSXMatchData> {
  static ruleName = "jsxElement"
  @proto static alias = ["jsxChild", "expression"]
  // `jsxFragment` matches a fragment's token instead
  @proto static tokenType: P.TokenConstructor = P.JSXElementToken

  /**
   * Parse the element's `attributes` / `children` tokens, through `scope.parser.parse()` (see the note inside).
   * - A fragment's children alone:  `jsxFragment` parses with this too.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    if (match.matched.length !== 1) throw new TypeError("Can only handle a single JSXElement at a time!")
    const [element] = match.matched as [P.JSXElementToken | P.JSXFragmentToken]
    // `Scope.parse()` only accepts a `string` for `text`, but we have actual `Token`s here:
    // call `scope.parser.parse()` directly instead, as `SpellCSSFile.parse()` does.
    match.data.children = element.children?.map(
      (child) => scope.parser?.parse(child, "jsxChild", scope) || scope.parser?.parse(child, "parse_error", scope)
    )
    // a fragment (`jsxFragment`) has no tag and no attributes
    if (!(element instanceof P.JSXElementToken)) return match
    match.data.attributes = element.attributes?.map((attr) => scope.parser?.parse(attr, "jsxAttribute", scope))
    // a dotted tag, `<UI.Form>`:  the writer writes the error where the element would be, this reports it
    const tagError = P.ASTJSXElement.tagError(element.tagName)
    if (tagError) match.data.error = SP.spellParser.createParseError(scope, [element], tagError)
    return match
  }

  /**
   * Build `P.ASTJSXElement`; drops falsy child ASTs (e.g. blank `jsxText`) via `.filter(Boolean)`.
   * - Spell's own tag words as the web's:  `<children/>` => `<slot/>` (`SPELL_TAG_NAMES`).
   */
  getAST(match: P.MatchFor<this>): P.ASTJSXElement {
    const { tagName: written } = match.matched[0] as P.JSXElementToken
    const tagName = SPELL_TAG_NAMES.get(written) ?? written
    const attrs = match.data.attributes?.map((attr) => P.asAST<P.ASTJSXAttribute>(attr?.AST))
    return new P.ASTJSXElement(match, { tagName, attrs, children: this.childASTs(match) })
  }

  /** The ASTs of `match`'s children, leaving out what writes nothing (e.g. blank `jsxText`). */
  protected childASTs(match: P.MatchFor<this>): P.ASTJSXElementProps["children"] {
    return (
      match.data.children
        ?.map((child) => P.asAST<P.ASTJSXElement | P.ASTJSXEndTag | P.ASTJSXText | P.ASTJSXExpression>(child?.AST))
        .filter(Boolean) ?? []
    )
  }

  /**
   * Parse errors from JSX anywhere in `statement`:  a `{...}` that didn't parse, e.g. `print <div>{foo bar}</div>`,
   * a dotted tag, `<UI.Form>`, or a markdown hole that didn't (`markdown_block`).
   * - JSX rules keep what they parse out of their tokens in `match.data`, not `matched`,
   *   so nothing else finds these.
   * - Looks through the statement's own matches and any inline body.
   *   NOT an indented body:  that's a `block`, which gathers its own errors.
   * - The errors still compile where they are, inside the JSX.  This is just so they're REPORTED.
   * - Static:  `BlockLine` asks, about any statement.
   */
  static parseErrorsIn(statement: P.Match): P.Match[] {
    const errors: P.Match[] = []
    visit(statement)
    return errors

    /** Collect `match`'s JSX error, if it has one, then look below it. */
    function visit(match: P.Match) {
      if (match.rule.name === "block") return
      const below: Array<P.Match | P.Token | undefined> = [...match.matched]
      if (match.is(SpellJSX)) {
        if (match.data.error) errors.push(match.data.error)
        below.push(...(match.data.attributes ?? []), ...(match.data.children ?? []))
      }
      if (match.is(SpellJSXContent)) {
        if (match.data.error) errors.push(match.data.error)
        below.push(match.data.expression, match.data.statement)
      }
      if (match.is(MarkdownBlock)) errors.push(...(match.data.errors ?? []))
      below.push(match.data.body as P.Match | undefined)
      for (const item of below) if (item instanceof P.Match) visit(item)
    }
  }
}
