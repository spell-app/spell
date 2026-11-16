/****************
 * ### `TextMarks`
 * The marks a bubbly drawing puts on a text, by offsets into it:  the base of the editors' marks (Spell's) and of
 * `MarkupMarks` (HTML), which every editor reads.
 * - Which stretch of the text gets which classes of the look's one sheet, `bubbly.css`, and which spacers:
 *   worked out here, the same for every editor.
 * - Only the last step is the editor's:  its `MarkMaker` turns each stretch into the editor's own mark
 *   (CodeMirror's, `CodeMirrorMarkup`'s).
 * - A shape names its place by an index into `marks`:  the editor moves that mark as the text is edited.
 * - Pure data:  no editor in it, so it's tested without one.
 *   NEVER imports an editor (epic `codemirror` P3).
 ****************/
export class TextMarks<Mark> {
  /** Where each line starts in `text`. */
  private readonly lineStarts: number[] = []

  /**
   * `text`:  what the marks are on
   * `make`:  the editor's step, from a stretch to its own mark
   * `marks`:  the marks made, in order, a shape naming its place by an index into them;
   *   another drawing's, to add to its own (a Spell drawing's tags, `MarkupMarks.within()`)
   */
  protected constructor(
    protected readonly text: string,
    protected readonly make: MarkMaker<Mark>,
    readonly marks: Mark[] = []
  ) {
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
    const stretch: MarkedStretch = { start, end, classes: classes ? `${PIECE} ${classes}` : PIECE, ...spacers }
    return this.marks.push(this.make(stretch, this)) - 1
  }

  /** A mark holding a shape's place from `start` to `end`, and nothing else;  returns its index. */
  protected place(start: number, end: number): number {
    return this.marks.push(this.make({ start, end }, this)) - 1
  }

  /** Offset `offset`'s line and column, 1-based. */
  positionAt(offset: number): { line: number; column: number } {
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

/**
 * An editor's step from a stretch of marked text to its own mark (`TextMarks`).
 * - `stretch.classes` undefined:  a place, holding nothing but where a shape goes
 * - `marks`:  the marks being made, for `positionAt()`
 */
export type MarkMaker<Mark> = (stretch: MarkedStretch, marks: { positionAt: TextMarks<Mark>["positionAt"] }) => Mark

/** A stretch of the text, its classes and the spacers either side:  what an editor makes a mark of. */
export type MarkedStretch = {
  /** where it starts, an offset into the text */
  start: number
  /** where it ends */
  end: number
  /** its classes, `bubbly-piece` first;  undefined for a place */
  classes?: string
} & Spacers

/** Spacers injected before or after a mark. */
export type Spacers = { before?: Spacer; after?: Spacer }

/**
 * Room injected beside a mark:  `content`, in `inlineClassName`, its width the sheet's.
 * - `cursorStops`:  which side of it the caret stops on:
 *   `1` (right) for a spacer before the text, `2` (left) for one after it;  none:  either side
 */
export type Spacer = { content: string; inlineClassName: string; cursorStops?: 1 | 2 }

/**
 * What a spacer makes room for, `bubbly-<kind>-spacer`:
 * - `input`:  either side of a pill's words
 * - `quote`:  outside a quoted input's marks
 * - `tag-quote`:  after a tag's quoted value's closing mark:  less than `quote`, the next attribute's own room after it (Owen)
 * - `line`:  before an HTML line of text, so it sits in from the tags beside it, as on the page
 * - `tag`:  either side of an HTML tag in a line, room for its pill
 * - `touch`:  between an empty element's two tags, whose points touch
 * - `tag-head`:  before an HTML block's start tag, its `⟨` clear of its band's cut corner, in an HTML file or a
 *   Spell file's drawing
 * - `tag-foot`:  before an HTML block's end tag that starts its line, its `⟨` just past its rail
 * - `tag-foot-bare`:  ... a `</>`, its `⟨|⟩` at its tiny pill's right end (Owen)
 * - `attribute`, `equals`:  before an HTML attribute's name, and its `=`
 * - `description`:  before a head's description, `-- A playing card`, to right-align it at the window's edge
 */
export type SpacerKind =
  | "input"
  | "code"
  | "quote"
  | "tag-quote"
  | "line"
  | "tag"
  | "touch"
  | "tag-head"
  | "tag-foot"
  | "tag-foot-bare"
  | "equals"
  | "closing-slash"
  | "description"

/** The class on every piece of text the look draws:  its ink, under any token's colour. */
const PIECE = "bubbly-piece"

/**
 * A spacer:  a no-break space, `bubbly-spacer bubbly-<kind>-spacer bubbly-spacer-<side>`, its width the sheet's.
 * - The caret stops only on the text's side of it:  beside the letter, never out past the spacer.
 */
export function spacer(kind: SpacerKind, side: "before" | "after"): Spacer {
  return {
    content: " ",
    inlineClassName: `bubbly-spacer bubbly-${kind}-spacer bubbly-spacer-${side}`,
    cursorStops: side === "before" ? 1 : 2
  }
}
