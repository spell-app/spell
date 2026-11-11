import type { SP } from "spell/parser/spell"
import { BubblyHtml } from "spell/app/app/components/spell-code/BubblyHtml"
import type { monaco } from "./monaco"

/****************
 * ### `BubblyMarks`
 * What Monaco draws of the bubbly look (epic `language` P50), worked out from a `SP.BubblyDrawing`:
 * the MARKS on the text, and the SHAPES drawn under it.
 * - Marks are Monaco decorations, in the classes of the look's one sheet, `bubbly.css`:
 *   - each piece's weight, slant and ink (`bubbly-reference bubbly-use` ...), as `<spell-code>` draws them
 *     (`BubblyHtml.classesFor()`)
 *   - a quoted input's own `"`, see-through, its curly mark drawn over it
 *   - ROOM either side of what a person typed, so its white pill has space round its words:
 *     injected text with a set width (`bubbly-room`), NEVER padding or margin on the text, which would move the
 *     caret off the letters
 *   - one mark spanning each shape, holding nothing but its place:  Monaco moves it as the text is edited,
 *     so the shapes follow typing before the look is laid out again (`SpellBubbly`)
 * - Shapes are a declaration's band, gutter, body and foot, a pill under what a person typed, a control line's
 *   bracket:  `SpellBubbly` places them from where Monaco draws each line and letter.
 * - Which rule presents which way is `SP.BubblyPresentation`'s, read by the layout:  nothing here decides it.
 * - Pure data:  Monaco's TYPES only, so it's tested without an editor.
 ****************/
export class BubblyMarks {
  /** `drawing`'s marks and shapes. */
  static of(drawing: SP.BubblyDrawing): BubblyMarks {
    return new BubblyMarks(drawing)
  }

  /** The decorations to set, in order:  a shape names its place by an index into them. */
  readonly marks: monaco.editor.IModelDeltaDecoration[] = []

  /** The shapes at the top of the drawing, each holding those inside it. */
  readonly shapes: BubblyShape[] = []

  /** Where each line starts in the drawing's text. */
  private readonly lineStarts: number[] = []

  private constructor(private readonly drawing: SP.BubblyDrawing) {
    let at = 0
    for (const line of drawing.text.split("\n")) {
      this.lineStarts.push(at)
      at += line.length + 1
    }
    this.nodes(drawing.nodes, this.shapes)
  }

  ////////////////
  // ## The drawing's nodes
  ////////////////

  /** Mark `nodes`, adding their shapes to `into`. */
  private nodes(nodes: SP.BubblyNode[], into: BubblyShape[]) {
    for (const node of nodes) {
      switch (node.kind) {
        case "gap":
          break
        case "line":
          this.line(node, into)
          break
        case "bracket":
          this.line(node.head, into)
          if (node.body.length) {
            into.push({ kind: "bracket", place: this.place(node.head.start, endOf(node)) })
            this.nodes(node.body, into)
          }
          break
        case "block":
          this.block(node, into)
          break
      }
    }
  }

  /** A declaration:  its band, the pills on it, and what's under it. */
  private block(block: SP.BubblyBlock, into: BubblyShape[]) {
    const shape: BubblyBlockShape = {
      kind: "block",
      place: this.place(block.head.start, endOf(block)),
      partOfSpeech: block.partOfSpeech,
      isGroup: block.isGroup,
      level: block.level,
      hasBody: block.body.some((node) => node.kind !== "gap"),
      ends: this.endsOf(block.head),
      inside: []
    }
    into.push(shape)
    this.line(block.head, shape.inside, { isHead: true })
    this.nodes(block.body, shape.inside)
  }

  /** A line's pieces:  their classes, and a pill under each input. */
  private line(line: SP.BubblyLine, into: BubblyShape[], { isHead = false } = {}) {
    let isFirstQuoted = isHead
    for (const piece of line.pieces) {
      const { start, end, kind } = piece
      if (kind === "input" || kind === "choice") {
        const isQuoted = this.isQuoted(piece)
        this.input(piece, into, { isQuoted, isName: isQuoted && isFirstQuoted })
        if (isQuoted) isFirstQuoted = false
      } else if (kind === "heading") {
        // its `#`s faint, its words bold, as `BubblyHtml` draws them
        const marks = /^#+/.exec(this.drawing.text.slice(start, end))?.[0].length ?? 0
        this.mark(start, start + marks, "bubbly-mark")
        this.mark(start + marks, end, BubblyHtml.classesFor("heading"))
      } else {
        this.mark(start, end, BubblyHtml.classesFor(kind))
      }
    }
  }

  /**
   * What a person typed:  its words with room either side, a pill under them;
   * a quoted one's own `"` marks see-through, the curly ones drawn over them, room outside them too.
   */
  private input(piece: SP.BubblyPiece, into: BubblyShape[], { isQuoted, isName }: InputPlace) {
    const { start, end, kind } = piece
    const words = isQuoted ? { start: start + 1, end: end - 1 } : { start, end }
    if (isQuoted) {
      this.mark(start, start + 1, `${QUOTE_MARK} bubbly-quote-open`, { before: room("quote", "before") })
      this.mark(end - 1, end, `${QUOTE_MARK} bubbly-quote-close`, { after: room("quote", "after") })
    }
    if (words.end <= words.start) return
    const classes = [BubblyHtml.classesFor(kind), ...(isName ? [NAME] : [])].join(" ")
    const place = this.mark(words.start, words.end, classes, {
      before: room("input", "before"),
      after: room("input", "after")
    })
    into.push({ kind: "input", place, isChoice: kind === "choice", isQuoted })
  }

  ////////////////
  // ## Marks
  ////////////////

  /**
   * Mark the text from `start` to `end` with `classes` (every piece is a `bubbly-piece`), and room `before` /
   * `after` it;  returns the mark's index.
   */
  private mark(start: number, end: number, classes: string, rooms: Rooms = {}): number {
    if (end <= start) return -1
    const options: monaco.editor.IModelDecorationOptions = {
      inlineClassName: classes ? `${PIECE} ${classes}` : PIECE,
      ...(rooms.before ? { before: rooms.before } : {}),
      ...(rooms.after ? { after: rooms.after } : {})
    }
    return this.marks.push({ range: this.range(start, end), options }) - 1
  }

  /** A mark holding a shape's place from `start` to `end`, and nothing else;  returns its index. */
  private place(start: number, end: number): number {
    return this.marks.push({ range: this.range(start, end), options: {} }) - 1
  }

  /** Monaco's range from offset `start` to `end`. */
  private range(start: number, end: number): monaco.IRange {
    const from = this.positionAt(start)
    const to = this.positionAt(end)
    return { startLineNumber: from.line, startColumn: from.column, endLineNumber: to.line, endColumn: to.column }
  }

  /** Offset `offset`'s line and column, 1-based. */
  private positionAt(offset: number): { line: number; column: number } {
    let low = 0
    let high = this.lineStarts.length - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if (this.lineStarts[middle]! <= offset) low = middle
      else high = middle - 1
    }
    return { line: low + 1, column: offset - this.lineStarts[low]! + 1 }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Is `piece` a quoted input, `"card"`? */
  private isQuoted(piece: SP.BubblyPiece): boolean {
    const words = this.drawing.text.slice(piece.start, piece.end)
    return piece.kind === "input" && words.length > 1 && words.startsWith('"') && words.endsWith('"')
  }

  /** Does a head start or end with a pill, `"card"` or `ace`? */
  private endsOf(head: SP.BubblyLine): BubblyBlockShape["ends"] {
    const pieces = head.pieces.filter((piece) => this.drawing.text.slice(piece.start, piece.end).trim())
    const isPill = (piece: SP.BubblyPiece | undefined) => piece?.kind === "input" || piece?.kind === "choice"
    const last = pieces.at(-1)
    return {
      startsWithInput: isPill(pieces[0]),
      endsWithInput: isPill(last),
      endsQuoted: !!last && isPill(last) && this.isQuoted(last)
    }
  }
}

////////////////
// ## Types and helpers
////////////////

/** A shape `SpellBubbly` draws under the text. */
export type BubblyShape = BubblyBlockShape | BubblyInputShape | BubblyBracketShape

/**
 * A declaration:  its band, and when it has a body, its gutter, its body's paper and its foot (`bubbly-block`);
 * else its band alone (`bubbly-pill`).
 */
export type BubblyBlockShape = {
  kind: "block"
  /** the mark from its head's first letter to its last line's end */
  place: number
  /** its band's colour */
  partOfSpeech: SP.BubblyPartOfSpeech
  /** a group */
  isGroup: boolean
  /** how deep it sits */
  level: number
  /** anything under its head */
  hasBody: boolean
  /** whether its head starts or ends with a pill, and a quoted one */
  ends: { startsWithInput: boolean; endsWithInput: boolean; endsQuoted: boolean }
  /** the pills on its head and its lines, its brackets, and the declarations in its body */
  inside: BubblyShape[]
}

/** A pill under what a person typed (`bubbly-input`), or one of a list's values (`bubbly-choice`). */
export type BubblyInputShape = {
  kind: "input"
  /** the mark on its words:  the room either side of them is injected there */
  place: number
  /** one of a list's values */
  isChoice: boolean
  /** its words were quoted:  its curly marks are drawn outside it */
  isQuoted: boolean
}

/** A control line's bracket down its steps (`bubbly-bracket`). */
export type BubblyBracketShape = {
  kind: "bracket"
  /** the mark from its line's first letter to its last step's end */
  place: number
}

/** Where `BubblyMarks.input()` is. */
type InputPlace = { isQuoted: boolean; isName: boolean }

/** Room injected before or after a mark. */
type Rooms = { before?: monaco.editor.InjectedTextOptions; after?: monaco.editor.InjectedTextOptions }

/** The class on every piece of text the look draws:  its ink, under any token's colour. */
const PIECE = "bubbly-piece"

/** The class of the name a head defines, `"card"` in `a "card" is a view`:  bold. */
const NAME = "bubbly-name"

/** A quoted input's own `"`:  see-through, its curly mark drawn over it. */
const QUOTE_MARK = "bubbly-quote-mark"

/**
 * Room either side of a pill's words (`input`), or outside a quoted one's marks (`quote`):
 * a no-break space, `bubbly-room-<kind>`, its width the sheet's.
 * - The caret stops only on the text's side of it:  beside the letter, never out past the room.
 *   Monaco's `InjectedTextCursorStops`:  `Right` (1) for room before the text, `Left` (2) for room after it.
 */
function room(kind: "input" | "quote", side: "before" | "after"): monaco.editor.InjectedTextOptions {
  return {
    content: "\u00a0",
    inlineClassName: `bubbly-room bubbly-room-${kind}`,
    cursorStops: side === "before" ? 1 : 2
  }
}

/** Where a node ends:  its last line's end. */
function endOf(node: SP.BubblyNode): number {
  switch (node.kind) {
    case "gap":
      return node.start
    case "line":
      return node.end
    case "bracket":
    case "block": {
      const last = node.body.findLast((each) => each.kind !== "gap")
      return last ? endOf(last) : node.head.end
    }
  }
}
