import type { monaco } from "./monaco"

/****************
 * ### `TextMarks`
 * The marks a bubbly drawing puts on a text in Monaco, by offsets into it:  the base of `BubblyMarks` (Spell) and
 * `MarkupMarks` (HTML).
 * - Each mark is a Monaco decoration in the classes of the look's one sheet, `bubbly.css`.
 * - A shape names its place by an index into `marks`:  Monaco moves that mark as the text is edited.
 * - Pure data:  Monaco's TYPES only, so it's tested without an editor.
 ****************/
export class TextMarks {
  /** The decorations to set, in order:  a shape names its place by an index into them. */
  readonly marks: monaco.editor.IModelDeltaDecoration[] = []

  /** Where each line starts in `text`. */
  private readonly lineStarts: number[] = []

  /** `text`:  what the marks are on. */
  protected constructor(protected readonly text: string) {
    let at = 0
    for (const line of text.split("\n")) {
      this.lineStarts.push(at)
      at += line.length + 1
    }
  }

  /**
   * Mark the text from `start` to `end` with `classes` (every piece is a `bubbly-piece`), and spacers `before` /
   * `after` it;  returns the mark's index, -1 when there's nothing to mark.
   */
  protected mark(start: number, end: number, classes: string, spacers: Spacers = {}): number {
    if (end <= start) return -1
    const options: monaco.editor.IModelDecorationOptions = {
      inlineClassName: classes ? `${PIECE} ${classes}` : PIECE,
      ...(spacers.before ? { before: spacers.before } : {}),
      ...(spacers.after ? { after: spacers.after } : {})
    }
    return this.marks.push({ range: this.range(start, end), options }) - 1
  }

  /** A mark holding a shape's place from `start` to `end`, and nothing else;  returns its index. */
  protected place(start: number, end: number): number {
    return this.marks.push({ range: this.range(start, end), options: {} }) - 1
  }

  /** Monaco's range from offset `start` to `end`. */
  protected range(start: number, end: number): monaco.IRange {
    const from = this.positionAt(start)
    const to = this.positionAt(end)
    return { startLineNumber: from.line, startColumn: from.column, endLineNumber: to.line, endColumn: to.column }
  }

  /** Offset `offset`'s line and column, 1-based. */
  protected positionAt(offset: number): { line: number; column: number } {
    let low = 0
    let high = this.lineStarts.length - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if (this.lineStarts[middle]! <= offset) low = middle
      else high = middle - 1
    }
    return { line: low + 1, column: offset - this.lineStarts[low]! + 1 }
  }
}

////////////////
// ## Types and helpers
////////////////

/** Spacers injected before or after a mark. */
export type Spacers = { before?: monaco.editor.InjectedTextOptions; after?: monaco.editor.InjectedTextOptions }

/**
 * What a spacer makes room for, `bubbly-<kind>-spacer`:
 * - `input`:  either side of a pill's words
 * - `quote`:  outside a quoted input's marks
 * - `line`:  before an HTML line of text, so it sits in from the tags beside it, as on the page
 * - `tag`:  either side of an HTML tag in a line, room for its pill
 * - `touch`:  between an empty element's two tags, whose points touch
 * - `head`:  before an HTML block's start tag, its words clear of its band's cut corner
 * - `attribute`, `equals`:  before an HTML attribute's name, and its `=`
 */
export type SpacerKind = "input" | "quote" | "line" | "tag" | "touch" | "head" | "attribute" | "equals"

/** The class on every piece of text the look draws:  its ink, under any token's colour. */
const PIECE = "bubbly-piece"

/**
 * A spacer:  a no-break space, `bubbly-spacer bubbly-<kind>-spacer bubbly-spacer-<side>`, its width the sheet's.
 * - The caret stops only on the text's side of it:  beside the letter, never out past the spacer.
 *   Monaco's `InjectedTextCursorStops`:  `Right` (1) for a spacer before the text, `Left` (2) for a spacer after it.
 */
export function spacer(kind: SpacerKind, side: "before" | "after"): monaco.editor.InjectedTextOptions {
  return {
    content: " ",
    inlineClassName: `bubbly-spacer bubbly-${kind}-spacer bubbly-spacer-${side}`,
    cursorStops: side === "before" ? 1 : 2
  }
}
