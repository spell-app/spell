import type { SP } from "spell/parser/spell"

/****************
 * ### `BubblyHtml`
 * A `SP.BubblyDrawing` as HTML, in the classes of the bubbly look's ONE sheet, `bubbly.css` beside it.
 * - `<div class="bubbly">`:  each declaration a `bubbly-block` (its head on a band, a gutter, its body, a foot),
 *   or a `bubbly-pill` when it has no body;  each line a `<p class="bubbly-line">`;  a control line with steps
 *   under it is a block too, `bubbly-control`.
 * - Each underlined stretch, one value or one question, ONE `<span class="bubbly-underline">` round its pieces:
 *   one box, so its dotted line runs on, its dots even, under bold and plain words alike.
 * - Every character of the code is in it, but the indents:  a copied line copies its words, quote marks too
 *   (drawn outside their pill, the file's own `"` kept transparent).
 * - `sections`:  each declaration wrapped in a `<ui-section class="bubbly-section" id="...">`, a block a docs
 *   page's comments anchor to (the drawn-bubbly page, `scripts/bubbly-page.ts`).
 * - Strings, not DOM:  `<ui-code>` takes its drawing as HTML, as it takes its coloured lines, and the page's script
 *   runs in node.
 * - STATIC and instance-free:  one drawing in, its HTML out.  NEVER imports the parser's code, only its types.
 ****************/
export class BubblyHtml {
  /** `drawing` as HTML;  `sections`:  wrap each declaration for a page's comments, ids from `idPrefix`. */
  static write(drawing: SP.BubblyDrawing, { sections }: BubblyHtmlOptions = {}): string {
    return `<div class="bubbly">${new BubblyWriter(drawing.text, sections).nodes(drawing.nodes)}</div>`
  }

  /**
   * A piece's classes in the sheet, e.g. `bubbly-reference` for a `reference`;  `""` for plain `words`.
   * - The code editor draws its pieces in the same classes (`CodeMirrorBubbly`, epic `codemirror` P3).
   */
  static classesFor(kind: SP.BubblyPieceKind): string {
    return PIECE_CLASSES[kind]
  }

  /** Round one value or one question (`SP.BubblyUnderline`):  ONE dotted line under all of it. */
  static readonly UNDERLINE = "bubbly-underline"

  /** A Spell expression's `{` and `}`:  a step darker than the other marks, so a `{…}` reads as one (Owen). */
  static readonly BRACE = "bubbly-brace"

  /**
   * Round a drawing's CODE, a `{…}` in its markup (`SP.BubblyLine.codes`):  ONE inverted pill, a deep shade of its
   * band's hue, its words light, so code worked out as the program runs reads apart from what's typed in (Owen, I144 C1)
   * - the same pill as an HTML file's `{…}` value (`BubblyMarkup`), and the code editor's
   */
  static readonly CODE = "bubbly-input bubbly-expression"

  /** A code pill's own `{` and `}`:  part of its pill, as a quoted value's marks are of its white (Owen, I144 C1). */
  static readonly CODE_BRACE = "bubbly-code-brace"

  /**
   * The `--` that starts a description (`-- A playing card`):  drawn as an em dash, `—`, over the file's own `--`,
   * which is kept, see-through, so a copied line copies it (Owen).
   */
  static readonly DASH = "bubbly-dash"

  /**
   * Round a head's description (`-- A playing card`):  the room from the head's words to the band's right end,
   * the description at its right, kept in view as the drawing scrolls (epic `language` J147)
   */
  static readonly DESCRIPTION = "bubbly-description"

  /** A comment's text as HTML:  its starting `--` a `DASH`. */
  static commentHtml(comment: string): string {
    return comment.startsWith("--")
      ? `<span class="${BubblyHtml.DASH}">--</span>${escape(comment.slice(2))}`
      : escape(comment)
  }

  /** `marks`, faint marks' text, as HTML:  each `{` and `}` among them a `BRACE`. */
  static marksHtml(marks: string): string {
    return escape(marks).replace(/[{}]/g, (brace) => `<span class="${BubblyHtml.BRACE}">${brace}</span>`)
  }
}

/** How `BubblyHtml.write()` draws. */
export type BubblyHtmlOptions = {
  /** wrap each declaration in a `<ui-section>` with an id, for a page's comments */
  sections?: {
    /** each id starts with it, e.g. `plain` for `plain-rank` */
    idPrefix: string
    /** ids taken already, across every drawing on the page:  a repeat gets `-2`, `-3` ... */
    ids: Set<string>
  }
}

/** One drawing being written. */
class BubblyWriter {
  constructor(
    private readonly text: string,
    private readonly sections: BubblyHtmlOptions["sections"]
  ) {}

  /** `nodes` as HTML. */
  nodes(nodes: SP.BubblyNode[]): string {
    return nodes.map((node) => this.node(node)).join("")
  }

  /** One node as HTML. */
  private node(node: SP.BubblyNode): string {
    switch (node.kind) {
      case "gap":
        return `<div class="bubbly-gap"></div>`
      case "line":
        return this.line(node)
      case "block":
        return this.block(node)
    }
  }

  /** A declaration:  its band and body, or its band alone. */
  private block(block: SP.BubblyBlock): string {
    // its id before its body's:  ids go in the page's order
    const id = this.sections && this.idFor(block)
    const kind = `bubbly-${block.partOfSpeech}${block.isGroup ? " bubbly-group" : ""} bubbly-level-${block.level}`
    const ends = this.endsOf(block.head)
    const head = this.head(block.head)
    const html = block.body.length
      ? `<div class="bubbly-block ${kind}"><p class="bubbly-head-pill${ends}">${head}</p><div class="bubbly-gutter"></div>` +
        `<div class="bubbly-body">${this.nodes(block.body)}</div><div class="bubbly-foot"></div></div>`
      : `<p class="bubbly-pill ${kind}${ends}">${head}</p>`
    return id ? `<ui-section class="bubbly-section" id="${id}">${html}</ui-section>` : html
  }

  /** A line:  a step, a comment or a heading. */
  private line(line: SP.BubblyLine): string {
    const [first] = line.pieces
    const style =
      first?.kind === "comment" && line.pieces.length === 1
        ? " bubbly-comment"
        : first?.kind === "heading"
          ? " bubbly-heading"
          : ""
    const body =
      style === " bubbly-comment" ? BubblyHtml.commentHtml(this.text.slice(line.start, line.end)) : this.pieces(line)
    return `<p class="bubbly-line${style} bubbly-indent-${Math.min(line.depth, MAX_INDENT)}">${body}</p>`
  }

  /**
   * A declaration's head line as HTML:  a description at its end (`-- A playing card`) in a `bubbly-description`,
   * the room from the head's words to the band's right end, so the sheet can keep it in view (Owen, epic `language`
   * J147)
   */
  private head(line: SP.BubblyLine): string {
    const last = line.pieces.at(-1)
    if (last?.kind !== "comment") return this.pieces(line)
    const words = this.pieces({ ...line, pieces: line.pieces.slice(0, -1) })
    return `${words}<span class="${BubblyHtml.DESCRIPTION}">${this.piece(last)}</span>`
  }

  /**
   * A line's pieces as HTML, each underlined stretch round the pieces it runs under;  each code round its own, its
   * braces part of its pill.
   */
  private pieces(line: SP.BubblyLine): string {
    const codes = line.codes ?? []
    return line.pieces
      .map((piece) => {
        // a pill's own, its blanks (`to play <a card>`):  drawn inside it
        const inPill = piece.kind === "input" ? line.underlines.filter((each) => isInside(each, piece)) : []
        const names = piece.kind === "input" ? (line.pillNames ?? []).filter((each) => isInside(each, piece)) : []
        const around = line.underlines.filter((each) => !inPill.includes(each))
        const opens = around.some((each) => each.start === piece.start)
        const closes = around.some((each) => each.end === piece.end)
        const code = codes.find((each) => each.start === piece.start || each.end === piece.end)
        const isBrace = !!code && piece.end - piece.start === 1
        const html = isBrace ? braceHtml(this.text[piece.start]!) : this.piece(piece, inPill, names)
        return (
          (opens ? `<span class="${BubblyHtml.UNDERLINE}">` : "") +
          (code?.start === piece.start ? `<span class="${BubblyHtml.CODE}">` : "") +
          html +
          (code?.end === piece.end ? "</span>" : "") +
          (closes ? "</span>" : "")
        )
      })
      .join("")
  }

  /**
   * One piece as HTML;  when it's an action's pill (`to play <a card>`), `blanks`, the underlines inside it,
   * and `names`, its bold words (`card`).
   */
  private piece(piece: SP.BubblyPiece, blanks: SP.BubblyUnderline[] = [], names: SP.BubblyPillName[] = []): string {
    const words = this.text.slice(piece.start, piece.end)
    switch (piece.kind) {
      case "words":
        return escape(words)
      case "heading": {
        // its `#`s faint, its words bold
        const marks = /^#+/.exec(words)?.[0] ?? ""
        return `<span class="bubbly-mark">${marks}</span>${escape(words.slice(marks.length))}`
      }
      case "input": {
        const { start, end } = piece
        const classes = blanks.length ? `bubbly-input ${WITH_BLANKS}` : "bubbly-input"
        if (/^".*"$/s.test(words) && words.length > 1)
          return `<span class="bubbly-quoted"><span class="${classes}">${QUOTE_OPEN}${this.wordsHtml(start + 1, end - 1, blanks, names)}${QUOTE_CLOSE}</span></span>`
        return `<span class="${classes}">${this.wordsHtml(start, end, blanks, names)}</span>`
      }
      case "mark":
        return `<span class="${BubblyHtml.classesFor(piece.kind)}">${BubblyHtml.marksHtml(words)}</span>`
      case "comment":
        return `<span class="${BubblyHtml.classesFor(piece.kind)}">${BubblyHtml.commentHtml(words)}</span>`
      default:
        return `<span class="${BubblyHtml.classesFor(piece.kind)}">${escape(words)}</span>`
    }
  }

  /**
   * The text from `start` to `end` as HTML, each of `underlines` in it round its words, each of `names` bold:
   * an action's blanks in its pill, their kind words bold, `to play <a card>` (epic `language` I109).
   */
  private wordsHtml(
    start: number,
    end: number,
    underlines: SP.BubblyUnderline[],
    names: SP.BubblyPillName[] = []
  ): string {
    let html = ""
    let at = start
    for (const each of underlines.filter((underline) => underline.start >= start && underline.end <= end)) {
      html += `${this.namesHtml(at, each.start, names)}<span class="${BubblyHtml.UNDERLINE}">`
      html += `${this.namesHtml(each.start, each.end, names)}</span>`
      at = each.end
    }
    return html + this.namesHtml(at, end, names)
  }

  /** The text from `start` to `end` as HTML, each of `names` in it a name, bold (`bubbly-reference`). */
  private namesHtml(start: number, end: number, names: SP.BubblyPillName[]): string {
    let html = ""
    let at = start
    for (const each of names.filter((name) => name.start >= start && name.end <= end)) {
      html += `${escape(this.text.slice(at, each.start))}<span class="${BubblyHtml.classesFor("reference")}">`
      html += `${escape(this.text.slice(each.start, each.end))}</span>`
      at = each.end
    }
    return html + escape(this.text.slice(at, end))
  }

  /** ` bubbly-starts-input` / ` bubbly-ends-input`:  a band whose first or last thing is a white pill. */
  private endsOf(head: SP.BubblyLine): string {
    const pieces = head.pieces.filter((piece) => this.text.slice(piece.start, piece.end).trim())
    const isPill = (piece: SP.BubblyPiece | undefined) => piece?.kind === "input" || piece?.kind === "choice"
    return (isPill(pieces[0]) ? " bubbly-starts-input" : "") + (isPill(pieces.at(-1)) ? " bubbly-ends-input" : "")
  }

  /** A declaration's section id:  its prefix, then its name (its first quoted words, else its line), unique. */
  private idFor(block: SP.BubblyBlock): string {
    const { idPrefix, ids } = this.sections!
    const line = this.text.slice(block.head.start, block.head.end)
    const name = /"([^"]+)"/.exec(line)?.[1] ?? line
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "block"
    let id = `${idPrefix}-${slug}`
    for (let count = 2; ids.has(id); count++) id = `${idPrefix}-${slug}-${count}`
    ids.add(id)
    return id
  }
}

/** The deepest indent the sheet draws, `bubbly-indent-4`. */
const MAX_INDENT = 4

/** A quoted input's marks:  the file's own `"`, kept for copying, its curly mark drawn by the sheet. */
const QUOTE_OPEN = `<span class="bubbly-quote-mark bubbly-quote-open">"</span>`
const QUOTE_CLOSE = `<span class="bubbly-quote-mark bubbly-quote-close">"</span>`

/**
 * An action's pill with blanks in it, `to "play a card"`:  plain, not bold as a quoted name is,
 * but its blanks' kind words, `card` (epic `language` I109).
 */
const WITH_BLANKS = "bubbly-with-blanks"

/** Each piece's classes:  `words` has none;  `heading` and `input` are drawn their own way, around these. */
const PIECE_CLASSES: Record<SP.BubblyPieceKind, string> = {
  words: "",
  heading: "bubbly-heading",
  input: "bubbly-input",
  mark: "bubbly-mark",
  comment: "bubbly-comment",
  "heading-mark": "bubbly-mark",
  reference: "bubbly-reference",
  value: "bubbly-value",
  choice: "bubbly-input bubbly-choice",
  tag: "bubbly-tag"
}

/** A code pill's `{` or `}`:  part of its pill (`BubblyHtml.CODE_BRACE`). */
export function braceHtml(brace: string): string {
  return `<span class="${BubblyHtml.CODE_BRACE}">${brace}</span>`
}

/** `text` safe in HTML. */
function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Is `stretch` inside `piece`, and not all of it:  an action's blank in its pill, or its name, `to play <a card>`? */
function isInside(stretch: SP.BubblyPillName, piece: SP.BubblyPiece): boolean {
  const { start, end } = stretch
  return start >= piece.start && end <= piece.end && end - start < piece.end - piece.start
}
