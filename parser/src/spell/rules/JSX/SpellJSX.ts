import { elementTagFor, proto } from "spell/util"
import { SkeletonText } from "spell/element/SkeletonText"
import { lookOfWords } from "spell/parser/core/looks"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Through the folder:  read only when called, once the folder has loaded
import { DrawIt, DrawnLines, OutlineSpecifierMedia, OutlineSpecifierSort } from "spell/parser/spell/rules/classes"
import { SpellConstant } from "spell/parser/spell/rules/constants"
import { QuotedMember } from "spell/parser/spell/rules/properties"
import { ParseError } from "spell/parser/spell/rules/ParseError"
import { Wording } from "spell/parser/spell/rules/expressions"
// Through the folder:  read only when parsing, once the folder has loaded
import { MEDIA_KINDS, noteMediaName } from "spell/parser/spell/rules/UI"
import { refuseWriteIfReadOnly } from "spell/parser/spell/rules/places/places.shared"
import {
  DIVIDER_TAG_MEANING,
  isBareComponentName,
  MENU_ROW_TAG,
  MENU_TAGS,
  SPELL_JSX_MEANINGS,
  SPELL_TAG_WORDS,
  spellTagsIn,
  CONTEXT_MENU_TAG_MEANING,
  HIDDEN_ATTRIBUTE,
  hasMenuNamed,
  noteMenuName,
  webWordFor,
  type DrawnDeclaration,
  type JSXMatchData
} from "./JSX.shared"
import { ActionButton } from "./ActionButton"
import { ContextMenuBlock } from "./ContextMenuBlock"
import { ExampleBlock } from "./ExampleBlock"
import { MarkdownBlock } from "./MarkdownBlock"
import { SpellJSXContent } from "./SpellJSXContent"

/** The table's tag:  `sort="the order"` shows and sets a sort a page holds. */
const TABLE_TAG = "ui-table"
/** The table's attribute naming the sort a page holds that it shows:  `sort`, in every language. */
const PAGE_SORT_ATTRIBUTE = "sort"
/** The tag of a form:  bound to a thing, its fields write to it. */
const FORM_TAG = "ui-form"
/** The attribute naming what a form is bound to. */
const VALUE_ATTRIBUTE = "value"
/** A disabled form's fields can't change anything. */
const DISABLED_ATTRIBUTE = "disabled"
/** A menu's divider, as Spell UI's `<ui-action>` takes it:  its `kind`. */
const MENU_DIVIDER = "divider"
/** What a project's own view is built on:  the core's classes drawn as elements of their own -- see `isDrawnType()`. */
const DRAWN_BASE_TYPES = ["View", "ViewableList"]
/** What a view's quoted word is, `<tableau "T1"/>`:  the id of the thing it draws -- see `attributesOf()`. */
const VIEW_ID_ATTRIBUTE = "id"
/**
 * The tags a quoted word NAMES (epic `language` P61):  `<modal "you won">` is the modal `show "you won"` shows.
 * - Its words joined by `-` are its id, `you-won`, as a view's are;  `title`, the attribute it also fills, as written.
 * - Only what comes and goes (Owen, 2026-11-17:  "Don't need it on everything"):  a modal, a menu, a popup.
 */
/** The attribute naming the menu a right click on an element shows, as the page reads it:  `context-menu="game menu"`. */
const CONTEXT_MENU_ATTRIBUTE = "context-menu"
/** Spell UI's modal:  its actions close it, and what it holds goes in its parts (epic `language` T155). */
const DIALOG_TAG = "ui-modal"
/** Where a sound or video's tag says its file is:  `source`, and Spanish's `fuente`;  `src` as the web writes it. */
const MEDIA_SOURCE_ATTRIBUTES = ["source", "fuente", "src"]

/** The scope a named modal's contents are drawn in, where `it` is what it's shown with (epic `language` P64). */
const SHOWN_SCOPE = "shown"

/** What `it` compiles to inside a named modal:  `core.drawShown()`'s callback's argument. */
const SHOWN_IT = "it"
/** The parts a modal lays out (`ownsParts`):  a drawing that names one lays its modal out itself. */
const DIALOG_PART_TAGS = ["ui-header", "ui-content", "ui-description", "ui-actions"]
/** Where a modal's drawing goes, when it names none of its parts:  its content, then its actions' buttons. */
const DIALOG_CONTENT_TAG = "ui-content"
const DIALOG_ACTIONS_TAG = "ui-actions"
/** A modal's attribute saying it's drawn as written, see-through:  `<modal transparent>` (epic `language` J245). */
const DIALOG_TRANSPARENT_ATTRIBUTE = "transparent"
const NAMED_TAGS: Readonly<Record<string, { title?: string }>> = {
  "ui-modal": { title: "heading" },
  "ui-menu": {},
  "ui-popup": { title: "heading" }
}

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
 * - A BARE name is a component's (epic `elemental-spell` P7, Q46;  in plain Spell too since epic `language` P45, Q4 A):
 *   `componentTagFor()`.
 *   - `<card>`:  one of the project's own views, `<solitaire-card>`;  else `<button>`:  a pack's, `<ui-button>`.
 *   - A view's slots can be filled there, `<card><text slot="front">Ace</text></card>`, each named as it compiles
 *     (P27):  see `withSlotNames()`.
 *   - A view's quoted word is its `id`, `<tableau "T1"/>` ~== `<tableau id="T1"/>` (Owen, 2026-11-12):
 *     it draws the thing whose name, or chosen id, is T1 -- see `attributesOf()`.
 *     A view declared further down is found as it compiles (`laterView`).
 *   - No native HTML in a page (Q46, C1):  `<div>` is an error unless a pack has it;
 *     in plain Spell it's the web's own, as written.
 *   - Except in a page.s `<spell>` or `<html>` block, code spell as written (J83):  there `<div>` is the web's (`SP.isCodeSpell()`).
 * - AN IF-CHAIN INSIDE MARKUP (epic `elemental-spell`, Owen 2026-10-25):
 *   `<text><if it is done>✓<otherwise>{its title}</></text>`, the same in a page and in plain Spell.
 *   - ONLY the branch whose condition holds is drawn:  `core.drawIf(() => c1, () => [...], () => [...])`, each
 *     branch's children a fragment.  A flip draws the new branch, and lets the old one go.
 *     - So a branch that isn't the one reads nothing:  a place's read under it waits until it shows.
 *     - Every branch was once drawn and kept, the others `hidden` (find-in-page reached them, and a flip kept their
 *       elements);  but a hidden branch still read what it showed, asking a place for every item for a value that
 *       wasn't there yet, and showed a spinner of its own beside the one shown.
 *   - Branch k shows while no branch before it holds, and its own phrase does.
 *   - A condition that waits:  ONE spinner where the chain goes (`WriterProject.ifsThatWait`).
 *   - The tokenizer reads the chain (`P.Tokenizer.chainTags`):  each branch a `JSXElementToken` with its `chain`
 *     and `phrase`, its siblings the next branches, ONE closer, `</>` or `</if>`, ending the last.
 *   - At a drawing's top level an `<if>` picks what to return, rebuilt as it changes:  a page.s own tag line, or
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
    // an `<html>` block inside a page drawing's markup:  its markup as written, drawn in its place (P18)
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
    // in a page's `<spell>` block, it and everything inside it is code spell (J83)
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
    const isPage = (scope.parser as SP.SpellParser | undefined)?.form === "page" && !codeSpell
    // a drawing's shortcuts, plain Spell's too (epic `language` P45, Q4 A):  bare names, a `<for>` in an element;
    // never in a page's `<spell>` or `<html>` block, code spell as written (J83)
    const takesShortcuts = !codeSpell
    // a drawing's `<for ...>` inside an element:  read as on a line of its own, its children its body (I19)
    if (takesShortcuts && element instanceof P.JSXElementToken && SpellJSX.isLoop(scope, element)) {
      return SpellJSX.parseLoop(scope, match, element)
    }
    // a modal named by its quoted word:  inside it, `it` is what it's shown with (epic `language` P64)
    const shownIn =
      takesShortcuts && element instanceof P.JSXElementToken ? SpellJSX.shownInScope(scope, element) : undefined
    if (shownIn) match.data.shownIn = textOf((element as P.JSXElementToken).quotedWord!.value).trim()
    // a rider inside an element, `<loading>`, `<failed>`:  inside `<failed>`, `the error` is what went wrong
    const rider = takesShortcuts && element instanceof P.JSXElementToken ? SpellJSX.riderOf(scope, element) : undefined
    if (rider) match.data.rider = rider
    const childScope = shownIn ?? (rider === "failed" ? SpellJSX.failedScope(scope) : scope)
    // `Scope.parse()` only accepts a `string` for `text`, but we have actual `Token`s here:
    // call `scope.parser.parse()` directly instead, as `SpellCSSFile.parse()` does.
    match.data.children = element.children?.map(
      (child) =>
        scope.parser?.parse(child, "jsxChild", childScope) || scope.parser?.parse(child, "parse_error", childScope)
    )
    SpellJSX.claimBranches(scope, match)
    // a fragment (`jsxFragment`) has no tag and no attributes
    if (!(element instanceof P.JSXElementToken)) return match
    if (element.chain) return SpellJSX.parseBranch(scope, match, element)
    const webTag = webWordFor(scope, SPELL_TAG_WORDS, element.tagName)
    // the web's tag for spell's word (`<children/>`);  spell's own tags keep their word where their rules didn't take
    // them:  `<action>` with no quoted word, a `<divider/>` outside a context menu
    // `<separator/>` is `<divider/>` anywhere (T156):  named by the language's own word, `divider`, `divisor`
    const word = webTag === DIVIDER_TAG_MEANING ? SpellJSX.dividerWordFor(scope, element.tagName) : element.tagName
    match.data.tagName = SPELL_JSX_MEANINGS.includes(webTag) ? webTag : word
    // a drawing names components by their bare names:  `<button>` => `<ui-button>`
    if (takesShortcuts && !element.attributes?.length && !element.children?.length && !element.quotedWord) {
      match.data.loopItem = SpellJSX.loopItemNamed(scope, element.tagName)
      if (match.data.loopItem) return match
    }
    // a sound or video named where it's drawn (epic `language` P65):  `<video "intro" source="..." />`
    if (
      takesShortcuts &&
      element.quotedWord &&
      !element.children?.length &&
      SpellJSX.mediaDrawnBy(scope, match, element)
    ) {
      return match
    }
    // a value declared where it's drawn (epic `language` P55, Q52):  `<number "score"/>` ~== `"score" is a number`
    if (takesShortcuts && element.quotedWord && !element.children?.length && !element.attributes?.length) {
      const value = SpellJSX.valueDeclaredBy(scope, element)
      if (value) {
        match.data.declares = value
        return match
      }
    }
    if (takesShortcuts && match.data.tagName === word) {
      // a quoted word names a thing, so a type declared further down wins over a pack's component of that name:
      // `<columna "C1"/>` is Solitario's column, `<columna/>` the grid's
      const later = element.quotedWord ? SpellJSX.laterViewFor(scope, element.tagName) : undefined
      const tag = later ? undefined : SpellJSX.componentTagFor(scope, word)
      const view = tag ? scope.getType(SP.typeName(element.tagName)) : undefined
      // one of the project's own views:  its children may fill its slots (`withSlotNames()`)
      if (view && SpellJSX.isDrawnType(view)) match.data.view = view
      if (tag) match.data.tagName = tag
      // a type declared further down, still a stub:  a view once its line says so, when it compiles (`viewOf()`)
      else match.data.laterView = later ?? SpellJSX.laterViewFor(scope, element.tagName)
      // a bare name nobody has:  an error in a page;  in plain Spell, the web's own element, `<div>`
      if (!tag && !match.data.laterView && !match.data.rider && isPage && isBareComponentName(element.tagName)) {
        const language = SP.Language.of(scope)
        const packs = SP.ComponentPacks.searched(SpellJSX.packsFor(scope))
        // a control inside an element (`<segment><otherwise>`):  a page reads those on a drawing's own lines
        const message = SpellJSX.isControlWord(language, element.tagName)
          ? language.parserMessage("page-tag-in-markup", { tag: element.tagName })
          : language.parserMessage("page-unknown-component", { tag: element.tagName, packs })
        match.data.error = SP.spellParser.createParseError(scope, [element], message)
        // still drawn, by the name it has:  a pack that isn't loaded here may have it
        match.data.error.data.drawnAnyway = true
      }
    }
    // a Spell UI menu or toolbar, in any language:  its actions and dividers are its rows (epic `editor` P29)
    if (SpellJSX.isMenu(scope, match.data.tagName)) SpellJSX.markMenuRows(scope, match)
    // a modal:  its actions close it, and what it holds goes in its parts (epic `language` T155)
    if (SpellJSX.canonicalTagOf(scope, match.data.tagName) === DIALOG_TAG) SpellJSX.markDialog(scope, match, element)
    // a modal, menu or popup its quoted word names, `<modal "you won">` (P61):  never one of the project's own views
    if (element.quotedWord && !match.data.view && !match.data.laterView) {
      match.data.named = SpellJSX.namedTagTitle(scope, match.data.tagName)
      // a menu by its name:  a right-click menu may reuse it (T156)
      if (match.data.named !== undefined && SpellJSX.isMenu(scope, match.data.tagName)) {
        noteMenuName(scope, textOf(element.quotedWord.value))
      }
    }
    SpellJSX.reuseNamedMenu(scope, match, element)
    match.data.looking = SpellJSX.lookingOf(scope, match, element, match.data.tagName)
    match.data.attributes = SpellJSX.attributesOf(match, element)?.map((attr) =>
      scope.parser?.parse(attr, "jsxAttribute", scope)
    )
    // a table showing a sort a page holds, `<table sortable sort="the order">`:  a header click sets it
    match.data.pageSort = SpellJSX.pageSortOf(scope, match, element)
    // a view declared where it's drawn (Q52):  `<column "C1"/>` ~== `"C1" is a new column`
    const view = SpellJSX.viewDeclaredBy(scope, match, element)
    if (view) match.data.declares = SpellJSX.saysHidden(match) ? { ...view, hidden: true } : view
    SpellJSX.warnAboutListedValues(scope, match, element)
    SpellJSX.refuseFormOfReadOnlyPlace(scope, match)
    // a dotted tag, `<UI.Form>`:  the writer writes the error where the element would be, this reports it
    if (P.ASTJSXElement.tagError(match.data.tagName)) {
      const message = SP.Language.of(scope).parserMessage("not-an-element", { tag: element.tagName })
      // a type declared further down, `<fundación "tréboles"/>`:  its view's tag is fine, its own word isn't
      const { laterView } = match.data
      if (laterView) SP.SpellWarnings.refuseIf(match, message, () => !SpellJSX.isLaterView(laterView.type))
      else match.data.error = SP.spellParser.createParseError(scope, [element], message)
    }
    SpellJSX.noteUnreadable(scope, match, element)
    return match
  }

  /**
   * `element`'s attributes, and its quoted word as what it means:  on one of the project's own views, its `id`
   * (Owen, 2026-11-12).
   * - `<tableau "T1"/>` ~== `<tableau id="T1"/>`:  the view's element draws the tableau whose name, or chosen id, is T1
   *   (`core.thingFor()`).
   * - Its words joined by `-`, the id the member it names takes:  `<discard-pile "discard pile"/>` ~==
   *   `<discard-pile id="discard-pile"/>` (`QuotedMember.idOf()`, language T147).
   * - Any language's tags alike:  it's the tag being a view that counts, not its word.
   * - After its other attributes, so each of those keeps its place (`warnAboutListedValues()`).
   * - On a tag a quoted word names (`NAMED_TAGS`, epic `language` P61), its id too, and its title:
   *   `<modal "you won">` ~== `<modal id="you-won" heading="you won">`, unless it says its own `heading`.
   * - On any other tag the word means nothing:  `noteUnreadable()` says so.
   */
  private static attributesOf(
    match: P.MatchFor<SpellJSX>,
    element: P.JSXElementToken
  ): P.JSXAttributeToken[] | undefined {
    const { quotedWord } = element
    const { view, laterView, named, contextMenuAttribute } = match.data
    // the language's word for the right-click menu's attribute, the web's `context-menu` (T156)
    const attributes = element.attributes?.map((attribute) =>
      attribute === contextMenuAttribute
        ? new P.JSXAttributeToken({ ...attribute.record, name: CONTEXT_MENU_ATTRIBUTE })
        : attribute
    )
    if (!quotedWord || !(view || laterView || named !== undefined)) return attributes
    const { start, value, raw } = quotedWord.record
    // one word, as the member it names takes it:  `"discard pile"` => `"discard-pile"` (`QuotedMember.idOf()`)
    const word = value instanceof P.TextToken ? oneWordText(value) : value
    const id = new P.JSXAttributeToken({ name: VIEW_ID_ATTRIBUTE, start, value: word, raw })
    // a named tag's title, `heading`:  unless it says its own
    if (!named || element.attributes?.some((attribute) => attribute.name === named)) {
      return [...(attributes ?? []), id]
    }
    return [...(attributes ?? []), id, new P.JSXAttributeToken({ name: named, start, value, raw })]
  }

  ////////////////
  // ## A table showing a sort a page holds
  ////////////////

  /**
   * A table's `sort="the order"`, naming a sort a page holds (`its "order" is a sort:  ...`):  the attribute's place,
   * and the property it names -- `undefined` for any other tag, or a table with no quoted `sort`.
   * - The table shows it, and a header click sets it (`<cell sort="completion">`;  `listenForTableSorts()`), so it
   *   must be a property, of the page or of the thing drawn:  anything else is an error.
   * - Its name is `sort` in every language:  Spell UI's table takes it so.
   * - A lookup:  call it WHILE PARSING;  whether it holds a sort is asked as it compiles (`withPageSort()`), so it may be
   *   declared further down.
   */
  private static pageSortOf(
    scope: P.Scope,
    match: P.MatchFor<SpellJSX>,
    element: P.JSXElementToken
  ): JSXMatchData["pageSort"] {
    if (SpellJSX.canonicalTagOf(scope, match.data.tagName) !== TABLE_TAG) return undefined
    const index = element.attributes?.findIndex(
      (each) => each.name === PAGE_SORT_ATTRIBUTE && each.value instanceof P.TextToken
    )
    if (index === undefined || index < 0) return undefined
    const attribute = element.attributes![index]!
    const words = (attribute.value as P.TextToken).innerText
    const value = scope.parse(words, "expression")
    const message = SP.Language.of(scope).parserMessage("table-sort-not-a-sort", { words })
    if (!value || value.inputText.length !== words.length) {
      match.data.error ??= SP.spellParser.createParseError(scope, [attribute], message)
      return undefined
    }
    SP.SpellWarnings.refuseIf(match, message, () => !SpellJSX.isPageSort(value))
    return { index, value }
  }

  /** Does `value` read a property holding a sort a page holds:  `the order`, `its order`? */
  private static isPageSort(value: P.Match): boolean {
    return OutlineSpecifierSort.holdsASort(value) && value.AST instanceof P.ASTPropertyExpression
  }

  /**
   * `attrs` with the table's `sort` showing the sort a page holds:  `"prop:sort": () => core.sortShown(this, "order")`,
   * which remembers where it lives for a header click to set (`core.sortShown()`).
   * - What names no sort was refused as it was read (`pageSortOf()`).
   */
  private static withPageSort(
    match: P.MatchFor<SpellJSX>,
    { index, value }: NonNullable<JSXMatchData["pageSort"]>,
    attrs: P.ASTJSXAttribute[] | undefined
  ): P.ASTJSXAttribute[] | undefined {
    if (!SpellJSX.isPageSort(value)) return attrs
    const read = value.AST as P.ASTPropertyExpression
    const shown = new P.ASTCoreMethodInvocation(match, {
      methodName: "sortShown",
      args: [
        read.object as P.ASTExpression,
        new P.ASTStringLiteral(match, { value: JSON.stringify(read.property.value) })
      ]
    })
    const sort = new P.ASTJSXAttribute(match, { name: PAGE_SORT_ATTRIBUTE, value: shown })
    return attrs?.map((attr, at) => (at === index ? sort : attr))
  }

  ////////////////
  // ## Members declared where they're drawn (epic `language` P55, Q52)
  ////////////////

  /**
   * The member a view's tag with a quoted word declares, in a thing's own drawing (`to draw it`), when the thing has
   * none by that name:  `<column "C1"/>` ~== `"C1" is a new column` -- `undefined` for any other tag.
   * - Its attributes are the new view's starting values:  `<foundation "clubs" suit=clubs/>`.
   * - A member said on a line of its own wins:  the tag draws it, as before (I79, I80).
   * - A lookup:  call it WHILE PARSING;  `DrawnMarkup` declares what it found.
   */
  private static viewDeclaredBy(
    scope: P.Scope,
    match: P.MatchFor<SpellJSX>,
    element: P.JSXElementToken
  ): DrawnDeclaration | undefined {
    const view = match.data.view ?? match.data.laterView?.type
    const owner = SpellJSX.drawingThingOf(scope)
    if (!view || !owner || !element.quotedWord) return undefined
    const name = textOf(element.quotedWord.value)
    if (!name || owner.getMember(QuotedMember.nameOf(name))) return undefined
    return { owner: owner.name, name, view: view.name }
  }

  /**
   * The value a tag naming a datatype declares, in a thing's own drawing:  `<number "score"/>` ~== `"score" is a number`,
   * drawn where it is, as `{the score}`;  Spanish's `<número "puntuación"/>` -- `undefined` for any other tag.
   * - Text or a number:  the language's words for them (`SP.Language.typeWords`).
   * - A member said on a line of its own is drawn the same, and declares nothing.
   */
  private static valueDeclaredBy(scope: P.Scope, element: P.JSXElementToken): DrawnDeclaration | undefined {
    const datatype = SP.Language.of(scope).typeWords[element.tagName] ?? element.tagName
    if (!DRAWN_VALUE_TYPES.includes(datatype)) return undefined
    const owner = SpellJSX.drawingThingOf(scope)
    const name = element.quotedWord && textOf(element.quotedWord.value)
    if (!owner || !name) return undefined
    // said on a line of its own:  only drawn
    if (owner.getMember(QuotedMember.nameOf(name))) return { owner: owner.name, name, datatype, drawnOnly: true }
    return { owner: owner.name, name, datatype }
  }

  /** Does `match`'s tag say `hidden` (Spanish `oculto`), by the web's name for its attribute? */
  private static saysHidden(match: P.MatchFor<SpellJSX>): boolean {
    return !!match.data.attributes?.some(
      (attr) => (attr?.data as JSXMatchData | undefined)?.webAttribute === HIDDEN_ATTRIBUTE
    )
  }

  /**
   * SIDE EFFECT:  reads a sound or video's tag with a quoted word into `match.data.media` -- `false` for any other tag
   * (epic `language` P65).
   * - `<sound "card slide" source="sounds/slide.mp3" />`, `<video "intro" source="..." />`, `<movie ...>`;
   *   Spanish `<sonido ...>`, `<vídeo ...>`, `<película ...>`:  the language's `media_kind` words.
   * - In a thing's own drawing, with a `source` and no member by that name:  it declares one, a property of the page
   *   or app, as `sound "card slide" is at "..."` does (`match.data.declares`).
   * - Its name is noted (`noteMediaName()`), so `play the card slide sound` reads.
   * - Its other attributes are left out:  a video's look is the core's (its controls, framed).
   */
  private static mediaDrawnBy(scope: P.Scope, match: P.MatchFor<SpellJSX>, element: P.JSXElementToken): boolean {
    const kind = MEDIA_KINDS.find((meaning) => Wording.reads(scope, "media_kind", element.tagName, meaning))
    const name = element.quotedWord && textOf(element.quotedWord.value).trim()
    if (!kind || !name) return false
    const attribute = element.attributes?.find((each) => MEDIA_SOURCE_ATTRIBUTES.includes(each.name))
    const source = attribute ? scope.parser?.parse(attribute, "jsxAttribute", scope) : undefined
    match.data.media = { kind, name, ...(source && { source }) }
    noteMediaName(scope, name)
    const owner = SpellJSX.drawingThingOf(scope)
    if (owner && source && !owner.getMember(QuotedMember.nameOf(name))) {
      match.data.declares = { owner: owner.name, name, media: kind, datatype: kind }
    }
    return true
  }

  /**
   * `core.drawMedia(...)`:  what a sound or video's tag draws, its player (a sound's, nothing).
   * - Named by its word, `core.mediaNamed("intro", "video")`:  declared here or anywhere else on the page or app.
   * - Outside a thing's own drawing, with a `source`:  `core.media("video", "...", "intro")`, which names it as it draws.
   */
  private static mediaAST(match: P.MatchFor<SpellJSX>, media: NonNullable<JSXMatchData["media"]>): P.ASTJSXElement {
    const text = (value: string) => new P.ASTStringLiteral(match, { value: JSON.stringify(value) })
    const source = (media.source?.AST as P.ASTJSXAttribute | undefined)?.value
    const target =
      media.source && !match.data.declares && source instanceof P.ASTExpression
        ? OutlineSpecifierMedia.made(match, media.kind, source, media.name)
        : new P.ASTCoreMethodInvocation(match, { methodName: "mediaNamed", args: [text(media.name), text(media.kind)] })
    // a call, as a loop's item's drawing is:  an element holding it puts it in braces (`childAST()`)
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "drawMedia",
      args: [target]
    }) as unknown as P.ASTJSXElement
  }

  /** Is `match` a tag that draws nothing:  a view it declares, `hidden` (`<deck "deck" hidden/>`, T123)? */
  private static drawsNothing(match: P.Match | undefined): boolean {
    return !!(match?.is(SpellJSX) && match.data.declares?.hidden)
  }

  /** The thing whose own drawing (`to draw it`) `scope` is in, if it's in one -- `undefined` elsewhere. */
  private static drawingThingOf(scope: P.Scope): P.TypeScope | undefined {
    if (DrawIt.drawingIn(scope)?.drawing !== "draw") return undefined
    return P.MethodScope.thingTypeOf(scope)
  }

  /**
   * SIDE EFFECT:  warns about a plain quoted value that isn't one of its property's values:
   * `<card suit="banana"/>`, naming the suits (epic `language` P39).
   * - Only plain text:  `suit={x}` and `rank="[rank]"` can only be known when it runs, where the same check warns.
   * - Only a project's own view:  anything else's attributes aren't its properties.
   */
  private static warnAboutListedValues(scope: P.Scope, match: P.Match, element: P.JSXElementToken): void {
    const texts = element.attributes?.filter((attribute) => attribute.value instanceof P.TextToken)
    if (!texts?.length) return
    const view = scope.getType(SP.typeName(element.tagName))
    if (!view || !SpellJSX.isDrawnType(view)) return
    for (const attribute of texts) {
      const member = view.getMember(attribute.name)
      const text = attribute.value as P.TextToken
      if (!(member instanceof P.ScopeVariable) || !member.listedValues || text.innerText.includes("[")) continue
      if (SpellConstant.isListed(member, text.innerText)) continue
      const index = element.attributes!.indexOf(attribute)
      const at = (match.data.attributes as Array<P.Match | undefined>)[index] ?? match
      SP.SpellWarnings.note(match, SpellConstant.notOneOfMessage(scope, member, `${text.value}`), at)
    }
  }

  /**
   * SIDE EFFECT:  a form bound to a saved thing, `<ui-form value={it}>`, won't compile while that's saved in a read-only place:
   * its fields write to the thing (epic `data` T37).
   * - The same check a `set` line has;  a disabled form writes nothing.
   */
  private static refuseFormOfReadOnlyPlace(scope: P.Scope, match: P.MatchFor<SpellJSX>): void {
    if (match.data.tagName !== FORM_TAG) return
    const attributes = (match.data.attributes ?? []) as Array<P.Match | undefined>
    const named = (word: string) => attributes.find((attribute) => attribute?.data.attribute === word)
    if (named(DISABLED_ATTRIBUTE)) return
    const value = named(VALUE_ATTRIBUTE)?.data.expression as P.Match | undefined
    if (value) refuseWriteIfReadOnly(match, scope.getType(value.datatype))
  }

  /**
   * SIDE EFFECT:  an element whose tag holds something it couldn't read says so -- see `parseErrorsIn()`.
   * - A quoted word on a tag that isn't one of the project's views too:  only a view takes one, as its `id`;
   *   and a tag it names, `<modal "you won">` (`NAMED_TAGS`).
   */
  static noteUnreadable(scope: P.Scope, match: P.Match, element: P.JSXElementToken): void {
    const { view, laterView, named } = match.data as JSXMatchData
    const word = element.quotedWord?.value
    const text = element.unreadable ?? (view || named !== undefined || !word ? undefined : textOf(word))
    if (!text) return
    const message = SP.Language.of(scope).parserMessage("unreadable-attribute", {
      text,
      tag: element.tagName
    })
    // a type declared further down:  its quoted word is unreadable only if its line doesn't make it a view
    if (laterView && !element.unreadable) {
      return SP.SpellWarnings.refuseIf(match, message, () => !SpellJSX.isLaterView(laterView.type))
    }
    const { data } = match as P.Match<P.MatchGroups, { error?: P.Match }>
    // an attribute it skipped:  that much broken, not the whole tag and all it holds (epic `language` I145)
    data.error = SP.spellParser.createParseError(scope, [element.unreadableAt ?? element], message)
  }

  /**
   * The project's view `match` draws, if it's one:  as `parse()` found it, or a type declared further down,
   * whose line has said what it is by the time it compiles (`laterView`).
   */
  private static viewOf(match: P.MatchFor<SpellJSX>): P.TypeScope | undefined {
    const { view, laterView } = match.data
    return view ?? (laterView && SpellJSX.isLaterView(laterView.type) ? laterView.type : undefined)
  }

  /**
   * Is `type`, declared further down than the drawing naming it, one of the project's views, as it compiles?
   * - Its line has parsed:  as `isDrawnType()` says.
   * - Its line never parsed (broken, or taken into a tag above it left open), yet a scan found it (`stubDeclaredTypes()`):
   *   a view, as when it last parsed.
   *   - So a full parse draws what an editor's parse of the same text draws:
   *     there the drawing keeps what it was compiled to before the line broke (`P.IncrementalProject`).
   * - A type only mentioned, never declared (a stub with a `declaredBy`), is no view.
   */
  private static isLaterView(type: P.TypeScope): boolean {
    return type.stub ? !type.declaredBy : SpellJSX.isDrawnType(type)
  }

  /**
   * A type `word` names that's declared further down the project, still a stub as this line parses:
   * `<tableau "T1"/>` above `a "tableau" is a pile` -- `undefined` for anything else.
   * - With the tag its element would have:  its name alone says that, as `componentTagFor()` spells it.
   * - Whether it's a view is known only once its line has parsed, so `viewOf()` asks when it compiles,
   *   as a value kind declared further down is read (`DefinePropertyHas`).
   */
  private static laterViewFor(scope: P.Scope, word: string): JSXMatchData["laterView"] {
    if (!word.includes("-") && !isBareComponentName(word)) return undefined
    const type = scope.getType(SP.typeName(word))
    const project = projectScopeOf(scope)
    if (!type?.stub || !project?.name) return undefined
    return { type, tag: elementTagFor(project.name, type.name) }
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
    // a menu's divider:  a row of its own, a line between groups
    if (match.data.menuDivider) {
      const kind = new P.ASTJSXAttribute(match, {
        name: "kind",
        value: new P.ASTStringLiteral(match, { value: MENU_DIVIDER, quote: '"', raw: JSON.stringify(MENU_DIVIDER) })
      })
      const attrs = match.data.attributes?.map((attr) => P.asAST<P.ASTJSXAttribute>(attr?.AST)).filter(Boolean) ?? []
      return new P.ASTJSXElement(match, { tagName: MENU_ROW_TAG, attrs: [kind, ...attrs], children: [] })
    }
    // a sound or video, `<video "intro" />`:  its player, drawn where it is (epic `language` P65)
    if (match.data.media) return SpellJSX.mediaAST(match, match.data.media)
    // a value declared where it's drawn, `<number "score"/>`:  drawn as `{the score}` is
    const { declares } = match.data
    if (declares?.datatype) {
      const read = new P.ASTPropertyExpression(match, {
        object: new P.ASTSelfLiteral(match),
        property: QuotedMember.nameOf(declares.name)
      })
      return new P.ASTJSXExpression(match, { expression: read }) as unknown as P.ASTJSXElement
    }
    // a chain branch alone, in no element (an error), or an `<html>` block:  its children, drawn as they are
    if (match.data.chain || match.data.htmlBlock)
      return new P.ASTJSXFragment(match, { children: this.childASTs(match) })
    const view = SpellJSX.viewOf(match)
    const { laterView } = match.data
    const tagName =
      laterView && view ? laterView.tag : (match.data.tagName ?? (match.matched[0] as P.JSXElementToken).tagName)
    let attrs = match.data.attributes?.map((attr) => P.asAST<P.ASTJSXAttribute>(attr?.AST))
    if (match.data.pageSort) attrs = SpellJSX.withPageSort(match, match.data.pageSort, attrs)
    // a later type that's no view after all:  its quoted word, last, is no id (`noteUnreadable()` says so)
    if (laterView && !view && (match.matched[0] as P.JSXElementToken).quotedWord) attrs = attrs?.slice(0, -1)
    // a view this tag declares (Q52):  its attributes are the new thing's starting values, so the element has its id alone
    if (match.data.declares?.view) attrs = attrs?.filter((attr) => attr?.name === VIEW_ID_ATTRIBUTE)
    // its `loading="..."` is Spell's:  how what waits inside it looks, never handed to the element
    const { looking } = match.data
    if (looking) attrs = attrs?.filter((attr) => attr?.name !== looking.attribute && attr?.name !== LOADING_ATTRIBUTE)
    if (match.data.rider) {
      return new P.ASTJSXElement(match, {
        tagName,
        attrs: [],
        children: this.childASTs(match),
        rider: match.data.rider
      })
    }
    const ridden = SpellJSX.ridersAmong(this.childASTs(match))
    const laidOut = match.data.dialogParts ? SpellJSX.dialogChildren(match) : ridden.children
    const children =
      match.data.shownIn !== undefined && readsIt(laidOut) ? SpellJSX.drawnShown(match, laidOut) : laidOut
    return new P.ASTJSXElement(match, {
      tagName,
      attrs: SpellJSX.clickableAttrs(match, SpellJSX.withMeasure(match, tagName, attrs)),
      children: view ? SpellJSX.withSlotNames(view, children) : children,
      ...((looking || ridden.waiting || ridden.failed) && {
        looking: {
          said: looking?.said ?? "",
          ownsState: looking?.ownsState ?? SpellJSX.ownsLoadingState(match.scope, tagName),
          ...(ridden.waiting && { waiting: ridden.waiting }),
          ...(ridden.failed && { failed: ridden.failed }),
          ...(SpellJSX.hasStateSlots(match.scope, tagName) && { slots: true })
        }
      })
    })
  }

  /**
   * Which rider `element` is, written inside an element:  `<loading>` (`waiting`) or `<failed>`, by the language's
   * words for a `<for>`'s slots (`cargando`, `fallo`);  `undefined` for any other tag.
   * - Inside an element whose content waits:  what shows while it waits, or once it failed -- in its `loading` /
   *   `error` slots where it has them (Spell UI's panes), else in place of what waits (`core.drawLooking()`).
   */
  private static riderOf(scope: P.Scope, element: P.JSXElementToken): "waiting" | "failed" | undefined {
    if (element.attributes?.length || element.quotedWord || element.chain) return undefined
    const language = SP.Language.of(scope)
    const controls = (language.words.page ?? SP.Language.default.words.page!).controls
    const kind = controls[element.tagName]
    return kind === WAITING_CONTROL ? "waiting" : kind === FAILED_CONTROL ? "failed" : undefined
  }

  /** The scope `<failed>`'s children read in:  `the error` is the failure's words (`core.drawLooking()`'s `riders`). */
  private static failedScope(scope: P.Scope): P.BlockScope {
    const failed = new P.BlockScope({ name: FAILED_SCOPE, parentScope: scope })
    failed.variables.add({ name: CAUGHT_ERROR, output: CAUGHT_ERROR })
    return failed
  }

  /** `children` without their riders, and each rider's children as a fragment. */
  private static ridersAmong(children: P.ASTJSXElementProps["children"]): {
    children: P.ASTJSXElementProps["children"]
    waiting?: P.ASTJSXFragment
    failed?: P.ASTJSXFragment
  } {
    const riders = children.filter(
      (child): child is P.ASTJSXElement => child instanceof P.ASTJSXElement && !!child.rider
    )
    if (!riders.length) return { children }
    const fragmentOf = (kind: "waiting" | "failed") => {
      const rider = riders.find((each) => each.rider === kind)
      return rider ? new P.ASTJSXFragment(rider.match, { children: rider.children }) : undefined
    }
    return {
      children: children.filter((child) => !riders.includes(child as P.ASTJSXElement)),
      waiting: fragmentOf("waiting"),
      failed: fragmentOf("failed")
    }
  }

  /** Does `tag` have a `loading` state of its own (its pack says it takes `loading`)? */
  private static ownsLoadingState(scope: P.Scope, tag: string): boolean {
    const { lang } = SP.Language.of(scope)
    return SP.ComponentPacks.attributeNameFor(tag, LOADING_ATTRIBUTE, lang, SpellJSX.packsFor(scope)) !== undefined
  }

  /** Does `tag` have `loading` and `error` slots (Spell UI's panes:  `StatePanes`)? */
  private static hasStateSlots(scope: P.Scope, tag: string): boolean {
    const { lang } = SP.Language.of(scope)
    return SP.ComponentPacks.slotNameFor(tag, ERROR_SLOT, lang, SpellJSX.packsFor(scope)) !== undefined
  }

  /**
   * Its `loading="..."`, when Spell takes it:  how what waits inside the element looks meanwhile, as a
   * `<for loading>` says it -- `"skeleton"`, `"spinner"`, `"none"`, or a spinner's words (`core.drawLooking()`).
   * - `skeleton: <skeleton text>` gives the skeleton's shape in `SkeletonText`'s words, the ones a component's
   *   vocabulary writes its own in (`header, 3 line paragraph`):  parsed here, as it compiles, so a page never does.
   *   A bare `skeleton` is the element's own (its vocabulary's), else the shape of what's coming.
   * - Only a QUOTED value, other than the web's own `lazy` and `eager` (an image's, `<image loading="lazy">`):
   *   a bare `loading` or `loading={...}` stays the element's, Spell UI's loading state.
   * - `ownsState`:  the tag has a `loading` state of its own (Spell UI's segment, card, section, tab, form, popup):
   *   with a spinner, that state turns on while what's inside waits, instead of a spinner inside it.
   * - Its name is the language's `<for>` one (`loading`, Spanish `cargando`).
   */
  private static lookingOf(
    scope: P.Scope,
    match: P.MatchFor<SpellJSX>,
    element: P.JSXElementToken,
    tag: string | undefined
  ): JSXMatchData["looking"] {
    const language = SP.Language.of(scope)
    const words = language.words.page ?? SP.Language.default.words.page!
    const name = Object.keys(words.forAttributes).find((word) => words.forAttributes[word] === LOADING_ATTRIBUTE)
    const attribute = element.attributes?.find((each) => each.name === name && each.value instanceof P.TextToken)
    if (!attribute || !name) return undefined
    const written = textOf(attribute.value!)
    if (WEB_LOADING_VALUES.includes(written)) return undefined
    const packs = SpellJSX.packsFor(scope)
    const ownsState = !!tag && SpellJSX.ownsLoadingState(scope, tag)
    const tagSkeleton = tag ? SP.ComponentPacks.skeletonFor(tag, language.lang, packs) : undefined
    let said = written
    try {
      // a skeleton's shape, `skeleton: header, 3 line paragraph`, parsed here:  a page never parses skeleton text
      said = lookOfWords(written, (text) => SkeletonText.parse(text), tagSkeleton)
    } catch (error) {
      const why = error instanceof Error ? error.message : String(error)
      match.data.error ??= SP.spellParser.createParseError(
        scope,
        [attribute],
        language.parserMessage("skeleton-unreadable", { why })
      )
    }
    return { attribute: name, said, ownsState }
  }

  ////////////////
  // ## What a modal is shown with (epic `language` P64)
  ////////////////

  /**
   * The scope a modal named by its quoted word draws its contents in, `<modal "edit card">`:
   * one where `it` is what the modal is shown with, `show "edit card" with the card` (`show_drawn`).
   * - Owen, 2026-11-17:  "Inside the modal's drawing, the thing is what it draws."
   *   So `{its name}`, `<input value={its name}/>` inside it read and edit the card itself.
   * - Never shown with anything, `it` is the thing whose drawing it's in, as before (`core.drawShown()`).
   * - What `it` is isn't known where it's drawn:  a `show` naming it may come later in the program.
   * - `undefined` for any other tag.
   */
  private static shownInScope(scope: P.Scope, element: P.JSXElementToken): P.BlockScope | undefined {
    if (!element.quotedWord || element.chain) return undefined
    const tag = SpellJSX.componentTagFor(scope, element.tagName)
    if (!tag || SpellJSX.canonicalTagOf(scope, tag) !== DIALOG_TAG) return undefined
    const shown = new P.BlockScope({ name: SHOWN_SCOPE, parentScope: scope })
    shown.variables.add({ name: "it", output: SHOWN_IT })
    return shown
  }

  /**
   * A named modal's `children`, drawn with what it's shown with:  `core.drawShown("edit card", this, (it) => [...])`
   * -- see `shownInScope()`.
   * - Only when they read `it` (`readsIt()`):  one that doesn't, `<modal "you won">`, draws as it always did.
   */
  private static drawnShown(
    match: P.MatchFor<SpellJSX>,
    children: P.ASTJSXElementProps["children"]
  ): P.ASTJSXElementProps["children"] {
    const name = match.data.shownIn!
    const draw = new P.ASTMethodDefinition(match, {
      args: [new P.ASTVariableExpression(match, { name: SHOWN_IT })],
      body: new P.ASTJSXFragment(match, { children }),
      inline: true
    })
    const shown = new P.ASTCoreMethodInvocation(match, {
      methodName: "drawShown",
      args: [
        new P.ASTStringLiteral(match, { value: name, quote: '"', raw: JSON.stringify(name) }),
        new P.ASTSelfLiteral(match, { value: "this", raw: "" }),
        draw
      ]
    })
    return [new P.ASTJSXExpression(match, { expression: shown })]
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
   * Is `element` an `<html>` block inside a page drawing's markup (epic `elemental-spell` P18)?
   * - `<section label="Image"><html><ui-avatar><img src="..."/></ui-avatar></html></section>`
   * - Its markup is the web's, as written:  `<img>`, `<span>`, `<ui-avatar>`, never a pack's bare name;  it draws in
   *   the block's place, the `<html>` tag itself drawing nothing.
   * - A block on a drawing's own lines is the tokenizer's (`SP.PageTokenizer`, `unwrapsHtml`):
   *   this is the one an element holds, which the tokenizer reads as that element's markup.
   * - The same in a `.spell` file, where its twin keeps it:  so the two compile the same.
   * - Not in a page's `<spell>` block, nor inside another block:  there `<html>` is the web's own tag.
   */
  static isHtmlBlock(element: P.JSXElementToken | P.JSXFragmentToken): boolean {
    if (!(element instanceof P.JSXElementToken) || element.tagName !== HTML_BLOCK_TAG) return false
    return codeSpellDepth === 0 && !SP.isCodeSpell(element)
  }

  /**
   * The tag of the component a drawing names by bare `word` (`<button>`, `<card>`):
   * - the project's own view of that name first:  `card` => `solitaire-card`, as its element is named
   * - else the first of the project's packs that has it (`SP.ComponentPacks`):  `button` => `ui-button`,
   *   `botón` in a Spanish file => `es-boton`
   * - a name with a dash is a pack's too, when it has one:  `tree-diagram` => `ui-tree-diagram` (P32)
   * - `undefined`:  nobody has it;  a name with a dash (`ui-text`, `solitaire-card`) is then left as written, as a tag
   */
  static componentTagFor(scope: P.Scope, word: string): string | undefined {
    // a view of several words is named with dashes:  `<task-list/>`, a page's own (epic `notebook` P10)
    const type = word.includes("-") || isBareComponentName(word) ? scope.getType(SP.typeName(word)) : undefined
    if (type && SpellJSX.isDrawnType(type)) {
      const project = projectScopeOf(scope)
      if (project?.name) return elementTagFor(project.name, type.name)
    }
    if (!isBareComponentName(word) && !word.includes("-")) return undefined
    return SP.ComponentPacks.tagFor(word, SP.Language.of(scope).lang, SpellJSX.packsFor(scope))
  }

  /**
   * The attribute a quoted word also fills on `tag`, if it's a tag a quoted word names (`NAMED_TAGS`, epic `language`
   * P61), in the drawing's language:  `heading` on `<ui-modal>`, `encabezado` on Spanish's `<es-modal>`;
   * `""` for a named tag with no title;  `undefined` for any other tag.
   */
  private static namedTagTitle(scope: P.Scope, tag: string | undefined): string | undefined {
    if (!tag) return undefined
    const { lang } = SP.Language.of(scope)
    const packs = SpellJSX.packsFor(scope)
    const named = NAMED_TAGS[tag] ?? NAMED_TAGS[SP.ComponentPacks.canonicalTagFor(tag, lang, packs) ?? ""]
    if (!named) return undefined
    if (!named.title) return ""
    return SP.ComponentPacks.attributeNameFor(tag, named.title, lang, packs) ?? named.title
  }

  /**
   * Is `type` one of the project's own views, drawn as an element of its own (`<solitaire-card>`)?
   * - A view, or a viewable list:  a pile is drawn as `<solitaire-tableau>`, around its cards' elements.
   */
  static isDrawnType(type: P.TypeScope): boolean {
    return DRAWN_BASE_TYPES.some((base) => type.isA(base))
  }

  /**
   * Does `word` start one of a page's control tags in `language` (`if`, `otherwise`, `for` ...)?
   * - Those are read on a drawing's own lines;  inside an element they'd be taken for components (C29).
   */
  static isControlWord(language: SP.Language, word: string): boolean {
    const controls = (language.words.page ?? SP.Language.default.words.page!).controls
    return Object.keys(controls).some((phrase) => phrase.split(" ")[0] === word)
  }

  ////////////////
  // ## A `<for>` inside an element
  ////////////////

  /** Is `element` a `<for ...>`, its word the language's (`<for>`, `<para>`)? */
  private static isLoop(scope: P.Scope, element: P.JSXElementToken): boolean {
    const controls = (SP.Language.of(scope).words.page ?? SP.Language.default.words.page!).controls
    return controls[element.tagName.toLowerCase()] === "for each"
  }

  /**
   * A `<for ...>` inside a drawing's element (epic `language` I19):  `<cards>` holding a card, then a card each.
   * - Its text is read again as a drawing's lines (`PageTokenizer.tokenizeDrawingLines()`), then parsed as they'd be
   *   on a line of their own:  its attributes riders, its `<empty>`, its children what it draws for each item.
   * - Its tokens are placed where its text sits in the file, so errors point at it.
   * - Its errors are its element's:  `parseErrorsIn()` reports them.
   */
  private static parseLoop(scope: P.Scope, match: P.MatchFor<SpellJSX>, element: P.JSXElementToken) {
    const parser = scope.parser as SP.SpellParser
    // a plain file's drawing reads it as a page does (epic `language` P45):  through its page-form twin
    const reader = parser.form === "page" ? parser : parser.twinFor(SP.Language.of(scope), "page")
    const tokenizer = reader.tokenizer as SP.PageTokenizer
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
    match.data.loop = block && reader.parse([block], "block", scope)
    if (!match.data.loop) match.data.error = parser.parse([element], "parse_error", scope)
    return match
  }

  /**
   * What a `<for>` draws:  `core.drawEach(...)`, or `core.drawRead(...)` with its riders --
   * gathered as a drawing's lines are (`DrawnLines`).
   * - The value itself, so a `<for>` on a drawing's own line is the loop, as `for` lines are (epic `language` I73).
   * - Inside an element, `childAST()` puts it in a `{...}`, so it follows what it reads.
   */
  private static loopAST(match: P.MatchFor<SpellJSX>, loop: P.Match): P.ASTExpression {
    const statements = (loop.AST as P.ASTStatementGroup | undefined)?.statements ?? []
    const gathered = DrawnLines.gather(statements as never) as P.ASTNode[]
    const drawing = gathered.filter((line): line is P.ASTReturnStatement => line instanceof P.ASTReturnStatement).at(-1)
    return (drawing?.value as P.ASTExpression | undefined) ?? new P.ASTNothingLiteral(match)
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
   * - An if-chain's branches (see the class's docs):  ONE `core.drawIf(...)`, drawing only the branch that holds.
   */
  protected childASTs(match: P.MatchFor<this>): P.ASTJSXElementProps["children"] {
    const asts: P.ASTJSXElementProps["children"] = []
    let chain: Array<P.MatchFor<SpellJSX>> = []
    // what's quiet after a branch (its indent, a comment):  between two branches it's dropped, after the last it's drawn
    let quiet: P.Match[] = []
    const endChain = () => {
      if (chain.length) asts.push(this.ifChain(chain))
      chain = []
    }
    const add = (child: P.Match | undefined) => {
      // a view it declares, hidden:  nothing drawn (T123)
      if (SpellJSX.drawsNothing(child)) return
      const ast = SpellJSX.childAST(child)
      if (ast) asts.push(ast)
    }
    for (const child of match.data.children ?? []) {
      if (child?.is(SpellJSX) && child.data.chain && child.data.inMarkup) {
        if (child.data.chain === "if") {
          endChain()
          quiet.forEach(add)
        }
        quiet = []
        chain.push(child as P.MatchFor<SpellJSX>)
      } else if (chain.length && child && SpellJSX.isQuiet(child)) quiet.push(child)
      else {
        endChain()
        quiet.forEach(add)
        quiet = []
        add(child)
      }
    }
    endChain()
    quiet.forEach(add)
    return asts
  }

  /**
   * An if-chain's `branches`, drawn:  `{core.drawIf(() => c1, () => [...], () => c2, () => [...], () => [...])}`.
   * - Each branch's condition, then its children, as a fragment;  `<otherwise>`'s children alone, last.
   * - A branch with no condition (`<otherwise>`, or a phrase that didn't parse) before another:  `true`.
   */
  private ifChain(branches: Array<P.MatchFor<SpellJSX>>): P.ASTJSXExpression {
    const [first] = branches
    const drawn = (match: P.AnyMatch, value: P.ASTExpression) =>
      new P.ASTMethodDefinition(match, { inline: true, body: new P.ASTReturnStatement(match, { value }) })
    const args = branches.flatMap((branch, at) => {
      const isLast = at === branches.length - 1
      const condition = SpellJSX.conditionOf(branch) ?? (isLast ? undefined : new P.ASTBooleanLiteral(branch, true))
      const children = this.childASTs(branch).filter((child) => !(child instanceof P.ASTJSXEndTag))
      const fragment = new P.ASTJSXFragment(branch, { children })
      return condition ? [drawn(branch, condition), drawn(branch, fragment)] : [drawn(branch, fragment)]
    })
    const expression = new P.ASTCoreMethodInvocation(first!, { methodName: "drawIf", args })
    return new P.ASTJSXExpression(first!, { expression })
  }

  /**
   * `child`'s AST, as one of an element's children.
   * - A value that isn't markup goes in braces:  a `<for>`'s loop (I19, I73), and `<film/>`, a loop's item beside
   *   other markup, `draw the film` (epic `atmosphere` T48);  a sound or video's player, `<video "intro" />` (P65).
   */
  static childAST(child: P.Match | undefined): P.ASTJSXElementProps["children"][number] | undefined {
    const ast = P.asAST<P.ASTJSXElement | P.ASTJSXEndTag | P.ASTJSXText | P.ASTJSXExpression>(child?.AST)
    if (ast && child?.is(SpellJSX) && (child.data.loopItem || child.data.loop || child.data.media))
      return new P.ASTJSXExpression(child, { expression: ast as unknown as P.ASTExpression })
    return ast
  }

  ////////////////
  // ## A menu's rows
  ////////////////

  /**
   * Mark the rows of `menu`, a Spell UI `<menu>` (epic `editor` P29, Choice 1 A):
   * - each `<action "save"/>` it holds draws a menu's row, not a button (`action_button`'s `inMenu`)
   * - each `<divider/>`, a line between groups:  a row of its own, `<ui-action kind="divider">`
   * - Inside an `<if ...>` / `<otherwise>` too:  its branches are drawn in the menu, each row in its place.
   * - Not inside another element:  a `<buttons>` in a menu keeps its buttons.
   */
  private static markMenuRows(scope: P.Scope, menu: P.Match) {
    for (const child of (menu.data as JSXMatchData).children ?? []) {
      if (child?.is(ActionButton)) child.data.inMenu = true
      else if (child?.is(SpellJSX) && child.data.chain) SpellJSX.markMenuRows(scope, child)
      else if (child?.is(SpellJSX) && SpellJSX.isDivider(scope, child)) child.data.menuDivider = true
    }
  }

  /**
   * Is `tag` a Spell UI menu, whose actions are its rows:  `menu`, `ui-menu`, `toolbar`, `ui-toolbar` (`MENU_TAGS`),
   * or the same in the file's language (`es-barra-herramientas`),
   * as the pack says (`SP.ComponentPacks.canonicalTagFor()`).
   */
  private static isMenu(scope: P.Scope, tag: string | undefined): boolean {
    if (!tag) return false
    if (MENU_TAGS.includes(tag)) return true
    const canonical = SP.ComponentPacks.canonicalTagFor(tag, SP.Language.of(scope).lang, SpellJSX.packsFor(scope))
    return !!canonical && MENU_TAGS.includes(canonical)
  }

  /**
   * A modal's drawing (epic `language` T155;  Owen, 2026-11-17:  "only for buttons in the modal's actions section"):
   * - naming none of its parts (`DIALOG_PART_TAGS`), nor an if-chain at its top:  ALWAYS laid out in them as it
   *   compiles (`dialogChildren()`), each `<action>` at its top going to its actions (epic `language` J245)
   *   - `transparent` (Spanish's `transparente`) opts out:  drawn as written, see-through (StarWars' crawl)
   * - each `<action "...">` in its ACTIONS, the row of buttons at its bottom, closes it once its click has run the
   *   action, as a dialog's own buttons do (`action_button`'s `inDialog`):
   *   - written in its `<actions>` (Spell UI's `<ui-actions>`, Spanish's `<acciones>`), however deep;
   *     or at its top, when it's laid out for you
   *   - not one that says `keep-open` (Spanish's `mantener-abierto`), nor a menu's row
   *   - an action anywhere else in it (its content) runs, and leaves it open
   */
  private static markDialog(scope: P.Scope, dialog: P.MatchFor<SpellJSX>, element: P.JSXElementToken) {
    const closes = (action: P.MatchFor<ActionButton>) => {
      if (!action.data.inMenu && action.data.keepOpenAt === undefined) action.data.inDialog = true
    }
    const markAll = (holder: P.Match) => {
      for (const child of (holder.data as JSXMatchData).children ?? []) {
        if (child?.is(ActionButton)) closes(child)
        else if (child?.is(SpellJSX) && !SpellJSX.isMenu(scope, child.data.tagName)) markAll(child)
      }
    }
    const children = dialog.data.children ?? []
    let laidOut = false
    for (const child of children) {
      if (!child?.is(SpellJSX)) continue
      const tag = SpellJSX.canonicalTagOf(scope, child.data.tagName) ?? ""
      if (child.data.chain || DIALOG_PART_TAGS.includes(tag)) laidOut = true
      if (tag === DIALOG_ACTIONS_TAG) markAll(child)
    }
    // `<modal transparent>` keeps its drawing as written, as StarWars' crawl, whose words are placed over the page
    if (laidOut || SpellJSX.isTransparent(scope, dialog.data.tagName ?? element.tagName, element)) return
    const actions = children.filter((child): child is P.MatchFor<ActionButton> => !!child?.is(ActionButton))
    dialog.data.dialogParts = true
    for (const action of actions) closes(action)
  }

  /**
   * Does `element`, a modal drawn as `tag` (`ui-modal`, `es-modal`), say `transparent` (Spanish's `transparente`, the pack's name for it):
   * drawn as written, with no box around it (epic `language` J245)?
   */
  private static isTransparent(scope: P.Scope, tag: string, element: P.JSXElementToken): boolean {
    const local = SP.ComponentPacks.attributeNameFor(
      tag,
      DIALOG_TRANSPARENT_ATTRIBUTE,
      SP.Language.of(scope).lang,
      SpellJSX.packsFor(scope)
    )
    const names = [DIALOG_TRANSPARENT_ATTRIBUTE, local]
    return !!element.attributes?.some((attribute) => names.includes(attribute.name))
  }

  /**
   * A modal's children, laid out in its parts:  what it holds in `<ui-content>`, the `<action>`s at its top after, in
   * `<ui-actions>` -- so it's drawn as a modal is, with room around it, its buttons on their own line, closing it.
   * - Spell UI's English tags in every language, as an action's `<ui-button>` is:  they're the page's own, not written.
   */
  private static dialogChildren(match: P.MatchFor<SpellJSX>): P.ASTJSXElementProps["children"] {
    const actions: P.ASTJSXElementProps["children"] = []
    const content: P.ASTJSXElementProps["children"] = []
    for (const child of match.data.children ?? []) {
      if (SpellJSX.drawsNothing(child)) continue
      const ast = SpellJSX.childAST(child)
      if (ast) (child?.is(ActionButton) ? actions : content).push(ast)
    }
    const part = (tagName: string, children: P.ASTJSXElementProps["children"]) =>
      new P.ASTJSXElement(match, { tagName, attrs: [], children })
    // blank text alone isn't content
    const hasContent = content.some((ast) => !(ast instanceof P.ASTJSXText) || ast.value.trim())
    return [
      ...(hasContent ? [part(DIALOG_CONTENT_TAG, content)] : []),
      ...(actions.length ? [part(DIALOG_ACTIONS_TAG, actions)] : [])
    ]
  }

  /**
   * `context-menu="game menu"` on an element (Spanish's `menú-contextual="..."`):  a right click on it shows the menu of
   * that name, a template's (`its "game menu" is a menu of ...`) or one the program drew, `<menu "game menu">`
   * (epic `language` T156;  Owen, 2026-11-17).
   * - The page finds either by its name as the right click comes (`core.menuOf()`):  the attribute is written as it is,
   *   the web's `context-menu` in every language.
   * - SIDE EFFECT:  refused, once the whole program has parsed, when no menu has that name (`unknown-menu-attribute`).
   * - A name worked out (`context-menu={...}`):  left to the page, unchecked.
   */
  private static reuseNamedMenu(scope: P.Scope, match: P.MatchFor<SpellJSX>, element: P.JSXElementToken) {
    const attribute = element.attributes?.find(
      (it) =>
        it.name === CONTEXT_MENU_ATTRIBUTE || webWordFor(scope, SPELL_TAG_WORDS, it.name) === CONTEXT_MENU_TAG_MEANING
    )
    if (!attribute) return
    if (attribute.name !== CONTEXT_MENU_ATTRIBUTE) match.data.contextMenuAttribute = attribute
    if (!(attribute.value instanceof P.TextToken)) return
    const menu = attribute.value.innerText.trim()
    const message = SP.Language.of(scope).parserMessage("unknown-menu-attribute", { attribute: attribute.name, menu })
    SP.SpellWarnings.refuseIf(match, message, () => !hasMenuNamed(scope, menu))
  }

  /** The pack's own (English) tag `tag` stands for in `scope`'s language:  `es-modal` => `ui-modal`;  itself if none. */
  private static canonicalTagOf(scope: P.Scope, tag: string | undefined): string | undefined {
    if (!tag) return undefined
    const lang = SP.Language.of(scope).lang
    return SP.ComponentPacks.canonicalTagFor(tag, lang, SpellJSX.packsFor(scope)) ?? tag
  }

  /**
   * The word `written`, one of the language's words for a divider (`separator`, `separador`), names the component by:
   * the language's first, `divider`, `divisor` (epic `language` T156;  Owen:  "make `<separator/>` an alias").
   * - A project's own type of that name keeps it:  its view is drawn, as before.
   */
  private static dividerWordFor(scope: P.Scope, written: string): string {
    if (scope.getType(SP.typeName(written))) return written
    return spellTagsIn(scope).find((tag) => tag.meaning === DIVIDER_TAG_MEANING)?.tag ?? written
  }

  /** Is `match` a `<divider/>`, its word the language's (`<divisor/>`)? */
  private static isDivider(scope: P.Scope, match: P.MatchFor<SpellJSX>): boolean {
    const [token] = match.matched
    if (!(token instanceof P.JSXElementToken) || token.chain || token.children?.length) return false
    return webWordFor(scope, SPELL_TAG_WORDS, token.tagName) === DIVIDER_TAG_MEANING
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
        if (child && !SpellJSX.isQuiet(child)) open = false
        continue
      }
      child.data.inMarkup = true
      if (child.data.chain === "if") open = true
      else if (!open) {
        const language = SP.Language.of(scope)
        const token = child.matched[0] as P.JSXElementToken
        const message = language.parserMessage("page-otherwise-without-if", {
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
    const controls: Record<string, string> = (language.words.page ?? SP.Language.default.words.page!).controls
    return Object.keys(controls).find((word) => controls[word] === kind) ?? kind
  }

  /** Is `child` text between an if-chain's branches (their indent), or a comment:  what leaves the chain open? */
  private static isQuiet(child: P.Match): boolean {
    const [token] = child.matched
    return token instanceof P.JSXCommentToken || (token instanceof P.JSXTextToken && !`${token.value ?? ""}`.trim())
  }

  /** Branch `branch`'s condition, its phrase's expression -- none for `<otherwise>`, or a phrase that didn't parse. */
  private static conditionOf(branch: P.MatchFor<SpellJSX>): P.ASTExpression | undefined {
    const ast = branch.data.condition?.AST
    return ast instanceof P.ASTJSXExpression ? ast.expression : undefined
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
      if (match.is(SpellJSX) || match.is(ExampleBlock) || match.is(ActionButton) || match.is(ContextMenuBlock)) {
        if (match.data.error) errors.push(match.data.error)
        if (match.is(SpellJSX) && match.data.aloneError && !match.data.inMarkup) errors.push(match.data.aloneError)
        if (match.is(SpellJSX) && match.data.condition) below.push(match.data.condition)
        // a `<for>` inside an element:  its lines' errors (I19)
        if (match.is(SpellJSX) && match.data.loop) errors.push(...(SP.Block.getParseErrors(match.data.loop) ?? []))
        below.push(...(match.data.attributes ?? []), ...(match.data.children ?? []))
        // a child nothing could read:  half a tag, say (epic `notebook` I5)
        errors.push(...(match.data.children ?? []).filter((child): child is P.Match => !!child?.is(ParseError)))
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
 * How many elements being parsed are code spell, outermost first:  > 0 inside a page's `<spell>` or `<html>` block.
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

/** What an element with an `onClick` looks like by itself -- see `SpellJSX.clickableAttrs()`. */
// written as Solid's compiler writes it into a TypeScript drawing, so every target draws the same
const CLICKABLE_STYLE = "cursor:var(--ui-control-cursor,pointer);user-select:none"

/** The datatypes a tag may declare a value of, where it's drawn:  `<number "score"/>`, `<text "hint"/>` (Q52). */
const DRAWN_VALUE_TYPES = ["number", "text"]

/** Spell UI's element that shows one measure:  `<ui-dimension value={its height}>`. */
const MEASURE_TAG = "ui-dimension"

/** `text`, a quoted word, as one word:  `"discard pile"` => `"discard-pile"`;  where it was written stays the same. */
function oneWordText(text: P.TextToken): P.TextToken {
  const quote = `${text.value}`.startsWith("'") ? "'" : '"'
  return new P.TextToken({ ...text.record, value: `${quote}${QuotedMember.idOf(text.innerText)}${quote}` })
}

/** A quoted word's text, without its quotes:  `T1` for `"T1"`. */
/**
 * Does `node`, a named modal's contents as compiled, read `it`, what the modal is shown with (`SHOWN_IT`, P64)?
 * - Walks every field of every node, as `if`'s `replaceNode()` does.
 */
function readsIt(node: unknown): boolean {
  if (!node || typeof node !== "object") return false
  if (Array.isArray(node)) return node.some(readsIt)
  if (!(node instanceof P.ASTNode)) return false
  if (node instanceof P.ASTVariableExpression && node.name === SHOWN_IT) return true
  const fields = node as unknown as Record<string, unknown>
  for (const key in fields) {
    if (key !== "match" && Object.hasOwn(fields, key) && readsIt(fields[key])) return true
  }
  return false
}

/** The `<for>` slots a rider inside an element is (`riderOf()`), as the page words' controls name them. */
const WAITING_CONTROL = "for waiting"
const FAILED_CONTROL = "for failed"

/** The scope of `<failed>`'s children (`failedScope()`). */
const FAILED_SCOPE = "failed"

/** What `the error` is called inside `<failed>`:  as in an action's `if that fails:`. */
const CAUGHT_ERROR = "error"

/** A pane's error slot (Spell UI's `StatePanes`). */
const ERROR_SLOT = "error"

/** `loading`, by its English name:  a `<for>`'s, and Spell UI's loading state. */
const LOADING_ATTRIBUTE = "loading"

/** The web's own values of `loading`, an image's or a frame's:  never Spell's. */
const WEB_LOADING_VALUES = ["lazy", "eager"]

function textOf(word: P.JSXAttributeValue): string {
  return word instanceof P.TextToken ? word.innerText : `${word.raw ?? ""}`.trim()
}
