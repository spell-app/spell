import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { PG } from "spell/parser/page"

/**
 * A page file's CHUNK TREE, built from the tokens spell's own parser reads it as (epic `elemental-spell` J30;
 * epic `language` P47):  `PageView.read(text)` => `PG.PageFile`.
 * - A page is read by spell's tokenizer and rules (`SP.PageTokenizer`, `SP.PageTwin`).
 * - This view is what the file SAYS, for the notebook editor and agents:
 *   its pages, their prose, markup and tags, and the plain Spell around them, each with its exact span.
 * - It reads the page TOKENS, not the parse's matches:  a match holds its twin's code-spell tokens, while a page's
 *   head, closers and prose are tokens of their own (`SP.PageTagToken` ...).
 *   - Its diagnostics are what the tokenizer noted on them (`SP.pageErrorOf()`).
 *     What the RULES say is the parsed file's (`SP.SpellFile.errors`).
 * - Pure, and cheap:  no scope, no rules, nothing compiled;  every hole stays raw spell text.
 * - Above `spell/parser/spell` in the import graph:  it uses the language's tokenizer there;  `spell` never imports it.
 */
export class PageView {
  /**
   * The chunk tree of `text`, a page file.
   * - `options.path`:  the file's path, which says its language (`Carta.es.spell` is Spanish)
   * - `options.language`:  its language, over what its path says
   * - NEVER throws on a file:  what's wrong is a diagnostic.
   */
  static read(text: string, options: PageReadOptions = {}): PG.PageFile {
    const language = options.language ?? SP.Language.forFile(options.path)
    const parser = language.parser.clone({ module: "page view", form: "page" } as P.ParserProps) as SP.SpellParser
    const { tokenizer } = parser
    // an `<html>` block stays one, its markup inside it
    if (tokenizer instanceof SP.PageTokenizer) tokenizer.unwrapsHtml = false
    const [root] = tokenizer.breakIntoIndentedBlocks(tokenizer.tokenize(text))
    const view = new PageView(text, tokenizer)
    const nodes = view.nodesOf(root?.tokens ?? [], "file")
    const diagnostics: PG.PageDiagnostic[] = []
    P.Tokenizer.forEachToken(root ? [root] : [], (token) => {
      const message = SP.pageErrorOf(token)
      if (message) diagnostics.push({ severity: "error", message, span: { start: token.start, end: token.end } })
    })
    return new PG.PageFile({ path: options.path, text, language, nodes, diagnostics })
  }

  private constructor(
    readonly text: string,
    /** The tokenizer that read it:  its brace scan finds where a hole closes, as it found the hole. */
    private readonly tokenizer: P.Tokenizer
  ) {}

  ////////////////
  // ## A block's items
  ////////////////

  /**
   * The nodes a block's `items` hold:  its lines, each tag line taking the block after it as its body.
   * - `where`:  what holds them -- the file, a page's body, a tag's, a drawing.
   */
  private nodesOf(items: P.Token[], where: Where): PG.PageNode[] {
    const nodes: PG.PageNode[] = []
    // a run of code lines, or prose lines, still open;  an if-chain, still taking branches
    let code: PG.PageCode | undefined
    let prose: PG.PageProse | undefined
    let choice: PG.PageChoice | undefined
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      if (item instanceof P.BlockToken) {
        // a block with no line before it to own it:  a body starting deeper than its next line, still spell
        prose = undefined
        choice = undefined
        const [line] = item.tokens
        if (!code && line instanceof P.LineToken && line.tokens[0])
          nodes.push(
            (code = { kind: "code", lines: [], span: { start: line.tokens[0].start, end: line.tokens[0].end } })
          )
        if (code) this.addBlockLines(code, item)
        continue
      }
      if (!(item instanceof P.LineToken)) continue
      const next = items[index + 1]
      const body = next instanceof P.BlockToken ? next : undefined
      if (body) index++
      const [first] = item.tokens
      // a blank line:  inside a prose run, part of it;  anything else, nothing
      if (!first) continue
      const isProse = first instanceof SP.PageProseToken || this.isHeading(first, where)
      if (!isProse) prose = undefined
      if (first instanceof SP.PageCloserToken && item.tokens.length === 1) {
        // a closer ends what it closes:  the node before it, or the if-chain still taking branches
        const closed = choice ?? nodes.at(-1)
        if (closed) closed.span = { start: closed.span.start, end: first.end }
        // an if-chain's last branch ends where its closer starts
        const branch = choice?.branches.at(-1)
        if (branch) branch.span = { start: branch.span.start, end: first.start }
        code = undefined
        choice = undefined
        continue
      }
      if (isProse) {
        if (prose) prose.span = { start: prose.span.start, end: first.end }
        else nodes.push((prose = { kind: "prose", text: "", span: { start: first.start, end: first.end } }))
        prose.text = this.dedented(prose.span)
        continue
      }
      if (first instanceof SP.PageTagToken) {
        code = undefined
        const node = this.tagNode(first, item, body, where, choice)
        if (node.kind === "branch") {
          // a branch ends where the next one starts
          const previous = choice!.branches.at(-1)!
          previous.span = { start: previous.span.start, end: node.span.start }
          choice!.branches.push(node)
          choice!.span = { start: choice!.span.start, end: node.span.end }
          continue
        }
        const before = nodes.at(-1)
        if (node.kind === "choice" && node.branches[0]!.type !== "if" && before?.kind === "choice") {
          // an `<otherwise>` after a `</>` that closed its `<if>`:  an error (the tokenizer's), read as ONE chain
          before.branches.push(...node.branches)
          before.span = { start: before.span.start, end: node.span.end }
          choice = before
          continue
        }
        choice = node.kind === "choice" ? node : undefined
        nodes.push(node)
        continue
      }
      choice = undefined
      if (where === "drawing" && this.isHoleLine(item)) {
        // a hole on a line of its own, `{column}`:  what it is, drawn
        code = undefined
        const start = first.start
        nodes.push(...this.holeAt(start, this.closingOf(start, item.tokens.at(-1)!.end) + 1))
        continue
      }
      if ((where === "drawing" || where === "page body") && this.isMarkup(item)) {
        code = undefined
        nodes.push(...this.markupOf(item.tokens))
        continue
      }
      // a line of spell:  with any after it, one code node
      if (!code) nodes.push((code = { kind: "code", lines: [], span: { start: first.start, end: first.end } }))
      this.addCodeLines(code, item, body)
    }
    return nodes
  }

  /** A tag line's node:  a page, a block, an if-chain or its next branch, a loop. */
  private tagNode(
    head: SP.PageTagToken,
    line: P.LineToken,
    body: P.BlockToken | undefined,
    where: Where,
    choice: PG.PageChoice | undefined
  ): PG.PageNode {
    const { tag } = head
    const headSpan = { start: head.start, end: head.end }
    const span = { start: head.start, end: this.endOf(line, body) }
    if (tag.category === "page")
      return {
        kind: "page",
        word: tag.word,
        name: tag.name?.text,
        nameSpan: this.textSpan(tag.name),
        attributes: tag.attributes.map((attribute) => this.attribute(attribute)),
        children: body ? this.nodesOf(body.tokens, "page body") : [],
        headSpan,
        span
      }
    const inner = this.innerOf(line, body, where === "drawing" || where === "page body" ? "drawing" : "body")
    if (tag.category === "code") {
      const type = tag.kind === "html" ? "html" : "code"
      const children = type === "html" ? inner : this.innerOf(line, body, "body")
      return { kind: "block", type, word: tag.word, children, headSpan, span }
    }
    const phrase = tag.phrase?.text
    const phraseSpan = this.textSpan(tag.phrase)
    if (tag.kind === "for each")
      return {
        kind: "loop",
        type: "for each",
        word: tag.word,
        phrase: phrase ?? "",
        phraseSpan: phraseSpan ?? headSpan,
        children: inner,
        headSpan,
        span
      }
    const branch: PG.PageBranch = {
      kind: "branch",
      type: tag.kind as PG.PageBranch["type"],
      word: tag.word,
      phrase,
      phraseSpan,
      children: inner,
      headSpan,
      span
    }
    // `<otherwise ...>` goes on with the open `<if>` (Q53);  an `<if>` starts a chain
    if (tag.kind !== "if" && choice) return branch
    return { kind: "choice", branches: [branch], span }
  }

  /**
   * What's inside a tag:  a body on its own line (`<alias "x">if ...</>`), then its block.
   * - `where`:  `drawing` for a drawing's markup, else a body of spell lines.
   */
  private innerOf(line: P.LineToken, body: P.BlockToken | undefined, where: Where): PG.PageNode[] {
    const rest = line.tokens.slice(1).filter((token) => !(token instanceof SP.PageCloserToken))
    const nodes: PG.PageNode[] = []
    if (rest.length) {
      const start = rest[0]!.start
      const end = rest.at(-1)!.end
      if (where === "drawing" && rest.every((token) => token instanceof P.JSXToken)) nodes.push(...this.markupOf(rest))
      else
        nodes.push({
          kind: "code",
          lines: [{ text: this.text.slice(start, end), indent: 0, span: { start, end } }],
          span: { start, end }
        })
    }
    if (body) nodes.push(...this.nodesOf(body.tokens, where))
    return nodes
  }

  ////////////////
  // ## Code and prose
  ////////////////

  /** Add `line` and its block's lines to `code`, each without the run's indent (Q7). */
  private addCodeLines(code: PG.PageCode, line: P.LineToken, body: P.BlockToken | undefined) {
    const indent = code.lines[0]?.indent ?? this.indentOf(line.tokens[0]!.start)
    const first = line.tokens[0]!
    const lineStart = first.start - this.indentOf(first.start)
    const start = Math.min(lineStart + indent, first.start)
    const end = line.tokens.at(-1)!.end
    code.lines.push({ text: this.text.slice(start, end), indent, span: { start, end } })
    code.span = { start: code.span.start, end }
    if (body) this.addBlockLines(code, body)
    code.span = { start: code.lines[0]!.span.start, end: code.span.end }
  }

  /** Add every line in `block`, however deep, to `code`, each without the run's indent. */
  private addBlockLines(code: PG.PageCode, block: P.BlockToken) {
    for (const each of block.tokens) {
      if (each instanceof P.BlockToken) this.addBlockLines(code, each)
      else if (each instanceof P.LineToken && each.tokens[0]) {
        const first = each.tokens[0]
        const indent = code.lines[0]?.indent ?? this.indentOf(first.start)
        const lineStart = first.start - this.indentOf(first.start)
        const start = Math.min(lineStart + indent, first.start)
        const end = each.tokens.at(-1)!.end
        code.lines.push({ text: this.text.slice(start, end), indent, span: { start, end } })
        code.span = { start: Math.min(code.span.start, start), end }
      }
    }
  }

  /** A prose line in a page, or a comment at the file's top:  `## Try it`, a markdown heading (Q12). */
  private isHeading(token: P.Token, where: Where) {
    return (where === "file" || where === "page body") && token instanceof P.CommentToken
  }

  /** `span`'s text, each line without the indent the first one has. */
  private dedented(span: PG.PageSpan): string {
    const indent = this.indentOf(span.start)
    return this.text
      .slice(span.start, span.end)
      .split("\n")
      .map((line, index) => (index ? line.slice(Math.min(indent, line.length - line.trimStart().length)) : line))
      .join("\n")
  }

  /** How many characters of indent the line at `offset` starts with, before `offset`. */
  private indentOf(offset: number) {
    const lineStart = this.text.lastIndexOf("\n", offset - 1) + 1
    const before = this.text.slice(lineStart, offset)
    return before.length - before.trimStart().length === before.length ? before.length : 0
  }

  /** Where a tag line's node ends, before any closer on a line of its own:  its line's, or its block's end. */
  private endOf(line: P.LineToken, body: P.BlockToken | undefined) {
    const lineEnd = line.tokens.at(-1)!.end
    return body ? Math.max(lineEnd, this.lastEnd(body)) : lineEnd
  }

  /** The end of the last token in `block`, however deep. */
  private lastEnd(block: P.BlockToken): number {
    let end = block.start
    P.Tokenizer.forEachToken([block], (token) => {
      if (!(token instanceof P.BlockToken) && !(token instanceof P.LineToken)) end = Math.max(end, token.end)
    })
    return end
  }

  ////////////////
  // ## Markup
  ////////////////

  /** Is `line` markup:  a drawing's element, `<text ...>`, not a line of spell? */
  private isMarkup(line: P.LineToken) {
    return line.tokens.every((token) => token instanceof P.JSXToken)
  }

  /** Is `line` a hole alone, `{column}`, which spell reads as symbols and words? */
  private isHoleLine(line: P.LineToken) {
    const first = line.tokens[0]!
    const last = line.tokens.at(-1)!
    return this.text[first.start] === "{" && this.closingOf(first.start, last.end) === last.end - 1
  }

  /**
   * Markup `tokens` as elements, text and holes.
   * - An if-chain inside markup, `<text><if ...>a<otherwise>b</></text>`, as a `choice` of its `branch`es, as a
   *   drawing's own `<if>` lines are (epic `elemental-spell`, Owen 2026-10-25).
   */
  private markupOf(tokens: P.Token[]): PG.PageNode[] {
    const nodes: PG.PageNode[] = []
    let choice: PG.PageChoice | undefined
    for (const token of tokens) {
      if (token instanceof P.JSXElementToken && token.chain) {
        const branch = this.branchOf(token)
        if (token.chain !== "if" && choice) {
          choice.branches.push(branch)
          choice.span = { start: choice.span.start, end: branch.span.end }
        } else nodes.push((choice = { kind: "choice", branches: [branch], span: { ...branch.span } }))
        continue
      }
      // a comment, never drawn, is no node (Owen, 2026-10-26):  its text stays where it's written
      if (token instanceof P.JSXCommentToken) continue
      // the indent between branches leaves the chain open;  anything else ends it
      if (!(token instanceof P.JSXTextToken && !`${token.value ?? ""}`.trim())) choice = undefined
      if (token instanceof P.JSXFragmentToken) nodes.push(...this.markupOf(token.children ?? []))
      else if (token instanceof P.JSXElementToken) nodes.push(this.element(token))
      else if (token instanceof P.JSXExpressionToken) nodes.push(...this.hole(token))
      else if (token instanceof P.JSXTextToken) {
        // whitespace with a line break in it is left out, as JSX leaves it
        const text = `${token.value ?? ""}`
        if (!(text.includes("\n") && !text.trim()))
          nodes.push({ kind: "text", text, span: { start: token.start, end: token.end } })
      }
    }
    return nodes
  }

  /** A branch of an if-chain inside markup, `<otherwise if its rank is 1>`, and what it shows. */
  private branchOf(token: P.JSXElementToken): PG.PageBranch {
    const children = (token.children ?? []) as P.Token[]
    const { phrase } = token
    const headEnd = children.length ? children[0]!.start : token.end
    return {
      kind: "branch",
      type: token.chain!,
      word: token.tagName,
      phrase: phrase ? `${phrase.contents}` : undefined,
      phraseSpan: phrase ? { start: phrase.start, end: phrase.end } : undefined,
      children: this.markupOf(children.filter((child) => !(child instanceof P.JSXEndTagToken))),
      headSpan: { start: token.start, end: headEnd },
      span: { start: token.start, end: token.end }
    }
  }

  /** An element:  `<text part="face" color={its color}>`, its attributes and what's inside. */
  private element(token: P.JSXElementToken): PG.PageElement {
    const children = (token.children ?? []) as P.Token[]
    const unary = !!token.isUnaryTag
    // a quoted word's contents are in the head:  `<header "Hardware">`
    const afterHead = children[token.quotedContents?.length ?? 0]
    const headEnd = unary || !afterHead ? token.end : afterHead.start
    return {
      kind: "element",
      name: token.tagName,
      attributes: (token.attributes ?? []).map((attribute) => this.markupAttribute(attribute)),
      children: this.markupOf(children),
      selfClosing: unary,
      headSpan: { start: token.start, end: headEnd },
      span: { start: token.start, end: token.end }
    }
  }

  /**
   * A hole, `{its rank}`:  spell, read where it's drawn.
   * - Text before it that the token took with it, `" "` in `{its rank} {its symbol}`, is a text node first.
   * - It ends where its token does, just past its `}`:  the tokenizer found that, strings skipped.
   */
  private hole(token: P.JSXExpressionToken): PG.PageNode[] {
    const open = this.text.indexOf("{", token.start)
    const start = open < 0 || open >= token.end ? token.start : open
    return this.holeAt(start, token.end, token.start)
  }

  /** The hole from `start`, its `{`, to `end`, past its `}`;  text from `from` before it first, if any. */
  private holeAt(start: number, end: number, from = start): PG.PageNode[] {
    const nodes: PG.PageNode[] = []
    if (start > from) {
      const text = this.text.slice(from, start)
      if (!(text.includes("\n") && !text.trim())) nodes.push({ kind: "text", text, span: { start: from, end: start } })
    }
    const codeSpan = { start: start + 1, end: Math.max(start + 1, end - 1) }
    nodes.push({ kind: "hole", code: this.text.slice(codeSpan.start, codeSpan.end), codeSpan, span: { start, end } })
    return nodes
  }

  /**
   * Where the quote or brace opening at `open` closes, before `limit`.
   * - A brace:  the tokenizer's brace scan (`findMatchingDelimiter()`), braces inside it counted and strings skipped,
   *   so a quoted `}` never closes it, `{its name + "}"}`.
   * - None found:  `limit - 1`.
   */
  private closingOf(open: number, limit: number): number {
    const opener = this.text[open]
    if (opener === "{") return this.tokenizer.findMatchingDelimiter("{", "}", this.text, open, limit) ?? limit - 1
    const close = this.text.indexOf(opener!, open + 1)
    return close < 0 || close >= limit ? limit - 1 : close
  }

  ////////////////
  // ## Attributes and spans
  ////////////////

  /** A page tag's attribute, as the model gives one. */
  private attribute(attribute: SP.PageAttribute): PG.PageAttribute {
    const { value } = attribute
    const valueSpan = this.textSpan(value)
    const opener = valueSpan ? this.text[valueSpan.start - 1] : undefined
    const quote = opener === '"' || opener === "'" || opener === "{" ? opener : undefined
    const end = valueSpan ? valueSpan.end + (quote ? 1 : 0) : attribute.start + attribute.word.length
    return {
      name: attribute.name,
      word: attribute.word,
      value: value?.text,
      quote,
      span: { start: attribute.start, end },
      valueSpan
    }
  }

  /** A markup attribute, `color={its color}`:  its parts read from the file. */
  private markupAttribute(token: P.JSXAttributeToken): PG.PageAttribute {
    const raw = this.text.slice(token.start, token.end)
    const equals = raw.indexOf("=")
    const span = { start: token.start, end: token.end }
    // a bare quoted name, `<example "one counter">` (`P.Tokenizer.quotedNameTags`)
    if (raw.startsWith('"')) {
      const close = this.closingOf(token.start, token.end)
      const valueSpan = { start: token.start + 1, end: Math.max(token.start + 1, close) }
      const value = this.text.slice(valueSpan.start, valueSpan.end)
      return {
        name: token.name,
        word: token.name,
        value,
        quote: '"',
        span: { start: token.start, end: close + 1 },
        valueSpan
      }
    }
    if (equals < 0)
      return { name: token.name, word: token.name, value: undefined, quote: undefined, span, valueSpan: undefined }
    const opener = raw[equals + 1]
    const quote = opener === '"' || opener === "'" || opener === "{" ? opener : undefined
    const open = token.start + equals + 1
    const close = quote ? this.closingOf(open, token.end) : token.end
    const valueStart = quote ? open + 1 : open
    const valueEnd = Math.max(valueStart, close)
    return {
      name: token.name,
      word: token.name,
      value: this.text.slice(valueStart, valueEnd),
      quote,
      span: { start: token.start, end: quote ? close + 1 : close },
      valueSpan: { start: valueStart, end: valueEnd }
    }
  }

  /** Where a tag's text is:  its name, a value, a phrase. */
  private textSpan(text: SP.PageText | undefined): PG.PageSpan | undefined {
    return text ? { start: text.start, end: text.start + text.text.length } : undefined
  }
}

/**
 * What holds a block's items:  the file, a page's body, a tag's body of spell lines, a drawing's markup.
 */
type Where = "file" | "page body" | "body" | "drawing"

/** Options for `PageView.read()`. */
export type PageReadOptions = {
  /** the file's path:  it says its language */
  path?: string
  /** its language, over what its path says */
  language?: SP.Language
}
