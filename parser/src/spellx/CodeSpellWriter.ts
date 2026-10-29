import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * The CODE SPELL a `.spellml` file means, as text (epic `elemental-spell` P8, Q70):
 * `CodeSpellWriter.write(text)` => the `.spell` text it reads as, for people to look at ("Show as .spell").
 * - Written line by line from each tag's TWIN, the very line spell's rules parse it as (`SP.SpellxTwin`):
 *   - a template's tag:  its twin, `a "flip tile" is a view :`
 *   - a member's:  its twin, bulleted and one tab in, `- its "side" is one of up, down`
 *   - a body's tags (notes, controls):  their twins, as written there
 *   - every other line (a body's spell, a drawing's markup):  as written
 *   - a description:  its comment lines just above its twin, the docstring code spell writes;  prose:  comments
 *   - closers:  nothing, as code spell's indentation already says where a body ends
 * - Not a step in the compile:  a `.spellml` file compiles from its own parse (Q70);
 *   this is what it MEANS, in the form people already read.
 * - A drawing's markup as code spell writes it:  a bare component name as its tag (`<text>` => `<ui-text>`, through
 *   `componentTag`), each `</>` naming what it closes.
 * - Pure:  no scope, no rules;  only the language's spellx tokenizer and twin words.
 * - Above `spell/parser/spell` in the import graph, as the rest of `SX`.
 */
export class CodeSpellWriter {
  /**
   * The code spell `text`, a `.spellml` file, reads as.
   * - `options.path`:  the file's path, which says its language (`Carta.es.spellml` is Spanish)
   * - `options.language`:  its language, over what its path says
   * - NEVER throws on a file:  a line spellx can't read is written as it is.
   */
  static write(text: string, options: CodeSpellWriteOptions = {}): string {
    const language = options.language ?? SP.Language.forFile(options.path)
    const parser = language.parser.clone({ module: "code spell writer", form: "spellx" } as P.ParserProps)
    const componentTag =
      options.componentTag ?? ((word: string) => SP.ComponentPacks.tagFor(word, language.lang, options.packs))
    // the language's example word is a block of Spell's own too (`<example>`, `<ejemplo>`):  never `<ui-example>`
    const blocks = new Set([...SPELL_BLOCK_TAGS, language.words.exampleTag])
    const writer = new CodeSpellWriter(parser as SP.SpellParser, text, componentTag, blocks)
    const { tokenizer } = writer.parser
    const [root] = tokenizer.breakIntoIndentedBlocks(tokenizer.tokenize(text))
    writer.writeItems(root?.tokens ?? [], 0, "file")
    while (writer.lines.at(-1) === "") writer.lines.pop()
    return `${writer.lines.join("\n")}\n`
  }

  /**
   * The code spell `markup` reads as, markup alone:  a drawing's, an example's body (epic `elemental-spell` P18).
   * - `<card>`, `<avatar src="..."/>` => `<ui-card>`, `<ui-avatar src="..."/>`, each `</>` naming what it closes,
   *   prose as `<markdown>` blocks:  what the same markup in a notebook's drawing is written as.
   * - Written as a notebook's drawing would be, then taken back out of it:  `markup`'s own lines, at its own indent.
   * - `options.componentTag`'s `start` is where the element starts in `markup`.
   * - NEVER throws:  markup spellx can't read is written as it is.
   */
  static writeMarkup(markup: string, options: CodeSpellWriteOptions = {}): string {
    const language = options.language ?? SP.Language.forFile(options.path)
    const { prefix, templates } = language.words.spellx!
    const notebook = Object.keys(templates).find((word) => templates[word] === "notebook")
    const head = `<${prefix}-${notebook} "markup">\n`
    const lines = markup.split("\n")
    // where each of `markup`'s lines starts, in it and in the notebook it's written in (one tab further in)
    const starts: Array<{ markup: number; written: number }> = []
    let at = 0
    for (const line of lines) {
      starts.push({ markup: at, written: head.length + at + starts.length + 1 })
      at += line.length + 1
    }
    const markupStart = (start: number) => {
      const line = starts.filter((each) => each.written <= start).at(-1) ?? starts[0]!
      return line.markup + start - line.written
    }
    const componentTag = options.componentTag
    const written = CodeSpellWriter.write(
      `${head}${lines.map((line) => `\t${line}`).join("\n")}\n</${prefix}-${notebook}>\n`,
      {
        ...options,
        language,
        componentTag: componentTag && ((word, start) => componentTag(word, markupStart(start)))
      }
    )
    // its drawing's lines:  after the notebook's line and its `to draw its content:`, before its `start` line
    const drawing = written.split("\n").slice(2)
    const end = drawing.findIndex((line) => line && !line.startsWith("\t"))
    return drawing
      .slice(0, end < 0 ? undefined : end)
      .map((line) => line.replace(/^\t\t/, ""))
      .join("\n")
      .trimEnd()
  }

  /** The lines written so far. */
  private readonly lines: string[] = []

  private constructor(
    readonly parser: SP.SpellParser,
    /** the file's text */
    readonly text: string,
    /** the tag a bare component name stands for, if any */
    readonly componentTag: (word: string, start: number) => string | undefined,
    /** Spell's own block words in a drawing, written as they are (`SPELL_BLOCK_TAGS`, the language's example word) */
    readonly blocks: ReadonlySet<string>
  ) {}

  /** Write `items`, a block's lines and blocks, `depth` tabs in;  `where` says whether a tag there is bulleted. */
  private writeItems(items: P.Token[], depth: number, where: "file" | "template" | "body") {
    const indent = "\t".repeat(depth)
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      if (item instanceof P.BlockToken) {
        this.writeItems(item.tokens, depth + 1, where === "file" ? "template" : "body")
        continue
      }
      if (!(item instanceof P.LineToken)) continue
      const twin = SP.SpellxTwin.lineOf(item, items[index + 1], this.parser)
      if (!twin) {
        this.writeLine(item.tokens, indent)
        continue
      }
      if (twin.takesNextItem || twin.swallowsNextItem) index++
      if (twin.skipped) {
        // a tag with no twin yet (`<menu>`):  kept, as a comment, so nothing it says is lost
        this.lines.push(`${indent}// ${CodeSpellWriter.textOf(item.tokens)}`)
        continue
      }
      this.writeLine(twin.line.tokens, indent, where === "template" ? "- " : "")
      // a template's body is its members;  any other tag's, its body
      if (twin.body) this.writeItems(twin.body.tokens, depth + 1, where === "file" ? "template" : "body")
    }
  }

  /** Write a line of `tokens`, `indent` in:  its trailing comments first, a line each, then the rest after `bullet`. */
  private writeLine(tokens: P.Token[], indent: string, bullet = "") {
    const code = tokens.filter((token) => !(token instanceof SP.SpellxCloserToken))
    let end = code.length
    while (end > 0 && isCommentLike(code[end - 1])) end--
    const comments = code.slice(end) as P.CommentToken[]
    // a line of prose, or a note's:  a comment;  a line of a `<!-- ... -->` comment:  a `//` line, empty or not
    if (end === 0) {
      for (const comment of comments)
        this.lines.push(
          comment.value || comment instanceof SP.SpellxCommentToken ? lineComment(indent, comment.value) : ""
        )
      if (!tokens.length) this.lines.push("")
      return
    }
    for (const comment of comments) this.lines.push(`${indent}// ${comment.value}`)
    const written = code.slice(0, end)
    // a notebook's drawing (P16):  each element, or block of prose, on lines of its own
    const [only] = written
    if (written.length === 1 && only instanceof P.JSXFragmentToken && only.record.isImplicit && !only.raw) {
      for (const child of only.children ?? []) this.writeMarkup(child, indent)
      return
    }
    // markup after the twin's words, an inline drawing:  `to draw it : <button ...>`
    const firstMarkup = written.findIndex((token) => token instanceof P.JSXToken)
    const words = firstMarkup > 0 ? `${CodeSpellWriter.textOf(written.slice(0, firstMarkup))} ` : ""
    const markup = this.markupOf(firstMarkup > 0 ? written.slice(firstMarkup) : written, indent)
    this.lines.push(
      `${indent}${bullet}${markup !== undefined ? CodeSpellWriter.colonOf(words) + markup : CodeSpellWriter.colonOf(CodeSpellWriter.textOf(written))}`
    )
  }

  /**
   * One of a notebook drawing's items, `indent` in:  an element as code spell writes it, or a run of its prose as the
   * `<markdown>` block it reads as, its lines one tab further in.
   */
  private writeMarkup(token: P.Token, indent: string) {
    if (
      token instanceof P.JSXElementToken &&
      token.tagName === "markdown" &&
      token.raw === `${token.children?.[0]?.value}`
    ) {
      this.lines.push(`${indent}<markdown>`)
      for (const line of `${token.raw}`.split("\n")) this.lines.push(line ? `${indent}\t${line}` : "")
      this.lines.push(`${indent}</markdown>`)
      return
    }
    const markup = this.markupOf([token], indent)
    if (markup !== undefined) this.lines.push(`${indent}${markup}`)
  }

  /**
   * A line holding markup, as code spell writes it:  each bare component name as its tag, each `</>` naming what it
   * closes -- `<text>back</>` => `<ui-text>back</ui-text>`.  `undefined` for a line with none.
   * - From the file's text, edited where a name is:  an element's token holds its children, on any number of lines.
   */
  private markupOf(tokens: P.Token[], indent = ""): string | undefined {
    if (!tokens.some((token) => token instanceof P.JSXToken)) return undefined
    const from = tokens[0]!.start
    const edits: Array<{ start: number; end: number; text: string }> = []
    P.Tokenizer.forEachToken(tokens, (token) => {
      const comment = token instanceof P.JSXCommentToken ? this.commentLines(token) : undefined
      if (comment) edits.push(comment)
      if (!(token instanceof P.JSXElementToken)) return
      const { tagName } = token
      const isComponent = BARE_NAME.test(tagName) && !this.blocks.has(tagName)
      const tag = isComponent ? this.componentTag(tagName, token.start) : undefined
      const name = tag ?? tagName
      // its name just after its `<`:  a token's start can take in the white space before it (`a <text>`)
      const nameAt = this.text.indexOf("<", token.start) + 1
      if (tag) edits.push({ start: nameAt, end: nameAt + tagName.length, text: tag })
      const closer = token.isUnaryTag ? undefined : token.raw?.match(/<\/[^>]*>$/)?.[0]
      if (closer && closer !== `</${name}>`) {
        edits.push({ start: token.end - closer.length, end: token.end, text: `</${name}>` })
      }
    })
    let line = this.text.slice(from, tokens.at(-1)!.end)
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      line = line.slice(0, edit.start - from) + edit.text + line.slice(edit.end - from)
    }
    // its lines after the first at `indent`, as the first is:  its own indent, where it was written, swapped for that
    const lineStart = this.text.lastIndexOf("\n", from - 1) + 1
    const written = /^[ \t]*/.exec(this.text.slice(lineStart, from))![0]
    return line
      .split("\n")
      .map((each, index) => (index && each.startsWith(written) ? indent + each.slice(written.length) : each))
      .join("\n")
      .trimEnd()
  }

  /**
   * A `<!-- ... -->` comment in markup, alone on its lines, as code spell writes it:  a `//` line for each of its lines,
   * at its first line's indent (Owen, 2026-10-26).
   * - `undefined` for one sharing a line with markup, `<text>a <!-- b --> c</text>`:  code spell reads it as written.
   */
  private commentLines(token: P.JSXCommentToken): { start: number; end: number; text: string } | undefined {
    if (token.commentSymbol !== P.HTML_COMMENT_START) return undefined
    const raw = `${token.raw}`
    const start = token.start + raw.length - raw.trimStart().length
    const lineStart = this.text.lastIndexOf("\n", start - 1) + 1
    const indent = this.text.slice(lineStart, start)
    const lineEnd = this.text.indexOf("\n", token.end)
    const after = this.text.slice(token.end, lineEnd < 0 ? undefined : lineEnd)
    if (/\S/.test(indent) || /\S/.test(after)) return undefined
    const inner = this.text
      .slice(start + P.HTML_COMMENT_START.length, token.end)
      .replace(new RegExp(`${P.HTML_COMMENT_END}$`), "")
    const lines = inner.split("\n").map((line, index) => lineComment(index ? indent : "", line.trim()))
    return { start, end: token.end, text: lines.join("\n") }
  }

  /**
   * `line` with its twin's colon written as code spell writes it, against the word before:
   * `to flip it :` => `to flip it:`, `on mouse down : flip it` => `on mouse down: flip it`.
   */
  private static colonOf(line: string): string {
    if (line.endsWith(" :")) return line.slice(0, -2) + ":"
    return line.replace(/^([^"]*?) : /, "$1: ")
  }

  /** `tokens` as text:  each as written, with the space after it;  a line's end trimmed. */
  private static textOf(tokens: P.Token[]): string {
    return tokens
      .map((token) => String(token))
      .join("")
      .trimEnd()
  }
}

/** Is `token` a line's comment, written as one of its own:  prose, or a line of a `<!-- ... -->` comment? */
function isCommentLike(token: P.Token | undefined): boolean {
  return token instanceof SP.SpellxProseToken || token instanceof SP.SpellxCommentToken
}

/** A `//` comment line, `indent` in:  `// text`, or `//` alone. */
function lineComment(indent: string, text: string): string {
  return text ? `${indent}// ${text}` : `${indent}//`
}

/** A component's bare name in spellx markup (`<text>`, `<botón>`):  lowercase letters only, as `SpellJSX` reads it. */
const BARE_NAME = /^\p{Ll}+$/u

/**
 * Spell's own blocks in a drawing, the same words in code spell:  never a pack's component (`<ui-markdown>`).
 * - `<markdown>`:  raw text, drawn as markdown;  `<html>`:  markup as written (P18)
 * - and the language's example word (`<example>`, `ExampleBlock`), added per file:  since epic `ui-gaps` P14 Spell
 *   UI has an `<ui-example>`, which a bare `example` would otherwise name
 */
const SPELL_BLOCK_TAGS: ReadonlySet<string> = new Set(["markdown", "html"])

/** Options for `CodeSpellWriter.write()`. */
export type CodeSpellWriteOptions = {
  /** The file's path, which says its language. */
  path?: string
  /** Its language, over what its path says. */
  language?: SP.Language
  /** The packs its bare component names come from, its project's (`SpellParser.packs`);  default:  Spell UI. */
  packs?: readonly string[]
  /**
   * The tag a bare component name stands for, over the packs':  e.g. the editor's, which reads it off the file's parse,
   * so a project's own views count too (`<card>` => `<solitaire-card>`).
   * - `start`:  where its element starts in the file, to find its match by
   */
  componentTag?: (word: string, start: number) => string | undefined
}
