import { SP } from "spell/parser/spell"
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
 * - Shapes are a block's band, gutter, body and foot (a declaration's, a control line's), a pill under what a person
 *   typed:  `SpellBubbly` places them from where Monaco draws each line and letter.
 * - Which rule presents which way is `SP.BubblyPresentation`'s, read by the layout:  nothing here decides it.
 * - Pure data:  Monaco's TYPES only, so it's tested without an editor.
 ****************/
export class BubblyMarks {
  /** `drawing`'s marks and shapes. */
  static of(drawing: SP.BubblyDrawing, tabSize = 4): BubblyMarks {
    return new BubblyMarks(drawing, tabSize)
  }

  /** The decorations to set, in order:  a shape names its place by an index into them. */
  readonly marks: monaco.editor.IModelDeltaDecoration[] = []

  /** The shapes at the top of the drawing, each holding those inside it. */
  readonly shapes: BubblyShape[] = []

  /** Where each line starts in the drawing's text. */
  private readonly lineStarts: number[] = []

  /**
   * `tabSize`:  how many columns a tab takes, as the editor shows it:  the room before a head's last tab is that many
   * characters, so the tab after it still takes its whole width (Monaco counts injected text in a line's columns)
   */
  private constructor(
    private readonly drawing: SP.BubblyDrawing,
    private readonly tabSize: number
  ) {
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
    this.headRoom(block.head.start)
    this.line(block.head, shape.inside, { band: block.partOfSpeech })
    this.nodes(block.body, shape.inside)
  }

  /**
   * Room before a head line's words (`bubbly-room-head`), so they sit further into their band than the lines under it;
   * its band stays where it was, as `SpellBubbly` places it from the words' indent, not this room (Owen, 2026-11-11).
   * - Before the indent's last tab, not the first word:  the word's first letter is then one place on screen, right
   *   after that tab, so a click, Home or a typed letter puts the caret by it.
   * - A head at the top level has no indent:  its room goes before its first word, where the caret may be drawn on
   *   either side of it.
   */
  private headRoom(start: number) {
    const { line, column } = this.positionAt(start)
    const range = { startLineNumber: line, startColumn: Math.max(1, column - 1), endLineNumber: line, endColumn: column }
    // plain spaces:  whitespace, so Home skips it as it skips the indent
    const before = { ...HEAD_ROOM, content: " ".repeat(this.tabSize) }
    this.marks.push({ range, options: { before, showIfCollapsed: true } })
  }

  /**
   * A line's stretches (`SP.BubblyStretches`, as VS Code's are):  their classes, and a pill under each input;
   * `band`:  it's a declaration's head, on a band of this part of speech.
   * a quoted one's own `"` marks see-through, the curly ones drawn over them, room outside them too.
   */
  private line(line: SP.BubblyLine, into: BubblyShape[], head: { band?: SP.BubblyPartOfSpeech } = {}) {
    for (const stretch of SP.BubblyStretches.ofLine(this.drawing.text, line, head)) {
      const { start, end, kind } = stretch
      if (kind === "quote-open")
        this.mark(start, end, `${QUOTE_MARK} bubbly-quote-open`, { before: room("quote", "before") })
      else if (kind === "quote-close")
        this.mark(start, end, `${QUOTE_MARK} bubbly-quote-close`, { after: room("quote", "after") })
      else if (kind === "input" || kind === "choice") this.input(stretch, into)
      else if (kind === "comment" && head.band) this.mark(start, end, `${BubblyHtml.classesFor(kind)} ${ON_BAND}`)
      else this.mark(start, end, BubblyHtml.classesFor(kind))
    }
  }

  /** What a person typed:  its words with room either side, a pill under them. */
  private input({ start, end, kind, isQuoted = false, isName }: SP.BubblyStretch, into: BubblyShape[]) {
    const classes = [BubblyHtml.classesFor(kind as SP.BubblyPieceKind), ...(isName ? [NAME] : [])].join(" ")
    const place = this.mark(start, end, classes, {
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

  /** Does a head start or end with a pill, `"card"` or `ace`? */
  private endsOf(head: SP.BubblyLine): BubblyBlockShape["ends"] {
    const pieces = head.pieces.filter((piece) => this.drawing.text.slice(piece.start, piece.end).trim())
    const isPill = (piece: SP.BubblyPiece | undefined) => piece?.kind === "input" || piece?.kind === "choice"
    const last = pieces.at(-1)
    return {
      startsWithInput: isPill(pieces[0]),
      endsWithInput: isPill(last),
      endsQuoted: !!last && isPill(last) && SP.BubblyStretches.isQuoted(this.drawing.text, last)
    }
  }
}

////////////////
// ## Types and helpers
////////////////

/** A shape `SpellBubbly` draws under the text. */
export type BubblyShape = BubblyBlockShape | BubblyInputShape

/**
 * A declaration, or a control line with steps under it:  its band, and when it has a body, its gutter, its body's
 * paper and its foot (`bubbly-block`);  else its band alone (`bubbly-pill`).
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
  /** the pills on its head and its lines, and the blocks in its body */
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

/** Room injected before or after a mark. */
type Rooms = { before?: monaco.editor.InjectedTextOptions; after?: monaco.editor.InjectedTextOptions }

/** The class on every piece of text the look draws:  its ink, under any token's colour. */
const PIECE = "bubbly-piece"

/** The class of the name a head defines, `"card"` in `a "card" is a view`:  bold. */
const NAME = "bubbly-name"

/** A quoted input's own `"`:  see-through, its curly mark drawn over it. */
const QUOTE_MARK = "bubbly-quote-mark"

/** A comment at the end of a head, on its band:  the page's is inside the band's element, the editor's isn't. */
const ON_BAND = "bubbly-on-band"

/**
 * Room either side of a pill's words (`input`), or outside a quoted one's marks (`quote`):
 * a no-break space, `bubbly-room-<kind> bubbly-room-<side>`, its width the sheet's.
 * - The caret stops only on the text's side of it:  beside the letter, never out past the room.
 *   Monaco's `InjectedTextCursorStops`:  `Right` (1) for room before the text, `Left` (2) for room after it.
 */
function room(kind: "input" | "quote", side: "before" | "after"): monaco.editor.InjectedTextOptions {
  return {
    content: "\u00a0",
    inlineClassName: `bubbly-room bubbly-room-${kind} bubbly-room-${side}`,
    cursorStops: side === "before" ? 1 : 2
  }
}

/**
 * Room before a head line's words:  `bubbly-room-head`, its width the sheet's (`--bubbly-pill-left-shift`).
 * - The caret stops only after it, by the tab or the word it's before.
 */
const HEAD_ROOM: monaco.editor.InjectedTextOptions = {
  content: " ",
  inlineClassName: "bubbly-room bubbly-room-head",
  cursorStops: 1
}

/** How many columns `text`'s indent takes, a tab `tabSize`. */
export function indentColumns(text: string, tabSize: number): number {
  let columns = 0
  for (const char of text) {
    if (char === "\t") columns += tabSize - (columns % tabSize)
    else if (char === " ") columns++
    else break
  }
  return columns
}

/** Where a node ends:  its last line's end. */
function endOf(node: SP.BubblyNode): number {
  switch (node.kind) {
    case "gap":
      return node.start
    case "line":
      return node.end
    case "block": {
      const last = node.body.findLast((each) => each.kind !== "gap")
      return last ? endOf(last) : node.head.end
    }
  }
}
