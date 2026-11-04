import type { MarkdownPlace } from "./UIMarkdown.types"

/****************
 * ### `MarkdownFormats`
 * The formats `<ui-markdown editable>`'s box puts on its text (epic `epic-engine` P61), as markdown marks:
 * bold `**`, italic `*`, strikethrough `~~`, a link `[text](address)`;  and a piece's SHAPE, which its line starts
 * with:  a paragraph, a heading (`## `), a bulleted or numbered item (`- `, `1. `).
 * - Each format works on the box's text and its selection (`Edit`), and answers the new text and selection.
 * - `runsOf()`:  the text cut into runs, each mark or styled word, for the box's faded-marks view.
 * - `markdownOf()`:  a formatted view's DOM written back as markdown.
 * - Pure but `markdownOf()` (a DOM walk), so its tests need no element.
 ****************/
export class MarkdownFormats {
  ////////////////
  // ## Marks
  ////////////////

  /**
   * `mark` put around the selection, or taken off when it's there already.
   * - No selection:  the word at the cursor;  between words, an empty pair with the cursor in it.
   * - A single `*` (italic) never counts one of bold's `**` as its own.
   */
  static toggle(edit: Edit, mark: WrapMark): Edit {
    const { text } = edit
    let { start, end } = edit.start === edit.end ? MarkdownFormats.wordAt(edit) : edit
    if (start === end) {
      return {
        text: text.slice(0, start) + mark + mark + text.slice(end),
        start: start + mark.length,
        end: start + mark.length
      }
    }
    const length = mark.length
    const isWrapped = (from: number, to: number) =>
      text.slice(from - length, from) === mark &&
      text.slice(to, to + length) === mark &&
      (mark !== "*" ||
        (text[from - length - 1] !== "*" && text[to + length] !== "*") ||
        MarkdownFormats.isTriple(text, from, to))
    if (isWrapped(start, end)) {
      return {
        text: text.slice(0, start - length) + text.slice(start, end) + text.slice(end + length),
        start: start - length,
        end: end - length
      }
    }
    const inner = text.slice(start, end)
    if (inner.length > 2 * length && inner.startsWith(mark) && inner.endsWith(mark)) {
      const unwrapped = inner.slice(length, -length)
      return { text: text.slice(0, start) + unwrapped + text.slice(end), start, end: start + unwrapped.length }
    }
    // marks never sit against the space around a selection:  `** bold**` isn't bold
    while (start < end && /\s/.test(text[start]!)) start++
    while (end > start && /\s/.test(text[end - 1]!)) end--
    const wrapped = mark + text.slice(start, end) + mark
    return { text: text.slice(0, start) + wrapped + text.slice(end), start: start + length, end: end + length }
  }

  /**
   * The selection as a link to `address`;  inside a link, its address changed, or (`address` empty) the link taken
   * off, its text kept.
   * - No selection outside a link:  the address as its own text.
   */
  static link(edit: Edit, address: string): Edit {
    const { text } = edit
    const link = MarkdownFormats.linkAt(text, edit.start)
    if (link) {
      const replaced = address ? `[${link.words}](${address})` : link.words
      const start = link.start + (address ? 1 : 0)
      return {
        text: text.slice(0, link.start) + replaced + text.slice(link.end),
        start,
        end: start + link.words.length
      }
    }
    if (!address) return edit
    const words = text.slice(edit.start, edit.end) || address
    const linked = `[${words}](${address})`
    return {
      text: text.slice(0, edit.start) + linked + text.slice(edit.end),
      start: edit.start + 1,
      end: edit.start + 1 + words.length
    }
  }

  /** The link at `offset` in `text`:  where it starts and ends, its words and its address;  `undefined` for none. */
  static linkAt(text: string, offset: number): FoundLink | undefined {
    for (const match of text.matchAll(LINK)) {
      const start = match.index
      const end = start + match[0].length
      if (offset >= start && offset <= end) return { start, end, words: match[1]!, address: match[2]! }
    }
    return undefined
  }

  /** The selection (or, with none, all the text) without its marks:  bold, italic, strikethrough, links. */
  static clear(edit: Edit): Edit {
    const whole = edit.start === edit.end
    const start = whole ? 0 : edit.start
    const end = whole ? edit.text.length : edit.end
    let part = edit.text.slice(start, end)
    part = part.replace(LINK, "$1").replace(STRONG, "$1").replace(STRUCK, "$1").replace(EMPHASIS, "$1")
    // the marks just outside the selection, when it's exactly a marked run's words
    const text = edit.text.slice(0, start) + part + edit.text.slice(end)
    let cleared: Edit = { text, start, end: start + part.length }
    for (const mark of WRAP_MARKS) {
      const inside = cleared.text.slice(cleared.start - mark.length, cleared.start) === mark
      if (!whole && inside && cleared.text.slice(cleared.end, cleared.end + mark.length) === mark)
        cleared = MarkdownFormats.toggle(cleared, mark)
    }
    return cleared
  }

  /** Which formats the cursor at `offset` is in:  the box's buttons show them pressed. */
  static formatsAt(text: string, offset: number): Set<Format> {
    const formats = new Set<Format>()
    const inside = (pattern: RegExp, format: Format) => {
      for (const match of text.matchAll(pattern)) {
        if (offset > match.index && offset < match.index + match[0].length) formats.add(format)
      }
    }
    inside(STRONG, "bold")
    inside(EMPHASIS, "italic")
    inside(STRUCK, "strikethrough")
    inside(LINK, "link")
    return formats
  }

  ////////////////
  // ## Shapes
  ////////////////

  /**
   * The shape the piece at `place` has, from what its line starts with in `text`:  `h2` for `## `, `bullet` for `- `.
   * - A table cell has none:  `undefined`.
   */
  static shapeOf(text: string, place: MarkdownPlace): Shape | undefined {
    if (place.kind === "cell") return undefined
    const lead = text.slice(text.lastIndexOf("\n", place.start - 1) + 1, place.start)
    const heading = /^ {0,3}(#{1,6})[ \t]/.exec(lead)
    if (heading) return `h${heading[1]!.length}` as Shape
    if (/^\s*\d{1,9}[.)][ \t]/.test(lead)) return "numbered"
    if (/^\s*[*+-][ \t]/.test(lead)) return "bullet"
    return "paragraph"
  }

  /**
   * `text` with the piece at `place` given `raw` as its words and `shape` as its shape:  its line's lead rewritten
   * (`## `, `- `), the indent before it kept.
   * - A heading is one line:  line ends in `raw` become spaces.
   * - Returns the new text, and where the piece's words now start and end in it.
   */
  static reshape(
    text: string,
    place: MarkdownPlace,
    raw: string,
    shape: Shape
  ): { text: string; place: MarkdownPlace } {
    const lineStart = text.lastIndexOf("\n", place.start - 1) + 1
    const indent = /^\s*/.exec(text.slice(lineStart, place.start))![0]
    const words = shape.startsWith("h") ? raw.replace(/\s*\n\s*/g, " ").trim() : raw.replace(/\s+$/, "")
    const lead = indent + SHAPE_LEADS[shape]
    const next = text.slice(0, lineStart) + lead + words + text.slice(place.end)
    const kind = shape === "paragraph" ? "paragraph" : shape.startsWith("h") ? "heading" : "item"
    const start = lineStart + lead.length
    return { text: next, place: { kind, start, end: start + words.length } }
  }

  ////////////////
  // ## Views
  ////////////////

  /**
   * `text` cut into runs, for the faded-marks view:  each mark its own run (`mark`), the words between marks
   * styled as the marks around them say.
   * - Runs join back into `text`, character for character.
   */
  static runsOf(text: string): Run[] {
    const runs: Run[] = []
    MarkdownFormats.cut(text, [], runs)
    return runs
  }

  /**
   * A formatted view's content written back as markdown:  `<strong>` / `<b>` as `**`, `<em>` / `<i>` as `*`,
   * `<del>` / `<s>` / `<strike>` as `~~`, `<a href>` as a link, `<code>` in backticks, `<br>` a line end.
   * - Any other element:  its text.  A `*` or `\` in text is escaped, so it stays text.
   */
  static markdownOf(node: Node): string {
    let out = ""
    for (const child of node.childNodes) {
      if (child.nodeType === TEXT_NODE) {
        out += (child.textContent ?? "").replace(/[\\*]/g, "\\$&")
        continue
      }
      if (child.nodeType !== ELEMENT_NODE) continue
      const element = child as Element
      const inner = MarkdownFormats.markdownOf(element)
      const name = element.localName
      if (name === "br") out += "\n"
      else if (name === "code") out += `\`${element.textContent ?? ""}\``
      else if (name === "a") out += `[${inner}](${element.getAttribute("href") ?? ""})`
      else if (HTML_MARKS[name] && inner.trim()) out += HTML_MARKS[name] + inner + HTML_MARKS[name]
      else out += inner
    }
    return out
  }

  ////////////////
  // ## Helpers:  static, as they're pure
  ////////////////

  /** The word around `edit`'s cursor:  letters, digits and marks' insides;  the cursor itself between words. */
  private static wordAt({ text, start }: Edit): { start: number; end: number } {
    let from = start
    let to = start
    while (from > 0 && WORD_CHAR.test(text[from - 1]!)) from--
    while (to < text.length && WORD_CHAR.test(text[to]!)) to++
    return { start: from, end: to }
  }

  /** `***x***`:  bold and italic both, so a `*` beside the selection's `**` is italic's. */
  private static isTriple(text: string, from: number, to: number): boolean {
    return text.slice(from - 3, from) === "***" && text.slice(to, to + 3) === "***"
  }

  /** Cut `text` into `runs`, inside the formats `within`:  the first marked span found, then what's around it. */
  private static cut(text: string, within: Format[], runs: Run[]) {
    let earliest: { match: RegExpExecArray; format: Format; mark: string } | undefined
    for (const [pattern, format, mark] of RUN_PATTERNS) {
      pattern.lastIndex = 0
      const match = pattern.exec(text)
      if (match && (!earliest || match.index < earliest.match.index)) earliest = { match, format, mark }
    }
    if (!earliest) {
      if (text) runs.push({ text, formats: within, isMark: false })
      return
    }
    const { match, format, mark } = earliest
    // `**bold *both***`:  the lazy match stops at italic's closing star;  bold's own two come one later
    const singles = match[1]!.match(/(?<!\*)\*(?!\*)/g)?.length ?? 0
    if (format === "bold" && singles % 2 && text[match.index + match[0].length] === "*") {
      match[1] += "*"
      match[0] += "*"
    }
    if (match.index) runs.push({ text: text.slice(0, match.index), formats: within, isMark: false })
    const inner = [...within, format]
    if (format === "link") {
      runs.push({ text: "[", formats: inner, isMark: true })
      MarkdownFormats.cut(match[1]!, inner, runs)
      runs.push({ text: `](${match[2]})`, formats: inner, isMark: true })
    } else {
      runs.push({ text: mark, formats: inner, isMark: true })
      MarkdownFormats.cut(match[1]!, inner, runs)
      runs.push({ text: mark, formats: inner, isMark: true })
    }
    MarkdownFormats.cut(text.slice(match.index + match[0].length), within, runs)
  }
}

/** The box's text and its selection:  offsets into the text. */
export type Edit = {
  /** the text */
  text: string
  /** where the selection starts */
  start: number
  /** where it ends:  `start` for a bare cursor */
  end: number
}

/** A mark put around words. */
export type WrapMark = "**" | "*" | "~~"

/** A format the box's buttons put on, and show pressed. */
export type Format = "bold" | "italic" | "strikethrough" | "link"

/** A piece's shape:  what its line starts with. */
export type Shape = "paragraph" | "h2" | "h3" | "h4" | "h5" | "h6" | "h1" | "bullet" | "numbered"

/** One run of `runsOf()`. */
export type Run = {
  /** its text */
  text: string
  /** the formats it's inside */
  formats: Format[]
  /** a mark (`**`, a link's brackets and address), drawn faint */
  isMark: boolean
}

/** A link in the text:  `linkAt()`. */
export type FoundLink = { start: number; end: number; words: string; address: string }

/** Each wrapping mark, longest first. */
const WRAP_MARKS: WrapMark[] = ["**", "~~", "*"]

/** What each shape's line starts with. */
const SHAPE_LEADS: Record<Shape, string> = {
  paragraph: "",
  h1: "# ",
  h2: "## ",
  h3: "### ",
  h4: "#### ",
  h5: "##### ",
  h6: "###### ",
  bullet: "- ",
  numbered: "1. "
}

/** A link:  its words, its address. */
const LINK = /\[([^\]\n]*)\]\(([^)\s]*)\)/g

/** Bold:  its words. */
const STRONG = /\*\*(?=\S)([^\n]*?\S)\*\*/g

/** Strikethrough:  its words. */
const STRUCK = /~~(?=\S)([^\n]*?\S)~~/g

/** Italic:  its words, a single `*` (never one of bold's). */
const EMPHASIS = /(?<!\*)\*(?=[^\s*])([^\n*]*?[^\s*])\*/g

/** Each run's pattern, its format and its mark, for `runsOf()`. */
const RUN_PATTERNS: [RegExp, Format, string][] = [
  [new RegExp(LINK.source, "g"), "link", ""],
  [new RegExp(STRONG.source, "g"), "bold", "**"],
  [new RegExp(STRUCK.source, "g"), "strikethrough", "~~"],
  [new RegExp(EMPHASIS.source, "g"), "italic", "*"]
]

/** The marks an element of a formatted view is written back with. */
const HTML_MARKS: Record<string, string> = { strong: "**", b: "**", em: "*", i: "*", del: "~~", s: "~~", strike: "~~" }

/** A character of a word, for a bare cursor's word. */
const WORD_CHAR = /[\p{L}\p{N}_'’-]/u

/** `Node.TEXT_NODE`, without the DOM's globals (node runs this file's tests too). */
const TEXT_NODE = 3

/** `Node.ELEMENT_NODE`. */
const ELEMENT_NODE = 1
