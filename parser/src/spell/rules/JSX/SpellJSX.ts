import { elementTagFor, proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { SPELL_JSX_MEANINGS, SPELL_TAG_WORDS, webWordFor, type JSXMatchData } from "./JSX.shared"
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
 *   - On a `ui-*` tag, a value that can change and may hold an object is a property, `prop:value`;
 *     text, a number or yes / no keeps its plain name (`ProgramWriter.mayHoldObject()`).
 * - A dotted tag, `<UI.Form>`, is an error:  `P.ASTJSXElement.tagError()`.
 * - An element with an `onClick` looks clickable by itself (epic `outline-spell` P28):
 *   a pointer cursor, and its text can't be selected.
 *   - `style="cursor:pointer;user-select:none"`, unless it says its own `style`.
 *   - Every target writes it the same:  see `clickableAttrs()`.
 * - Spell's own words become the web's as the AST is built, so both writers write the web's:
 *   - `<children/>` => `h("slot")`
 *   - `<children name="header"/>` => `h("slot", { name: "header" })`
 *   - `<h3 in="header">` => `h("h3", { slot: "header" })`, in `SpellJSXAttribute`
 *   - each language's words, in its word rules `spell_jsx_tag` and `spell_jsx_attribute`:
 *     `SPELL_TAG_WORDS`, `SPELL_ATTRIBUTE_WORDS`
 * - In a spellx file, a BARE name is a component's (epic `elemental-spell` P7, Q46):  `componentTagFor()`.
 *   - `<card>`:  one of the project's own views, `<solitaire-card>`;  else `<button>`:  a pack's, `<ui-button>`.
 *   - No native HTML (Q46, C1):  `<div>` is an error unless a pack has it.
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
    match.data.tagName = webWordFor(scope, SPELL_TAG_WORDS, element.tagName)
    // a spellx drawing names components by their bare names:  `<button>` => `<ui-button>`
    if ((scope.parser as SP.SpellParser | undefined)?.form === "spellx" && match.data.tagName === element.tagName) {
      const tag = SpellJSX.componentTagFor(scope, element.tagName)
      if (tag) match.data.tagName = tag
      else if (BARE_NAME.test(element.tagName) && !SPELL_JSX_MEANINGS.includes(element.tagName)) {
        const language = SP.Language.of(scope)
        const packs = SP.ComponentPacks.searched(SpellJSX.packsFor(scope))
        // a control or handler inside an element (`<segment><if ...>`):  spellx reads those on a drawing's own lines
        const message = SpellJSX.isSpellxPhraseWord(language, element.tagName)
          ? language.parserMessage("spellx-tag-in-markup", { tag: element.tagName })
          : language.parserMessage("spellx-unknown-component", { tag: element.tagName, packs })
        match.data.error = SP.spellParser.createParseError(scope, [element], message)
      }
    }
    match.data.attributes = element.attributes?.map((attr) => scope.parser?.parse(attr, "jsxAttribute", scope))
    // a dotted tag, `<UI.Form>`:  the writer writes the error where the element would be, this reports it
    if (P.ASTJSXElement.tagError(match.data.tagName)) {
      const message = SP.Language.of(scope).parserMessage("not-an-element", { tag: element.tagName })
      match.data.error = SP.spellParser.createParseError(scope, [element], message)
    }
    return match
  }

  /**
   * Build `P.ASTJSXElement`; drops falsy child ASTs (e.g. blank `jsxText`) via `.filter(Boolean)`.
   * - Spell's own tag words as the web's, found by `parse()`:  `<children/>` => `<slot/>` (`SPELL_TAG_WORDS`).
   */
  getAST(match: P.MatchFor<this>): P.ASTJSXElement {
    const tagName = match.data.tagName ?? (match.matched[0] as P.JSXElementToken).tagName
    const attrs = match.data.attributes?.map((attr) => P.asAST<P.ASTJSXAttribute>(attr?.AST))
    return new P.ASTJSXElement(match, {
      tagName,
      attrs: SpellJSX.clickableAttrs(match, attrs),
      children: this.childASTs(match)
    })
  }

  /**
   * The tag of the component a spellx drawing names by bare `word` (`<button>`, `<card>`):
   * - the project's own view of that name first:  `card` => `solitaire-card`, as its element is named
   * - else the first of the project's packs that has it (`SP.ComponentPacks`):  `button` => `ui-button`,
   *   `botón` in a Spanish file => `es-boton`
   * - `undefined`:  not a bare name (`ui-text`, `solitaire-card`, `slot` are left as written), or nobody has it
   */
  static componentTagFor(scope: P.Scope, word: string): string | undefined {
    if (!BARE_NAME.test(word) || SPELL_JSX_MEANINGS.includes(word)) return undefined
    const type = scope.getType(SP.typeName(word))
    if (type?.isA("View")) {
      const project = projectScopeOf(scope)
      if (project?.name) return elementTagFor(project.name, type.name)
    }
    return SP.ComponentPacks.tagFor(word, SP.Language.of(scope).lang, SpellJSX.packsFor(scope))
  }

  /**
   * Does `word` start one of spellx's control or handler tags in `language` (`if`, `otherwise`, `for`, `on` ...)?
   * - Those are read on a drawing's own lines;  inside an element they'd be taken for components (C29).
   */
  static isSpellxPhraseWord(language: SP.Language, word: string): boolean {
    const spellx = language.words.spellx
    const phrases = [...Object.keys(spellx?.controls ?? {}), ...Object.keys(spellx?.handlers ?? {})]
    return phrases.some((phrase) => phrase.split(" ")[0] === word)
  }

  /** The packs `scope`'s project draws with:  its project file's `packs`, else `SP.ComponentPacks.DEFAULT`. */
  static packsFor(scope: P.Scope): readonly string[] {
    return (scope.parser as SP.SpellParser | undefined)?.packs ?? SP.ComponentPacks.DEFAULT
  }

  /**
   * `attrs`, plus `style="cursor:pointer;user-select:none"` when they say `onClick` and no `style`:
   * what can be clicked shows it, and a click never selects its text.
   */
  private static clickableAttrs(match: P.AnyMatch, attrs: P.ASTJSXAttribute[] | undefined) {
    const named = (name: string) => attrs?.some((attr) => attr?.name === name)
    if (!attrs || !named("onClick") || named("style")) return attrs
    const style = new P.ASTStringLiteral(match, { value: CLICKABLE_STYLE, quote: '"' })
    return [...attrs, new P.ASTJSXAttribute(match, { name: "style", value: style })]
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
   *   NOT an indented body that's a `block`:  it gathers its own errors.
   *   An indented body that's ONE expression, e.g. `return` with its markup on the lines below,
   *   `BlockLine` asks about too.
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

/** A tag a spellx drawing may write bare, for a component:  letters alone, accents too (`button`, `botón`). */
const BARE_NAME = /^\p{Ll}+$/u

/** The project scope `scope` is in, if any:  its `name` names the project's elements. */
function projectScopeOf(scope: P.Scope): P.ProjectScope | undefined {
  for (let at: P.Scope | undefined = scope; at; at = at.parentScope) if (at instanceof P.ProjectScope) return at
  return undefined
}

/** What an element with an `onClick` looks like by itself -- see `SpellJSX.clickableAttrs()`. */
// written as Solid's compiler writes it into a TypeScript drawing, so every target draws the same
const CLICKABLE_STYLE = "cursor:pointer;user-select:none"
