import { P } from "spell-lang/parser"
import type { FillInParts } from "spell-lang/spell/rules/core"
import { Wording } from "spell-lang/spell/rules/expressions"

/**
 * Spell's own tag words in JSX, in ENGLISH, by the web's tag each becomes:  for the editor's completions.
 * - The rules never read it:  they ask the language's word rule, `spell_jsx_tag` (`webWordFor()`).
 * - `<children/>` => `<slot/>`:  where a drawable list's items show, in its `to draw`
 * - `<children name="header"/>` => `<slot name="header"/>`:
 *   a second, named place, filled by a child written `in="header"` (`spell_jsx_attribute`)
 * - The web's own `<slot/>` keeps working.
 * - TODO(es):  the editor should offer the project's language's words, not English's.
 */
export const SPELL_TAG_NAMES = new Map([["children", "slot"]])

/**
 * The word rule holding spell's own JSX TAG words, each meaning the web's tag it becomes (epic `spanish`).
 * - English `((slot:children)|slot)`, Spanish `((slot:hijos)|slot)`:  `<children/>` / `<hijos/>` => `<slot/>`.
 * - Renamed as the element is parsed (`SpellJSX`), so both writers write the web's.
 */
export const SPELL_TAG_WORDS = "spell_jsx_tag"

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
 * The web's name for `written`, a tag or attribute name, if word rule `ruleName` (`SPELL_TAG_WORDS` ...) holds it --
 * `written` itself if not, e.g. `slot` for `children` in English, `div` for `div`.
 * - Only a plain word is looked up:  `ui-button`, `on-click` and `UI.Form` never are.
 */
export function webWordFor(scope: P.Scope, ruleName: string, written: string): string {
  if (!PLAIN_WORD.test(written)) return written
  const rule = scope.parser?.rules[ruleName] as Wording | undefined
  return rule?.meanings?.find((meaning) => Wording.reads(scope, ruleName, written, meaning)) ?? written
}

/** A name of letters alone, which might be one of spell's own JSX words. */
const PLAIN_WORD = /^\p{L}+$/u

/**
 * What JSX rules (`jsxElement`, `jsxAttribute`, `jsxExpression`) stash on their matches.
 * - Shared by all three because they cross-reference each other's matches (e.g. `jsxElement` holds an
 *   array of `jsxAttribute` matches) -- splitting per-rule would just mean re-importing one another's type.
 */
export type JSXMatchData = {
  /** (`jsxAttribute`/`jsxExpression`) Sub-expression match parsed out of the attribute/expression value. */
  expression?: P.Match
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
}

/**
 * The text inside raw-text element `element`, e.g. a `<css>` or `<markdown>` block's:
 * its common indent taken off, blank lines at either end dropped.
 * - So the block can sit indented in an outline or a drawing.
 * - Raw text:  the tokenizer reads the element's whole contents as ONE text token (`P.Tokenizer.rawTextTags`).
 */
export function rawTextOf(element: P.JSXElementToken): string {
  const text = ((element.children ?? []) as P.Token[])
    .filter((child): child is P.JSXTextToken => child instanceof P.JSXTextToken)
    .map((child) => `${child.value}`)
    .join("")
  const lines = text.split("\n")
  while (lines.length && !lines[0]!.trim()) lines.shift()
  while (lines.length && !lines.at(-1)!.trim()) lines.pop()
  const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => /^\s*/.exec(line)![0].length))
  return lines.map((line) => line.slice(Number.isFinite(indent) ? indent : 0)).join("\n")
}

/** The tag of a markdown block:  drawn in a drawing (`markdown_block`), a type's description in its outline. */
export const MARKDOWN_TAG = "markdown"
