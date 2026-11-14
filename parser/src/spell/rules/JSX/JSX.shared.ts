import { dedent } from "spell/util"
import { P } from "spell/parser/parser"
import type { FillInParts } from "spell/parser/spell/rules/core"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * Spell's own tag words in JSX, in `scope`'s language, each with what it means:  for the editor's completions.
 * - English:  `children` (`slot`), `action`, `context-menu`, `divider`;
 *   Spanish:  `hijos`, `acción`, `menú-contextual`, `divisor` (epic `language` P53).
 * - Read off the language's word rule, `spell_jsx_tag` (`SPELL_TAG_WORDS`), so a new word shows by itself.
 * - The web's own `slot` is left out:  it's the web's tag, not one of spell's words.
 * - `[]` when the scope's parser has no such rule.
 */
export function spellTagsIn(scope: P.Scope): SpellTag[] {
  const { parser } = scope
  const rule = parser?.rules[SPELL_TAG_WORDS]
  if (!parser || !rule) return []
  const tags: SpellTag[] = []
  for (const leading of P.leadingRules(rule, { parser })) {
    const literals = leading instanceof P.Literal ? [leading.literal].flat() : []
    if (leading instanceof P.Literals) for (const { literal } of leading.literals) literals.push(...[literal].flat())
    for (const tag of literals) {
      const meaning = webWordFor(scope, SPELL_TAG_WORDS, tag)
      if (tag === meaning && SPELL_JSX_MEANINGS.includes(tag)) continue
      if (!tags.some((it) => it.tag === tag)) tags.push({ tag, meaning })
    }
  }
  return tags
}

/** One of spell's own tag words, as `spellTagsIn()` lists them. */
export type SpellTag = {
  /** the word, as the language writes it:  `children`, `acción` */
  tag: string
  /** what it means:  the web's tag it becomes (`slot`), or spell's own tag (`action`, `context_menu`, `divider`) */
  meaning: string
}

/**
 * The word rule holding spell's own JSX TAG words, each meaning the web's tag it becomes (epic `spanish`),
 * or spell's own tag (`action`).
 * - English `((slot:children)|slot|(action:action))`, Spanish `((slot:hijos)|slot|(action:acción))`.
 * - `<children/>` / `<hijos/>` => `<slot/>`:  renamed as the element is parsed (`SpellJSX`), so both writers write the web's.
 * - `<action "auto play"/>` / `<acción "jugar solo"/>`:  a button for one of the program's actions
 *   (`action_button`, epic `language`;  Owen, 2026-11-13).
 * - `<context-menu>` / `<menú-contextual>`:  the right-click menu of the element it's in (`context_menu_block`).
 */
export const SPELL_TAG_WORDS = "spell_jsx_tag"

/** What a tag word means when it's spell's ACTION tag, `<action "auto play"/>`:  see `action_button`. */
export const ACTION_TAG_MEANING = "action"

/** What a tag word means when it's spell's CONTEXT MENU, `<context-menu>` inside an element:  see `context_menu_block`. */
export const CONTEXT_MENU_TAG_MEANING = "context_menu"

/** What a tag word means when it's a context menu's DIVIDER, `<divider/>` inside a `<context-menu>`. */
export const DIVIDER_TAG_MEANING = "divider"

/**
 * The Spell UI menus whose `<action "save"/>`s are their ROWS, not buttons (epic `editor` P29, Choice 1 A):
 * `<menu>` as a drawing names it bare, `ui-menu` once its pack is loaded.
 * - And `<toolbar>`, which IS a menu (epic `mockup`):  its actions are its items,
 *   so a `shrinkable` one fits their titles, then their icons, then folds them into its `…` button.
 *   An action in one of its slots (`<buttons slot="center">`) is inside another element, so it stays a button.
 * - So are their `<divider/>`s:  a line between groups, a row of its own.
 */
export const MENU_TAGS = ["menu", "ui-menu", "toolbar", "ui-toolbar"]

/** What a menu's actions and dividers draw as:  Spell UI's `<ui-action>`, a menu's row (`core.drawAction()`). */
export const MENU_ROW_TAG = "ui-action"

/**
 * `<action "save"/>`'s mark that it's a menu's row (`core.drawAction()`):  `SpellJSX` sets it on the actions
 * a `<menu>` holds.
 * - The core's own attribute, as `icon-only` is;  the core's name for it is the same.
 */
export const IN_MENU_ATTRIBUTE = "in-menu"

/**
 * The word rule holding spell's own JSX ATTRIBUTE words, each meaning the web's attribute it becomes.
 * - English `((slot:in)|slot)`, Spanish `((slot:en)|slot)`:
 *   `<h3 in="header">` / `<h3 en="header">` => `<h3 slot="header">`, "put me in the frame's `header` children".
 * - On any tag, renamed as the attribute is parsed (`SpellJSXAttribute`).
 * - The web's own `slot="header"` keeps working.
 */
export const SPELL_ATTRIBUTE_WORDS = "spell_jsx_attribute"

/**
 * What spell's own JSX words may mean:
 * the web's names they become, `SPELL_TAG_WORDS`' and `SPELL_ATTRIBUTE_WORDS`' meanings.
 */
export const SPELL_JSX_MEANINGS = ["slot"]

/**
 * What spell's own JSX TAG words may mean:  the web's names they become (`SPELL_JSX_MEANINGS`), and spell's own tags.
 * - Spell's own tags are read by their rules;  anywhere else a tag keeps its word, `<divider/>` Spell UI's divider.
 */
export const SPELL_TAG_MEANINGS = [
  ...SPELL_JSX_MEANINGS,
  ACTION_TAG_MEANING,
  CONTEXT_MENU_TAG_MEANING,
  DIVIDER_TAG_MEANING
]

/**
 * The web's name for `written`, a tag or attribute name, if word rule `ruleName` (`SPELL_TAG_WORDS` ...) holds it --
 * `written` itself if not, e.g. `slot` for `children` in English, `div` for `div`.
 * - Only words of letters are looked up, alone or joined by dashes (`context-menu`):  `UI.Form`, `h3` never are.
 */
export function webWordFor(scope: P.Scope, ruleName: string, written: string): string {
  if (!PLAIN_WORD.test(written)) return written
  const rule = scope.parser?.rules[ruleName] as Wording | undefined
  if (!rule) return written
  // each word read once per word rule:  a drawing names the same few tags over and over
  let read = WORDS_READ.get(rule)
  if (!read) WORDS_READ.set(rule, (read = new Map()))
  let word = read.get(written)
  if (word === undefined) {
    word = rule.meanings?.find((meaning) => Wording.reads(scope, ruleName, written, meaning)) ?? written
    read.set(written, word)
  }
  return word
}

/** What each word rule read each word as, by the rule:  rules never change once registered. */
const WORDS_READ = new WeakMap<P.Rule, Map<string, string>>()

/**
 * Is `tag`, as written in a drawing, one a drawing reads as a COMPONENT's bare name (epic `elemental-spell` P7)?
 * - Lowercase letters alone, accents too (`button`, `div`, `botón`), and not one of the web names spell's own words
 *   become (`slot`):  `SpellJSX.componentTagFor()` looks it up.
 * - One no pack has:  an error in a page;  in plain Spell, the web's own element.
 */
export function isBareComponentName(tag: string): boolean {
  return BARE_NAME.test(tag) && !SPELL_JSX_MEANINGS.includes(tag)
}

/** A tag a drawing may write bare, for a component:  letters alone, accents too (`button`, `botón`). */
const BARE_NAME = /^\p{Ll}+$/u

/** A name of letters alone, or words of letters joined by dashes, which might be one of spell's own JSX words. */
const PLAIN_WORD = /^\p{L}+(-\p{L}+)*$/u

/**
 * What JSX rules (`jsxElement`, `jsxAttribute`, `jsxExpression`) stash on their matches.
 * - Shared by all three because they cross-reference each other's matches (e.g. `jsxElement` holds an
 *   array of `jsxAttribute` matches) -- splitting per-rule would just mean re-importing one another's type.
 */
export type JSXMatchData = {
  /** (`jsxAttribute`/`jsxExpression`) Sub-expression match parsed out of the attribute/expression value. */
  expression?: P.Match
  /** (`jsxAttribute`/`jsxExpression`) The items of the loops around it, in a drawing:  `readableInDrawing()`. */
  loopItems?: string[]
  /** (`jsxAttribute`) Sub-statement match parsed out of an `on*` attribute value, e.g. an inline event handler. */
  statement?: P.Match
  /**
   * `parse_error` match:  (`jsxAttribute`/`jsxExpression`) recorded when neither `expression` nor `statement` could
   * be parsed;  (`jsxElement`) for a dotted tag, `<UI.Form>`.
   */
  error?: P.Match
  /** (`jsxElement`) Parsed `jsxAttribute` matches for the element. */
  attributes?: Array<P.Match | undefined>
  /** (`jsxAttribute`) Normalized attribute name. */
  attribute?: string
  /**
   * (`jsxAttribute`) The web's name for it:
   * `slot` for spell's own `in` (`SPELL_ATTRIBUTE_WORDS`), else `attribute`.
   */
  webAttribute?: string
  /** (`jsxElement`) The web's tag:  `slot` for spell's own `children` (`SPELL_TAG_WORDS`), else the tag as written. */
  tagName?: string
  /** (`jsxElement`) Parsed child matches (`jsxChild` or `parse_error`) for the element. */
  children?: Array<P.Match | undefined>
  /** (`jsxAttribute`) A text value's `[name]` fill-ins, if it has any -- see `parseFillIns()`. */
  fillIns?: FillInParts
  /** (`jsxElement`) A chain branch's kind, `<if ...>` ... -- see `SpellJSX`, "An if-chain inside markup". */
  chain?: P.JSXChainKind
  /** (`jsxElement`) A chain branch's condition, its phrase parsed as `{...}` (`jsxChild`);  none for `<otherwise>`. */
  condition?: P.Match
  /** (`jsxElement`) A chain branch inside an element, as it must be:  its element said so. */
  inMarkup?: boolean
  /** (`jsxElement`) An `<html>` block inside a drawing's markup:  its children alone (`SpellJSX.isHtmlBlock()`). */
  htmlBlock?: boolean
  /** (`jsxElement`) A chain branch's error if it turns out to stand alone, outside any element. */
  aloneError?: P.Match
  /**
   * (`jsxElement`) The project's own view a drawing names bare, `<carta>`:
   * its children's `slot="frente"` name its slots as they compile, `front` -- see `SpellJSX.withSlotNames()`.
   */
  view?: P.TypeScope
  /**
   * (`jsxElement`) A type a drawing names bare that's declared further down, `<tableau>` above `a "tableau" is a pile`,
   * and the tag its element would have:  a view only if its line says so, read when it compiles (`SpellJSX.viewOf()`).
   */
  laterView?: { type: P.TypeScope; tag: string }
  /**
   * (`jsxElement`) A `<divider/>` a `<menu>` holds:  a line between its groups, drawn as a row of its own,
   * `<ui-action kind="divider">` (`SpellJSX.markMenuRows()`).
   */
  menuDivider?: boolean
  /** `<film/>` in a loop over films:  the loop's item, drawn. */
  loopItem?: P.ScopeVariable
  /**
   * (`jsxElement`) A `<for ...>` inside a drawing's element (epic `language` I19):
   * its lines, read through a page's twin (`SP.PageTwin`) as the drawing's own would be --
   * a `block` match, drawn in its place (`SpellJSX.parseLoop()`).
   */
  loop?: P.Match
}

/**
 * The text inside raw-text element `element`, e.g. a `<css>` or `<markdown>` block's:
 * its common indent taken off, blank lines at either end dropped.
 * - So the block can sit indented in an outline or a drawing.
 * - Raw text:  the tokenizer reads the element's whole contents as ONE text token (`P.Tokenizer.rawTextTags`).
 */
export function rawTextOf(element: P.JSXElementToken): string {
  return dedent(
    ((element.children ?? []) as P.Token[])
      .filter((child): child is P.JSXTextToken => child instanceof P.JSXTextToken)
      .map((child) => `${child.value}`)
      .join("")
  )
}

/**
 * The text inside element `element` as written in its file, from its first child to its last:
 * its holes' braces too, its common indent taken off, blank lines at either end dropped.
 * - For text an element holds that isn't raw text (`rawTextTags`), but is read as if it were:
 *   a `<ui-markdown>`'s markdown (`markdown_block`).
 */
export function innerTextOf(element: P.JSXElementToken): string {
  // its closer is a child too:  not its text
  const children = ((element.children ?? []) as P.Token[]).filter((child) => !(child instanceof P.JSXEndTagToken))
  const [first] = children
  const last = children.at(-1)
  if (!first || !last) return ""
  const raw = `${element.raw}`
  const from = first.start - element.start
  return dedent(raw.slice(from, last.end - element.start))
}

/** The tag of a markdown block:  drawn in a drawing (`markdown_block`), a type's description in its outline. */
export const MARKDOWN_TAG = "markdown"

/**
 * The tag of a page's STORIES (epic `mockup` P6):  what the page must let people do, `<story>` tags, in its outline.
 * - `markdown_description` reads it, as the type's `static stories`.
 */
export const STORIES_TAG = "stories"
