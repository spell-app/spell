import { elementTagFor, proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { isBareComponentName, SPELL_TAG_WORDS, webWordFor, type JSXMatchData } from "./JSX.shared"
import { ExampleBlock } from "./ExampleBlock"
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
 *   - Except in a `<spell>` chunk, code spell as written (J83):  there `<div>` is the web's (`SP.isCodeSpell()`).
 * - AN IF-CHAIN INSIDE MARKUP (epic `elemental-spell`, Owen 2026-10-25:  "Inside an element:  hidden"):
 *   `<text><if it is done>✓<otherwise>{its title}</></text>`, the same in code spell and spellx.
 *   - Every branch stays on the page:  each one's elements get `hidden="until-found"` while it isn't the one, so a
 *     flip keeps the element (its DOM node, its state and focus) and find-in-page still reaches it.
 *   - Its text and `{holes}` are wrapped in a `<span>` each, to be hidden too.
 *   - Branch k shows while no branch before it holds, and its own phrase does:  `hidden` is
 *     `() => !c1 && c2 ? undefined : "until-found"`.
 *   - The tokenizer reads the chain (`P.Tokenizer.chainTags`):  each branch a `JSXElementToken` with its `chain`
 *     and `phrase`, its siblings the next branches, ONE closer, `</>` or `</if>`, ending the last.
 *   - At a drawing's top level an `<if>` picks what to return, rebuilt as it changes:  spellx's own tag line, or
 *     code spell's `if` lines.  A chain branch standing alone, in no element, is an error saying so.
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
    // in a spellx file's `<spell>` chunk, it and everything inside it is code spell (J83)
    const codeSpell = codeSpellDepth > 0 || SP.isCodeSpell(element)
    if (codeSpell) codeSpellDepth++
    try {
      return this.parseElement(scope, match, element, codeSpell)
    } finally {
      if (codeSpell) codeSpellDepth--
    }
  }

  /** `parse()`'s work on `element`:  its children, its tag, its attributes;  `codeSpell`:  is it written as code spell? */
  private parseElement(
    scope: P.Scope,
    match: P.MatchFor<this>,
    element: P.JSXElementToken | P.JSXFragmentToken,
    codeSpell: boolean
  ) {
    // `Scope.parse()` only accepts a `string` for `text`, but we have actual `Token`s here:
    // call `scope.parser.parse()` directly instead, as `SpellCSSFile.parse()` does.
    match.data.children = element.children?.map(
      (child) => scope.parser?.parse(child, "jsxChild", scope) || scope.parser?.parse(child, "parse_error", scope)
    )
    SpellJSX.claimBranches(scope, match)
    // a fragment (`jsxFragment`) has no tag and no attributes
    if (!(element instanceof P.JSXElementToken)) return match
    if (element.chain) return SpellJSX.parseBranch(scope, match, element)
    match.data.tagName = webWordFor(scope, SPELL_TAG_WORDS, element.tagName)
    // a spellx drawing names components by their bare names:  `<button>` => `<ui-button>`
    const isSpellx = (scope.parser as SP.SpellParser | undefined)?.form === "spellx" && !codeSpell
    if (isSpellx && match.data.tagName === element.tagName) {
      const tag = SpellJSX.componentTagFor(scope, element.tagName)
      if (tag) match.data.tagName = tag
      else if (isBareComponentName(element.tagName)) {
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
    // a chain branch alone, in no element (an error):  its children, drawn as they are
    if (match.data.chain) return new P.ASTJSXFragment(match, { children: this.childASTs(match) })
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
    if (!isBareComponentName(word)) return undefined
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

  /**
   * The ASTs of `match`'s children, leaving out what writes nothing (e.g. blank `jsxText`).
   * - An if-chain's branches (see the class's docs):  each one's children, each hidden while it isn't the one.
   */
  protected childASTs(match: P.MatchFor<this>): P.ASTJSXElementProps["children"] {
    const asts: P.ASTJSXElementProps["children"] = []
    let before: P.ASTExpression[] = []
    for (const child of match.data.children ?? []) {
      if (child?.is(SpellJSX) && child.data.chain && child.data.inMarkup) {
        if (child.data.chain === "if") before = []
        const condition = SpellJSX.conditionOf(child)
        const shown = P.ASTMultiInfixExpression(child, {
          expressions: [...before.map((it) => SpellJSX.not(child, it)), ...(condition ? [condition] : [])],
          operator: "and"
        })
        if (condition) before.push(condition)
        asts.push(...SpellJSX.hiddenUnless(child, shown, this.childASTs(child as P.MatchFor<this>)))
        continue
      }
      const ast = P.asAST<P.ASTJSXElement | P.ASTJSXEndTag | P.ASTJSXText | P.ASTJSXExpression>(child?.AST)
      if (ast) asts.push(ast)
    }
    return asts
  }

  ////////////////
  // ## An if-chain inside markup
  ////////////////

  /**
   * A chain branch, `<if its done is yes>`:  its kind, and its phrase parsed as a `{...}` would be.
   * - Its error, should it stand alone (no element claims it):  `SpellJSX.parseErrorsIn()` reports it.
   */
  private static parseBranch(scope: P.Scope, match: P.MatchFor<SpellJSX>, element: P.JSXElementToken) {
    match.data.chain = element.chain
    if (element.phrase) match.data.condition = scope.parser?.parse(element.phrase, "jsxChild", scope)
    const language = SP.Language.of(scope)
    match.data.aloneError = SP.spellParser.createParseError(
      scope,
      [element],
      language.parserMessage("chain-outside-markup", {
        tag: `<${element.tagName} ...>`,
        if: SpellJSX.chainWord(language, "if")
      })
    )
    return match
  }

  /**
   * Claim the chain branches among `match`'s children, in order:  each is inside markup, as it must be;
   * an `<otherwise ...>` with no `<if ...>` before it is an error.
   */
  private static claimBranches(scope: P.Scope, match: P.MatchFor<SpellJSX>) {
    let open = false
    for (const child of match.data.children ?? []) {
      if (!child?.is(SpellJSX) || !child.data.chain) {
        // text between branches (their indent) leaves the chain open;  anything else ends it
        const [token] = child?.matched ?? []
        if (child && !(token instanceof P.JSXTextToken && !`${token.value ?? ""}`.trim())) open = false
        continue
      }
      child.data.inMarkup = true
      if (child.data.chain === "if") open = true
      else if (!open) {
        const language = SP.Language.of(scope)
        const token = child.matched[0] as P.JSXElementToken
        const message = language.parserMessage("spellx-otherwise-without-if", {
          tag: `<${token.tagName}>`,
          if: SpellJSX.chainWord(language, "if")
        })
        child.data.error = SP.spellParser.createParseError(scope, [token], message)
      }
      if (child.data.chain === "otherwise") open = false
    }
  }

  /** `language`'s first word for a chain branch of `kind`, e.g. `if`, Spanish `si`. */
  private static chainWord(language: SP.Language, kind: P.JSXChainKind): string {
    const controls: Record<string, string> = language.words.spellx?.controls ?? {}
    return Object.keys(controls).find((word) => controls[word] === kind) ?? kind
  }

  /** Branch `branch`'s condition, its phrase's expression -- none for `<otherwise>`, or a phrase that didn't parse. */
  private static conditionOf(branch: P.MatchFor<SpellJSX>): P.ASTExpression | undefined {
    const ast = branch.data.condition?.AST
    return ast instanceof P.ASTJSXExpression ? ast.expression : undefined
  }

  /** `not (expression)`. */
  private static not(match: P.AnyMatch, expression: P.ASTExpression): P.ASTExpression {
    return new P.ASTNotExpression(match, { expression: new P.ASTParenthesizedExpression(match, { expression }) })
  }

  /**
   * `children`, each hidden while `shown` isn't true (`hidden="until-found"`):  an element by an attribute of its
   * own, text and a `{hole}` in a `<span>` of their own.
   * - `shown` none:  always shown, as an `<otherwise>` alone would be.
   */
  private static hiddenUnless(
    match: P.AnyMatch,
    shown: P.ASTExpression | undefined,
    children: P.ASTJSXElementProps["children"]
  ): P.ASTJSXElementProps["children"] {
    if (!shown) return children
    const hidden = () =>
      new P.ASTJSXAttribute(match, {
        name: "hidden",
        value: new P.ASTTernaryExpression(match, {
          condition: shown,
          trueValue: new P.ASTNothingLiteral(match),
          falseValue: new P.ASTStringLiteral(match, { value: UNTIL_FOUND, quote: '"' })
        })
      })
    return children.flatMap((child): P.ASTJSXElementProps["children"] => {
      if (child instanceof P.ASTJSXEndTag) return []
      if (child instanceof P.ASTJSXFragment) return SpellJSX.hiddenUnless(match, shown, child.children)
      if (child instanceof P.ASTJSXElement) {
        const { tagName, attrs = [], children: inside } = child
        return [new P.ASTJSXElement(child.match, { tagName, attrs: [...attrs, hidden()], children: inside })]
      }
      return [new P.ASTJSXElement(child.match, { tagName: "span", attrs: [hidden()], children: [child] })]
    })
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
      if (match.is(SpellJSX) || match.is(ExampleBlock)) {
        if (match.data.error) errors.push(match.data.error)
        if (match.is(SpellJSX) && match.data.aloneError && !match.data.inMarkup) errors.push(match.data.aloneError)
        if (match.is(SpellJSX) && match.data.condition) below.push(match.data.condition)
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

/**
 * How many elements being parsed are code spell, outermost first:  > 0 inside a spellx file's `<spell>` chunk.
 * - An element's `{...}` is tokenized as it parses, so its elements aren't noted (`SP.markCodeSpell()`):
 *   they're read as their outer element is.
 */
let codeSpellDepth = 0

/** The project scope `scope` is in, if any:  its `name` names the project's elements. */
function projectScopeOf(scope: P.Scope): P.ProjectScope | undefined {
  for (let at: P.Scope | undefined = scope; at; at = at.parentScope) if (at instanceof P.ProjectScope) return at
  return undefined
}

/** What a branch that isn't the one is:  hidden, and still found by find-in-page, as a folded section is. */
const UNTIL_FOUND = "until-found"

/** What an element with an `onClick` looks like by itself -- see `SpellJSX.clickableAttrs()`. */
// written as Solid's compiler writes it into a TypeScript drawing, so every target draws the same
const CLICKABLE_STYLE = "cursor:pointer;user-select:none"
