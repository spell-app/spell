import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"

/**
 * Spell's tokenizer for a SPELLX file, spell's tag-shaped form (epic `elemental-spell` P6):  `Card.spellx`.
 * - A spellx file is read by spell's own rules (Q69):  this tokenizer makes its tags tokens a line of spell can hold,
 *   and `SP.SpellxTwin` reads each tag line as the code-spell line it means.
 * - At the START of a line (after its indent):
 *   - a tag's head, `<property "suit" one-of="...">`, is ONE `SP.SpellxTagToken`, though it run over several lines;
 *     so a tag line and its indented body are a line and its block, as an outline item and its body are (Q7)
 *   - a closer, `</>` or `</property>`, is a `SP.SpellxCloserToken`;  one ending a tag's own line too:
 *     `<alias "is a face card">if its rank is jack, queen or king</>`
 *   - a line a template holds that isn't a tag is PROSE (Q12), and so is a `<description>`'s or `<comment>`'s text
 *     (Q14):  each line one `SP.SpellxProseToken`, a comment as code spell writes it
 * - Everything else is spell's own tokens:  each body's spell, a drawing's markup (`<ui-text>`).
 * - Which words make a tag is the file's language's (`SP.SpellxWords`), and where it is:
 *   - in a template:  its members (`<property>`, `<action>`, `<on ...>` ...), and any word spellx doesn't know,
 *     which is an error
 *   - in a body of spell:  notes, and the controls (`<if ...>`)
 *   - in a drawing:  notes, controls and a placed part (`<draw "front" />`);  any other tag is markup
 * - Mistakes are noted on the tokens (`SP.addSpellxError()`), in the file's language:  a word spellx doesn't know, a closer that closes
 *   nothing, a tag never closed, a line indented less than its tag's body.  `SP.SpellxTwin` reports them on their line.
 * - Tags nest by INDENT, as spell's blocks do;  a closer is checked, never needed to find where a body ends.
 */
export class SpellxTokenizer extends P.Tokenizer {
  /** The file's language:  its spellx words, and what its messages say. */
  readonly language: SP.Language
  /** The language's spellx words. */
  readonly words: SP.SpellxWords
  /** Spell's own tokenizer, for a tag's name, attribute values and phrase. */
  readonly spell: P.Tokenizer

  constructor(props: SpellxTokenizerProps) {
    const { language, spell, ...tokenizerProps } = props
    super(tokenizerProps)
    this.language = language
    this.spell = spell
    const words = language.words.spellx ?? SP.Language.default.words.spellx
    if (!words) throw new TypeError("SpellxTokenizer():  no language has spellx's words;  English's should")
    this.words = words
    // each file starts with no tag open;  one still open at its end was never closed
    const tokenizeFile = this.tokenize
    this.tokenize = (text: string, start?: number, end?: number) => {
      this.frames = []
      this.inlineCloser = undefined
      this.closedChain = undefined
      const tokens = tokenizeFile(text, start, end)
      for (const frame of this.frames.reverse()) {
        for (const error of this.unclosed(frame)) SP.addSpellxError(frame.token, error)
      }
      this.frames = []
      return tokens
    }
    // a `<spell>` chunk is code spell where it sits:  its tag goes, its lines join the block around it
    const groupLines = this.breakIntoIndentedBlocks
    this.breakIntoIndentedBlocks = (tokens: P.Token[]) => groupLines(tokens).map(unwrapCode)
  }

  /** The tags open at the line being read, outermost first. */
  private frames: Frame[] = []
  /** A closer ending the line being read, which closes the tag it started with. */
  private inlineCloser: { start: number; tag: SP.SpellxTagToken } | undefined
  /** The if-chain the last closer closed, so an `<otherwise>` right after it says to drop that closer. */
  private closedChain: Frame | undefined
  /** An error for the next token, the first of its line:  a line indented less than its tag's body. */
  private lineError: string | undefined

  /** Match a single top-level token at `start`:  a spellx tag, closer or line of prose, else spell's. */
  matchTopTokens(text: string, start = 0, end = text.length) {
    if (this.inlineCloser?.start === start) return this.takeInlineCloser(text, start)
    if (this.isLineStart(text, start)) {
      const token = this.matchLineStart(text, start, end)
      if (token) return token
    }
    const token = super.matchTopTokens(text, start, end)
    if (token && this.lineError) {
      SP.addSpellxError(token, this.lineError)
      this.lineError = undefined
    }
    return token
  }

  ////////////////
  // ## A line's start
  ////////////////

  /**
   * What starts the line at `start`, if spellx's:  a closer, a tag, or a line of prose.
   * - `undefined`:  spell's own tokens, e.g. a body's spell, a drawing's markup.
   */
  private matchLineStart(text: string, start: number, end: number): P.Token | undefined {
    const indent = start - (text.lastIndexOf("\n", start - 1) + 1)
    const lineEnd = lineEndOf(text, start, end)
    if (text.startsWith("</", start)) {
      const closer = this.readCloser(text, start)
      if (closer) return this.closeTag(closer, indent)
    }
    if (text[start] === "<" && WORD_START.test(text[start + 1] ?? "")) {
      const word = this.tagWordAt(text, start)
      if (this.isTagHere(word, indent)) return this.readTag(text, start, end, indent, lineEnd, word)
    }
    const owner = this.ownerOfLine(indent)
    if (this.lineError) return undefined
    if (owner?.category === "template" || owner?.category === "note" || !this.frames.length) {
      if (this.isCommentStart(text, start)) return undefined
      const note = owner?.category === "note" ? (owner.kind as SP.SpellxNoteKind) : undefined
      return this.prose(text, start, lineEnd, text.slice(start, lineEnd).trim(), note)
    }
    return undefined
  }

  /**
   * A markup tag's head, as spell's, but its name may hold any letter:  a Spanish drawing writes `<botón>`
   * (epic `elemental-spell` P7, Q49);  `SpellJSX.componentTagFor()` finds its component.
   */
  get JSX_TAG_START() {
    return /^<(\p{L}[\p{L}\p{N}_.-]*)(\s*\/>|\s*>|\s+)/u
  }

  /**
   * Where markup's next element would start, for a run of them (`matchJSXElements()`):  never at a line a spellx tag
   * starts, e.g. `<if ...>` or `<for each ...>` after a drawing's `<toolbar />`, which is a tag of its own.
   */
  protected nextElementStart(text: string, from: number, end: number, indent: number): number {
    const next = super.nextElementStart(text, from, end, indent)
    if (next >= end || !this.isLineStart(text, next) || !WORD_START.test(text[next + 1] ?? "")) return next
    const lineIndent = next - (text.lastIndexOf("\n", next - 1) + 1)
    return this.isTagHere(this.tagWordAt(text, next), lineIndent) ? end : next
  }

  /** Is `start` a line's first character that isn't a space or tab? */
  private isLineStart(text: string, start: number) {
    const char = text[start]
    if (char === undefined || char === " " || char === "\t" || char === "\n" || char === "\r") return false
    const lineStart = text.lastIndexOf("\n", start - 1) + 1
    return /^[ \t]*$/.test(text.slice(lineStart, start))
  }

  /** Does a comment start at `start`, as code spell writes one:  `//`, `--` or a heading's `#`s? */
  private isCommentStart(text: string, start: number) {
    return text.startsWith("//", start) || text.startsWith("--", start) || text[start] === "#"
  }

  ////////////////
  // ## Tags
  ////////////////

  /**
   * What the tag at `start` says it is, by its word:  a template, a member, a note, a handler or a control.
   * - A handler's or control's word may be several (`otherwise if`):  the longest that fits wins,
   *   and `otherwise` takes no phrase, so `<otherwise it is red>` is no `<otherwise>`.
   */
  private tagWordAt(text: string, start: number): TagWord {
    const wordStart = start + 1
    const first = text.slice(wordStart).match(WORD)![0]
    const wordEnd = wordStart + first.length
    const lower = first.toLowerCase()
    const { prefix, templates, declarations, notes, handlers, controls } = this.words
    if (lower.startsWith(`${prefix}-`)) {
      const kind = templates[lower.slice(prefix.length + 1)]
      if (kind) return { category: "template", kind, word: first, wordEnd }
    }
    // a chunk of code spell, as written:  the bare prefix (epic `elemental-spell` P12)
    if (lower === prefix) return { category: "code", kind: "code", word: first, wordEnd }
    if (declarations[lower]) return { category: "declaration", kind: declarations[lower]!, word: first, wordEnd }
    if (notes[lower]) return { category: "note", kind: notes[lower]!, word: first, wordEnd }
    // the longest handler or control word written here
    const words: { end: number }[] = []
    let pos = wordStart
    while (words.length < MOST_WORDS_IN_A_TAG_WORD) {
      const word = text.slice(pos).match(WORD)?.[0]
      if (!word) break
      pos += word.length
      words.push({ end: pos })
      const gap = text.slice(pos).match(/^[ \t]+/)?.[0]
      if (!gap) break
      pos += gap.length
    }
    for (let count = words.length; count > 0; count--) {
      const end = words[count - 1]!.end
      const written = text.slice(wordStart, end)
      const key = written.toLowerCase().replace(/[ \t]+/g, " ")
      if (handlers[key]) return { category: "handler", kind: handlers[key]!, word: written, wordEnd: end }
      const control = controls[key]
      if (!control) continue
      if (control === "otherwise" && this.phraseFrom(text, end).text) continue
      return { category: "control", kind: control, word: written, wordEnd: end }
    }
    return { category: "unknown", kind: first, word: first, wordEnd }
  }

  /**
   * Is a tag with `word`, on a line `indent` in, spellx's here -- else spell's markup?
   * - At the top, and among a template's members:  every tag;  a word spellx doesn't know is an error.
   * - In a body of spell:  notes and controls.
   * - In a drawing (or a control in one):  notes, controls and a placed part, `<draw "front" />`.
   * - In a menu:  its actions, `<action "start a new game" />` (Q34, Q41;  P10 reads them).
   * - In a note:  none;  its text is prose.
   */
  private isTagHere(word: TagWord, indent: number): boolean {
    const owner = this.ownerOfTag(indent, word)
    if (!owner || owner.category === "template") return true
    if (owner.category === "note" || owner.category === "code") return false
    if (owner.kind === "menu" && word.category === "declaration" && word.kind === "action") return true
    if (word.category === "note" || word.category === "control") return true
    return word.category === "declaration" && word.kind === "draw" && this.isInDrawing()
  }

  /** Are we in a drawing:  inside a `<draw>`, maybe in a control in it? */
  private isInDrawing() {
    return this.frames.some((frame) => frame.category === "declaration" && frame.kind === "draw")
  }

  /**
   * Read the tag at `start`:  its head, one token, and what it opens.
   * - A note's head and text are prose:  `<comment>...</>` is one line of it.
   * - Its body on the same line is closed by a closer ending the line:  `<alias "x">if ...</>`.
   */
  private readTag(text: string, start: number, end: number, indent: number, lineEnd: number, word: TagWord) {
    const isPhrased = word.category === "handler" || word.category === "control"
    const head = isPhrased ? this.readPhraseHead(text, word) : this.readNamedHead(text, start, end, word)
    const raw = text.slice(start, head.end)
    const tag: SP.SpellxTag = {
      category: word.category,
      kind: word.kind,
      word: word.word,
      name: head.name,
      attributes: head.attributes,
      phrase: head.phrase,
      selfClosing: head.selfClosing
    }
    const continuing = this.continuesChain(word, indent)
    const errors: string[] = [...head.errors]
    if (!continuing) errors.push(...this.closeSiblings(indent))
    if (word.category === "control" && (word.kind === "otherwise" || word.kind === "otherwise if") && !continuing) {
      errors.push(this.otherwiseError(word))
    }
    errors.push(...this.placementErrors(word))
    const rest = text.slice(head.end, lineEnd)
    const closerAtEnd = rest.trim() && !head.selfClosing ? this.closerEnding(text, head.end, lineEnd) : undefined

    if (word.category === "note") {
      const note = word.kind as SP.SpellxNoteKind
      if (closerAtEnd) {
        const token = this.prose(text, start, lineEnd, text.slice(head.end, closerAtEnd.start).trim(), note)
        if (closerAtEnd.word && !this.isWordFor(closerAtEnd.word, word))
          errors.push(this.message("spellx-mismatched-closer", { closer: closerAtEnd.raw, open: `<${word.word}>` }))
        return withErrors(token, errors)
      }
      const token = this.prose(text, start, rest.trim() ? lineEnd : head.end, rest.trim(), note)
      if (!head.selfClosing) this.open(word, indent, token)
      return withErrors(token, errors)
    }

    const token = new SP.SpellxTagToken({ start, raw, value: raw, tag })
    if (continuing) this.continueChain(continuing, token)
    else if (!head.selfClosing && closerAtEnd) this.inlineCloser = { start: closerAtEnd.start, tag: token }
    else if (!head.selfClosing) this.open(word, indent, token)
    return withErrors(token, errors)
  }

  /** Errors for a tag where it can't go:  a member outside a template, a template inside one. */
  private placementErrors(word: TagWord): string[] {
    const owner = this.frames.at(-1)
    const tag = `<${word.word}>`
    if (word.category === "unknown") return [this.unknownWordError(word)]
    if (word.category === "template" && owner)
      return [this.message("spellx-nested-template", { tag, outer: `<${owner.word}>` })]
    if (word.category === "code" && owner && owner.category !== "template")
      return [this.message("spellx-nested-template", { tag, outer: `<${owner.word}>` })]
    if (word.category !== "template" && word.category !== "note" && word.category !== "code" && !owner)
      return [this.message("spellx-outside-template", { tag, template: `<${this.words.prefix}-view>` })]
    return []
  }

  /** `word` isn't spellx's:  the error, naming the closest word. */
  private unknownWordError(word: TagWord) {
    const { prefix, templates, declarations, notes, handlers } = this.words
    const known = [
      ...Object.keys(templates).map((it) => `${prefix}-${it}`),
      ...Object.keys(declarations),
      ...Object.keys(notes),
      ...Object.keys(handlers)
    ]
    const suggestion = closestWord(word.word.toLowerCase(), known)
    return this.message("spellx-unknown-word", { tag: `<${word.word}>`, suggestion: `<${suggestion}>` })
  }

  /** `<otherwise>` with no open `<if>`:  the error, saying to drop the closer before it if that closed one. */
  private otherwiseError(word: TagWord) {
    const ifWord = Object.keys(this.words.controls).find((key) => this.words.controls[key] === "if") ?? "if"
    if (this.closedChain) return this.message("spellx-otherwise-after-closed-if", { tag: `<${word.word}>`, if: ifWord })
    return this.message("spellx-otherwise-without-if", { tag: `<${word.word}>`, if: `<${ifWord}>` })
  }

  ////////////////
  // ## Heads
  ////////////////

  /**
   * Read a named tag's head, from its word:  an optional quoted name, then attributes, to its `>` or `/>`.
   * - `name="..."` names it too (Q39).
   * - It may run over several lines.
   */
  private readNamedHead(text: string, start: number, end: number, word: TagWord): Head {
    const head: Head = { attributes: [], selfClosing: false, end, errors: [] }
    const checks = !(word.category === "declaration" && word.kind === "event") && word.category !== "unknown"
    let pos = word.wordEnd
    while (pos < end) {
      pos = skipSpace(text, pos, end)
      if (text.startsWith("/>", pos)) {
        head.selfClosing = true
        head.end = pos + 2
        return head
      }
      const char = text[pos]
      if (char === ">") {
        head.end = pos + 1
        return head
      }
      if (char === '"' && !head.name && !head.attributes.length) {
        const close = closingQuote(text, pos, end)
        head.name = this.textAt(text, pos + 1, close - 1, true)
        pos = close
        continue
      }
      const name = char !== undefined ? text.slice(pos).match(ATTRIBUTE_NAME)?.[0] : undefined
      if (!name) {
        pos++
        continue
      }
      const attribute = this.readAttribute(text, pos, end, name)
      pos = attribute.end
      if (attribute.name === "name" && !head.name && attribute.value) {
        head.name = attribute.value
        continue
      }
      if (checks && !(name.toLowerCase() in this.words.attributes)) {
        const known = Object.keys(this.words.attributes)
        head.errors.push(
          this.message("spellx-unknown-attribute", {
            tag: `<${word.word}>`,
            attribute: name,
            suggestion: closestWord(name.toLowerCase(), known)
          })
        )
      }
      const { end: _end, ...rest } = attribute
      head.attributes.push(rest)
    }
    head.errors.push(this.message("spellx-unclosed-head", { tag: `<${word.word}>` }))
    return head
  }

  /** Read one attribute at `start`, named `word`:  `name`, `name="value"`, `name={spell}`, or `name=value`. */
  private readAttribute(text: string, start: number, end: number, word: string): SP.SpellxAttribute & { end: number } {
    const attribute: SP.SpellxAttribute & { end: number } = {
      name: this.words.attributes[word.toLowerCase()] ?? word,
      word,
      start,
      end: start + word.length
    }
    let pos = skipSpace(text, start + word.length, end)
    if (text[pos] !== "=") return attribute
    pos = skipSpace(text, pos + 1, end)
    const quote = text[pos]
    if (quote === '"' || quote === "{") {
      const close = quote === "{" ? matchingBrace(text, pos, end) : closingQuote(text, pos, end)
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

  /** Read a handler's or control's head, from its word:  its phrase, to its `>`. */
  private readPhraseHead(text: string, word: TagWord): Head {
    const phrase = this.phraseFrom(text, word.wordEnd)
    const head: Head = { attributes: [], selfClosing: phrase.selfClosing, end: phrase.end, errors: [] }
    if (!phrase.closed) head.errors.push(this.message("spellx-unclosed-head", { tag: `<${word.word}>` }))
    if (phrase.text) head.phrase = this.textAt(text, phrase.start, phrase.start + phrase.text.length, false)
    else if (word.kind !== "otherwise")
      head.errors.push(this.message("spellx-missing-phrase", { tag: `<${word.word}>`, word: word.word }))
    return head
  }

  /**
   * The phrase from `start` to its tag's `>`:  a `>` inside a string, parens or braces is the phrase's (Q45),
   * and a `/` just before the `>` ends the tag, not the phrase.
   * - Only `"` starts a string:  an apostrophe is spell's possessive (P3, J25).  A phrase ends with its line.
   */
  private phraseFrom(text: string, start: number) {
    let pos = start
    let depth = 0
    let inString = false
    while (pos < text.length) {
      const char = text[pos]!
      if (char === "\n" && !inString && depth === 0) break
      if (inString) {
        if (char === '"') inString = false
      } else if (char === '"') inString = true
      else if (char === "(" || char === "{" || char === "[") depth++
      else if ((char === ")" || char === "}" || char === "]") && depth > 0) depth--
      else if (char === ">" && depth === 0) break
      pos++
    }
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
  private textAt(text: string, start: number, end: number, quoted: boolean): SP.SpellxText {
    const tokens = start < end ? this.spell.tokenize(text, start, end) : []
    const result: SP.SpellxText = { text: text.slice(start, end), start, tokens }
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
   * The closer ending the line from `start` to `lineEnd`:  `...jack, queen or king</>`.
   * - Only one spellx closes:  `</>`, or a spellx word's;  a line of markup ending `</ui-text>` is markup.
   * - A comment may follow it, as on any line of spell (epic `elemental-spell` P12):
   *   `<property "value">its rank</>   // ace = 1`
   */
  private closerEnding(text: string, start: number, lineEnd: number): Closer | undefined {
    const line = text.slice(start, lineEnd).trimEnd()
    for (let at = line.lastIndexOf("</"); at >= 0; at = at ? line.lastIndexOf("</", at - 1) : -1) {
      const closer = this.readCloser(text, start + at)
      if (!closer) continue
      const after = line.slice(at + closer.raw.length)
      if (after && !TRAILING_COMMENT.test(after)) continue
      return !closer.word || this.isSpellxWord(closer.word) ? closer : undefined
    }
    return undefined
  }

  /**
   * The closer token for `closer`, on a line `indent` in:  it closes the tag open at that indent.
   * - Tags open deeper were never closed;  one at no such indent means it closes nothing.
   */
  private closeTag(closer: Closer, indent: number): SP.SpellxCloserToken {
    const token = new SP.SpellxCloserToken({
      start: closer.start,
      raw: closer.raw,
      value: closer.raw,
      word: closer.word
    })
    const errors: string[] = []
    while (this.frames.length && this.frames.at(-1)!.indent > indent) {
      const unclosed = this.frames.pop()!
      for (const error of this.unclosed(unclosed)) SP.addSpellxError(unclosed.token, error)
    }
    const frame = this.frames.at(-1)
    if (!frame || frame.indent !== indent) {
      errors.push(this.message("spellx-unexpected-closer", { closer: closer.raw }))
      return withErrors(token, errors)
    }
    this.frames.pop()
    this.closedChain = frame.chain ? frame : undefined
    if (closer.word && !this.isWordFor(closer.word, frame))
      errors.push(this.message("spellx-mismatched-closer", { closer: closer.raw, open: `<${frame.word}>` }))
    return withErrors(token, errors)
  }

  /** The closer ending a tag's own line, `<alias "x">if ...</>`:  checked against that tag. */
  private takeInlineCloser(text: string, start: number): SP.SpellxCloserToken {
    const { tag } = this.inlineCloser!
    this.inlineCloser = undefined
    const closer = this.readCloser(text, start)!
    const token = new SP.SpellxCloserToken({ start, raw: closer.raw, value: closer.raw, word: closer.word })
    if (closer.word && !this.isWordFor(closer.word, tag.tag))
      SP.addSpellxError(
        token,
        this.message("spellx-mismatched-closer", { closer: closer.raw, open: `<${tag.tag.word}>` })
      )
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

  /**
   * Close every tag open at `indent` or deeper, for a tag on a line `indent` in:  none was closed.
   * - Returns no errors:  each goes on the tag never closed.
   */
  private closeSiblings(indent: number): string[] {
    while (this.frames.length && this.frames.at(-1)!.indent >= indent) {
      const frame = this.frames.pop()!
      for (const error of this.unclosed(frame)) SP.addSpellxError(frame.token, error)
    }
    return []
  }

  /** The error for `frame`, a tag never closed. */
  private unclosed(frame: Frame): string[] {
    return [this.message("spellx-unclosed-tag", { tag: `<${frame.word}>` })]
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
      for (const error of this.unclosed(frame)) SP.addSpellxError(frame.token, error)
    }
    return chain
  }

  /** Go on with if-chain `chain`:  its next branch's head is `token`. */
  private continueChain(chain: Frame, token: P.Token) {
    chain.token = token
  }

  /**
   * The tag owning a line `indent` in that isn't a tag or closer:  the innermost open at less indent.
   * - SIDE EFFECT:  closes the tags open deeper than it, never closed;  and for one open AT its indent, notes the
   *   line's error (`lineError`):  it's indented less than that tag's body, whose line it's read as (spell, not prose).
   */
  private ownerOfLine(indent: number): Frame | undefined {
    while (this.frames.length && this.frames.at(-1)!.indent > indent) {
      const frame = this.frames.pop()!
      for (const error of this.unclosed(frame)) SP.addSpellxError(frame.token, error)
    }
    const top = this.frames.at(-1)
    if (top && top.indent === indent && top.category !== "template") {
      this.lineError = this.message("spellx-indented-less", { tag: `<${top.word}>` })
    }
    return top
  }

  /** The tag owning a TAG `indent` in, without closing anything:  the innermost open at less indent. */
  private ownerOfTag(indent: number, word: TagWord): Frame | undefined {
    if (this.continuesChainAt(word, indent)) return [...this.frames].reverse().find((frame) => frame.indent < indent)
    return [...this.frames].reverse().find((frame) => frame.indent < indent)
  }

  /** Could `word` go on with an if-chain open at `indent`? */
  private continuesChainAt(word: TagWord, indent: number) {
    return word.category === "control" && this.frames.some((frame) => frame.chain && frame.indent === indent)
  }

  ////////////////
  // ## Words
  ////////////////

  /** Does `word`, in a named closer, close `tag`:  its word, any word meaning the same, or its first word? */
  private isWordFor(word: string, tag: { category: string; kind: string; word: string }): boolean {
    const lower = word.toLowerCase()
    if (lower === tag.word.toLowerCase() || lower === firstWordOf(tag.word)) return true
    const { prefix, templates, declarations, notes, handlers, controls } = this.words
    switch (tag.category) {
      case "code":
        return lower === prefix
      case "template":
        return lower.startsWith(`${prefix}-`) && templates[lower.slice(prefix.length + 1)] === tag.kind
      case "declaration":
        return declarations[lower] === tag.kind
      case "note":
        return notes[lower] === tag.kind
      case "handler":
        return handlers[lower] === tag.kind
      case "control": {
        // an if-chain closes by any of its words;  a loop by its own
        const control = controls[lower]
        return tag.kind === "for each" ? control === "for each" : !!control && control !== "for each"
      }
    }
    return false
  }

  /** Is `word` any spellx word, in our language? */
  private isSpellxWord(word: string) {
    const lower = word.toLowerCase()
    const { prefix, templates, declarations, notes, handlers, controls } = this.words
    if (lower.startsWith(`${prefix}-`) && lower.slice(prefix.length + 1) in templates) return true
    return [declarations, notes, handlers, controls].some((table) =>
      Object.keys(table).some((key) => firstWordOf(key) === lower)
    )
  }

  /**
   * A line of prose from `start` to `end`, whose text is `value`:  a comment, as code spell writes it.
   * - `note`:  the note it's part of, its head line too, e.g. a `<description>`'s.
   */
  private prose(
    text: string,
    start: number,
    end: number,
    value: string,
    note?: SP.SpellxNoteKind
  ): SP.SpellxProseToken {
    const raw = text.slice(start, end).trimEnd()
    const record: SP.SpellxProseTokenProps = {
      start,
      raw,
      value,
      commentSymbol: "//",
      initialWhitespace: value ? " " : "",
      note
    }
    return new SP.SpellxProseToken(record)
  }

  /** Our language's message `key`. */
  private message(key: SP.ParserMessageKey, params: Record<string, string>) {
    return this.language.parserMessage(key, params)
  }
}

/** What a `SpellxTokenizer` needs:  spell's tokenizer props, the file's language and spell's own tokenizer. */
export type SpellxTokenizerProps = P.TokenizerProps & {
  /** The file's language. */
  language: SP.Language
  /** Spell's own tokenizer, for a tag's name, values and phrase. */
  spell: P.Tokenizer
}

/** What a tag's word says it is, and where its word ends. */
type TagWord = {
  category: SP.SpellxTag["category"]
  kind: string
  word: string
  wordEnd: number
}

/**
 * `block` with each CODE CHUNK in it unwrapped (epic `elemental-spell` P12):  a `<spell>` line goes, and the lines
 * of its body join `block` in its place, so they parse as the code spell they are, at that level.
 * - A file's top level:  its functions, tests and starting code;  a template's:  members with no tag of their own.
 * - Its closer stays, as a closer line, which compiles to nothing.
 * - SIDE EFFECT:  changes `block` (and the blocks in it) in place;  returns it.
 */
function unwrapCode(block: P.BlockToken): P.BlockToken {
  const items = block.tokens
  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    if (item instanceof P.BlockToken) unwrapCode(item)
    if (!(item instanceof P.LineToken)) continue
    const [head] = item.tokens
    if (!(head instanceof SP.SpellxTagToken) || head.tag.category !== "code") continue
    const next = items[index + 1]
    const body = next instanceof P.BlockToken ? unwrapCode(next).tokens : []
    items.splice(index, next instanceof P.BlockToken ? 2 : 1, ...body)
    index += body.length - 1
  }
  return block
}

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
  name?: SP.SpellxText
  attributes: SP.SpellxAttribute[]
  phrase?: SP.SpellxText
  selfClosing: boolean
  /** Just past its `>` or `/>`. */
  end: number
  /** What's wrong with it. */
  errors: string[]
}

/** A closer:  `</>`, or `</word>`. */
type Closer = { start: number; raw: string; word: string | undefined }

/** `token`, with `errors` noted on it -- see `SP.addSpellxError()`. */
function withErrors<T extends P.Token>(token: T, errors: string[]): T {
  for (const error of errors) SP.addSpellxError(token, error)
  return token
}

/** The end of the line `start` is on, before `end`. */
function lineEndOf(text: string, start: number, end: number) {
  const at = text.indexOf("\n", start)
  return at < 0 || at > end ? end : at
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

/** Just past the `}` matching the `{` at `start`, strings and nested braces skipped. */
function matchingBrace(text: string, start: number, end: number) {
  let depth = 0
  let inString = false
  for (let pos = start; pos < end; pos++) {
    const char = text[pos]
    if (inString) {
      if (char === '"') inString = false
    } else if (char === '"') inString = true
    else if (char === "{") depth++
    else if (char === "}" && --depth === 0) return pos + 1
  }
  return end
}

/** The first word of `words`, lowercased. */
function firstWordOf(words: string) {
  return words.toLowerCase().split(/[ \t]+/)[0] ?? ""
}

/** The word of `words` closest to `word`:  the one sharing the longest start, else the first. */
function closestWord(word: string, words: string[]): string {
  let best = words[0] ?? word
  let bestShared = -1
  for (const each of words) {
    let shared = 0
    while (shared < word.length && word[shared] === each[shared]) shared++
    if (shared > bestShared) {
      best = each
      bestShared = shared
    }
  }
  return best
}

/** A word of a tag:  letters, digits, `_` and `-`, accents too. */
const WORD = /^[\p{L}\p{M}\d_-]+/u

/** What a tag's word starts with:  a letter. */
const WORD_START = /^\p{L}/u

/** An attribute's name:  a word, `:` and `.` allowed, as in markup. */
const ATTRIBUTE_NAME = /^[\p{L}\p{M}\d_:.@-]+/u

/** A closer:  `</>`, or `</word>`, spaces allowed before its `>`. */
/** A comment after a line's closer:  `</>   // ace = 1`. */
const TRAILING_COMMENT = /^\s+\/\//

const CLOSER = /^<\/([\p{L}\p{M}\d_-]*)[ \t]*>/u

/** The most words a handler's or control's word has:  `de lo contrario si`. */
const MOST_WORDS_IN_A_TAG_WORD = 4
