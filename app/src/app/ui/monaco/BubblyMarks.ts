import { SP } from "spell/parser/spell"
import { BubblyHtml } from "spell/app/app/components/spell-code/BubblyHtml"
import type { MarkupPartOfSpeech } from "spell/app/app/components/spell-code/BubblyMarkup"
import type { monaco } from "./monaco"
import { MarkupMarks, type MarkupShape } from "./MarkupMarks"
import { TextMarks, spacer, type Spacers } from "./TextMarks"

/****************
 * ### `BubblyMarks`
 * What Monaco draws of the bubbly look (epic `language` P50), worked out from a `SP.BubblyDrawing`:
 * the MARKS on the text, and the SHAPES drawn under it.
 * - Marks are Monaco decorations, in the classes of the look's one sheet, `bubbly.css`:
 *   - each piece's weight, slant and ink (`bubbly-reference`, `bubbly-value` ...), as `<spell-code>` draws them
 *     (`BubblyHtml.classesFor()`)
 *   - a quoted input's own `"`, see-through, its curly mark drawn over it
 *   - SPACERS either side of what a person typed, so its white pill has space round its words:
 *     injected text with a set width (`bubbly-spacer`), NEVER padding or margin on the text, which would move the
 *     caret off the letters
 *   - one mark spanning each shape, holding nothing but its place:  Monaco moves it as the text is edited,
 *     so the shapes follow typing before the look is laid out again (`SpellBubbly`)
 * - Shapes are a block's band, gutter, body and foot (a declaration's, a control line's), a pill under what a person
 *   typed, ONE dotted line under each value and each question (`bubbly-underline`):  `SpellBubbly` places them from
 *   where Monaco draws each line and letter.
 *   - The dotted line's a shape, not a mark on the text:  a mark is cut at each piece, and its dots restarted there.
 * - Which rule presents which way is `SP.BubblyPresentation`'s, read by the layout:  nothing here decides it.
 * - Pure data:  Monaco's TYPES only, so it's tested without an editor.
 * - Its marks are made as every drawing's are:  `TextMarks`.
 ****************/
export class BubblyMarks extends TextMarks {
  /**
   * `drawing`'s marks and shapes.
   * - `isView`:  is a tag in a drawing one of the project's own views?  Its pill is a thing's (`MarkupMarks.within()`).
   */
  static of(drawing: SP.BubblyDrawing, tabSize = 4, isView?: (tag: string) => boolean): BubblyMarks {
    return new BubblyMarks(drawing, tabSize, isView)
  }

  /** The shapes at the top of the drawing, each holding those inside it. */
  readonly shapes: Array<BubblyShape | MarkupShape> = []

  /** A drawing's tags, `<text color="blue">`:  drawn as HTML is (`MarkupMarks`), so Spell's marks leave them alone. */
  private readonly tags: Array<{ start: number; end: number }> = []

  /** How many head lines' descriptions it has marked:  each one's spacer is `bubbly-description-<n>`. */
  private descriptions = 0

  /** Where a head spacer is injected right before a word, a head at the top level:  its first letter's offset. */
  private readonly headSpacers = new Set<number>()

  /**
   * `tabSize`:  how many columns a tab takes, as the editor shows it:  the spacer before a head's last tab is that many
   * characters, so the tab after it still takes its whole width (Monaco counts injected text in a line's columns)
   */
  private constructor(
    private readonly drawing: SP.BubblyDrawing,
    private readonly tabSize: number,
    private readonly isView?: (tag: string) => boolean
  ) {
    super(drawing.text)
    this.nodes(drawing.nodes, this.shapes)
  }

  ////////////////
  // ## The drawing's nodes
  ////////////////

  /**
   * Mark `nodes`, adding their shapes to `into`.
   * - In a body of declarations (a thing's, a group's:  one holding a head that isn't a control line's), a line of its
   *   own (a `//` note, a step) gets a head's spacer too, so its words sit in the body, level with the heads' beside it,
   *   not on its rail (epic `language` I95)
   */
  private nodes(nodes: SP.BubblyNode[], into: Array<BubblyShape | MarkupShape>, { inBody = false } = {}) {
    const isDeclarations = inBody && nodes.some((node) => node.kind === "block" && node.partOfSpeech !== "control")
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index]!
      if (node.kind === "line" && this.drawing.text[node.start] === "<") {
        index = this.markup(nodes, index, into)
        continue
      }
      switch (node.kind) {
        case "gap":
          break
        case "line":
          if (isDeclarations && node.depth === 0) this.headSpacer(node.start)
          this.line(node, into)
          break
        case "block":
          this.block(node, into)
          break
      }
    }
  }

  /**
   * A drawing's lines, from `nodes[first]`, the first that starts with a tag, to the last line before the next block:
   * its tags drawn as HTML is, in pills, bands and blocks (`MarkupMarks.within()`), the rest as Spell;
   * returns the index of its last line.
   */
  private markup(nodes: SP.BubblyNode[], first: number, into: Array<BubblyShape | MarkupShape>): number {
    let last = first
    while (nodes[last + 1] && nodes[last + 1]!.kind !== "block") last++
    const lines = nodes.slice(first, last + 1).filter((node): node is SP.BubblyLine => node.kind === "line")
    const tags = MarkupMarks.within(this.drawing.text, lines[0]!.start, lines.at(-1)!.end, this.marks, {
      isView: this.isView,
      declaringTags: this.drawing.declaringTags,
      codes: lines.flatMap((line) => line.codes ?? [])
    })
    this.tags.push(...tags.tags)
    into.push(...tags.shapes)
    for (const line of lines) this.line(line, into)
    return last
  }

  /** A declaration:  its band, the pills on it, and what's under it. */
  private block(block: SP.BubblyBlock, into: Array<BubblyShape | MarkupShape>) {
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
    this.headSpacer(block.head.start)
    const description = this.line(block.head, shape.inside, { band: block.partOfSpeech })
    if (description) shape.description = description
    this.nodes(block.body, shape.inside, { inBody: true })
  }

  /**
   * A spacer before a head line's words (`bubbly-head-spacer`), so they sit further into their band than the lines under it;
   * its band stays where it was, as `SpellBubbly` places it from the words' indent, not this spacer (Owen, 2026-11-11).
   * - Before the indent's last tab, not the first word:  the word's first letter is then one place on screen, right
   *   after that tab, so a click, Home or a typed letter puts the caret by it.
   * - A head at the top level has no indent:  its spacer goes before its first word, where the caret may be drawn on
   *   either side of it.
   */
  private headSpacer(start: number) {
    const { line, column } = this.positionAt(start)
    const range = {
      startLineNumber: line,
      startColumn: Math.max(1, column - 1),
      endLineNumber: line,
      endColumn: column
    }
    // plain spaces:  whitespace, so Home skips it as it skips the indent
    const before = { ...HEAD_SPACER, content: " ".repeat(this.tabSize) }
    this.marks.push({ range, options: { before, showIfCollapsed: true } })
    if (column === 1) this.headSpacers.add(start)
  }

  /**
   * A line's stretches (`SP.BubblyStretches`, as VS Code's are):  their classes, and a pill under each input;
   * `band`:  it's a declaration's head, on a band of this part of speech.
   * a quoted one's own `"` marks see-through, the curly ones drawn over them, spacers outside them too.
   */
  private line(
    line: SP.BubblyLine,
    into: Array<BubblyShape | MarkupShape>,
    head: { band?: SP.BubblyPartOfSpeech } = {}
  ): BubblyBlockShape["description"] {
    let description: BubblyBlockShape["description"]
    for (const stretch of SP.BubblyStretches.ofLine(this.drawing.text, line, head)) {
      const { start, end, kind } = stretch
      // a drawing's tag:  HTML's marks
      if (this.tags.some((tag) => start >= tag.start && end <= tag.end)) continue
      if (kind === "quote-open")
        this.mark(start, end, `${QUOTE_MARK} bubbly-quote-open`, { before: spacer("quote", "before") })
      else if (kind === "quote-close")
        this.mark(start, end, `${QUOTE_MARK} bubbly-quote-close`, { after: spacer("quote", "after") })
      else if (kind === "underline") into.push({ kind: "underline", place: this.place(start, end) })
      else if (kind === "input" || kind === "choice") this.input(stretch, into)
      else if (kind === "comment" && head.band) description = this.description(start, end)
      else if (kind === "comment") this.comment(start, end, BubblyHtml.classesFor(kind))
      else if (kind === "mark") this.marksIn(start, end)
      else this.mark(start, end, BubblyHtml.classesFor(kind))
    }
    return description
  }

  /**
   * A head line's description, `-- A playing card` at its end, on its band:  right-aligned at the window's edge, its
   * band reaching there too (Owen);  returns its mark and its spacer's class.
   * - The room before it is a spacer of its own, `bubbly-description-<n>`, as wide as `SpellBubbly` works out for it,
   *   line by line, as the window's width and scroll change:  the caret stays on its letters.
   */
  private description(start: number, end: number): BubblyBlockShape["description"] {
    const spacerClass = `${DESCRIPTION}${this.descriptions++}`
    const own = spacer("description", "before")
    const before = { ...own, inlineClassName: `${own.inlineClassName} ${spacerClass}` }
    this.comment(start, end, `${BubblyHtml.classesFor("comment")} ${BAND_COMMENT}`, { before })
    return { place: this.place(start, end), spacer: spacerClass }
  }

  /** A comment, in `classes`;  the `--` that starts a description drawn as an em dash over it (`BubblyHtml.DASH`). */
  private comment(start: number, end: number, classes: string, spacers: Spacers = {}) {
    if (!this.drawing.text.startsWith("--", start)) return this.mark(start, end, classes, spacers)
    this.mark(start, start + 2, `${classes} ${BubblyHtml.DASH}`, spacers)
    return this.mark(start + 2, end, classes)
  }

  /** Marks, faint;  but a Spell expression's `{` and `}` a step darker, so it reads as one (`bubbly-brace`, Owen). */
  private marksIn(start: number, end: number) {
    const classes = BubblyHtml.classesFor("mark")
    for (const part of this.drawing.text.slice(start, end).matchAll(/[{}]+|[^{}]+/g)) {
      const from = start + part.index
      this.mark(from, from + part[0].length, /[{}]/.test(part[0]) ? `${classes} ${BubblyHtml.BRACE}` : classes)
    }
  }

  /** What a person typed:  its words with a spacer either side, a pill under them. */
  private input(
    { start, end, kind, isQuoted = false, isName }: SP.BubblyStretch,
    into: Array<BubblyShape | MarkupShape>
  ) {
    const classes = [BubblyHtml.classesFor(kind as SP.BubblyPieceKind), ...(isName ? [NAME] : [])].join(" ")
    const place = this.mark(start, end, classes, {
      before: spacer("input", "before"),
      after: spacer("input", "after")
    })
    const afterHeadSpacer = this.headSpacers.has(start)
    into.push({
      kind: "input",
      place,
      isChoice: kind === "choice",
      isQuoted,
      ...(afterHeadSpacer ? { afterHeadSpacer } : {})
    })
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
export type BubblyShape = BubblyBlockShape | BubblyInputShape | BubblyUnderlineShape

/** ONE dotted line under a value or a question (`SP.BubblyUnderline`), from its first letter to its last. */
export type BubblyUnderlineShape = {
  kind: "underline"
  /** the mark from its first letter to its last */
  place: number
}

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
  /**
   * the mark on its head's description, `-- A playing card` at its end:  right-aligned at the window's edge, its band
   * reaching there (Owen)
   */
  description?: {
    /** the mark on it, from its `--` to the line's end */
    place: number
    /** the class of the spacer before it, `bubbly-description-<n>`:  `SpellBubbly` sets its width */
    spacer: string
  }
  /** the pills on its head and its lines, and the blocks in its body;  a drawing's tags too */
  inside: Array<BubblyShape | MarkupShape>
}

/** A pill under what a person typed (`bubbly-input`), or one of a list's values (`bubbly-choice`). */
export type BubblyInputShape = {
  kind: "input"
  /** the mark on its words:  the spacer either side of them is injected there */
  place: number
  /** one of a list's values */
  isChoice: boolean
  /** its words were quoted:  its curly marks are drawn outside it */
  isQuoted: boolean
  /**
   * a top-level head's bare name (`solitaire is an app`):  the head spacer is injected at its words too, before its
   * own, so its pill starts past it (epic `language` I84)
   */
  afterHeadSpacer?: boolean
  /** an HTML tag's value:  the tag's part of speech, whose hue its pill's edge takes, as on the page */
  inTag?: MarkupPartOfSpeech
  /** a tag's `{…}` value, worked out as it runs:  its pill inverted, a shade of its tag's colour (Owen) */
  isExpression?: boolean
}

/** The class of the spacer before a head's description, then its number:  `bubbly-description-3`. */
export const DESCRIPTION = "bubbly-description-"

/** The class of the name a head defines, `"card"` in `a "card" is a view`:  bold. */
const NAME = "bubbly-name"

/** A quoted input's own `"`:  see-through, its curly mark drawn over it. */
const QUOTE_MARK = "bubbly-quote-mark"

/** A comment at the end of a head, on its band:  the page's is inside the band's element, the editor's isn't. */
const BAND_COMMENT = "bubbly-band-comment"

/**
 * A spacer before a head line's words:  `bubbly-head-spacer`, its width the sheet's (`--bubbly-pill-left-shift`).
 * - The caret stops only after it, by the tab or the word it's before.
 */
const HEAD_SPACER: monaco.editor.InjectedTextOptions = {
  content: " ",
  inlineClassName: "bubbly-spacer bubbly-head-spacer",
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
