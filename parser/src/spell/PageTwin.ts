import { withoutAccents } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * Code spell's TWIN of a page's head, or of a tag its body draws with:  the line it reads as.
 * - A page file is read by spell's own rules:  each tag line is made into its twin's tokens, which `BlockLine`
 *   parses as the code-spell line would.
 *   - `"counter notebook" is a notebook page` reads as `counter notebook is a page :`, its body as
 *     `- to draw it :` and the drawing:  see `drawnPage()`
 *   - `<if it is done>` reads as `if it is done`;  `<for film in its films loading="Wait">` as `for film in its films`,
 *     with `while waiting :` after its body
 * - So a page compiles to exactly what its code-spell twin does:  the same rule parses it, makes the same match,
 *   the same AST.  Nothing is written as text in between.
 * - The twin's words are the language's (`SP.PageTwinWords`);  its other tokens are the file's own,
 *   where they sit:  the page's name, a tag's phrase and attribute values (`SP.PageTagToken`), its body.
 *   - Its own words take the tag's place:  `isSynthetic()`, with no text of their own in the file.
 * - Reads only tokens:  `SP.PageTokenizer` made them, and noted what's wrong (`SP.pageErrorOf()`).
 * - Never a scope:  it's the same whatever has been declared, so a scan before parsing can read it (`skeletonOf()`).
 */
export class PageTwin {
  /**
   * The twin of `line`, if it starts with a page's tag:  its line, and the body it takes.
   * - `next`:  the item after it, its indented block if it has one.
   */
  static of(scope: P.Scope, line: P.LineToken, next: P.Token | undefined): PageTwinLine | undefined {
    if (!SP.isPageTag(line.tokens[0])) return undefined
    const parser = scope.parser as SP.SpellParser | undefined
    return PageTwin.for(SP.Language.of(scope), parser, line, next)
  }

  /**
   * The twin of `line`, read by `parser` (a page parser:  its language's), with no scope:  see `of()`.
   * - For colouring a page a line at a time (the app's `SpellTokensProvider`).
   */
  static lineOf(line: P.LineToken, next: P.Token | undefined, parser: SP.SpellParser): PageTwinLine | undefined {
    return PageTwin.for(parser.language ?? SP.Language.default, parser, line, next)
  }

  /** The twin of `line`, read in `language` by `parser`:  see `of()`. */
  private static for(
    language: SP.Language,
    parser: SP.SpellParser | undefined,
    line: P.LineToken,
    next: P.Token | undefined
  ): PageTwinLine | undefined {
    const [head] = line.tokens
    if (!SP.isPageTag(head)) return undefined
    const words = (language.words.page ?? SP.Language.default.words.page!).twins
    const spell = parser?.spellTokenizer ?? SP.spellParser.spellTokenizer
    return new PageTwin(language, spell, words, line, head, next instanceof P.BlockToken ? next : undefined).make()
  }

  /**
   * Page file `text` as a scan BEFORE it's parsed reads it:  each page's head as its twin, `counter notebook is a
   * page :`, its body left out;  every other line as written.
   * - So a page file's types and methods are known ahead, as a plain file's are:
   *   `SpellParser.declaredTypes()`, `declaredMethods()` read this instead.
   * - A page's body only draws:  it declares nothing.
   */
  static skeletonOf(text: string, parser: SP.SpellParser): string {
    const language = parser.language ?? SP.Language.default
    const words = language.words.page ?? SP.Language.default.words.page!
    const head = new RegExp(words.plainPage.source, "iu")
    const lines: string[] = []
    let inPage = false
    for (const line of text.split("\n")) {
      const name = head.exec(line)?.groups?.name
      if (name) {
        lines.push(words.twins.page.replace("{words}", SP.plainPartName(name)))
        inPage = true
        continue
      }
      // its body:  every line indented under it, and the blank lines between
      if (inPage && (!line.trim() || /^\s/.test(line))) continue
      inPage = false
      lines.push(line)
    }
    return lines.join("\n")
  }

  /**
   * Parse errors for what the page tokenizer noted wrong on `line`'s tokens, each over its token.
   * - A tag's head, a closer, the first token of a line indented less than its tag's body ...
   */
  static errorsIn(scope: P.Scope, line: P.LineToken): P.Match[] {
    const errors: P.Match[] = []
    for (const token of line.tokens) {
      const message = SP.pageErrorOf(token)
      if (message) errors.push(SP.spellParser.createParseError(scope, [token], message))
    }
    return errors
  }

  /** Is `token` one of a twin's own words, standing in a tag's place with no text of its own? */
  static isSynthetic(token: P.Token): boolean {
    return !!(token.record as { synthetic?: boolean }).synthetic
  }

  /** The tag's head. */
  readonly tag: SP.PageTag

  private constructor(
    readonly language: SP.Language,
    readonly spell: P.Tokenizer,
    readonly words: SP.PageTwinWords,
    readonly line: P.LineToken,
    readonly head: SP.PageTagToken,
    readonly block: P.BlockToken | undefined
  ) {
    this.tag = head.tag
  }

  /** The twin. */
  private make(): PageTwinLine {
    if (this.tag.category === "page") return this.drawnPage()
    // a block of code is unwrapped as it's read:  its head never reaches here
    if (this.tag.category !== "control") return { line: this.line, takesNextItem: !!this.block, skipped: true }
    const riders = this.forLines()
    const twin = this.lineAndBlock(this.expand(this.words.controls[this.tag.kind] ?? "{phrase}"), riders)
    return riders.length ? { ...twin, riders: riders.length } : twin
  }

  ////////////////
  // ## A page
  ////////////////

  /**
   * A page:  its line is `counter notebook is a page :`, and its body is its drawing, `- to draw it :`, in order:
   * - markup, `<section>`, `<example "one counter">`, as written
   * - each run of prose as a `<markdown>` block
   * - its tags, `<if>`, `<for>`, as their twins
   * - Its sections draw as the docs pages' do, sticky and foldable (epic `notebook` P3, J1):
   *   - each `##` heading and what follows it, a `<section>` the twin makes:  see `markdownLines()`, `gatherSections()`
   *   - each `<section label="...">` written at its top level, with the same look:  see `withSectionLook()`
   * - `locked`:  a line before its drawing, `- its lock is locked`.
   */
  private drawnPage(): PageTwinLine {
    const drawing: Array<P.LineToken | P.BlockToken> = []
    let prose: Array<SP.PageProseToken | null> = []
    const endProse = () => {
      drawing.push(...this.markdownLines(prose))
      prose = []
    }
    for (const item of this.block?.tokens ?? []) {
      if (item instanceof P.BlockToken) {
        drawing.push(item)
        continue
      }
      if (!(item instanceof P.LineToken)) continue
      const [first] = item.tokens
      if (first instanceof SP.PageProseToken && item.tokens.length === 1) {
        prose.push(first)
        continue
      }
      // a blank line:  inside a run of prose, part of it
      if (!first) {
        if (prose.length) prose.push(null)
        continue
      }
      endProse()
      // a closer in the drawing (an `<html>` block's) compiles to nothing:  left out, so the markup around it joins;
      // one that closes nothing stays, to say so
      if (first instanceof SP.PageCloserToken && item.tokens.length === 1 && !SP.pageErrorOf(first)) continue
      drawing.push(item)
    }
    endProse()
    this.withSectionLook(drawing)
    this.gatherSections(drawing)
    const indent = this.block?.indent ?? (this.line.indent ?? 0) + 1
    const lineOf = (tokens: P.Token[]) =>
      new P.LineToken({ start: this.head.start, line: this.head.line, ch: this.head.ch, indent, tokens })
    const items: Array<P.LineToken | P.BlockToken> = []
    if (this.tag.attributes.some((attribute) => attribute.name === "locked"))
      items.push(lineOf([this.bullet(), ...this.expand(this.words.pageLocked)]))
    if (drawing.length) {
      items.push(lineOf([this.bullet(), ...this.expand(this.words.draw)]))
      PageTwin.joinMarkup(drawing)
      const [first] = drawing
      items.push(
        new P.BlockToken({ start: first!.start, line: first!.line, ch: first!.ch, indent: indent + 1, tokens: drawing })
      )
    }
    const line = new P.LineToken({ ...this.line.record, tokens: this.expand(this.words.page) })
    if (!items.length) return { line, takesNextItem: !!this.block, swallowsNextItem: !!this.block }
    const body = new P.BlockToken({
      start: this.block?.start ?? this.head.start,
      line: this.block?.line ?? this.head.line,
      ch: this.block?.ch ?? this.head.ch,
      indent,
      tokens: items
    })
    return { line, body, takesNextItem: !!this.block }
  }

  /**
   * `lines` with each run of lines holding only markup joined into ONE line, an implicit fragment:
   * the drawing is those elements side by side, as code spell's tokenizer joins the elements on lines one after
   * another (`P.Tokenizer.matchJSXElements()`).
   * - A `<markdown>` block or an `<example>` is then a child of the fragment, read as one (`jsxChild`).
   * - SIDE EFFECT:  changes `lines` in place.
   */
  private static joinMarkup(lines: Array<P.LineToken | P.BlockToken>) {
    for (let index = 0; index < lines.length; index++) {
      let end = index
      while (isMarkupLine(lines[end])) {
        end++
        // a comment line between two lines of markup (`<!-- ... -->`, `//`) is part of the run, and draws nothing
        let after = end
        while (isCommentLine(lines[after])) after++
        if (after > end && isMarkupLine(lines[after])) end = after
      }
      if (end - index < 2) continue
      const run = (lines.slice(index, end) as P.LineToken[]).filter((line) => !isCommentLine(line))
      const children = run.flatMap((line) => line.tokens.flatMap(childrenOf))
      const [first] = run
      const fragment = new P.JSXFragmentToken({ start: first!.start, raw: "", children, isImplicit: true })
      lines.splice(index, end - index, new P.LineToken({ ...first!.record, tokens: [fragment] }))
    }
  }

  /**
   * A run of a page's `prose` as `<markdown>` blocks, a line each:  a new one at each `##` heading.
   * - Each block stands where its first line is, its text the lines as written, less their indent.
   * - A `##` heading's run is a SECTION of the page (epic `notebook` P3, J1):
   *   a `<section>` labelled with the heading, holding the rest of the run's block (`sectionFor()`).
   *   - Its heading isn't in the block too:  the section's title shows it.
   *   - `gatherSections()` then moves the markup after it into it.
   */
  private markdownLines(prose: Array<SP.PageProseToken | null>): P.LineToken[] {
    const runs: Array<Array<SP.PageProseToken | null>> = []
    for (const token of prose) {
      if (!runs.length || (token && HEADING.test(`${token.value}`))) runs.push([])
      runs.at(-1)!.push(token)
    }
    const indent = (this.block?.indent ?? 1) + 1
    return runs.flatMap((run) => {
      while (run.length && !run.at(-1)) run.pop()
      const [first] = run
      if (!first) return []
      const lineOf = (token: P.Token) =>
        new P.LineToken({ start: first.start, line: first.line, ch: first.ch, indent, tokens: [token] })
      const heading = HEADING.exec(`${first.value}`)
      if (!heading) return [lineOf(PageTwin.markdownOf(run))]
      // the rest of its run:  from its first line after the heading with text
      const rest = run.slice(1)
      while (rest.length && !rest[0]) rest.shift()
      const block = rest.length ? [PageTwin.markdownOf(rest)] : []
      return [lineOf(this.sectionFor(heading[1]!.trim(), first, block))]
    })
  }

  /**
   * `run`, lines of prose, as ONE `<markdown>` block standing where its first line is.
   * - Its line and column are its first line's:  so what it draws is marked as written there, as a tag is
   *   (`P.SourceMarks`), and the editor can pick it, move it and delete it (epic `notebook` P5).
   */
  private static markdownOf(run: Array<SP.PageProseToken | null>): P.JSXElementToken {
    const first = run[0]!
    // each line as written, less the indent its run's first line has:  a nested list stays nested
    const indentOf = (token: SP.PageProseToken) => "  ".repeat(Math.max(0, (token.ch ?? 0) - (first.ch ?? 0)))
    const text = run.map((token) => (token ? indentOf(token) + `${token.value}` : "")).join("\n")
    const end = run.at(-1)!.end
    return new P.JSXElementToken({
      tagName: MARKDOWN,
      start: first.start,
      line: first.line,
      ch: first.ch,
      raw: text,
      children: [
        new P.JSXTextToken({ value: text, raw: text, start: first.start }) as unknown as P.JSXElementToken,
        new P.JSXEndTagToken({ raw: `</${MARKDOWN}>`, tagName: MARKDOWN, start: end }) as unknown as P.JSXElementToken
      ]
    })
  }

  ////////////////
  // ## A page's sections
  ////////////////

  /**
   * The section a `##` heading starts, `heading` its text, holding `children`:
   * `<section label="Try it" sticky="stack" collapsible dividing level="2">`,
   * in the language's words (`SP.PageTwinWords.pageSection`).
   * - Its own tokens stand at the heading (`at`), with no text of their own in the file:  `isSynthetic()`.
   *   So its source mark is the heading's line;  each child keeps its own.
   * - Its label is the heading as written, but:
   *   - its `[`s and `]`s doubled:  an attribute's `[name]` is a fill-in
   *   - its `"`s curly, `“...”`:  markup's attribute text has no escape for its own quote
   */
  private sectionFor(heading: string, at: P.Token, children: P.Token[]): P.JSXElementToken {
    const { tag, label } = this.words.pageSection
    const text = heading
      .replace(/[[\]]/g, "$&$&")
      .replace(/"([^"]*)"/g, "“$1”")
      .replace(/"/g, "”")
    const quoted = `"${text}"`
    const closer = new P.JSXEndTagToken({ raw: `</${tag}>`, tagName: tag, start: at.end })
    const section = new P.JSXElementToken({
      tagName: tag,
      start: at.start,
      line: at.line,
      ch: at.ch,
      raw: "",
      attributes: [PageTwin.attributeAt(at.start, label, quoted), ...this.sectionLook(at.start)],
      children: [...children, closer] as P.JSXElementToken[],
      synthetic: true
    } as P.JSXElementTokenProps)
    SECTIONS_MADE.add(section)
    return section
  }

  /** The section look's attributes, each standing at `start`, but those `said` already. */
  private sectionLook(start: number, said: ReadonlySet<string> = new Set()): P.JSXAttributeToken[] {
    return Object.entries(this.words.pageSection.defaults)
      .filter(([name]) => !said.has(name))
      .map(([name, value]) => PageTwin.attributeAt(start, name, value === true ? undefined : `"${value}"`))
  }

  /**
   * `drawing` with each section a `##` heading started (`sectionFor()`) holding the markup after it:
   * its elements, `<example>`s and comments, up to the next heading, or the drawing's end.
   * - It ends early, before anything that can't be an element's child:  a line of code, a block.
   * - And before the next section, a `##` heading's or a `<section label="...">` written at the top level:
   *   markup on lines one after another is one line, so a line may be split there.
   * - Comments in it are left out, as they draw nothing;  its closer moves to the end of the last element it takes.
   * - SIDE EFFECT:  changes `drawing` in place.
   */
  private gatherSections(drawing: Array<P.LineToken | P.BlockToken>) {
    const startsSection = (token: P.Token) => SECTIONS_MADE.has(token) || this.isTopSection(token)
    for (let index = 0; index < drawing.length; index++) {
      const section = onlyTokenOf(drawing[index])
      if (!(section instanceof P.JSXElementToken) || !SECTIONS_MADE.has(section)) continue
      const children = section.record.children as P.Token[]
      const closer = children.pop()!
      let end = index + 1
      for (; end < drawing.length; end++) {
        const item = drawing[end]
        if (isCommentLine(item)) continue
        if (!isMarkupLine(item)) break
        const elements = item.tokens.flatMap(childrenOf)
        const next = elements.findIndex(startsSection)
        children.push(...elements.slice(0, next < 0 ? undefined : next))
        if (next < 0) continue
        // the next section starts on this line:  what's before it is this one's, the rest a line of its own
        if (next > 0) drawing[end] = lineOfElements(item, elements.slice(next))
        break
      }
      // comments at its end are left after it
      while (end > index + 1 && isCommentLine(drawing[end - 1])) end--
      const last = children.at(-1)
      if (last) closer.record.start = last.end
      children.push(closer)
      drawing.splice(index + 1, end - index - 1)
    }
  }

  /**
   * `drawing` with each `<section label="...">` written at its top level given the docs pages' look,
   * as a `##` heading's section has (`sectionFor()`):
   * each of `sticky="stack" collapsible dividing level="2"` it doesn't say.
   * - Only a labelled section, and only at the top:  a section inside an example, or with no title, is as written.
   * - Each a copy of the file's element, its added attributes standing at its start (`isSynthetic()`).
   * - SIDE EFFECT:  changes `drawing` in place.
   */
  private withSectionLook(drawing: Array<P.LineToken | P.BlockToken>) {
    const withLook = (token: P.Token): P.Token => {
      if (token instanceof P.JSXFragmentToken && token.isImplicit)
        return new P.JSXFragmentToken({ ...token.record, children: token.children?.map(withLook) })
      if (!this.isTopSection(token)) return token
      const added = this.sectionLook(token.start, new Set(token.attributes?.map((attribute) => attribute.name)))
      if (!added.length) return token
      return new P.JSXElementToken({ ...token.record, attributes: [...(token.attributes ?? []), ...added] })
    }
    for (const [index, item] of drawing.entries()) {
      if (isMarkupLine(item)) drawing[index] = new P.LineToken({ ...item.record, tokens: item.tokens.map(withLook) })
    }
  }

  /** Is `token` a `<section label="...">` written in the file, in the language's word for it? */
  private isTopSection(token: P.Token | undefined): token is P.JSXElementToken {
    const { tag, label } = this.words.pageSection
    return (
      token instanceof P.JSXElementToken &&
      !SECTIONS_MADE.has(token) &&
      withoutAccents(token.tagName) === tag &&
      !!token.attributes?.some((attribute) => attribute.name === label)
    )
  }

  /** An attribute the twin adds, `name="value"` or bare `name`, standing at `start` with no text of its own. */
  private static attributeAt(start: number, name: string, quoted?: string): P.JSXAttributeToken {
    const value = quoted === undefined ? undefined : new P.TextToken({ value: quoted, raw: quoted, start })
    return new P.JSXAttributeToken({ name, start, value, raw: "", synthetic: true } as P.JSXAttributeTokenProps)
  }

  ////////////////
  // ## Lines
  ////////////////

  /**
   * The twin:  `tokens`, then the tag's body on its own line;  and its block.
   * - `before`:  lines at the top of its block, e.g. a loop's riders.
   */
  private lineAndBlock(tokens: P.Token[], before: P.Token[][] = []): PageTwinLine {
    const { line, block } = this
    const inlineBody = this.inlineBody
    // nothing to open:  no `:` ending its words, e.g. `<empty/>` is `if there are none`
    const last = tokens.at(-1)
    const bodiless = !block?.tokens.length && !before.length && !inlineBody.length
    if (bodiless && last && PageTwin.isSynthetic(last) && last.value === ":") tokens.pop()
    // a body on its line under lines at the top of its block:  its own line after them, as code spell can't have
    // both a body on its line and a block under it
    const inlineBelow = before.length && inlineBody.length ? inlineBody : []
    spaceAfter(tokens)
    const twinLine = new P.LineToken({ ...line.record, tokens: [...tokens, ...(inlineBelow.length ? [] : inlineBody)] })
    const takesNextItem = !!block
    if (!before.length) return { line: twinLine, body: block, takesNextItem }
    const indent = block?.indent ?? (line.indent ?? 0) + 1
    const lineOf = (lineTokens: P.Token[]) =>
      new P.LineToken({ start: this.head.start, line: this.head.line, ch: this.head.ch, indent, tokens: lineTokens })
    const below = inlineBelow.length
      ? [
          new P.LineToken({
            start: inlineBelow[0]!.start,
            line: this.head.line,
            ch: this.head.ch,
            indent,
            tokens: inlineBelow
          })
        ]
      : []
    const body = new P.BlockToken({
      start: block?.start ?? this.head.start,
      line: block?.line ?? this.head.line,
      ch: block?.ch ?? this.head.ch,
      indent,
      tokens: [...before.map(lineOf), ...below, ...(block?.tokens ?? [])]
    })
    return { line: twinLine, body, takesNextItem }
  }

  /**
   * What follows the head on its own line, before any closer ending it:  `✓` in `<if it is done>✓</>`.
   * - A comment after the closer stays, after the body.
   */
  private get inlineBody(): P.Token[] {
    const rest = this.line.tokens.slice(1)
    let closer = rest.length - 1
    while (closer >= 0 && !(rest[closer] instanceof SP.PageCloserToken)) closer--
    if (closer < 0) return rest
    const after = rest.slice(closer + 1)
    return after.every((token) => token instanceof P.CommentToken || token instanceof P.WhitespaceToken)
      ? [...rest.slice(0, closer), ...after]
      : rest
  }

  ////////////////
  // ## Words
  ////////////////

  /**
   * The tokens of twin `shape`:  its words the language's own (synthetic), its slots the tag's.
   * - SEE:  `SP.PageTwinWords`.
   * - A slot with nothing for it gives nothing:  the line then fails to parse, saying so.
   */
  private expand(shape: string): P.Token[] {
    const tokens: P.Token[] = []
    for (const part of shape.match(/\{[^}]*\}|\S+/g) ?? []) {
      const slot = part.match(/^\{([^}]+)\}$/)
      if (!slot) {
        tokens.push(...this.synthetic(part))
        continue
      }
      const text = slot[1] === "words" ? this.tag.name : this.tag.phrase
      if (slot[1] === "words" && text && SP.plainPartName(text.text) !== text.text.trim())
        tokens.push(...this.synthetic(SP.plainPartName(text.text)))
      else tokens.push(...(text?.tokens ?? []))
      spaceAfter(tokens)
    }
    return tokens
  }

  /**
   * A `<for>`'s attributes, as lines of code spell at the top of its body:  a rider each, as `while waiting:` is.
   * - `loading={no}`:  a rider with nothing in it.
   * - `hide-empty` goes on the section, so nothing but a title needs it;  with it, no "nothing found" either.
   * - Whatever isn't its own goes on what's around its items:  `<for films as="cards" columns="4" />`.
   */
  private forLines(): P.Token[][] {
    const { tag } = this
    if (tag.kind !== "for each" || !tag.attributes.length) return []
    const words = this.words.forTag
    const own = (name: string) => tag.attributes.find((attribute) => attribute.name === name)
    const isNo = (attribute: SP.PageAttribute) => !attribute.value?.quoted && attribute.value?.text.trim() === words.no
    const said = (attribute: SP.PageAttribute) =>
      attribute.value?.quoted ? `"${attribute.value.text}"` : attribute.value!.text.trim()
    const lines: string[] = []
    const loading = own("loading")
    if (loading && isNo(loading)) lines.push(words.waiting)
    else if (loading?.value)
      lines.push(`${words.waiting} <ui-loader visible inline text>{${said(loading)}}</ui-loader>`)
    const empty = own("empty")
    const hideEmpty = own("hide-empty")
    if (empty && !hideEmpty && !isNo(empty)) {
      const text = empty.value ? said(empty) : `"${words.nothingFound}"`
      lines.push(`${words.none} <ui-text>{${text}}</ui-text>`)
    }
    const failed = own("failed")
    if (failed && isNo(failed)) lines.push(words.failed)
    else if (failed?.value) lines.push(`${words.failedSay} ${said(failed)}`)
    const title = own("title")
    if (title?.value) {
      const hidden = hideEmpty ? ' hide-empty=""' : ""
      lines.push(`${words.whole} <ui-section label={${said(title)}}${hidden}></ui-section>`)
    }
    const paging = own("paging")?.value?.text
    if (paging === words.pages) lines.push(words.inPages)
    else if (paging === words.none_) lines.push(words.allAtOnce)
    const pageSize = own("page-size")?.value?.text.trim()
    if (pageSize) lines.push(words.atATime.replaceAll("{size}", pageSize))
    const layout = own("as")?.value?.text
    if (layout) {
      const handedOn = tag.attributes.filter((attribute) => !FOR_OWN_ATTRIBUTES.has(attribute.name))
      const head = [layout, ...handedOn.map((attribute) => attribute.raw)].join(" ")
      const row = layout === words.table ? `<${words.row}></${words.row}>` : ""
      lines.push(`${words.items} <${head}>${row}</${layout}>`)
    }
    return lines.map((line) => this.synthetic(line))
  }

  /** `words`, the language's own, as synthetic tokens standing at the tag. */
  private synthetic(words: string): P.Token[] {
    const tokens = this.spell.tokenize(words)
    P.Tokenizer.shiftTokens(tokens, 0)
    for (const token of tokens) {
      Object.assign(token.record, {
        start: this.head.start,
        line: this.head.line,
        ch: this.head.ch,
        whitespace: " ",
        synthetic: true
      })
    }
    return tokens
  }

  /** An outline's bullet, `- `, for a line the page's flag adds to its body. */
  private bullet(): P.Token {
    return this.synthetic("-")[0]!
  }
}

/** What `PageTwin.of()` makes of a page's head, or a tag in its body. */
export type PageTwinLine = {
  /** The line, as code spell's twin of it. */
  line: P.LineToken
  /** Its body, as its twin's:  the tag's indented lines, and any its attributes add. */
  body?: P.BlockToken
  /** Does the line take its own indented block, the item after it? */
  takesNextItem: boolean
  /** It takes that block, though nothing of it is left for its body:  a page with nothing in it. */
  swallowsNextItem?: boolean
  /** A tag with no twin:  its line is skipped, and its block. */
  skipped?: boolean
  /**
   * How many of its body's first lines are a `<for>`'s riders (`show them in: <grid></grid>`, `while waiting:`):
   * code spell writes them under the loop, after its body.
   */
  riders?: number
}

/**
 * A space after the last of `tokens`, if it has none:  the end of a slot's run, which a twin puts beside a word it was
 * never next to, e.g. a phrase and the word after it.
 * - Never within a run:  `2 ... 10` and `jack, queen` keep their spacing, which their rules read.
 * - SIDE EFFECT:  sets its `whitespace`;  only twins read a tag's own tokens.
 */
function spaceAfter(tokens: P.Token[]) {
  const last = tokens.at(-1)
  if (last && !last.whitespace) last.record.whitespace = " "
}

/** The tag of a run of a page's prose, drawn as markdown:  `markdown_block`'s. */
const MARKDOWN = "markdown"

/** A `##` heading, starting a page's section:  its text. */
const HEADING = /^##\s+(.*)$/

/** The sections the twin made for `##` headings (`sectionFor()`), apart from those written as tags. */
const SECTIONS_MADE = new WeakSet<P.Token>()

/** Is `item` a line holding only markup:  elements, fragments? */
function isMarkupLine(item: P.Token | undefined): item is P.LineToken {
  return (
    item instanceof P.LineToken &&
    item.tokens.length > 0 &&
    item.tokens.every((token) => token instanceof P.JSXElementToken || token instanceof P.JSXFragmentToken)
  )
}

/** Is `item` a line holding only a comment (`<!-- ... -->`, `//`):  it draws nothing. */
function isCommentLine(item: P.Token | undefined): boolean {
  return item instanceof P.LineToken && item.tokens.length === 1 && item.tokens[0] instanceof P.CommentToken
}

/** The one token of `item`, a line of one token. */
function onlyTokenOf(item: P.Token | undefined): P.Token | undefined {
  return item instanceof P.LineToken && item.tokens.length === 1 ? item.tokens[0] : undefined
}

/** A line in `line`'s place holding `elements`, the end of its markup:  one element, or an implicit fragment. */
function lineOfElements(line: P.LineToken, elements: P.Token[]): P.LineToken {
  const [first] = elements
  const token =
    elements.length === 1
      ? first!
      : new P.JSXFragmentToken({ start: first!.start, raw: "", children: elements, isImplicit: true })
  return new P.LineToken({ ...line.record, start: first!.start, tokens: [token] })
}

/** `token` as children of what holds it:  an implicit fragment's children, else itself. */
function childrenOf(token: P.Token): P.Token[] {
  return token instanceof P.JSXFragmentToken && token.record.isImplicit ? (token.children ?? []) : [token]
}

/** `<for>`'s own attributes, by their English names:  any other goes on what's around its items. */
const FOR_OWN_ATTRIBUTES = new Set(["title", "loading", "empty", "hide-empty", "failed", "paging", "page-size", "as"])
