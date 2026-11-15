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

/**
 * A part of speech, which colours a block's band:  things purple, actions green, properties amber;
 * a control line (`if`, `for each`) a very light grey.
 */
export type BubblyPartOfSpeech = "thing" | "action" | "property" | "plain" | "control"

/**
 * What a stretch of a line is, to a reader:  bold is a name, italic a value written in, plain Spell's own words
 * (Owen, 2026-11-15, epic `language` Q64).
 * - `words`:  Spell's own words, and the spaces between, drawn plain;  a question's own words too (`is on top of`)
 * - `mark`:  `,` `:` and a drawing's `<` `>` `{` `}` `=`, faint
 * - `comment`:  a `//` note, faint and italic;  `heading`:  a `#` heading's words, bold;  `heading-mark`:  its `#`
 * - `reference`:  a NAME, bold, one weight:  a thing, a kind, a property, a variable, an action's parameter, the word a
 *   head declares (`droppable`);  whole with its `'s` (`pile's`), never its `the`, `its` or `a`
 * - `value`:  a value written in a step, italic:  a list's value (`king`, `clubs`), a number, yes or no, a text
 * - `input`:  what a person typed in a head, in a white pill;  a quoted one keeps its `"` (`"card"`)
 * - `choice`:  each value a list declares (`is one of ace, 2 ... 10, jack`), a pill of its own, bold
 * - `tag`:  a tag's name in a drawing (`<text ...>`)
 */
export type BubblyPieceKind =
  | "words"
  | "mark"
  | "comment"
  | "heading"
  | "heading-mark"
  | "reference"
  | "value"
  | "input"
  | "choice"
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
  /** the stretches drawn underlined, in order, never overlapping:  each starts and ends where a piece does */
  underlines: BubblyUnderline[]
  /**
   * a drawing's markup line's CODE, each `{…}` in it (`onClick={count up}`, `<text>{its name}</text>`):
   * worked out as the program runs, so drawn apart from what's typed in -- an inverted pill, its braces part of it
   * - its braces included;  each starts and ends where a piece does
   * - only on a markup line with code
   */
  codes?: BubblyCode[]
}

/** A `{…}` in a drawing's markup:  Spell code, its braces included. */
export type BubblyCode = {
  /** its `{` */
  start: number
  /** one past its `}` */
  end: number
}

/**
 * A stretch of a line drawn with ONE dotted line under it, from the parse:  where one value or one question starts
 * and ends, so the plain words between two show how they combine (`is` that compares, `and`, `- 1`).
 * - `value`:  a value read, `the pile's suit`, `its pile`, `a new deck`, `the first card of the pile`
 * - `question`:  a yes-or-no asked of a thing, with the thing, `the card is on top of its pile`, `pile is a foundation`
 * - `quantity`:  a number and its unit, `300 msec`
 * - Outermost only:  a value inside a value or a question gets no line of its own.
 * - Never a line's break:  a stretch going on onto the next line is one underline on each.
 */
export type BubblyUnderline = {
  /** first character */
  start: number
  /** one past the last */
  end: number
  /** what it groups */
  kind: "value" | "question" | "quantity"
}

/**
 * A DECLARATION, or a CONTROL LINE with steps under it:  its head on a band in its part of speech's colour,
 * its body under it, a rail down its left and a foot under it.
 * - No body:  a band alone (a pill).
 * - A group's body holds the declarations after it, up to the next group.
 * - A control line (`if`, `for each`, `repeat`) is a `control` block, its line plain on its band (Owen, 2026-11-11:
 *   "I really want some bubbly action and footers in the for and if");  one with no steps under it stays a line.
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

/** A blank line. */
export type BubblyGap = {
  kind: "gap"
  /** where it is */
  start: number
}

/** Anything a drawing or a body holds. */
export type BubblyNode = BubblyBlock | BubblyLine | BubblyGap

/** Some Spell, laid out in the bubbly look:  `nodes` hold offsets into `text`. */
export type BubblyDrawing = {
  /** the source */
  text: string
  /** its top-level lines and blocks, in order */
  nodes: BubblyNode[]
  /**
   * where each tag in a drawing that DECLARES a member starts, its `<`, in order (epic `editor` I84):
   * `<number "score"/>` ~== `"score" is a number`, `<column "C1"/>` ~== `"C1" is a new column`
   * - as the parse decides it (`SpellJSX`'s `declares`):  a member said on a line of its own, `<action "redo"/>`,
   *   any other tag, none
   * - drawn round, not pointed:  it names a thing, where any other tag draws one
   */
  declaringTags: number[]
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
  /** a drawing's head:  its verb and the part it draws bold, Spell's words, no pill (`to <draw> its <front>`) */
  namesWhatItDraws?: boolean
  params?: readonly string[]
  /** its child rules whose items are each a pill of their own, bold (`identifier_list`:  `is one of ace, jack`) */
  choices?: readonly string[]
  /** its child rules drawn as a step, even in a head (`it "is a face card" if <its rank is jack>`) */
  steps?: readonly string[]
  /** its child rules drawn plain, never bold (`item` in `item column of the list`) */
  plain?: readonly string[]
  /** a CONTROL line:  its steps in a bracket */
  isControl?: boolean
  /**
   * the words of its head that say an ability it gives are names, bold (`draggable` in `a "card" is a draggable view`,
   * `droppable` in `it is droppable when`):  the words its parser reads as one (`SP.DeclarationPatterns.abilityWord`)
   */
  namesAbility?: boolean
  /** a part of the name before it, bold with it:  `'s` in `pile's` */
  isNamePart?: boolean
  /** its group whose end ends a name it starts, bold through it:  `type` in `a new foundation with suit = hearts` */
  namesThrough?: string
  /**
   * a YES-OR-NO asked of the thing before it (`is on top of its pile`, `is a king`, `is empty`):  ONE underline from
   * that thing to its end, its own words plain
   * - the thing:  what comes before it, back to the last `and` or `or`, as the compiler binds it
   */
  isQuestion?: boolean
  /** more of the value before it (`as lower case`, `in feet`):  ONE underline from that value to its end */
  continuesValue?: boolean
  /** joins two yes-or-nos (`and`, `or`):  a question after it is asked of what follows it */
  isJoin?: boolean
  /** holds other expressions, each underlined on its own (`(it is empty and the card is a king)`), never itself */
  isCombination?: boolean
  /** its groups that hold what it SETS (`set <the score> to 0`):  each underlined whole, one value of its own */
  sets?: readonly string[]
  /** its number and the rest of it are one quantity:  underlined (`pause for <300 msec>`) */
  isQuantity?: boolean
  /** a value written in:  italic, never underlined (a number, a text, yes or no, a list's value) */
  isValue?: boolean
}

/** How `SP.BubblyLayout.of()` reads its text. */
export type BubblyLayoutOptions = {
  /** the project file it's the text of:  its project's parse of it is read, when it's of this text */
  within?: SP.SpellFile
}
