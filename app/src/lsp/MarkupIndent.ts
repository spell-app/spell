import type { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/****************
 * ### `MarkupIndent`
 * How a drawing's markup is indented as a TREE:  a tag's children one level under it, its closing tag back at its level.
 * - The ONE set of rules, for a paste (the app's `SpellTyping`, epic `editor` I53, I59)
 *   and for Format Document (`SpellLanguageService.formatting()`, epic `editor` T71).
 * - An if-chain's next branch, `<otherwise>`, back at its `<if>`'s level:  one closer ends the chain
 *   (`P.Tokenizer.chainTags`).
 * - Some lines keep where they are, moved only as far as the line above them moved:
 *   - a tag's attributes on lines of their own, under its first line (lined up as written, epic `editor` I142)
 *   - a `{...}` running over lines
 *   - a raw-text tag's contents, `<css>`, `<markdown>` ...:  their indent is theirs (`P.Tokenizer.rawTextTags`)
 * - Pure text, no parse:  so a paste, which may not parse yet, is laid out too.
 *   Format Document checks with the parser that nothing reads differently.
 * - STATIC and instance-free on purpose, as `CompletionShapes` is.
 ****************/
export class MarkupIndent {
  /**
   * `lines`, the first a drawing's first line from its first tag, laid out as a tree under it.
   * - The first line comes back as it is:  the caller places it.
   * - Each other line at `base` plus a `tabSize` per tag open above it, written by `indentOfWidth()`;
   *   a blank line `""`.
   * - A line that keeps where it is (see the class) moves as far as the line above it moved.
   */
  static layout(lines: readonly string[], options: MarkupLayoutOptions): string[] {
    const { base, tabSize, indentOfWidth, tokenizer } = options
    const scan = new MarkupScan(tokenizer ?? SP.spellParser.tokenizer)
    const [first = ""] = lines
    scan.read(first)
    let moved = options.firstMoved ?? base - MarkupIndent.widthOf(indentOfLine(first), tabSize)
    return [
      first,
      ...lines.slice(1).map((line) => {
        const trimmed = line.trim()
        if (!trimmed) return ""
        const indent = indentOfLine(line)
        if (scan.keepsIndent) {
          scan.read(trimmed)
          return MarkupIndent.moved(indent, moved, options) + trimmed
        }
        const isBack = trimmed.startsWith("</") || scan.isBranch(trimmed, 0)
        const width = base + Math.max(0, isBack ? scan.depth - 1 : scan.depth) * tabSize
        moved = width - MarkupIndent.widthOf(indent, tabSize)
        scan.read(trimmed)
        return indentOfWidth(width) + trimmed
      })
    ]
  }

  /**
   * `indent` moved `by` columns, as written:  a level's tabs added or taken off its start, its spaces kept,
   * so attributes lined up under a tag's first one stay lined up (epic `editor` I142).
   * - Rewritten by `indentOfWidth()` when that can't be done:  a move of part of a level, or more tabs than it has.
   */
  private static moved(indent: string, by: number, { tabSize, indentOfWidth }: MarkupLayoutOptions): string {
    const levels = by / tabSize
    if (Number.isInteger(levels)) {
      if (levels >= 0) return "\t".repeat(levels) + indent
      if (indent.startsWith("\t".repeat(-levels))) return indent.slice(-levels)
    }
    return indentOfWidth(Math.max(0, MarkupIndent.widthOf(indent, tabSize) + by))
  }

  /** How wide `indent` is, a tab `tabSize` columns. */
  static widthOf(indent: string, tabSize: number): number {
    let width = 0
    for (const char of indent) width += char === "\t" ? tabSize - (width % tabSize) : 1
    return width
  }

  /** How many tags `line` leaves open:  each opened adds one, each closed takes one;  `<x />` neither. */
  static depthChange(line: string, tokenizer: MarkupTokenizer = SP.spellParser.tokenizer): number {
    const scan = new MarkupScan(tokenizer)
    scan.read(line)
    return scan.depth
  }
}

/** How `MarkupIndent.layout()` writes the lines. */
export type MarkupLayoutOptions = {
  /** Width, in columns, of the first line's level:  its children go a level in from it. */
  base: number
  /** Columns a tab, and a level, takes. */
  tabSize: number
  /** The indent for `width` columns, e.g. tabs, or spaces. */
  indentOfWidth: (width: number) => string
  /**
   * Columns the first line moved, for the lines under it that keep where they are;
   * default `base` less its own indent's width.
   */
  firstMoved?: number
  /** Whose raw-text tags and if-chain words;  default spell's. */
  tokenizer?: MarkupTokenizer
}

/** What `MarkupIndent` reads of a tokenizer:  the tags whose contents are raw text, and the if-chain's words. */
export type MarkupTokenizer = Pick<P.Tokenizer, "rawTextTags" | "chainTags">

/**
 * Where reading markup has got to, line by line:  how many tags are open, and whether the next line starts inside
 * a tag, a `{...}`, quotes or a raw-text tag's contents.
 * - Only `"` quotes, as spell's tokenizer:  a `'` is an apostrophe, `Spell's`, `<if it's done>`.
 * - No void tags:  `<link>` is Spell UI's, and holds its text;  `<br />` closes itself.
 */
class MarkupScan {
  /** tags open */
  depth = 0
  /** the tag being read, its `<` read but not its `>`:  what its `>` does to `depth` */
  private tag: { name: string; opens: -1 | 0 | 1 } | undefined
  /** inside a `"..."` */
  private isQuoted = false
  /** `{` not closed yet */
  private braces = 0
  /** the raw-text tag whose contents are being read, `css` */
  private raw: string | undefined
  /** the if-chain's words, longest first, so `otherwise if` is found before `otherwise` */
  private readonly chainWords: string[]

  constructor(readonly tokenizer: MarkupTokenizer) {
    this.chainWords = Object.keys(tokenizer.chainTags).sort((one, other) => other.length - one.length)
  }

  /** Does the next line start where its indent is its own:  in a tag, a `{...}`, quotes or raw text? */
  get keepsIndent(): boolean {
    return !!(this.tag || this.braces || this.isQuoted || this.raw)
  }

  /** Does an if-chain's next branch start at `at` of `line`:  `<otherwise>`, `<otherwise if ...>`? */
  isBranch(line: string, at: number): boolean {
    const word = this.chainWordAt(line, at)
    return !!word && this.tokenizer.chainTags[word] !== "if"
  }

  /** Read `line`, a line of markup. */
  read(line: string): void {
    for (let at = 0; at < line.length; at++) {
      const char = line[at]!
      if (this.isQuoted) {
        if (char === '"') this.isQuoted = false
      } else if (this.raw) {
        // `</>` ends it only at the line's end, as the tokenizer reads it (`matchRawJSXChildren()`)
        if (line.startsWith(`</${this.raw}>`, at) || (line.startsWith("</>", at) && !line.slice(at + 3).trim())) {
          this.raw = undefined
          at = this.startTag(line, at)
        }
      } else if (this.braces) {
        if (char === '"') this.isQuoted = true
        else if (char === "{") this.braces++
        else if (char === "}") this.braces--
      } else if (this.tag) {
        if (char === '"') this.isQuoted = true
        else if (char === "{") this.braces++
        else if (char === ">") this.endTag(line[at - 1] === "/")
      } else if (char === "<") at = this.startTag(line, at)
      else if (char === "{") this.braces++
    }
  }

  /** A `<` at `at`:  a tag starts if a name, `/` or `>` follows;  where reading goes on. */
  private startTag(line: string, at: number): number {
    const chainWord = this.chainWordAt(line, at)
    if (chainWord) {
      this.tag = { name: chainWord, opens: this.tokenizer.chainTags[chainWord] === "if" ? 1 : 0 }
      return at + chainWord.length
    }
    const name = /^<(\/?)([\p{L}][\p{L}\p{M}\d_.:-]*)?/u.exec(line.slice(at))!
    const isClosing = !!name[1]
    if (!name[2] && !isClosing && line[at + 1] !== ">") return at
    this.tag = { name: name[2] ?? "", opens: isClosing ? -1 : 1 }
    return at + name[0].length - 1
  }

  /** The tag's `>`:  one more open, one fewer, or neither for `<x />` and a chain's next branch. */
  private endTag(isSelfClosing: boolean): void {
    const { name, opens } = this.tag!
    this.tag = undefined
    if (opens === -1) this.depth--
    else if (opens === 1 && !isSelfClosing) {
      this.depth++
      if (this.tokenizer.rawTextTags.includes(name)) this.raw = name
    }
  }

  /** The if-chain word a tag at `at` of `line` starts with, `otherwise if` in `<otherwise if x>`, if any. */
  private chainWordAt(line: string, at: number): string | undefined {
    if (line[at] !== "<") return undefined
    const after = (word: string) => line[at + 1 + word.length] ?? ""
    return this.chainWords.find((word) => line.startsWith(word, at + 1) && /^[\s>]/.test(after(word)))
  }
}

/** `line`'s indent. */
function indentOfLine(line: string): string {
  return /^[ \t]*/.exec(line)![0]
}
