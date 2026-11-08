import { elementTagFor, proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Through the folder:  read only when called, once the folder has loaded
import { DrawIt, DrawnLines } from "spell/parser/spell/rules/classes"
import { ParseError } from "spell/parser/spell/rules/ParseError"
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
 *   the cursor controls have, and its text can't be selected.
 *   - `style="cursor:var(--ui-control-cursor,pointer);user-select:none"`, unless it says its own `style`.
 *   - Every target writes it the same:  see `clickableAttrs()`.
 * - Spell's own words become the web's as the AST is built, so both writers write the web's:
 *   - `<children/>` => `h("slot")`
 *   - `<children name="header"/>` => `h("slot", { name: "header" })`
 *   - `<h3 in="header">` => `h("h3", { slot: "header" })`, in `SpellJSXAttribute`
 *   - each language's words, in its word rules `spell_jsx_tag` and `spell_jsx_attribute`:
 *     `SPELL_TAG_WORDS`, `SPELL_ATTRIBUTE_WORDS`
 * - In a spellx file, a BARE name is a component's (epic `elemental-spell` P7, Q46):  `componentTagFor()`.
 *   - `<card>`:  one of the project's own views, `<solitaire-card>`;  else `<button>`:  a pack's, `<ui-button>`.
 *   - A view's slots can be filled there, `<card><text slot="front">Ace</text></card>`, each named as it compiles
 *     (P27):  see `withSlotNames()`.
 *   - No native HTML (Q46, C1):  `<div>` is an error unless a pack has it.
 *   - Except in a `<spell>` chunk, code spell as written (J83):  there `<div>` is the web's (`SP.isCodeSpell()`).
 * - AN IF-CHAIN INSIDE MARKUP (epic `elemental-spell`, Owen 2026-10-25:  "Inside an element:  hidden"):
 *   `<text><if it is done>✓<otherwise>{its title}</></text>`, the same in code spell and spellx.
 *   - Every branch stays on the page, each one's elements hidden while it isn't the one:  a flip keeps the element
 *     (its DOM node, its state and focus), and changes only its `hidden`.
 *     - The web's own elements and text:  `hidden="until-found"`, so find-in-page still reaches them.
 *     - A custom element (`<ui-label>`):  plain `hidden`, which Spell UI hides by.  Its host takes no box of its own
 *       (`display: contents`), where the browser's until-found would draw it all the same.
 *   - Each run of its text and `{holes}` is wrapped in a `<span>`, to be hidden too.
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
    // an `<html>` block inside a spellx drawing's markup:  its markup as written, drawn in its place (P18)
    if (SpellJSX.isHtmlBlock(element)) {
      match.data.htmlBlock = true
      codeSpellDepth++
      try {
        match.data.children = element.children?.map(
          (child) => scope.parser?.parse(child, "jsxChild", scope) || scope.parser?.parse(child, "parse_error", scope)
        )
      } finally {
        codeSpellDepth--
      }
      return match
    }
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
    // a spellx drawing's `<for ...>` inside an element:  read as on a line of its own, its children its body (I19)
    const isSpellx = (scope.parser as SP.SpellParser | undefined)?.form === "spellx" && !codeSpell
    if (isSpellx && element instanceof P.JSXElementToken && SpellJSX.isSpellxLoop(scope, element)) {
      return SpellJSX.parseLoop(scope, match, element)
    }
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
    if (isSpellx && !element.attributes?.length && !element.children?.length) {
      match.data.loopItem = SpellJSX.loopItemNamed(scope, element.tagName)
      if (match.data.loopItem) return match
    }
    if (isSpellx && match.data.tagName === element.tagName) {
      const tag = SpellJSX.componentTagFor(scope, element.tagName)
      const view = tag ? scope.getType(SP.typeName(element.tagName)) : undefined
      // one of the project's own views:  its children may fill its slots (`withSlotNames()`)
      if (view?.isA("View")) match.data.view = view
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
    if (match.data.loop) return SpellJSX.loopAST(match, match.data.loop) as unknown as P.ASTJSXElement
    const { loopItem } = match.data
    if (loopItem) {
      const value = new P.ASTVariableExpression(match, { name: loopItem.name, variable: loopItem })
      return new P.ASTCoreMethodInvocation(match, {
        methodName: "drawThing",
        args: [value]
      }) as unknown as P.ASTJSXElement
    }
    // a chain branch alone, in no element (an error), or an `<html>` block:  its children, drawn as they are
    if (match.data.chain || match.data.htmlBlock)
      return new P.ASTJSXFragment(match, { children: this.childASTs(match) })
    const tagName = match.data.tagName ?? (match.matched[0] as P.JSXElementToken).tagName
    const attrs = match.data.attributes?.map((attr) => P.asAST<P.ASTJSXAttribute>(attr?.AST))
    const children = this.childASTs(match)
    return new P.ASTJSXElement(match, {
      tagName,
      attrs: SpellJSX.clickableAttrs(match, SpellJSX.withMeasure(match, tagName, attrs)),
      children: match.data.view ? SpellJSX.withSlotNames(match.data.view, children) : children
    })
  }

  /**
   * `attrs`, and for a `<ui-dimension value={its height}>` what its value measures, `dimension="Length"
   * unit="centimeter"` (epic `language` P24, Owen's C4):  its value is a plain number, so the element can't tell.
   * - Not when the element says them itself.
   */
  private static withMeasure(
    match: P.MatchFor<SpellJSX>,
    tagName: string,
    attrs: P.ASTJSXAttribute[] | undefined
  ): P.ASTJSXAttribute[] | undefined {
    if (tagName !== MEASURE_TAG || !attrs) return attrs
    const attributes = match.data.attributes ?? []
    const said = (name: string) =>
      attributes.some((attr) => (attr?.data as JSXMatchData | undefined)?.attribute === name)
    const value = attributes.find((attr) => (attr?.data as JSXMatchData | undefined)?.attribute === "value")
    const measure = SP.measureOf((value?.data as JSXMatchData | undefined)?.expression)
    if (!measure || said("dimension") || said("unit")) return attrs
    const attribute = (name: string, text: string) =>
      new P.ASTJSXAttribute(match, { name, value: new P.ASTStringLiteral(match, { value: text, quote: '"' }) })
    return [...attrs, attribute("dimension", measure.dimension), attribute("unit", measure.unit)]
  }

  /**
   * `<film/>` in a loop over films:  this film, drawn as `draw the film` is.
   * - Only with nothing on it or in it, named as the loop's item is.
   */
  private static loopItemNamed(from: P.Scope, tagName: string): P.ScopeVariable | undefined {
    if (tagName.includes("-")) return undefined
    let scope: P.Scope | undefined = from
    while (scope) {
      const declaredBy = (scope as P.MethodScope).declaredBy
      if ((declaredBy?.rule as { loops?: boolean } | undefined)?.loops) {
        const variable = (scope as P.MethodScope).args?.(tagName) as P.ScopeVariable | undefined
        if (variable) return variable
      }
      scope = scope.parentScope
    }
    return undefined
  }

  /**
   * `children` of a drawn view, `<carta>`, each `slot="..."` naming one of its slots as it compiles
   * (epic `elemental-spell` P27):  a Spanish two sided view's `slot="frente"` fills its `front`;
   * `slot="back cover"`, its `back_cover`.
   * - The view's element draws each slot as the web's `<slot name="front">` (`draw_slot`), so the name must match.
   * - A worked-out `slot={...}`, or a name that isn't one of its slots, is left as written.
   */
  private static withSlotNames(view: P.TypeScope, children: P.ASTJSXElementProps["children"]) {
    return children.map((child) => {
      if (!(child instanceof P.ASTJSXElement) || child instanceof P.ASTJSXFragment) return child
      const index = child.attrs?.findIndex((attr) => attr.name === "slot") ?? -1
      const said = index < 0 ? undefined : child.attrs![index]!.value
      if (!(said instanceof P.ASTStringLiteral)) return child
      const slot = DrawIt.slotName(`${said.value}`)
      if (!view.hasSlot(slot)) return child
      const name = view.slotOutput(slot)
      if (name === said.value) return child
      const attrs = [...child.attrs!]
      const value = new P.ASTStringLiteral(said.match, { value: name, quote: '"' })
      attrs[index] = new P.ASTJSXAttribute(attrs[index]!.match, { name: "slot", value })
      return new P.ASTJSXElement(child.match, { tagName: child.tagName, attrs, children: child.children })
    })
  }

  /**
   * Is `element` an `<html>` block inside a spellx drawing's markup (epic `elemental-spell` P18)?
   * - `<section label="Image"><html><ui-avatar><img src="..."/></ui-avatar></html></section>`
   * - Its markup is the web's, as written:  `<img>`, `<span>`, `<ui-avatar>`, never a pack's bare name;  it draws in
   *   the block's place, the `<html>` tag itself drawing nothing.
   * - A block on a drawing's own lines is the tokenizer's (`SP.SpellxTokenizer`, `unwrapsHtml`):
   *   this is the one an element holds, which the tokenizer reads as that element's markup.
   * - The same in a `.spell` file, where its twin keeps it:  so the two compile the same.
   * - Not in a spellx file's `<spell>` chunk, nor inside another block:  there `<html>` is the web's own tag.
   */
  static isHtmlBlock(element: P.JSXElementToken | P.JSXFragmentToken): boolean {
    if (!(element instanceof P.JSXElementToken) || element.tagName !== HTML_BLOCK_TAG) return false
    return codeSpellDepth === 0 && !SP.isCodeSpell(element)
  }

  /**
   * The tag of the component a spellx drawing names by bare `word` (`<button>`, `<card>`):
   * - the project's own view of that name first:  `card` => `solitaire-card`, as its element is named
   * - else the first of the project's packs that has it (`SP.ComponentPacks`):  `button` => `ui-button`,
   *   `botón` in a Spanish file => `es-boton`
   * - a name with a dash is a pack's too, when it has one:  `tree-diagram` => `ui-tree-diagram` (P32)
   * - `undefined`:  nobody has it;  a name with a dash (`ui-text`, `solitaire-card`) is then left as written, as a tag
   */
  static componentTagFor(scope: P.Scope, word: string): string | undefined {
    if (!isBareComponentName(word)) {
      return word.includes("-")
        ? SP.ComponentPacks.tagFor(word, SP.Language.of(scope).lang, SpellJSX.packsFor(scope))
        : undefined
    }
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

  ////////////////
  // ## A `<for>` inside an element
  ////////////////

  /** Is `element` spellx's `<for ...>`, its word the language's (`<for>`, `<para>`)? */
  private static isSpellxLoop(scope: P.Scope, element: P.JSXElementToken): boolean {
    const controls = SP.Language.of(scope).words.spellx?.controls ?? {}
    return controls[element.tagName.toLowerCase()] === "for each"
  }

  /**
   * A `<for ...>` inside a spellx drawing's element (epic `language` I19):  `<cards>` holding a card, then a card each.
   * - Its text is read again as a drawing's lines (`SpellxTokenizer.tokenizeDrawingLines()`), then parsed as they'd be
   *   on a line of their own:  its attributes riders, its `<empty>`, its children what it draws for each item.
   * - Its tokens are placed where its text sits in the file, so errors point at it.
   * - Its errors are its element's:  `parseErrorsIn()` reports them.
   */
  private static parseLoop(scope: P.Scope, match: P.MatchFor<SpellJSX>, element: P.JSXElementToken) {
    const parser = scope.parser as SP.SpellParser
    const tokenizer = parser.tokenizer as SP.SpellxTokenizer
    const { raw = "", start, line = 0, ch = 0 } = element.record
    // its first line indented as it is in the file, the same way its later lines are
    const indent = /\n( ?)/.exec(raw)?.[1] ? " " : "\t"
    const blocks = tokenizer.tokenizeDrawingLines(indent.repeat(ch) + raw)
    P.Tokenizer.forEachToken(blocks, (token) => {
      token.record.start += start - ch
      token.record.line = (token.record.line ?? 0) + line
    })
    let block: P.BlockToken | undefined = blocks[0]
    while (block?.tokens.length === 1 && block.tokens[0] instanceof P.BlockToken) block = block.tokens[0]
    match.data.loop = block && parser.parse([block], "block", scope)
    if (!match.data.loop) match.data.error = parser.parse([element], "parse_error", scope)
    return match
  }

  /**
   * What a `<for>` inside an element draws, as one of its children:  `core.drawEach(...)`, or `core.drawRead(...)`
   * with its riders -- gathered as a drawing's lines are (`DrawnLines`), in a `{...}` so it follows what it reads.
   */
  private static loopAST(match: P.MatchFor<SpellJSX>, loop: P.Match): P.ASTExpression {
    const statements = (loop.AST as P.ASTStatementGroup | undefined)?.statements ?? []
    const gathered = DrawnLines.gather(statements as never) as P.ASTNode[]
    const drawing = gathered.filter((line): line is P.ASTReturnStatement => line instanceof P.ASTReturnStatement).at(-1)
    const value = drawing?.value ?? new P.ASTNothingLiteral(match)
    return new P.ASTJSXExpression(match, { expression: value as P.ASTExpression })
  }

  /** The packs `scope`'s project draws with:  its project file's `packs`, else `SP.ComponentPacks.DEFAULT`. */
  static packsFor(scope: P.Scope): readonly string[] {
    return (scope.parser as SP.SpellParser | undefined)?.packs ?? SP.ComponentPacks.DEFAULT
  }

  /**
   * `attrs`, plus `style="cursor:var(--ui-control-cursor,pointer);user-select:none"` when they say `onClick` and no `style`:
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
      // `<film/>`, a loop's item beside other markup:  `draw the film`, in braces (epic `atmosphere` T48)
      if (ast && child?.is(SpellJSX) && child.data.loopItem)
        asts.push(new P.ASTJSXExpression(child, { expression: ast as unknown as P.ASTExpression }))
      else if (ast) asts.push(ast)
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
        // text between branches (their indent), or a comment, leaves the chain open;  anything else ends it
        const [token] = child?.matched ?? []
        const isQuiet =
          token instanceof P.JSXCommentToken || (token instanceof P.JSXTextToken && !`${token.value ?? ""}`.trim())
        if (child && !isQuiet) open = false
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
   * own, each run of text and `{holes}` in a `<span>` of its own.
   * - `shown` none:  always shown, as an `<otherwise>` alone would be.
   */
  private static hiddenUnless(
    match: P.AnyMatch,
    shown: P.ASTExpression | undefined,
    children: P.ASTJSXElementProps["children"]
  ): P.ASTJSXElementProps["children"] {
    if (!shown) return children
    // a custom element (`<ui-label>`) by its own `hidden`, Spell UI's:  its host takes no box of its own, where the
    // browser's until-found would draw it all the same;  the web's own elements and text, until found
    const hidden = (tagName = "span") =>
      new P.ASTJSXAttribute(match, {
        name: "hidden",
        value: new P.ASTTernaryExpression(match, {
          condition: shown,
          trueValue: new P.ASTNothingLiteral(match),
          falseValue: tagName.includes("-")
            ? new P.ASTBooleanLiteral(match, true)
            : new P.ASTStringLiteral(match, { value: UNTIL_FOUND, quote: '"' })
        })
      })
    const out: P.ASTJSXElementProps["children"] = []
    // a run of text and holes, `{its count} to do`:  ONE span
    let run: P.ASTJSXElementProps["children"] = []
    const endRun = () => {
      if (run.length)
        out.push(new P.ASTJSXElement(run[0]!.match, { tagName: "span", attrs: [hidden()], children: run }))
      run = []
    }
    for (const child of children) {
      if (child instanceof P.ASTJSXEndTag) continue
      if (child instanceof P.ASTJSXFragment) {
        endRun()
        out.push(...SpellJSX.hiddenUnless(match, shown, child.children))
      } else if (child instanceof P.ASTJSXElement) {
        endRun()
        const { tagName, attrs = [], children: inside } = child
        out.push(new P.ASTJSXElement(child.match, { tagName, attrs: [...attrs, hidden(tagName)], children: inside }))
      } else run.push(child)
    }
    endRun()
    return out
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
        // a `<for>` inside an element:  its lines' errors (I19)
        if (match.is(SpellJSX) && match.data.loop) errors.push(...(SP.Block.getParseErrors(match.data.loop) ?? []))
        below.push(...(match.data.attributes ?? []), ...(match.data.children ?? []))
      }
      if (match.is(SpellJSXContent)) {
        if (match.data.error) errors.push(match.data.error)
        // an expression its rule refused, saying why (`SpellStatement.refuse()`):  compiled as its error (epic `language` T48)
        if (match.data.expression?.is(ParseError)) errors.push(match.data.expression)
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

/** An `<html>` block's tag:  the web's word, the same in every language (`SpellJSX.isHtmlBlock()`). */
const HTML_BLOCK_TAG = "html"

/** What a branch that isn't the one is:  hidden, and still found by find-in-page, as a folded section is. */
const UNTIL_FOUND = "until-found"

/** What an element with an `onClick` looks like by itself -- see `SpellJSX.clickableAttrs()`. */
// written as Solid's compiler writes it into a TypeScript drawing, so every target draws the same
const CLICKABLE_STYLE = "cursor:var(--ui-control-cursor,pointer);user-select:none"

/** Spell UI's element that shows one measure:  `<ui-dimension value={its height}>`. */
const MEASURE_TAG = "ui-dimension"
