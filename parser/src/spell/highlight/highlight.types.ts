/**
 * The types of `highlight/`:  the BUBBLY LAYOUT, Spell drawn so what a person typed stands apart from Spell's own
 * words, as data.
 * - `SP.BubblyLayout` makes a `BubblyDrawing` from source;  `SP.BubblyPresentation` says how each rule presents.
 * - Read by everything that draws the look, so they draw the same blocks, bands and pills:
 *   - the app's `BubblyHtml` (`<spell-code>`, `<ui-code language="spell">`, the drawn-bubbly page)
 *   - Monaco's decorations (epic `language` P50) and VS Code's (P51)
 * - Types only:  nothing here runs.
 */

import type { SP } from "spell/parser/spell"

////////////////
// ## The drawing
////////////////

/** A part of speech, which colours a declaration's band:  things purple, actions green, properties amber. */
export type BubblyPartOfSpeech = "thing" | "action" | "property" | "plain"

/**
 * What a stretch of a line is, to a reader:
 * - `words`:  Spell's own words, and the spaces between, drawn plain
 * - `mark`:  `,` `:` and a drawing's `<` `>` `{` `}` `=`, faint
 * - `comment`:  a `//` note, faint and italic;  `heading`:  a `#` heading's words, bold;  `heading-mark`:  its `#`
 * - `reference`:  what a step reads or changes (`its rank`, `the deck`), semibold
 * - `first-mention`:  a name's first mention (a loop's variable, a local set the first time, an action's
 *   parameter), bold
 * - `constant`:  one of a list's values in a step (`queen`, `spades`), semibold
 * - `value`:  a text, a number, yes or no, in a step
 * - `input`:  what a person typed in a head, in a white pill;  a quoted one keeps its `"` (`"card"`)
 * - `choice`:  each value a list declares (`is one of ace, 2 ... 10, jack`), a pill of its own, bold
 * - `phrase`:  a phrase called whole (`is a diamond`, `is a face card`), dotted under
 * - `quantity`:  a number and its unit (`300 msec`), dotted under
 * - `tag`:  a tag's name in a drawing (`<text ...>`)
 */
export type BubblyPieceKind =
  | "words"
  | "mark"
  | "comment"
  | "heading"
  | "heading-mark"
  | "reference"
  | "first-mention"
  | "constant"
  | "value"
  | "input"
  | "choice"
  | "phrase"
  | "quantity"
  | "tag"

/** One stretch of a line:  offsets into the drawing's `text`, never overlapping, covering the line's words. */
export type BubblyPiece = {
  /** first character */
  start: number
  /** one past the last */
  end: number
  /** what it is to a reader */
  kind: BubblyPieceKind
}

/**
 * One line of source, its leading whitespace left out:  a step, a comment, a heading, or a declaration's head.
 * - `depth`:  how far it's indented within its body (or the file), 0 at the body's edge
 */
export type BubblyLine = {
  kind: "line"
  /** its first character past its indent */
  start: number
  /** one past its last */
  end: number
  /** its indent within its body, in steps */
  depth: number
  /** its pieces, in order */
  pieces: BubblyPiece[]
}

/**
 * A DECLARATION:  its head on a band in its part of speech's colour, its body under it in a bracket.
 * - No body:  a band alone (a pill).
 * - A group's body holds the declarations after it, up to the next group.
 */
export type BubblyBlock = {
  kind: "block"
  /** the rule its head matched, `SP.BubblyPresentation`'s key */
  rule: string
  /** its band's colour */
  partOfSpeech: BubblyPartOfSpeech
  /** a group, holding the declarations after it */
  isGroup: boolean
  /** how deep it sits, 0 at the top of the file;  a group counts as a level */
  level: number
  /** its head:  its line */
  head: BubblyLine
  /** what's under it;  empty for a pill */
  body: BubblyNode[]
}

/** A CONTROL LINE (`if`, `for each`, `repeat`):  its line, then a simple bracket holding its steps. */
export type BubblyBracket = {
  kind: "bracket"
  /** the rule its line matched */
  rule: string
  /** its line */
  head: BubblyLine
  /** its steps */
  body: BubblyNode[]
}

/** A blank line. */
export type BubblyGap = {
  kind: "gap"
  /** where it is */
  start: number
}

/** Anything a drawing or a body holds. */
export type BubblyNode = BubblyBlock | BubblyBracket | BubblyLine | BubblyGap

/** Some Spell, laid out in the bubbly look:  `nodes` hold offsets into `text`. */
export type BubblyDrawing = {
  /** the source */
  text: string
  /** its top-level lines and blocks, in order */
  nodes: BubblyNode[]
}

////////////////
// ## How each rule presents
////////////////

/**
 * How lines a rule matched present in the bubbly look:  a row of `SP.BubblyPresentation`'s table.
 * - Every field is optional:  a rule with no row draws as a plain step.
 * - Rule names, never class names:  a rule's `name` is what its syntax strings call it (`{define_property_has}`),
 *   the same in every language;  a rule built while parsing (a phrase, `is_a_$suit`) goes by its `importableAs`.
 */
export type BubblyRulePresentation = {
  /** a DECLARATION:  its line is a head, on a band of this part of speech */
  head?: BubblyPartOfSpeech
  /** a group:  its body holds the declarations after it, up to the next group */
  isGroup?: boolean
  /** its child rules that are a person's words, each a pill (`quoted_member`:  `its "rank"`) */
  inputs?: readonly string[]
  /**
   * an action's head:  everything after its first word (`to`, `para`), to the end of its last input, is what a
   * person typed, ONE pill:  `to <test a new deck>`, `to <draw its front>`, `to <draw it>`
   * - but for the parameters it introduces, `params`, bold between its pills:  `to <move> (a card) <to> (a pile)`
   */
  typedAfterLead?: boolean
  /** its child rules that are the parameters it introduces, `(a card)`, with the brackets round them */
  params?: readonly string[]
  /** its child rules whose items are each a pill of their own, bold (`identifier_list`:  `is one of ace, jack`) */
  choices?: readonly string[]
  /** its child rules drawn as a step, even in a head (`it "is a face card" if <its rank is jack>`) */
  steps?: readonly string[]
  /** its child rules drawn plain, never bold (`item` in `item column of the list`) */
  plain?: readonly string[]
  /** a CONTROL line:  its steps in a bracket */
  isControl?: boolean
  /** a phrase called whole:  dotted under (`is a diamond`) */
  isPhrase?: boolean
  /** its number and the rest of it are one quantity:  dotted under (`pause for <300 msec>`) */
  isQuantity?: boolean
  /** a value:  yes or no */
  isValue?: boolean
  /** a reference that takes the words before it:  `the color` of seven, `a new card` */
  takesArticle?: boolean
}

/** How `SP.BubblyLayout.of()` reads its text. */
export type BubblyLayoutOptions = {
  /** the project file it's the text of:  its project's parse of it is read, when it's of this text */
  within?: SP.SpellFile
}
