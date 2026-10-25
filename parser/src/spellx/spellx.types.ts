/**
 * Spellx's types:  the CHUNK TREE a `.spellx` file reads into, its spans and its diagnostics (epic `elemental-spell`).
 * - The bottom of the folder's import graph:  `import type` only, so it erases completely.
 *   `SpellxFile` and `SpellxView` stand on it.
 * - A chunk tree is what a `.spellx` file SAYS, in the order it says it, every node with its exact span:
 *   nothing is compiled, every body stays raw spell text.
 *   - Spell's own parser reads the file (P6:  each tag as its code-spell twin);  this tree is what it SAYS, for the
 *     editor, the notebook (P12) and agents, which walk it (`SpellxFile.walk()`).
 */
import type { SP } from "spell-parser/spell"

////////////////
// ## Spans
////////////////

/**
 * Where something is in a file's text:  character offsets, `end` exclusive.
 * - `file.text.slice(span.start, span.end)` is the thing, exactly as written.
 */
export type SpellxSpan = {
  /** offset of its first character */
  start: number
  /** offset just past its last character */
  end: number
}

/** A place in a file for people:  1-based line and column -- see `SpellxFile.positionOf()`. */
export type SpellxPosition = {
  /** line, from 1 */
  line: number
  /** column, from 1:  a tab is one column */
  column: number
}

////////////////
// ## Attributes
////////////////

/**
 * One attribute of a tag, as written:  `one-of="clubs, diamonds"`, `color={its color}`, `hidden`.
 * - Attributes REPEAT (Q6):  two `alias=` are two attributes, in order.
 */
export type SpellxAttribute = {
  /** its name in English, e.g. `one-of` for Spanish's `uno-de`;  a markup or event attribute's name as written */
  name: string
  /** its name as written */
  word: string
  /** its value as written, without its quotes or braces;  `undefined` for a bare `hidden` */
  value: string | undefined
  /** how its value was written:  `"`, `'`, `{` (a spell expression) or `undefined` (bare, or no value) */
  quote: SpellxQuote | undefined
  /** the whole attribute */
  span: SpellxSpan
  /** its value, inside its quotes or braces */
  valueSpan: SpellxSpan | undefined
}

/** How an attribute's value is written:  in double or single quotes, or braces (a spell expression). */
export type SpellxQuote = '"' | "'" | "{"

////////////////
// ## The chunk tree
////////////////

/**
 * A TEMPLATE:  `<spell-view "playing card" aka="card" template="two sided view">`, its members inside.
 * - The only tags with the language's prefix (Q37):  `spell-` in English, `encanto-` in Spanish.
 */
export type SpellxTemplate = {
  kind: "template"
  /** what it makes:  a view's template, an app ... */
  type: SP.SpellxTemplateKind
  /** its tag as written, e.g. `spell-view` */
  word: string
  /** its name, quoted (`"playing card"`) or `name="..."` (Q39) */
  name: string | undefined
  /** its name's span, inside its quotes */
  nameSpan: SpellxSpan | undefined
  /** its other attributes:  `aka`, `template`, `menu-bar` ... */
  attributes: SpellxAttribute[]
  /** its members and prose, in order */
  children: SpellxNode[]
  /** from its `<` to its `>` */
  headSpan: SpellxSpan
  /** from its `<` to the end of its closer */
  span: SpellxSpan
}

/**
 * A PROSE cell:  markdown between tags, about what it's in (Q12), headings too.
 * - One cell per run of lines with no tag between them;  blank lines inside it stay.
 */
export type SpellxProse = {
  kind: "prose"
  /** its markdown, each line without the indent all its lines share */
  text: string
  /** from its first character to its last, blank lines around it left out */
  span: SpellxSpan
}

/**
 * A DECLARATION:  a member of its template -- `<property "suit" one-of="...">`, `<alias>`, `<action>`, `<draw>` ...
 * - Its children, by its type:
 *   - `draw`:  MARKUP (`SpellxMarkupNode`s) -- what it draws
 *   - `menu`:  its `<action>`s, each a declaration with no body:  the menu's items (Q41)
 *   - every other:  its body, `SpellxCode` and `SpellxNote`s
 */
export type SpellxDeclaration = {
  kind: "declaration"
  /** what it declares */
  type: SP.SpellxDeclarationKind
  /** its tag as written, e.g. `property`, `propiedad` */
  word: string
  /** its name, quoted or `name="..."` (Q39);  `undefined` for a template's one drawing, `<draw>` */
  name: string | undefined
  /** its name's span, inside its quotes */
  nameSpan: SpellxSpan | undefined
  /** its other attributes, in order */
  attributes: SpellxAttribute[]
  /** its body, as above */
  children: SpellxNode[]
  /** whether it ended its head with `/>`:  no body at all */
  selfClosing: boolean
  /** from its `<` to its `>` or `/>` */
  headSpan: SpellxSpan
  /** from its `<` to the end of its closer */
  span: SpellxSpan
}

/**
 * A HANDLER:  `<on mouse down>`, `<when flipped>`, `<while the mouse is down>` (Q42, Q51):
 * its head a spell phrase, its body spell lines.
 */
export type SpellxHandler = {
  kind: "handler"
  /** `on`, `when` or `while` */
  type: SP.SpellxHandlerKind
  /** its word as written, e.g. `on`, `al` */
  word: string
  /** the spell phrase after its word, e.g. `mouse down` */
  phrase: string
  /** its phrase's span */
  phraseSpan: SpellxSpan
  /** its body:  `SpellxCode` and `SpellxNote`s */
  children: SpellxNode[]
  /** from its `<` to its `>` */
  headSpan: SpellxSpan
  /** from its `<` to the end of its closer */
  span: SpellxSpan
}

/**
 * A NOTE:  `<description>...</>`, a member's long description, or `<comment>...</>` among its lines (Q12, Q14).
 * - Its text is markdown, never compiled.
 */
export type SpellxNote = {
  kind: "note"
  /** `description` or `comment` */
  type: SP.SpellxNoteKind
  /** its tag as written */
  word: string
  /** its markdown, each line without the indent all its lines share */
  text: string
  /** its text, from its first character to its last */
  textSpan: SpellxSpan
  /** from its `<` to its `>` */
  headSpan: SpellxSpan
  /** from its `<` to the end of its closer */
  span: SpellxSpan
}

/**
 * Spell CODE:  a run of a body's lines between its tags.
 * - Each line keeps its own span, so a position in the line is a position in the file.
 */
export type SpellxCode = {
  kind: "code"
  /** its lines, blank ones inside it included */
  lines: SpellxLine[]
  /** from its first line's first character to its last line's last */
  span: SpellxSpan
}

/**
 * One line of a body:  its text without the body's indent (Q7).
 * - `file.text.slice(line.span.start, line.span.end) === line.text`.
 */
export type SpellxLine = {
  /** the line, without the indent its body's lines share, nor a closer after it */
  text: string
  /** how many characters of indent came off it */
  indent: number
  /** its text's span */
  span: SpellxSpan
}

////////////////
// ## A drawing's markup
////////////////

/**
 * An ELEMENT in a drawing:  `<text part="face" color={its color}>`, `<button>`, `<solitaire-card ...>`.
 * - Its name is a component's, as written:  `text` is Spell UI's `<ui-text>`, never HTML's (Q46);
 *   which pack has it is P6's to find.
 */
export type SpellxElement = {
  kind: "element"
  /** its tag as written */
  name: string
  /** its attributes, in order;  `{...}` values are spell */
  attributes: SpellxAttribute[]
  /** what's inside it */
  children: SpellxNode[]
  /** whether it ended its head with `/>` */
  selfClosing: boolean
  /** from its `<` to its `>` or `/>` */
  headSpan: SpellxSpan
  /** from its `<` to the end of its closer */
  span: SpellxSpan
}

/**
 * TEXT in a drawing, as written.
 * - Whitespace with a line break in it, between tags, is left out, as JSX does;  any other is kept.
 */
export type SpellxText = {
  kind: "text"
  /** the text, as written */
  text: string
  /** its span */
  span: SpellxSpan
}

/** A HOLE in a drawing:  `{its rank}`, a spell expression whose value shows there. */
export type SpellxHole = {
  kind: "hole"
  /** the spell inside its braces, as written */
  code: string
  /** the spell's span, inside its braces */
  codeSpan: SpellxSpan
  /** from its `{` to its `}` */
  span: SpellxSpan
}

/**
 * An IF-CHAIN in a drawing:  `<if ...>` and any `<otherwise if ...>` / `<otherwise>` after it, closed by ONE `</>` (Q53).
 */
export type SpellxChoice = {
  kind: "choice"
  /** its `<if>`, then each `<otherwise ...>`, in order */
  branches: SpellxBranch[]
  /** from its `<if>`'s `<` to the end of its closer */
  span: SpellxSpan
}

/** One branch of an if-chain:  what a drawing shows when its phrase holds. */
export type SpellxBranch = {
  kind: "branch"
  /** `if`, `otherwise if` or `otherwise` */
  type: Exclude<SP.SpellxControlKind, "for each">
  /** its word as written, e.g. `otherwise if`, `si no si` */
  word: string
  /** its condition, a spell phrase;  `undefined` for `<otherwise>` */
  phrase: string | undefined
  /** its phrase's span */
  phraseSpan: SpellxSpan | undefined
  /** what it shows */
  children: SpellxNode[]
  /** from its `<` to its `>` */
  headSpan: SpellxSpan
  /** from its `<` to where the next branch, or the chain's closer, starts */
  span: SpellxSpan
}

/** A LOOP in a drawing:  `<for each column in its columns>`, its markup drawn once for each. */
export type SpellxLoop = {
  kind: "loop"
  /** `for each` */
  type: "for each"
  /** its word as written */
  word: string
  /** the spell phrase after its word, e.g. `column in its columns` */
  phrase: string
  /** its phrase's span */
  phraseSpan: SpellxSpan
  /** what it draws for each */
  children: SpellxNode[]
  /** from its `<` to its `>` */
  headSpan: SpellxSpan
  /** from its `<` to the end of its closer */
  span: SpellxSpan
}

/**
 * A PLACED PART:  `<draw "front" />` in a drawing, where that part's own `<draw "front">` goes (Q55, Q56).
 */
export type SpellxPlace = {
  kind: "place"
  /** its tag as written, e.g. `draw`, `dibujar` */
  word: string
  /** the part's name */
  name: string
  /** its name's span, inside its quotes */
  nameSpan: SpellxSpan
  /** the whole tag */
  span: SpellxSpan
}

/** Any node of a chunk tree. */
export type SpellxNode =
  | SpellxTemplate
  | SpellxProse
  | SpellxDeclaration
  | SpellxHandler
  | SpellxNote
  | SpellxCode
  | SpellxElement
  | SpellxText
  | SpellxHole
  | SpellxChoice
  | SpellxBranch
  | SpellxLoop
  | SpellxPlace

/** A node's kind:  `template`, `declaration`, `code` ... */
export type SpellxNodeKind = SpellxNode["kind"]

////////////////
// ## Diagnostics
////////////////

/**
 * Something wrong in a `.spellx` file's spellx:  a word spellx doesn't know, a closer for another tag, a tag never closed ...
 * - What the spellx tokenizer noted while reading it (`SP.spellxErrorOf()`), in the file's language.
 * - COLLECTED, never thrown.  What the rules say of a body's spell is the parsed file's (`SP.SpellFile.errors`).
 */
export type SpellxDiagnostic = {
  /** `error`:  the file means something else than it says;  `warning`:  it reads, but should be fixed */
  severity: SpellxSeverity
  /** what's wrong and how to fix it, for people */
  message: string
  /** where */
  span: SpellxSpan
}

/** How bad a diagnostic is. */
export type SpellxSeverity = "error" | "warning"
