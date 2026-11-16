/**
 * The types of `highlight/`:  the BUBBLY LAYOUT, as data:
 * Spell drawn so what a person typed stands apart from Spell's own words.
 * - `SP.BubblyLayout` makes a `BubblyDrawing` from source;  `SP.BubblyPresentation` says how each rule presents.
 * - Read by everything that draws the look, so they draw the same blocks, bands and pills:
 *   - the app's `BubblyHtml` (`<spell-code>`, `<ui-code language="spell">`, the drawn-bubbly page)
 *   - the app's code editor's decorations (epic `codemirror` P3) and VS Code's (P51)
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
  /**
   * the stretches drawn underlined, in order, never overlapping:  each starts and ends where a piece does,
   * but an action's blanks, inside its pill (`to play <a card>`;  epic `language` I109)
   */
  underlines: BubblyUnderline[]
  /**
   * a drawing's markup line's CODE, each `{…}` in it (`onClick={count up}`, `<text>{its name}</text>`):
   * worked out as the program runs, so drawn apart from what's typed in -- an inverted pill, its braces part of it
   * - its braces included;  each starts and ends where a piece does
   * - only on a markup line with code
   */
  codes?: BubblyCode[]
  /**
   * the NAMES inside an action head's pill, bold:  each blank's kind word, `card` in `to <play a **card**>`,
   * `solitaire` in `when <creating **solitaire**>`, `carta` in `para <jugar una **carta**>` (epic `language` I109)
   * - drawn over the pill's one piece, never cutting it:  its white, and its quote marks, stay one pill
   * - never its `a`, `una`, `el`:  only what the parse reads as a name
   * - only on a head with such a pill
   */
  pillNames?: BubblyPillName[]
}

/** A name inside an action head's pill, bold:  `card` in `to <play a card>` (`BubblyLine.pillNames`). */
export type BubblyPillName = {
  /** first character */
  start: number
  /** one past the last */
  end: number
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
 * - `call`:  a call of an action the project declares, `turn over the next card`, `put the card on end pile`
 * - Outermost only:  a value inside a value or a question gets no line of its own.
 * - Never a line's break:  a stretch going on onto the next line is one underline on each.
 */
export type BubblyUnderline = {
  /** first character */
  start: number
  /** one past the last */
  end: number
  /** what it groups */
  kind: "value" | "question" | "quantity" | "call"
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
// ## Roles:  what each part of a rule is to a reader
////////////////

/**
 * What a part of a rule's match IS to a reader (epic `language` P60, Q68):  each role draws one way, the same in every
 * rule (`SP.BubblyLayout`;  the roles-to-look table is in `bubbly.css`).
 * - `declaration`:  what a person typed in a declaration's head, a white pill:  `a «"pile"» is ...`, `to «play a card»`
 * - `blank`:  a blank an action's head introduces, underlined in its pill, its kind word bold:  `to play «a card»`
 * - `name`:  a name, bold:  `droppable` in `it is droppable when`, `a new foundation`, `'s`;
 *   a type's kind, its abilities and words too, its commas plain:  `a "pile" is a **viewable**, **droppable list of cards**`
 * - `choice`:  each value a list declares, a bold pill of its own:  `its "rank" is one of «ace», «2 ... 10», «jack»`
 * - `value`:  one value read, one dotted underline:  `as lower case` (more of the value before it), `each card in the deck`
 * - `question`:  a yes or no asked of a thing, underlined with that thing:  `the card is on top of its pile`
 * - `action call`:  a call of an action the project declares, underlined whole:  `turn over the next card`
 * - `quantity`:  a number and its unit, underlined:  `300 msec`
 * - `written value`:  a value written in a step, italic, never underlined:  `10`, `yes`, `"Score"`
 * - `plain`:  Spell's own words, never bold:  `item` in `item column of [...]`
 */
export type BubblyRole =
  | "declaration"
  | "blank"
  | "name"
  | "choice"
  | "value"
  | "question"
  | "action call"
  | "quantity"
  | "written value"
  | "plain"

/**
 * A rule's ROLES, beside its syntax where it's registered (`addRule(Rule, { syntax, roles })`;  epic `language` P60):
 * what its match, and each part of it, is to a reader.
 * - ONE per rule class, every language's:  its groups are named alike in each, so English's says it for all;
 *   another language's may say it too, the same (`SP.BubblyRoles.record()` throws if not).
 * - A rule built while parsing (a phrase, `quoted_property`) says its roles on its class:  `@proto static roles`.
 * - Kept and read by `SP.BubblyRoles`.
 * - `band`:  its match is a declaration's HEAD, on a band of this colour (`to play a card` on the action band)
 * - `match`:  the role of everything it matched (`is a {type}`:  `question`)
 * - each of its groups, by name:  that part's role (`signature: "declaration"`, `item: "blank"`)
 * - `literal`:  a word of its syntax that's a name, `{ droppable: "name" }`;  any other word is Spell's own, plain
 * - A rule with no roles draws by the defaults:
 *   names that read or set something bold, Spell's own words plain, written values italic.
 */
export type BubblyRuleRoles = {
  /** a declaration's head, on a band of this colour */
  readonly band?: BubblyPartOfSpeech
  /** the role of everything it matched */
  readonly match?: BubblyRole
  /** words of its syntax with a role of their own, lower case:  `{ droppable: "name" }` */
  readonly literal?: Readonly<Record<string, BubblyRole>>
} & {
  /** each group's role, by the group's name in its syntax */
  readonly [group: string]: BubblyRole | BubblyPartOfSpeech | Readonly<Record<string, BubblyRole>> | undefined
}

////////////////
// ## How each rule presents:  its shape
////////////////

/**
 * The SHAPE of a rule's lines in the bubbly look, what its roles don't say:  a row of `SP.BubblyPresentation`'s table.
 * - Every field is optional:  a rule with no row draws by its roles alone.
 * - Rule names, never class names:  a rule's `name` is what its syntax strings call it (`{define_property_has}`),
 *   the same in every language;  a rule built while parsing (a phrase, `is_a_$suit`) goes by its `importableAs`.
 * - Its CHECKS, each a look no role says yet (epic `language` P60, Q69):
 *   `namesWhatItDraws`, `blankAfterVerb`.
 */
export type BubblyRulePresentation = {
  /** a group:  its body holds the declarations after it, up to the next group */
  isGroup?: boolean
  /** a CONTROL line:  its steps in a bracket */
  isControl?: boolean
  /** its child rules drawn as a step, even in a head (`it "is a face card" if <its rank is jack>`) */
  steps?: readonly string[]
  /** joins two yes-or-nos (`and`, `or`):  a question after it is asked of what follows it */
  isJoin?: boolean
  /** holds other expressions, each underlined on its own (`(it is empty and the card is a king)`), never itself */
  isCombination?: boolean
  /** its groups that hold what it SETS (`set <the score> to 0`):  each underlined whole, one value of its own */
  sets?: readonly string[]

  ////////////////
  // ## Checks:  a look no role says yet
  ////////////////

  /** CHECK:  a drawing's head:  its verb and the part it draws bold, Spell's words, no pill (`to <draw> its <front>`) */
  namesWhatItDraws?: boolean
  /**
   * CHECK:  its blank, this group but its first word, `when creating <a card image>`, `al crear <el solitario>`
   * (`signature`), its kind its words past the small words it starts with, whatever the parse read
   */
  blankAfterVerb?: string
}

/** How `SP.BubblyLayout.of()` reads its text. */
export type BubblyLayoutOptions = {
  /** the project file it's the text of:  its project's parse of it is read, when it's of this text */
  within?: SP.SpellFile
}
