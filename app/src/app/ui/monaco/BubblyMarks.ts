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
 *   - room before each line of a group's member, so its words move past the group's rail with its band
 *     (`pushes`, below)
 * - Shapes are a declaration's band, gutter, body and foot, a pill under what a person typed, a control line's
 *   bracket:  `SpellBubbly` places them from where Monaco draws each line and letter.
 * - Which rule presents which way is `SP.BubblyPresentation`'s, read by the layout:  nothing here decides it.
 * - Pure data:  Monaco's TYPES only, so it's tested without an editor.
 ****************/
export class BubblyMarks {
  /** `drawing`'s marks and shapes;  `tabSize`:  how many columns a tab in its text takes, as the editor shows it. */
  static of(drawing: SP.BubblyDrawing, tabSize = 4): BubblyMarks {
    return new BubblyMarks(drawing, tabSize)
  }

  /** The decorations to set, in order:  a shape names its place by an index into them. */
  readonly marks: monaco.editor.IModelDeltaDecoration[] = []

  /** The shapes at the top of the drawing, each holding those inside it. */
  readonly shapes: BubblyShape[] = []

  /**
   * The marks of the room that PUSHES a line's words right, by their index:  one per push, before its last indent.
   * - A group's members are written at its own indent, so their bands are drawn past its rail (`SpellBubbly`),
   *   as far past it as the group is past its parent's:  one indent step.
   *   So a member's head, and each declaration's inside it, gets room (`bubbly-room-push`) as wide as that step,
   *   and its words keep their usual room inside its band (Owen, 2026-11-11).
   *   - Its plain lines don't:  they stay under its words (`pushHeads()`).
   *   - The step:  the group's indent less its parent's, in spaces, so it's the font's own width;
   *     a group at the top level has no parent's rail, so a tab's
   * - Only a member written at the group's indent, or less:  one written deeper is past the rail already.
   * - A group inside a group's member is pushed with it, and its own members once more.
   * - `SpellBubbly` counts their columns on each line, to know where its words are drawn.
   */
  readonly pushes: number[] = []

  /** Where each line starts in the drawing's text. */
  private readonly lineStarts: number[] = []

  /** The drawing's lines. */
  private readonly lines: string[]

  private constructor(
    private readonly drawing: SP.BubblyDrawing,
    private readonly tabSize: number
  ) {
    this.lines = drawing.text.split("\n")
    let at = 0
    for (const line of this.lines) {
      this.lineStarts.push(at)
      at += line.length + 1
    }
    this.nodes(drawing.nodes, this.shapes)
    this.pushMembers(this.shapes)
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
    this.line(block.head, shape.inside, { band: block.partOfSpeech })
    this.nodes(block.body, shape.inside)
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
  // ## A group's members, past its rail
  ////////////////

  /**
   * Push the head of each group's member in `shapes`, and of each declaration inside it, those in deeper groups too;
   * `parent`:  the block they're in.
   * - Heads only:  a member's plain lines (a value's lines, steps, comments) stay where they're written,
   *   under its words, not a step further in (Owen, 2026-11-11:  "text inside the block is too far to the right").
   * - A declaration inside a member is pushed too, or its band would start on the member's rail.
   */
  private pushMembers(shapes: BubblyShape[], parent?: BubblyBlockShape) {
    for (const shape of shapes) {
      if (shape.kind !== "block") continue
      if (shape.isGroup && shape.hasBody) {
        const groupIndent = this.indentOf(shape)
        const step = parent ? groupIndent - this.indentOf(parent) : this.tabSize
        for (const member of shape.inside) {
          if (member.kind !== "block" || step <= 0 || this.indentOf(member) > groupIndent) continue
          this.pushHeads(member, step)
        }
      }
      this.pushMembers(shape.inside, shape.hasBody ? shape : parent)
    }
  }

  /** Push `block`'s head, and those of the declarations inside it, by `columns`. */
  private pushHeads(block: BubblyBlockShape, columns: number) {
    this.push(this.marks[block.place]!.range.startLineNumber, columns)
    for (const inside of block.inside) if (inside.kind === "block") this.pushHeads(inside, columns)
  }

  /**
   * Room `columns` wide before the last tab or space of `line`'s indent, or before its first word if it has none.
   * - Before the indent's last character, not the word:  the word's first letter is then one place in the text,
   *   drawn right after that tab, so a click, Home or a typed letter puts the caret by it.
   *   Room right before the word would be two places on screen for one in the text, and Monaco may draw the caret
   *   at either:  a room's width off its letter.
   * - Plain spaces:  whitespace, so Home skips it as it skips the indent.
   * - Monaco counts it in the line's columns, so the tab after it still reaches the next tab stop.
   */
  private push(line: number, columns: number) {
    const text = this.lines[line - 1] ?? ""
    const column = /^[ \t]*/.exec(text)![0].length + 1
    if (column > text.length) return
    const before = { ...PUSH_ROOM, content: " ".repeat(columns) }
    const range =
      column > 1
        ? { startLineNumber: line, startColumn: column - 1, endLineNumber: line, endColumn: column }
        : { startLineNumber: line, startColumn: column, endLineNumber: line, endColumn: column }
    this.pushes.push(this.marks.push({ range, options: { before, showIfCollapsed: true } }) - 1)
  }

  /** How many columns the indent of `block`'s head takes, a tab `tabSize`. */
  private indentOf(block: BubblyBlockShape): number {
    return indentColumns(this.lines[this.marks[block.place]!.range.startLineNumber - 1] ?? "", this.tabSize)
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
 * Room pushing a group member's line past the group's rail (`bubbly-room-push`):
 * spaces, as many as the indent step (`BubblyMarks.push()`).
 * - The caret stops after it, by the tab or word it's before.
 */
const PUSH_ROOM: monaco.editor.InjectedTextOptions = {
  content: " ",
  inlineClassName: "bubbly-room bubbly-room-push",
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
    case "bracket":
    case "block": {
      const last = node.body.findLast((each) => each.kind !== "gap")
      return last ? endOf(last) : node.head.end
    }
  }
}
