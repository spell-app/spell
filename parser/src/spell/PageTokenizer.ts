import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * Spell's tokenizer for a PAGE FILE (epic `language` P47):  a file holding a page's plain head,
 * `"button api" is a notebook page`, its body indented under it.
 * - A page's body is a drawing, written as a page reads:
 *   - a line of prose, `A button that counts its clicks.`, drawn as markdown, a `##` heading starting a section
 *   - markup, as written:  `<section>`, `<example "one counter">`
 *   - the tags it draws with, each ONE `SP.PageTagToken`:  `<if ...>`, `<otherwise>`, `<for ...>`, an `<html>` block,
 *     a `<spell>` block
 * - Everything outside a page is plain Spell, read as any plain file is:  a page's own views are written above it.
 * - At the START of a line (after its indent):
 *   - a page's head, at the file's left edge:  a `SP.PageTagToken`, its tag a `page`
 *   - a tag its body draws with:  a `SP.PageTagToken`, though it run over several lines
 *   - a closer, `</>` or `</if>`:  a `SP.PageCloserToken`
 *   - a line of prose in a page's body:  a `SP.PageProseToken`, a comment as code spell writes it
 *   - a comment on lines of its own, `<!-- ... -->`, anywhere:  a `SP.PageCommentToken` a line
 * - Everything else is spell's own tokens:  plain Spell, a drawing's markup (`<ui-text>`), the spell in `{...}`.
 * - Which words make a tag is the file's language's (`SP.PageWords`).
 * - Mistakes are noted on the tokens (`SP.addPageError()`), in the file's language:
 *   a closer that closes nothing, a tag never closed, a line indented less than its tag's body.
 *   `SP.PageTwin` reports them on their line.
 * - Tags nest by INDENT, as spell's blocks do;  a closer is checked, never needed to find where a body ends.
 * - A plain file reads the same tags inside an element of its drawing (`tokenizeDrawingLines()`):
 *   a `<for>` with loading and empty parts.
 */
export class PageTokenizer extends P.Tokenizer {
  /** The file's language:  its page words, and what its messages say. */
  readonly language: SP.Language
  /** The language's page words. */
  readonly words: SP.PageWords
  /** Spell's own tokenizer, for a tag's name, attribute values and phrase. */
  readonly spell: P.Tokenizer

  constructor(props: PageTokenizerProps) {
    const { language, spell, ...tokenizerProps } = props
    super(tokenizerProps)
    this.language = language
    this.spell = spell
    const words = language.words.page ?? SP.Language.default.words.page
    if (!words) throw new TypeError("PageTokenizer():  no language has a page's words;  English's should")
    this.words = words
    // each file starts with no tag open;  one still open at its end was never closed
    const tokenizeFile = (this.tokenizeText = this.tokenize)
    this.tokenize = (text: string, start?: number, end?: number) => {
      this.frames = []
      this.inlineCloser = undefined
      this.closedChain = undefined
      this.openComment = undefined
      this.openFence = undefined
      const tokens = tokenizeFile(text, start, end)
      for (const frame of this.frames.reverse()) {
        for (const error of this.unclosed(frame)) SP.addPageError(frame.token, error)
      }
      // a comment still open at the file's end was never closed (read through a cast:  `tokenizeFile()` changed it)
      const unclosed = (this.openComment as PageTokenizer["openComment"])?.token
      if (unclosed) SP.addPageError(unclosed, this.message("page-unclosed-comment", {}))
      this.frames = []
      this.openComment = undefined
      this.openFence = undefined
      return tokens
    }
    // a comment's later lines sit at its first line's indent, however they're written:  never a block of their own
    const toLines = this.breakIntoLines
    this.breakIntoLines = (tokens: P.Token[]) => {
      const lines = toLines(tokens)
      for (const line of lines) {
        const [first] = line.tokens
        const indent = first instanceof SP.PageCommentToken ? commentIndentOf(first) : undefined
        if (indent !== undefined) line.record.indent = indent
      }
      return lines
    }
    // a `<spell>` or `<html>` block is code where it sits:  its tag goes, its lines join the block around it
    const groupLines = this.breakIntoIndentedBlocks
    this.breakIntoIndentedBlocks = (tokens: P.Token[]) =>
      groupLines(tokens).map((block) => unwrapCode(block, this.unwrapsHtml))
  }

  /**
   * Tokenize ONE line of a file, `line`, read with the tags `open` before it:  for colouring a file line by line,
   * as the editor app's code editor does.
   * - Returns its tokens, and the tags open after it:  the next line's `open`.
   * - `open` is never changed.
   * - No line is checked against the file's end:  a tag still open isn't an error here.
   * - A tag's head over several lines is read a line at a time, so it's unclosed on its first.
   * - `inComment`:  the line before it left a comment open, `<!--` with no `-->` yet;
   *   the result says if this one does.
   */
  tokenizeLine(
    line: string,
    open: readonly PageOpenTag[] = [],
    inComment = false
  ): { tokens: P.Token[]; open: PageOpenTag[]; inComment: boolean } {
    this.frames = open.map((tag) => ({ ...tag }))
    this.inlineCloser = undefined
    this.closedChain = undefined
    this.lineError = undefined
    this.openComment = inComment ? { indent: 0 } : undefined
    this.openFence = undefined
    const tokens = this.tokenizeText(line)
    const after = this.frames
    const stillInComment = !!this.openComment
    this.frames = []
    this.openComment = undefined
    return { tokens, open: after, inComment: stillInComment }
  }

  /** Spell's own `tokenize()`, before ours wraps it for a whole file:  see `tokenizeLine()`. */
  private tokenizeText!: P.Tokenizer["tokenize"]

  /**
   * Tokenize `text`, lines a drawing holds, as a page's body draws them:  its controls are tags, its markup spell's.
   * - For a `<for>` inside an element (epic `language` I19), in a page or a plain file:  its text, read again as a
   *   drawing's lines, so it reads as it would on a line of its own (`SpellJSX`).
   * - Returns its indented blocks, as `breakIntoIndentedBlocks()` does.
   * - Leaves the file being read as it was:  its tags open, its comment, its line's error.
   */
  tokenizeDrawingLines(text: string): P.BlockToken[] {
    const saved = {
      frames: this.frames,
      inlineCloser: this.inlineCloser,
      closedChain: this.closedChain,
      lineError: this.lineError,
      openComment: this.openComment,
      openFence: this.openFence
    }
    const token = new P.WhitespaceToken({ start: 0, raw: "", value: "" })
    this.frames = [{ category: "drawing", kind: "drawing", word: "", wordEnd: 0, indent: -1, token, chain: false }]
    this.inlineCloser = undefined
    this.closedChain = undefined
    this.lineError = undefined
    this.openComment = undefined
    this.openFence = undefined
    try {
      return this.breakIntoIndentedBlocks(this.tokenizeText(text) ?? [])
    } finally {
      Object.assign(this, saved)
    }
  }

  /**
   * Does `breakIntoIndentedBlocks()` unwrap each `<html>` block, so its markup is the drawing's own lines, as written
   * (`unwrapCode()`)?  Yes for a parse;  a view of the file's chunks keeps the block, a cell of its own.
   */
  unwrapsHtml = true

  /** The tags open at the line being read, outermost first. */
  private frames: Frame[] = []
  /** A closer ending the line being read, which closes the tag it started with. */
  private inlineCloser: { start: number; tag: SP.PageTagToken } | undefined
  /** The if-chain the last closer closed, so an `<otherwise>` right after it says to drop that closer. */
  private closedChain: Frame | undefined
  /** An error for the next token, the first of its line:  a line indented less than its tag's body. */
  private lineError: string | undefined
  /**
   * A comment still open, `<!--` with no `-->` yet:  its first line's indent, and its first token (where the error
   * goes if the file ends first).
   */
  private openComment: { indent: number; token?: SP.PageCommentToken } | undefined
  /**
   * A fenced code block still open in a page's prose, ` ``` ` or `~~~` with no closing fence yet (epic `language` T80):
   * its fence.
   * - Every line to its closing fence is prose, as written:  `<if ...>` at a line's start is shown, never read.
   */
  private openFence: { fence: string } | undefined

  /** Match a single top-level token at `start`:  a page's tag, closer or line of prose, else spell's. */
  matchTopTokens(text: string, start = 0, end = text.length) {
    if (this.inlineCloser?.start === start) return this.takeInlineCloser(text, start)
    if (this.openComment && this.isLineStart(text, start)) return this.comment(text, start, start, end)
    if (this.isLineStart(text, start)) {
      const token = this.matchLineStart(text, start, end)
      if (token) return token
    }
    const token = super.matchTopTokens(text, start, end)
    if (token && this.lineError) {
      SP.addPageError(token, this.lineError)
      this.lineError = undefined
    }
    return token
  }

  ////////////////
  // ## A line's start
  ////////////////

  /**
   * What starts the line at `start`, if a page's:  a closer, a tag, or a line of prose.
   * - `undefined`:  spell's own tokens, e.g. plain Spell outside a page, a drawing's markup.
   */
  private matchLineStart(text: string, start: number, end: number): P.Token | undefined {
    const indent = start - (text.lastIndexOf("\n", start - 1) + 1)
    const lineEnd = lineEndOf(text, start, end)
    if (this.openFence) return this.fencedLine(text, start, lineEnd)
    // a comment, `<!-- ... -->`, anywhere (Owen, 2026-10-26):  it ends the tags open deeper, as a `//` line does,
    // but is never itself wrong where it sits
    if (text.startsWith(P.HTML_COMMENT_START, start)) {
      this.ownerOfLine(indent)
      this.lineError = undefined
      this.openComment = { indent }
      return this.comment(text, start, start + P.HTML_COMMENT_START.length, end)
    }
    // a line at the file's left edge ends the page above it:  it's plain Spell, or the next page's head
    if (indent === 0) this.closeSiblings(0)
    if (text.startsWith("</", start) && this.frames.length) {
      const closer = this.readCloser(text, start)
      if (closer) return this.closeTag(closer, indent)
    }
    // a page's plain head, `"button api" is a notebook page`, at the file's left edge
    if (indent === 0 && text[start] === '"') {
      const page = this.readPageHead(text, start, lineEnd)
      if (page) return page
    }
    if (text[start] === "<" && WORD_START.test(text[start + 1] ?? "")) {
      const word = this.tagWordAt(text, start)
      if (word && this.isTagHere(word, indent)) return this.readTag(text, start, end, lineEnd, word, indent)
    }
    if (!this.frames.length) return undefined
    const owner = this.ownerOfLine(indent)
    if (this.lineError || owner?.category !== "page") return undefined
    // a page's body is a drawing:  markup and holes are spell's, `//` a comment, and any other line markdown,
    // its `#` headings too
    if (text[start] === "<" || text[start] === "{" || text.startsWith("//", start)) return undefined
    return this.proseOpeningFence(text, start, lineEnd)
  }

  /**
   * A markup tag's head, as spell's, but its name may hold any letter:  a Spanish drawing writes `<botón>`
   * (epic `elemental-spell` P7, Q49);  `SpellJSX.componentTagFor()` finds its component.
   */
  get JSX_TAG_START() {
    return /^<(\p{L}[\p{L}\p{N}_.-]*)(\s*\/>|\s*>|\s+)/u
  }

  /**
   * Where markup's next element would start, for a run of them (`matchJSXElements()`):  never at a line a page's tag
   * starts, e.g. `<if ...>` or `<for each ...>` after a drawing's `<toolbar />`, which is a tag of its own.
   */
  protected nextElementStart(text: string, from: number, end: number, indent: number): number {
    const next = super.nextElementStart(text, from, end, indent)
    if (next >= end || !this.isLineStart(text, next) || !WORD_START.test(text[next + 1] ?? "")) return next
    const lineIndent = next - (text.lastIndexOf("\n", next - 1) + 1)
    const word = this.tagWordAt(text, next)
    return word && this.isTagHere(word, lineIndent) ? end : next
  }

  /** Is `start` a line's first character that isn't a space or tab? */
  private isLineStart(text: string, start: number) {
    const char = text[start]
    if (char === undefined || char === " " || char === "\t" || char === "\n" || char === "\r") return false
    const lineStart = text.lastIndexOf("\n", start - 1) + 1
    return /^[ \t]*$/.test(text.slice(lineStart, start))
  }

  ////////////////
  // ## Tags
  ////////////////

  /**
   * What the tag at `start` says it is, by its word:  a control, or a block of code;  `undefined` for markup.
   * - A control's word may be several (`otherwise if`):  the longest that fits wins,
   *   and `otherwise` takes no phrase, so `<otherwise it is red>` is no `<otherwise>`.
   */
  private tagWordAt(text: string, start: number): TagWord | undefined {
    const wordStart = start + 1
    const first = text.slice(wordStart).match(WORD)![0]
    const wordEnd = wordStart + first.length
    const lower = first.toLowerCase()
    const { prefix, controls } = this.words
    // a block of plain Spell, as written:  the language's word for Spell (epic `elemental-spell` P12)
    if (lower === prefix) return { category: "code", kind: "code", word: first, wordEnd }
    // markup drawn as written, `<ui-button>` (epic `elemental-spell` P16):  the web's word, in every language
    if (lower === HTML_WORD) return { category: "code", kind: "html", word: first, wordEnd }
    // the longest control word written here
    let pos = wordStart
    const ends: number[] = []
    while (ends.length < MOST_WORDS_IN_A_TAG_WORD) {
      const word = text.slice(pos).match(WORD)?.[0]
      if (!word) break
      pos += word.length
      ends.push(pos)
      const gap = text.slice(pos).match(/^[ \t]+/)?.[0]
      if (!gap) break
      pos += gap.length
    }
    for (let count = ends.length; count > 0; count--) {
      const end = ends[count - 1]!
      const written = text.slice(wordStart, end)
      const control = controls[written.toLowerCase().replace(/[ \t]+/g, " ")]
      if (!control) continue
      if (control === "otherwise" && this.phraseFrom(text, end).text) continue
      return { category: "control", kind: control, word: written, wordEnd: end }
    }
    return undefined
  }

  /**
   * Is a tag with `word`, on a line `indent` in, a page's here -- else markup, or plain Spell's?
   * - Only inside a page's body, or a drawing's lines (`tokenizeDrawingLines()`):  outside one, it's plain Spell.
   * - A `<spell>` block only right in a page's body;  an `<html>` block anywhere in it.
   * - A loop's slots, `<empty>`, `<loading>`, `<failed>`:  only right inside its `<for>`.
   * - Inside a block of code:  none, it's that code's.
   */
  private isTagHere(word: TagWord, indent: number): boolean {
    const owner = this.ownerOfTag(indent, word)
    if (!owner || owner.category === "code") return false
    if (word.category === "code") return word.kind === "html" || owner.category === "page"
    if (isForSlot(word.kind)) return owner.kind === "for each"
    return true
  }

  /**
   * Read the tag at `start`:  its head, one token, and what it opens.
   * - Its body on the same line is closed by a closer ending the line:  `<if it is done>✓</>`.
   */
  private readTag(text: string, start: number, end: number, lineEnd: number, word: TagWord, indent: number) {
    const head = word.category === "control" ? this.readPhraseHead(text, word) : this.readCodeHead(text, word, end)
    const raw = text.slice(start, head.end)
    const tag: SP.PageTag = {
      category: word.category as SP.PageTag["category"],
      kind: word.kind,
      word: word.word,
      attributes: head.attributes,
      phrase: head.phrase,
      selfClosing: head.selfClosing
    }
    const continuing = this.continuesChain(word, indent)
    const errors: string[] = [...head.errors]
    if (!continuing) this.closeSiblings(indent)
    if (word.kind === "otherwise" || word.kind === "otherwise if") {
      if (!continuing) errors.push(this.otherwiseError(word))
    }
    const rest = text.slice(head.end, lineEnd)
    const closerAtEnd = rest.trim() && !head.selfClosing ? this.closerEnding(text, head.end, lineEnd) : undefined
    const token = new SP.PageTagToken({ start, raw, value: raw, tag })
    if (continuing) continuing.token = token
    else if (!head.selfClosing && closerAtEnd) this.inlineCloser = { start: closerAtEnd.start, tag: token }
    else if (!head.selfClosing) this.open(word, indent, token)
    return withErrors(token, errors)
  }

  /**
   * Read a page's head at `start`, `"button api" is a notebook page` (epic `language` P45):
   * only at a file's left edge;  `undefined` when the line isn't one (`SP.PageWords.plainPage`).
   * - Its indentation says where its body ends:  no closer.
   * - Its flags are bare words before `page`, in the language's words:  `notebook`, `locked`;
   *   any other word, and the line isn't a page's head.
   */
  private readPageHead(text: string, start: number, lineEnd: number): SP.PageTagToken | undefined {
    const match = new RegExp(this.words.plainPage.source, "iu").exec(text.slice(start, lineEnd))
    if (!match?.groups) return undefined
    const { name, flags = "" } = match.groups
    const headEnd = start + match[0].length
    const attributes: SP.PageAttribute[] = []
    const flagsAt = start + match[0].indexOf(flags, name!.length + 2)
    for (const flag of flags.matchAll(/[\p{L}-]+/gu)) {
      const english = this.words.flags[flag[0].toLowerCase()]
      if (!english) return undefined
      attributes.push({ name: english, word: flag[0], start: flagsAt + flag.index })
    }
    const tag: SP.PageTag = {
      category: "page",
      kind: "page",
      word: this.words.page,
      name: this.textAt(text, start + 1, start + 1 + name!.length, true),
      attributes,
      selfClosing: false
    }
    this.closeSiblings(0)
    const raw = text.slice(start, headEnd)
    const token = new SP.PageTagToken({ start, raw, value: raw, tag })
    this.open({ category: "page", kind: "page", word: this.words.page, wordEnd: headEnd }, 0, token)
    return token
  }

  /** `<otherwise>` with no open `<if>`:  the error, saying to drop the closer before it if that closed one. */
  private otherwiseError(word: TagWord) {
    const ifWord = Object.keys(this.words.controls).find((key) => this.words.controls[key] === "if") ?? "if"
    if (this.closedChain) return this.message("page-otherwise-after-closed-if", { tag: `<${word.word}>`, if: ifWord })
    return this.message("page-otherwise-without-if", { tag: `<${word.word}>`, if: `<${ifWord}>` })
  }

  ////////////////
  // ## Heads
  ////////////////

  /** Read a block's head, `<html>` or `<spell>`, from its word to its `>`:  it says nothing more. */
  private readCodeHead(text: string, word: TagWord, end: number): Head {
    const close = text.indexOf(">", word.wordEnd)
    if (close < 0 || close >= end)
      return {
        attributes: [],
        selfClosing: false,
        end,
        errors: [this.message("page-unclosed-head", { tag: `<${word.word}>` })]
      }
    return { attributes: [], selfClosing: text[close - 1] === "/", end: close + 1, errors: [] }
  }

  /** Read one attribute at `start`, named `word`:  `name`, `name="value"`, `name={spell}`, or `name=value`. */
  private readAttribute(text: string, start: number, end: number, word: string): SP.PageAttribute & { end: number } {
    const attribute: SP.PageAttribute & { end: number } = { name: word, word, start, end: start + word.length }
    let pos = skipSpace(text, start + word.length, end)
    if (text[pos] !== "=") return attribute
    pos = skipSpace(text, pos + 1, end)
    const quote = text[pos]
    if (quote === '"' || quote === "{") {
      // just past its `}`:  the tokenizer's brace scan skips a `}` in a string, `{its name + "}"}`
      const close =
        quote === "{"
          ? (this.findMatchingDelimiter("{", "}", text, pos, end) ?? end - 1) + 1
          : closingQuote(text, pos, end)
      attribute.value = this.textAt(text, pos + 1, close - 1, quote === '"')
      attribute.end = close
    } else {
      let valueEnd = pos + (text.slice(pos, end).match(/^[^\s>]+/)?.[0].length ?? 0)
      if (text.startsWith("/>", valueEnd - 1)) valueEnd--
      attribute.value = this.textAt(text, pos, valueEnd, false)
      attribute.end = valueEnd
    }
    attribute.tokens = attribute.value.tokens
    return attribute
  }

  /** Read a control's head, from its word:  its phrase, to its `>`;  a `<for>`'s attributes after it. */
  private readPhraseHead(text: string, word: TagWord): Head {
    const phrase = this.phraseFrom(text, word.wordEnd)
    const head: Head = { attributes: [], selfClosing: phrase.selfClosing, end: phrase.end, errors: [] }
    if (!phrase.closed) head.errors.push(this.message("page-unclosed-head", { tag: `<${word.word}>` }))
    let phraseText = phrase.text
    if (word.kind === "for each") {
      const at = this.forAttributesAt(phrase.text)
      if (at !== undefined) {
        head.attributes = this.readForAttributes(text, phrase.start + at, phrase.start + phrase.text.length)
        phraseText = phrase.text.slice(0, at).trimEnd()
        head.errors.push(...this.forHeadErrors(word, phraseText, head))
      }
    }
    if (phraseText) head.phrase = this.textAt(text, phrase.start, phrase.start + phraseText.length, false)
    else if (word.kind !== "otherwise" && !isForSlot(word.kind))
      head.errors.push(this.message("page-missing-phrase", { tag: `<${word.word}>`, word: word.word }))
    return head
  }

  /**
   * Where `<for>`'s attributes start in its `phrase`, if it has any:  the first of its own, or a `word=` with no space.
   * - Anything in quotes, parens or braces is the phrase's;  so is `with cook = them`, its `=` spaced.
   * - A bare `empty` or `loading` right after `is`, as in `where it is empty`, is the phrase's too.
   */
  private forAttributesAt(phrase: string): number | undefined {
    const { forAttributes, forFlagsNotAfter } = this.words
    let depth = 0
    let isQuoted = false
    let previous = ""
    for (let pos = 0; pos < phrase.length; pos++) {
      const char = phrase[pos]!
      if (char === '"') isQuoted = !isQuoted
      if (isQuoted || char === '"') continue
      if ("({[".includes(char)) depth++
      else if (")}]".includes(char)) depth--
      if (depth || !/[\p{L}\p{M}\d_-]/u.test(char)) continue
      const word = phrase.slice(pos).match(WORD)![0]
      const lower = word.toLowerCase()
      const isGlued = phrase[pos + word.length] === "="
      const name = forAttributes[lower]
      if (pos > 0 && (isGlued || (name && !forFlagsNotAfter.includes(previous) && FOR_FLAGS.has(name)))) return pos
      previous = lower
      pos += word.length - 1
    }
    return undefined
  }

  /** `<for>`'s attributes, from `start` to `end`:  each its English name, if it's one of its own. */
  private readForAttributes(text: string, start: number, end: number): SP.PageAttribute[] {
    const attributes: SP.PageAttribute[] = []
    let pos = start
    while (pos < end) {
      pos = skipSpace(text, pos, end)
      const word = text.slice(pos, end).match(ATTRIBUTE_NAME)?.[0]
      if (!word) {
        pos++
        continue
      }
      const { end: attributeEnd, ...attribute } = this.readAttribute(text, pos, end, word)
      attributes.push({
        ...attribute,
        name: this.words.forAttributes[word.toLowerCase()] ?? word,
        raw: text.slice(pos, attributeEnd)
      })
      pos = attributeEnd
    }
    return attributes
  }

  /** What's wrong with a `<for>` head:  a flag before its attributes, what's around its items unnamed, a table with no cells. */
  private forHeadErrors(word: TagWord, phrase: string, head: Head): string[] {
    const errors: string[] = []
    const tag = `<${word.word}>`
    const { forAttributes, forListWords } = this.words
    const as = Object.keys(forAttributes).find((it) => forAttributes[it] === "as")!
    const [first, flag, ...more] = phrase.split(/\s+/)
    if (flag && !more.length && !forListWords.includes(first!.toLowerCase()))
      errors.push(this.message("page-for-flag-first", { flag, tag }))
    const layout = head.attributes.find((attribute) => attribute.name === "as")
    const handedOn = head.attributes.find((attribute) => !Object.values(forAttributes).includes(attribute.name))
    if (handedOn && !layout) errors.push(this.message("page-for-needs-as", { attribute: handedOn.word, tag, as }))
    const table = this.words.twins.forTag.table
    if (layout?.value?.text === table && head.selfClosing)
      errors.push(this.message("page-for-table-needs-cells", { tag }))
    return errors
  }

  /**
   * The phrase from `start` to its tag's `>`:  a `>` inside a string, parens or braces is the phrase's (Q45),
   * and a `/` just before the `>` ends the tag, not the phrase.
   * - Only `"` starts a string:  an apostrophe is spell's possessive (P3, J25).  A phrase ends with its line.
   * - The tokenizer's own phrase scan, `findPhraseEnd()`, as an if-chain's in markup.
   */
  private phraseFrom(text: string, start: number) {
    const pos = this.findPhraseEnd(text, start, text.length, { stop: ">", lineEnds: true })
    const closed = text[pos] === ">"
    const selfClosing = closed && text[pos - 1] === "/"
    const textEnd = selfClosing ? pos - 1 : pos
    const raw = text.slice(start, textEnd)
    const phraseStart = start + (raw.length - raw.trimStart().length)
    return { text: raw.trim(), start: phraseStart, end: closed ? pos + 1 : pos, closed, selfClosing }
  }

  /**
   * The text from `start` to `end`, tokenized as spell where it sits in the file.
   * - `quoted`:  it sat in quotes, which are kept as ONE `TextToken` too (`quoted`), for a twin that quotes it.
   */
  private textAt(text: string, start: number, end: number, quoted: boolean): SP.PageText {
    const tokens = start < end ? this.spell.tokenize(text, start, end) : []
    const result: SP.PageText = { text: text.slice(start, end), start, tokens }
    if (quoted) {
      const raw = text.slice(start - 1, end + 1)
      result.quoted = new P.TextToken({ value: raw, raw, start: start - 1 })
    }
    return result
  }

  ////////////////
  // ## Closers
  ////////////////

  /** The closer at `start` -- `</>` or `</word>` -- or `undefined` when `</` starts none there. */
  private readCloser(text: string, start: number): Closer | undefined {
    const match = text.slice(start).match(CLOSER)
    if (!match) return undefined
    return { start, raw: match[0], word: match[1] || undefined }
  }

  /**
   * The closer ending the line from `start` to `lineEnd`:  `...✓</>`.
   * - Only one of a page's tags closes:  `</>`, or a tag's own word;  a line of markup ending `</ui-text>` is markup.
   * - A comment may follow it, as on any line of spell:  `<if it is done>✓</>   // done`
   */
  private closerEnding(text: string, start: number, lineEnd: number): Closer | undefined {
    const line = text.slice(start, lineEnd).trimEnd()
    for (let at = line.lastIndexOf("</"); at >= 0; at = at ? line.lastIndexOf("</", at - 1) : -1) {
      const closer = this.readCloser(text, start + at)
      if (!closer) continue
      const after = line.slice(at + closer.raw.length)
      if (after && !TRAILING_COMMENT.test(after)) continue
      return !closer.word || this.isPageWord(firstWordOf(closer.word)) ? closer : undefined
    }
    return undefined
  }

  /**
   * The closer token for `closer`, on a line `indent` in:  it closes the tag open at that indent.
   * - Tags open deeper were never closed;  one at no such indent means it closes nothing.
   */
  private closeTag(closer: Closer, indent: number): SP.PageCloserToken {
    const token = new SP.PageCloserToken({
      start: closer.start,
      raw: closer.raw,
      value: closer.raw,
      word: closer.word
    })
    const errors: string[] = []
    while (this.frames.length && this.frames.at(-1)!.indent > indent) {
      const unclosed = this.frames.pop()!
      for (const error of this.unclosed(unclosed)) SP.addPageError(unclosed.token, error)
    }
    const frame = this.frames.at(-1)
    if (!frame || frame.indent !== indent || frame.category === "page") {
      errors.push(this.message("page-unexpected-closer", { closer: closer.raw }))
      return withErrors(token, errors)
    }
    this.frames.pop()
    this.closedChain = frame.chain ? frame : undefined
    if (closer.word && !this.isWordFor(closer.word, frame))
      errors.push(this.message("page-mismatched-closer", { closer: closer.raw, open: `<${frame.word}>` }))
    return withErrors(token, errors)
  }

  /** The closer ending a tag's own line, `<if it is done>✓</>`:  checked against that tag. */
  private takeInlineCloser(text: string, start: number): SP.PageCloserToken {
    const { tag } = this.inlineCloser!
    this.inlineCloser = undefined
    const closer = this.readCloser(text, start)!
    const token = new SP.PageCloserToken({ start, raw: closer.raw, value: closer.raw, word: closer.word })
    if (closer.word && !this.isWordFor(closer.word, tag.tag))
      SP.addPageError(token, this.message("page-mismatched-closer", { closer: closer.raw, open: `<${tag.tag.word}>` }))
    return token
  }

  ////////////////
  // ## What's open
  ////////////////

  /** Open the tag `word`, on a line `indent` in:  the lines indented under it are its body. */
  private open(word: TagWord, indent: number, token: P.Token) {
    this.closedChain = undefined
    this.frames.push({ ...word, indent, token, chain: word.category === "control" && word.kind === "if" })
  }

  /** Close every tag open at `indent` or deeper, for a tag on a line `indent` in:  none was closed. */
  private closeSiblings(indent: number) {
    while (this.frames.length && this.frames.at(-1)!.indent >= indent) {
      const frame = this.frames.pop()!
      for (const error of this.unclosed(frame)) SP.addPageError(frame.token, error)
    }
  }

  /** The error for `frame`, a tag never closed:  none for a page, which its indentation closes. */
  private unclosed(frame: Frame): string[] {
    if (frame.category === "page" || frame.category === "drawing") return []
    return [this.message("page-unclosed-tag", { tag: `<${frame.word}>` })]
  }

  /**
   * An `<otherwise ...>` going on with the if-chain open at `indent`, if it is one:  that chain's frame.
   * - Tags open deeper are closed first:  the last branch's.
   */
  private continuesChain(word: TagWord, indent: number): Frame | undefined {
    if (word.category !== "control" || (word.kind !== "otherwise" && word.kind !== "otherwise if")) return undefined
    const chain = [...this.frames].reverse().find((frame) => frame.indent <= indent)
    if (!chain?.chain || chain.indent !== indent) return undefined
    while (this.frames.at(-1) !== chain) {
      const frame = this.frames.pop()!
      for (const error of this.unclosed(frame)) SP.addPageError(frame.token, error)
    }
    return chain
  }

  /**
   * The tag owning a line `indent` in that isn't a tag or closer:  the innermost open at less indent.
   * - SIDE EFFECT:  closes the tags open deeper than it, never closed;  and for one open AT its indent, notes the
   *   line's error (`lineError`):  it's indented less than that tag's body.
   */
  private ownerOfLine(indent: number): Frame | undefined {
    while (this.frames.length && this.frames.at(-1)!.indent > indent) {
      const frame = this.frames.pop()!
      for (const error of this.unclosed(frame)) SP.addPageError(frame.token, error)
    }
    const top = this.frames.at(-1)
    if (top && top.indent === indent && top.category !== "page") {
      this.lineError = this.message("page-indented-less", { tag: `<${top.word}>` })
    }
    return top
  }

  /** The tag owning a TAG `indent` in, without closing anything:  the innermost open at less indent. */
  private ownerOfTag(indent: number, word: TagWord): Frame | undefined {
    const continuesChain =
      word.category === "control" && this.frames.some((frame) => frame.chain && frame.indent === indent)
    if (continuesChain) return [...this.frames].reverse().find((frame) => frame.indent < indent)
    return [...this.frames].reverse().find((frame) => frame.indent < indent)
  }

  ////////////////
  // ## Words
  ////////////////

  /**
   * Does `word`, in a named closer, close `tag`:  its word, any word meaning the same, or its first word?
   * - An if-chain closes by any of its words, `</if>` closing an `<otherwise>`;  a loop by its own.
   */
  private isWordFor(word: string, tag: { category: string; kind: string; word: string }): boolean {
    const lower = word.toLowerCase().replace(/[ \t]+/g, " ")
    if (lower === tag.word.toLowerCase() || lower === firstWordOf(tag.word)) return true
    const { prefix, controls } = this.words
    if (tag.category === "code") return lower === prefix || lower === HTML_WORD
    if (tag.category !== "control") return false
    const control = controls[lower]
    return tag.kind === "for each" || isForSlot(tag.kind)
      ? control === tag.kind
      : !!control && control !== "for each" && !isForSlot(control)
  }

  /** Is `word` the first word of any of a page's tags, in our language? */
  private isPageWord(word: string) {
    const lower = word.toLowerCase()
    const { prefix, controls } = this.words
    if (lower === prefix || lower === HTML_WORD) return true
    return Object.keys(controls).some((key) => firstWordOf(key) === lower)
  }

  /** A line of a page's prose from `start` to `end`, whose text is `value`:  a comment, as code spell writes it. */
  private prose(text: string, start: number, end: number, value: string): SP.PageProseToken {
    const raw = text.slice(start, end).trimEnd()
    return new SP.PageProseToken({ start, raw, value, commentSymbol: "//", initialWhitespace: value ? " " : "" })
  }

  /** A line of prose;  a fence (` ``` `, `~~~`) opens a fenced code block there (`openFence`). */
  private proseOpeningFence(text: string, start: number, lineEnd: number) {
    const value = text.slice(start, lineEnd).trim()
    const fence = FENCE.exec(value)?.[1]
    if (fence) this.openFence = { fence }
    return this.prose(text, start, lineEnd, value)
  }

  /** A line of the fenced code block still open (`openFence`):  prose, as written;  its closing fence closes it. */
  private fencedLine(text: string, start: number, lineEnd: number): SP.PageProseToken {
    const { fence } = this.openFence!
    const value = text.slice(start, lineEnd).trim()
    const closing = FENCE.exec(value)
    if (closing?.[1]!.startsWith(fence) && !closing[2]) this.openFence = undefined
    return this.prose(text, start, lineEnd, value)
  }

  /**
   * A line of the comment still open (`openComment`), from `start`, its text from `from`:  to its `-->`, which closes
   * it, else to the line's end, leaving it open.
   */
  private comment(text: string, start: number, from: number, end: number): SP.PageCommentToken {
    const open = this.openComment!
    const lineEnd = lineEndOf(text, start, end)
    const close = text.indexOf(P.HTML_COMMENT_END, from)
    const closes = close >= 0 && close < lineEnd
    const textEnd = closes ? close : lineEnd
    const value = text.slice(from, textEnd).trim()
    const tokenEnd = closes ? close + P.HTML_COMMENT_END.length : start + text.slice(start, lineEnd).trimEnd().length
    const token = new SP.PageCommentToken({
      start,
      raw: text.slice(start, tokenEnd),
      value,
      commentSymbol: "//",
      initialWhitespace: value ? " " : ""
    })
    ;(token.record as CommentLineRecord).commentIndent = open.indent
    open.token ??= token
    if (closes) this.openComment = undefined
    return token
  }

  /** Our language's message `key`. */
  private message(key: SP.ParserMessageKey, params: Record<string, string>) {
    return this.language.parserMessage(key, params)
  }
}

/** What a `PageTokenizer` needs:  spell's tokenizer props, the file's language and spell's own tokenizer. */
export type PageTokenizerProps = P.TokenizerProps & {
  /** The file's language. */
  language: SP.Language
  /** Spell's own tokenizer, for a tag's name, values and phrase. */
  spell: P.Tokenizer
}

/** What a tag's word says it is, and where its word ends. */
type TagWord = {
  /** A page's tag, or `drawing`:  the lines `tokenizeDrawingLines()` reads, as if a page's body held them. */
  category: SP.PageTag["category"] | "drawing"
  kind: string
  word: string
  wordEnd: number
}

/**
 * `block` with each CODE BLOCK in it unwrapped (epic `elemental-spell` P12):  a `<spell>` or `<html>` line goes,
 * and the lines of its body join `block` in its place, so they parse as written, at that level.
 * - An `<html>` block's markup is the drawing's own lines, drawn as written, `<ui-button>`.
 * - Its closer stays, as a closer line, which compiles to nothing.
 * - Its JSX is code spell's:  `<div>` the web's, never a pack's component (`SP.markCodeSpell()`, J83).
 * - `html`:  unwrap `<html>` blocks too;  a view of the file's chunks keeps them (`unwrapsHtml`).
 * - SIDE EFFECT:  changes `block` (and the blocks in it) in place;  returns it.
 */
function unwrapCode(block: P.BlockToken, html = true): P.BlockToken {
  const items = block.tokens
  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    if (item instanceof P.BlockToken) unwrapCode(item, html)
    if (!(item instanceof P.LineToken)) continue
    const [head] = item.tokens
    if (!SP.isPageTag(head, "code")) continue
    if (head.tag.kind === "html" && !html) continue
    const next = items[index + 1]
    const body = next instanceof P.BlockToken ? unwrapCode(next, html).tokens : []
    // its drawings name tags as code spell does:  `<div>` is the web's (J83)
    for (const line of body) SP.markCodeSpell(line)
    items.splice(index, next instanceof P.BlockToken ? 2 : 1, ...body)
    index += body.length - 1
  }
  return block
}

/** A tag open where a line starts:  what `PageTokenizer.tokenizeLine()` takes and returns. */
export type PageOpenTag = Frame

/** A tag open while a file is tokenized. */
type Frame = TagWord & {
  /** How far in its line is. */
  indent: number
  /** Its head's token:  where an error that it was never closed goes. */
  token: P.Token
  /** Is it an if-chain, which an `<otherwise>` goes on with? */
  chain: boolean
}

/** A tag's head, read. */
type Head = {
  attributes: SP.PageAttribute[]
  phrase?: SP.PageText
  selfClosing: boolean
  /** Just past its `>` or `/>`. */
  end: number
  /** What's wrong with it. */
  errors: string[]
}

/** A closer:  `</>`, or `</word>`. */
type Closer = { start: number; raw: string; word: string | undefined }

/** `token`, with `errors` noted on it -- see `SP.addPageError()`. */
function withErrors<T extends P.Token>(token: T, errors: string[]): T {
  for (const error of errors) SP.addPageError(token, error)
  return token
}

/** The end of the line `start` is on, before `end`. */
function lineEndOf(text: string, start: number, end: number) {
  const at = text.indexOf("\n", start)
  return at < 0 || at > end ? end : at
}

/** A comment line's `record`:  the indent its comment's first line has. */
type CommentLineRecord = P.CommentTokenProps & { commentIndent?: number }

/** The indent of the first line of the comment `token` is a line of:  where `breakIntoLines()` puts its line. */
function commentIndentOf(token: SP.PageCommentToken): number | undefined {
  return (token.record as CommentLineRecord).commentIndent
}

/** Skip spaces, tabs and line breaks from `pos`. */
function skipSpace(text: string, pos: number, end: number) {
  while (pos < end && /\s/.test(text[pos]!)) pos++
  return pos
}

/** Just past the `"` closing the one at `start`;  its line's end when it has none. */
function closingQuote(text: string, start: number, end: number) {
  const close = text.indexOf('"', start + 1)
  return close < 0 || close >= end ? lineEndOf(text, start, end) : close + 1
}

/** The first word of `words`, lowercased. */
function firstWordOf(words: string) {
  return words.toLowerCase().split(/[ \t]+/)[0] ?? ""
}

/** A word of a tag:  letters, digits, `_` and `-`, accents too. */
const WORD = /^[\p{L}\p{M}\d_-]+/u

/** What a tag's word starts with:  a letter. */
const WORD_START = /^\p{L}/u

/**
 * A markdown fence starting a line of prose, ` ``` ` or `~~~` (three or more), and what follows it:  its language
 * (` ```spell `), none on a closing fence.
 */
const FENCE = /^(`{3,}|~{3,})\s*(.*)$/

/** An attribute's name:  a word, `:` and `.` allowed, as in markup. */
const ATTRIBUTE_NAME = /^[\p{L}\p{M}\d_:.@-]+/u

/** Is `kind` one of a `<for>`'s slots:  `<loading>`, `<empty>`, `<failed>`? */
const isForSlot = (kind: string) => kind === "for waiting" || kind === "for none" || kind === "for failed"

/** `<for>`'s attributes that may stand with no value, or be written with one:  so each ends a phrase, by itself. */
const FOR_FLAGS = new Set(["loading", "empty", "hide-empty"])

/** A comment after a line's closer:  `</>   // done`. */
const TRAILING_COMMENT = /^\s+\/\//

/** A closer:  `</>`, or `</word>`, spaces allowed before its `>`. */
const CLOSER = /^<\/((?:[\p{L}\p{M}\d_-]+(?:[ \t]+[\p{L}\p{M}\d_-]+)*)?)[ \t]*>/u

/** The most words a control's word has:  `de lo contrario si`. */
const MOST_WORDS_IN_A_TAG_WORD = 4

/** An `<html>` block's word:  markup drawn as written, `<ui-button>`, the same in every language (P16). */
const HTML_WORD = "html"
