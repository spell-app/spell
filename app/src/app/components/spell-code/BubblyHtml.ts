import type { SP } from "spell/parser/spell"

/****************
 * ### `BubblyHtml`
 * A `SP.BubblyDrawing` as HTML, in the classes of the bubbly look's ONE sheet, `bubbly.css` beside it.
 * - `<div class="bubbly">`:  each declaration a `bubbly-block` (its head on a band, a gutter, its body, a foot),
 *   or a `bubbly-pill` when it has no body;  each line a `<p class="bubbly-line">`;  a control line's steps in a
 *   `bubbly-bracket`.
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
   * A piece's classes in the sheet, e.g. `bubbly-reference bubbly-use` for a `reference`;  `""` for plain `words`.
   * - Monaco draws its pieces in the same classes (`BubblyMonaco`, epic `language` P50).
   */
  static classesFor(kind: SP.BubblyPieceKind): string {
    return PIECE_CLASSES[kind]
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
      case "bracket":
        return `${this.line(node.head)}<div class="bubbly-bracket">${this.nodes(node.body)}</div>`
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
    const head = this.pieces(block.head)
    const html = block.body.length
      ? `<div class="bubbly-block ${kind}"><p class="bubbly-head${ends}">${head}</p><div class="bubbly-gutter"></div>` +
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
    const body = style === " bubbly-comment" ? escape(this.text.slice(line.start, line.end)) : this.pieces(line)
    return `<p class="bubbly-line${style} bubbly-indent-${Math.min(line.depth, MAX_INDENT)}">${body}</p>`
  }

  /** A line's pieces as HTML. */
  private pieces(line: SP.BubblyLine): string {
    return line.pieces.map((piece) => this.piece(piece)).join("")
  }

  /** One piece as HTML. */
  private piece(piece: SP.BubblyPiece): string {
    const words = this.text.slice(piece.start, piece.end)
    switch (piece.kind) {
      case "words":
        return escape(words)
      case "heading": {
        // its `#`s faint, its words bold
        const marks = /^#+/.exec(words)?.[0] ?? ""
        return `<span class="bubbly-mark">${marks}</span>${escape(words.slice(marks.length))}`
      }
      case "input":
        return /^".*"$/s.test(words) && words.length > 1
          ? `<span class="bubbly-quoted"><span class="bubbly-input">${QUOTE_OPEN}${escape(words.slice(1, -1))}${QUOTE_CLOSE}</span></span>`
          : `<span class="bubbly-input">${escape(words)}</span>`
      default:
        return `<span class="${BubblyHtml.classesFor(piece.kind)}">${escape(words)}</span>`
    }
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

/** Each piece's classes:  `words` has none;  `heading` and `input` are drawn their own way, around these. */
const PIECE_CLASSES: Record<SP.BubblyPieceKind, string> = {
  words: "",
  heading: "bubbly-heading",
  input: "bubbly-input",
  mark: "bubbly-mark",
  comment: "bubbly-comment",
  "heading-mark": "bubbly-mark",
  reference: "bubbly-reference bubbly-use",
  "first-mention": "bubbly-reference bubbly-first-mention",
  constant: "bubbly-reference bubbly-use bubbly-constant",
  value: "bubbly-value",
  choice: "bubbly-input bubbly-choice",
  phrase: "bubbly-phrase",
  quantity: "bubbly-quantity",
  tag: "bubbly-tag"
}

/** `text` safe in HTML. */
function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
