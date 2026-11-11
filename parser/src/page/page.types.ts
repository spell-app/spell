/**
 * A page's CHUNK TREE (epic `language` P47):  what a page file says, its spans and its diagnostics.
 * - The bottom of the folder's import graph:  `import type` only, so it erases completely.
 *   `PageFile` and `PageView` stand on it.
 * - A chunk tree is what a page SAYS, in the order it says it, every node with its exact span:
 *   nothing is compiled, every hole stays raw spell text.
 *   - Spell's own parser reads the file (`SP.PageTokenizer`, `SP.PageTwin`).
 *   - This tree is what it SAYS, for the notebook editor and agents, which walk it (`PageFile.walk()`).
 */
import type { SP } from "spell/parser/spell"

////////////////
// ## Spans
////////////////

/**
 * Where something is in a file's text:  character offsets, `end` exclusive.
 * - `file.text.slice(span.start, span.end)` is the thing, exactly as written.
 */
export type PageSpan = {
  /** offset of its first character */
  start: number
  /** offset just past its last character */
  end: number
}

/** A place in a file for people:  1-based line and column -- see `PageFile.positionOf()`. */
export type PagePosition = {
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
export type PageAttribute = {
  /** its name in English, e.g. `one-of` for Spanish's `uno-de`;  a markup or event attribute's name as written */
  name: string
  /** its name as written */
  word: string
  /** its value as written, without its quotes or braces;  `undefined` for a bare `hidden` */
  value: string | undefined
  /** how its value was written:  `"`, `'`, `{` (a spell expression) or `undefined` (bare, or no value) */
  quote: PageQuote | undefined
  /** the whole attribute */
  span: PageSpan
  /** its value, inside its quotes or braces */
  valueSpan: PageSpan | undefined
}

/** How an attribute's value is written:  in double or single quotes, or braces (a spell expression). */
export type PageQuote = '"' | "'" | "{"

////////////////
// ## The chunk tree
////////////////

/** A PAGE:  its head, `"button api" is a notebook page`, and what its body draws, in order. */
export type PageHead = {
  kind: "page"
  /** its word, in its language:  `page`, `página` */
  word: string
  /** its name, inside its quotes */
  name: string | undefined
  /** its name's span, inside its quotes */
  nameSpan: PageSpan | undefined
  /** its flags, the words before `page`:  `notebook`, `locked` */
  attributes: PageAttribute[]
  /** its prose and markup, in order */
  children: PageNode[]
  /** its head's line */
  headSpan: PageSpan
  /** from its head to the end of its body */
  span: PageSpan
}

/**
 * A PROSE cell:  markdown between tags, about what it's in (Q12), headings too.
 * - One cell per run of lines with no tag between them;  blank lines inside it stay.
 */
export type PageProse = {
  kind: "prose"
  /** its markdown, each line without the indent all its lines share */
  text: string
  /** from its first character to its last, blank lines around it left out */
  span: PageSpan
}

/**
 * Spell CODE:  a run of a body's lines between its tags.
 * - Each line keeps its own span, so a position in the line is a position in the file.
 */
export type PageCode = {
  kind: "code"
  /** its lines, blank ones inside it included */
  lines: PageLine[]
  /** from its first line's first character to its last line's last */
  span: PageSpan
}

/**
 * One line of a body:  its text without the body's indent (Q7).
 * - `file.text.slice(line.span.start, line.span.end) === line.text`.
 */
export type PageLine = {
  /** the line, without the indent its body's lines share, nor a closer after it */
  text: string
  /** how many characters of indent came off it */
  indent: number
  /** its text's span */
  span: PageSpan
}

////////////////
// ## A drawing's markup
////////////////

/**
 * An ELEMENT in a drawing:  `<text part="face" color={its color}>`, `<button>`, `<solitaire-card ...>`.
 * - Its name is a component's, as written:  `text` is Spell UI's `<ui-text>`, never HTML's (Q46);
 *   which pack has it is P6's to find.
 */
export type PageElement = {
  kind: "element"
  /** its tag as written */
  name: string
  /** its attributes, in order;  `{...}` values are spell */
  attributes: PageAttribute[]
  /** what's inside it */
  children: PageNode[]
  /** whether it ended its head with `/>` */
  selfClosing: boolean
  /** from its `<` to its `>` or `/>` */
  headSpan: PageSpan
  /** from its `<` to the end of its closer */
  span: PageSpan
}

/**
 * TEXT in a drawing, as written.
 * - Whitespace with a line break in it, between tags, is left out, as JSX does;  any other is kept.
 */
export type PageMarkupText = {
  kind: "text"
  /** the text, as written */
  text: string
  /** its span */
  span: PageSpan
}

/** A HOLE in a drawing:  `{its rank}`, a spell expression whose value shows there. */
export type PageHole = {
  kind: "hole"
  /** the spell inside its braces, as written */
  code: string
  /** the spell's span, inside its braces */
  codeSpan: PageSpan
  /** from its `{` to its `}` */
  span: PageSpan
}

/**
 * An IF-CHAIN in a drawing:  `<if ...>` and any `<otherwise if ...>` / `<otherwise>` after it, closed by ONE `</>` (Q53).
 */
export type PageChoice = {
  kind: "choice"
  /** its `<if>`, then each `<otherwise ...>`, in order */
  branches: PageBranch[]
  /** from its `<if>`'s `<` to the end of its closer */
  span: PageSpan
}

/** One branch of an if-chain:  what a drawing shows when its phrase holds. */
export type PageBranch = {
  kind: "branch"
  /** `if`, `otherwise if` or `otherwise` */
  type: Exclude<SP.PageControlKind, "for each">
  /** its word as written, e.g. `otherwise if`, `si no si` */
  word: string
  /** its condition, a spell phrase;  `undefined` for `<otherwise>` */
  phrase: string | undefined
  /** its phrase's span */
  phraseSpan: PageSpan | undefined
  /** what it shows */
  children: PageNode[]
  /** from its `<` to its `>` */
  headSpan: PageSpan
  /** from its `<` to where the next branch, or the chain's closer, starts */
  span: PageSpan
}

/** A LOOP in a drawing:  `<for column in its columns>` (`<for each ...>` too), its markup drawn once for each. */
export type PageLoop = {
  kind: "loop"
  /** `for each` */
  type: "for each"
  /** its word as written */
  word: string
  /** the spell phrase after its word, e.g. `column in its columns` */
  phrase: string
  /** its phrase's span */
  phraseSpan: PageSpan
  /** what it draws for each */
  children: PageNode[]
  /** from its `<` to its `>` */
  headSpan: PageSpan
  /** from its `<` to the end of its closer */
  span: PageSpan
}

/**
 * A BLOCK in a page's body, drawn or read as written:  `<html>` (markup) or `<spell>` (plain Spell).
 */
export type PageBlock = {
  kind: "block"
  /** `html` or `code` */
  type: "html" | "code"
  /** its word as written, e.g. `html`, `spell`, `encanto` */
  word: string
  /** what it holds:  markup for `html`, code for `code` */
  children: PageNode[]
  /** from its `<` to its `>` */
  headSpan: PageSpan
  /** from its `<` to the end of its closer */
  span: PageSpan
}

/** Any node of a chunk tree. */
export type PageNode =
  | PageHead
  | PageProse
  | PageCode
  | PageElement
  | PageMarkupText
  | PageHole
  | PageChoice
  | PageBranch
  | PageLoop
  | PageBlock

/** A node's kind:  `page`, `prose`, `element` ... */
export type PageNodeKind = PageNode["kind"]

////////////////
// ## Diagnostics
////////////////

/**
 * Something wrong in a page file:  a closer that closes nothing, a tag never closed ...
 * - What the page tokenizer noted while reading it (`SP.pageErrorOf()`), in the file's language.
 * - COLLECTED, never thrown.  What the rules say of a body's spell is the parsed file's (`SP.SpellFile.errors`).
 */
export type PageDiagnostic = {
  /** `error`:  the file means something else than it says;  `warning`:  it reads, but should be fixed */
  severity: PageSeverity
  /** what's wrong and how to fix it, for people */
  message: string
  /** where */
  span: PageSpan
}

/** How bad a diagnostic is. */
export type PageSeverity = "error" | "warning"
