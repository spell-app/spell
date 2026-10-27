import { Logger } from "spell/util/spell/Logger"
import { P } from "spell-parser/parser"

/**
 * Tokenizer class for parsing text into a stream of tokens.
 * - TODO: error checking / reporting, especially in JSX expressions.
 * - TODO: have normal `tokenize` stick whitespace elements in the stream, then `tokenizeLines()` takes them out?
 */
export class Tokenizer {
  /** Build a `Tokenizer`, copying any `props` (e.g. `whitespacePolicy`, `quoteSymbols`) onto `this`. */
  constructor(props: TokenizerProps = {}) {
    Object.assign(this, props)
  }

  /** Leave all whitespace by default. */
  whitespacePolicy: P.WhitespacePolicy = P.WhitespacePolicy.ALL

  /**
   * JSX tags whose contents are RAW TEXT, as HTML's `<style>`:  one `JSXTextToken` up to the end tag,
   * so `{`, `<` and `}` there are just text.
   * - e.g. spell's `["css"]`:  `<css> .red { color: red } </css>`
   * - None by default.
   */
  rawTextTags: string[] = []

  /**
   * JSX tags whose first attribute may be a bare quoted NAME, as spellx names its tags:  `<example "one counter">`
   * reads as `<example name="one counter">` (epic `elemental-spell` P16).
   * - e.g. spell's `["example", "ejemplo"]`.
   * - None by default:  anywhere else a bare string in a tag is no attribute.
   */
  quotedNameTags: string[] = []

  /**
   * Does `</>` close the innermost open JSX element, as in a spellx drawing (`<text>{its rank}</>`;  epic
   * `elemental-spell` P7, Q40)?
   * - Off by default:  in code spell, `</>` only ends a fragment, `<>...</>`.
   */
  emptyEndTagCloses = false

  /**
   * CHAIN tags inside markup, by their words:  `<if its done is yes>`, `<otherwise if ...>`, `<otherwise>`
   * (epic `elemental-spell`, Owen 2026-10-25):  each word, lowercase, => which kind of branch it starts.
   * - Its head is a PHRASE up to its `>`, not attributes:  the phrase is its `phrase`, a `JSXExpressionToken` as if
   *   written `{...}`.
   * - A branch ends where the next branch of its chain starts, unclosed;  the chain's last branch ends at `</>`
   *   (in any form of spell) or a closer naming a chain word, `</if>`, `</otherwise>`:  ONE closer for the chain.
   * - e.g. spell's English and Spanish words, `if`, `otherwise if`, `si no` ...
   * - None by default:  `<if>` is then an element like any other.
   */
  chainTags: Record<string, P.JSXChainKind> = {}

  /**
   * Does markup hold COMMENTS, never drawn (epic `elemental-spell`, Owen 2026-10-26)?  Each is a `JSXCommentToken`:
   * - `<!-- ... -->`, anywhere among an element's children, over as many lines as it takes
   * - a line of its own starting `//`, as a comment line is everywhere else in spell
   * - Not in a raw-text tag's contents (`rawTextTags`):  a `<markdown>` block's `<!--` and `//` are its own.
   * - Off by default:  markup's `<!--` is then no tag, and `//` is text.
   */
  markupComments = false

  /**
   * Quote symbols recognized by `matchText`.
   * - REFACTOR: backtick?  left/right quotes, e.g. `""` and `''`?
   */
  quoteSymbols = [P.DOUBLE_QUOTE, P.SINGLE_QUOTE] as const

  /** Debug logger. */
  logger = new Logger({ prefix: "tokenizer", level: Logger.ERROR })

  /**
   * Read `¬` as `\n` and `∆` as `\t` in `tokenize()`:  stand-ins that keep test fixtures compact.
   * - `false` where they are real characters, e.g. `RulexTokenizer`.
   */
  rewriteFixtureChars = true

  /**
   * Tokenize `text` between `start` and `end` into an array of `Token`s.
   * - NOTE: `¬` and `∆` are treated as stand-ins for `\n` and `\t` -- see `rewriteFixtureChars`.
   */
  tokenize = (text: string, start = 0, end?: number) => {
    // Replace `¬` with `\n` and `∆` with `\t`.
    // We use these to see tabs and returns in debugging output more easily.
    if (this.rewriteFixtureChars) text = text.replace(/¬/g, "\n").replace(/∆/g, "\t")

    // Make sure `end` is a number within the text length.
    if (typeof end !== "number" || end > text.length) end = text.length
    // quick return out of range or only whitespace
    if (start >= end || !text.trim()) return []

    // Process our top-level rules.
    const tokens = this.consume(this.matchTopTokens, text, start, end)
    if (!tokens || tokens.length === 0) return []

    const lastEnd = tokens[tokens.length - 1].next
    if (lastEnd !== end) {
      this.logger.warn("tokenize(): didn't consume: `", text.slice(start, end), "`")
    }

    // Set `line` and `ch`(ar), which is sometimes more useful than the raw `start` offset within the file.
    this.setPositions(tokens, text)

    // Return tokens filtered according to our whitespace policy
    switch (this.whitespacePolicy) {
      case P.WhitespacePolicy.NONE:
        return this.filterWhitespace(tokens, P.WhitespaceToken)
      case P.WhitespacePolicy.LEADING_ONLY:
        return this.filterWhitespace(tokens, P.InlineWhitespaceToken)
      default:
        return tokens
    }
  }

  /**
   * Set `line` / `ch` on `tokens` and every token nested in them, worked out from each `start` in `text`.
   * - Counts EVERY `\n` in `text`, so multi-line JSX / strings don't throw later lines off.
   * - NOTE: each `start` must be absolute within `text`, even when tokenizing from part way through it.
   * - SIDE EFFECT: writes `record.line` / `record.ch`.
   */
  setPositions(tokens: P.Token[], text: string) {
    const lineStarts = P.getLineStarts(text)
    Tokenizer.forEachToken(tokens, (token) => {
      const { line, ch } = P.positionForOffset(lineStarts, token.start)
      token.record.line = line
      token.record.ch = ch
    })
  }

  /**
   * Move `tokens` and every token nested in them by `delta` characters, then re-work-out their `line` / `ch`
   * in `text` -- for tokens we're keeping after an edit earlier in the text.
   * - SIDE EFFECT: writes `record.start` / `record.line` / `record.ch`.
   */
  moveTokens(tokens: P.Token[], delta: number, text: string) {
    Tokenizer.shiftTokens(tokens, delta)
    this.setPositions(tokens, text)
  }

  /**
   * Move `tokens` and every token nested in them by `delta` characters -- `start` ONLY.
   * - `line` / `ch` are left as they were.
   * - For tokens parsed from a copy of some text, to put them where that text sits in the file.
   * - SIDE EFFECT: writes `record.start`.
   */
  static shiftTokens(tokens: P.Token[], delta: number) {
    if (delta) Tokenizer.forEachToken(tokens, (token) => (token.record.start += delta))
  }

  /**
   * Call `callback` for each of `tokens` and every token nested inside them, parents first:
   * - `LineToken` tokens + its `newline`
   * - `BlockToken` lines / blocks
   * - JSX element attributes + children, a fragment's children, attribute values, expression `contents` when it's a token
   * - JSX expression `innerTokens`, once a rule has parsed its `{...}` contents
   * - any other token's `nested` ones, e.g. a spellx tag's
   */
  static forEachToken(tokens: P.Token[], callback: (token: P.Token) => void) {
    tokens.forEach(visit)

    /** `callback` for `token`, then recurse into anything nested inside it.  Ignores non-tokens. */
    function visit(token: unknown) {
      if (!(token instanceof P.Token)) return
      callback(token)
      if (token instanceof P.LineToken) {
        token.tokens.forEach(visit)
        visit(token.newline)
      } else if (token instanceof P.BlockToken) {
        token.tokens.forEach(visit)
      } else if (token instanceof P.JSXElementToken) {
        token.attributes?.forEach(visit)
        token.children?.forEach(visit)
      } else if (token instanceof P.JSXFragmentToken) {
        token.children?.forEach(visit)
      } else if (token instanceof P.JSXAttributeToken) {
        visit(token.value)
      } else if (token instanceof P.JSXExpressionToken) {
        visit(token.contents)
        token.innerTokens?.forEach(visit)
      } else {
        token.nested?.forEach(visit)
      }
    }
  }

  /**
   * Join `tokens` back into their source form.
   * - Pass `start` and `end` to restrict to a subset of `tokens`.
   * - NOTE: we `trim()` the result, which is generally what's desired.
   */
  static join(tokens: P.Token[], start = 0, end = tokens.length) {
    if (start !== 0 || end !== tokens.length) tokens = tokens.slice(start, end)
    return tokens.join("").trim()
  }

  /**
   * Filter whitespace tokens of the specified type from `tokens`.
   * - Note that we add whitespace filtered out to `token.whitespace` of the PREVIOUS token.
   *   This allows us to reconstruct the stream exactly by just looking at the filtered tokens.
   * - NOTE: filtered whitespace tokens at the start will be lost.
   */
  filterWhitespace(tokens: P.Token[], whitespaceType: typeof P.WhitespaceToken) {
    const results = []
    for (let i = 0, token; (token = tokens[i]); i++) {
      if (token instanceof whitespaceType) {
        const previous = tokens[i - 1]
        if (previous) previous.record.whitespace = (previous.record.whitespace || "") + token.value
      } else {
        results.push(token)
      }
    }
    return results
  }

  /**
   * Repeatedly execute a `method` (bound to `this) which returns a `[result, nextStart]` or `undefined`.
   * Places matched results together in `results` array and returns `[results, nextStart]` for the entire set.
   * Stops if `method` doesn't return anything, or if calling `method` is unproductive.
   */
  consume<T extends P.Token = P.Token>(
    method: P.TokenMatcher<T>,
    text: string,
    start = 0,
    end?: number,
    results: T[] = []
  ): T[] | undefined {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    // process rules repeatedly until we get to the end
    let nextStart = start
    while (nextStart < end) {
      const token = method.call(this, text, nextStart, end)
      if (!token) break
      results.push(token)

      if (token.next === nextStart) {
        this.logger.warn("error: got token but didn't advance in stream")
        break
      }
      nextStart = token.next
    }
    return results
  }

  /** Match a single top-level token at `start` of `text`.  */
  matchTopTokens(text: string, start?: number, end?: number) {
    return (
      this.matchWhitespace(text, start, end) ||
      this.matchWord(text, start, end) ||
      this.matchNumber(text, start, end) ||
      this.matchNewline(text, start, end) ||
      this.matchJSXElements(text, start, end) ||
      this.matchText(text, start, end) ||
      this.matchComment(text, start, end) ||
      this.matchSymbol(text, start, end)
    )
  }

  ////////////////
  // ## Whitespace
  ////////////////

  /**
   * Convert a run of spaces and/or tabs into:
   * - an `IndentToken` if it occurs at the begining of `text` or after a newline, or
   * - an `InlineWhitespaceToken` if it occurs in the middle of a line.
   */
  matchWhitespace = (text: string, start = 0, end?: number): P.IndentToken | P.InlineWhitespaceToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    const whitespaceEnd = this.eatWhitespace(text, start, end)
    // forget it if no forward motion
    if (whitespaceEnd === start) return undefined

    const value = text.slice(start, whitespaceEnd)
    const props = {
      value,
      raw: value,
      start
    }
    // if at start of text or after a newline, return an `IndentToken`
    if (start === 0 || text[start - 1] === "\n") return new P.IndentToken(props)
    // otherwise, return an `InlineWhitespaceToken`
    return new P.InlineWhitespaceToken(props)
  }

  /**
   * Match a single newline character at `start` of `text`, as `NewlineToken`.
   * - NOTE: this assumes we're in utf-8 mode, so `\n` is a single character.
   */
  matchNewline = (text: string, start = 0, end?: number): P.NewlineToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end || text[start] !== "\n") return undefined
    return new P.NewlineToken({ start })
  }

  ////////////////
  // ## Word / Symbol / Text
  ////////////////

  /** Regex matching first character allowed to start a `WordToken` -- a letter in any script:  `a`, `ñ`, `É`. */
  get WORD_START() {
    return /\p{L}/u
  }
  /** Regex matching subsequent `WordToken` characters -- letters, accents, digits, `_` or `-`. */
  get WORD_CHAR() {
    return /^[\p{L}\p{M}\d_-]/u
  }

  /**
   * Match a single `word` at `start` of `text` at character `start`, as `WordToken`.
   * - e.g. `hello`, `_world`, `foo-bar`, `foo_bar_3`, etc.
   */
  matchWord = (text: string, start = 0, end?: number): P.WordToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    // Make sure we start with a letter or underscore.
    if (!this.WORD_START.test(text[start])) return undefined

    let wordEnd = start + 1
    while (wordEnd < end && this.WORD_CHAR.test(text[wordEnd])) {
      wordEnd++
    }
    if (wordEnd === start) return undefined

    const raw = text.slice(start, wordEnd)
    // One spelling per word:  `é` typed as one character or as `e` plus an accent is the same word (NFC).
    // `raw` and `start` stay the text's own, so positions still line up with the source.
    return new P.WordToken({ value: raw.normalize("NFC"), raw, start })
  }

  /**
   * Match a single "symbol" character at `start` of `text`, as `SymbolToken`.
   * - NOTE: This does not do any checking, it just blindly uses the character in question.
   * - You should make sure all other possible rules have been exhausted first.
   */
  matchSymbol = (text: string, start = 0, end?: number): P.SymbolToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined
    const value = text[start]
    return new P.SymbolToken({
      value,
      raw: value,
      start
    })
  }

  /**
   * Match a quoted text literal string at `start` of `text`, as `TextToken`.
   * - e.g. `"hello"`, `'hello world'`, `"text \" with escaped quotes"`, etc.
   * - TESTME:  not sure the escaping logic is really right...
   */
  matchText = (text: string, start = 0, end?: number): P.TextToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    // REFACTOR: handle backticks, curly quotes, etc.
    const quoteSymbol = text[start]
    if (!this.quoteSymbols.includes(quoteSymbol as any)) return undefined

    let textEnd = start + 1
    while (textEnd < end) {
      const char = text[textEnd]
      if (char === quoteSymbol) break
      // if we get a backslash, consume next char if it's the same quote symbol
      if (char === P.BACKSLASH && text[textEnd + 1] === quoteSymbol) textEnd++
      textEnd++
    }
    // Forget it if we didn't end with the quote symbol
    if (text[textEnd] !== quoteSymbol) return undefined
    // advance past end quote
    textEnd++

    // Value includes the quotes, use `innerText` to get the actual text.
    const value = text.slice(start, textEnd)
    return new P.TextToken({
      value,
      raw: value,
      start
    })
  }

  ////////////////
  // ## Numbers
  ////////////////

  /** Regex testing whether a character could begin a `NumberToken` -- digit, `-` or `.`. */
  get NUMBER_START() {
    return /[0-9-.]/
  }

  /** Regex matching a `NumberToken` literal at head of string -- optional leading `-`, optional decimal point. */
  get NUMBER() {
    return /^-?([0-9]*\.)?[0-9]+/
  }

  /** Match a single number at `start` of `text`, as a `NumberToken`. */
  matchNumber = (text: string, start = 0, end?: number): P.NumberToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    if (!this.NUMBER_START.test(text[start])) return undefined

    const numberMatch = this.matchExpressionAtHead(this.NUMBER, text, start, end)
    if (!numberMatch) return undefined

    const input = numberMatch[0]
    const value = parseFloat(input)
    return new P.NumberToken({
      value,
      raw: input,
      start
    })
  }

  ////////////////
  // ## JSX expressions
  ////////////////

  /**
   * Regex matching JSX opening tag head: `<TagName` plus either self-close `/>`, plain `>`, or trailing
   * whitespace before attributes.
   * - Capture groups: tag name, then end bit (`/>`, `>` or whitespace).
   */
  get JSX_TAG_START() {
    return /^<([A-Za-z][\w-.]*)(\s*\/>|\s*>|\s+)/
  }
  /** Regex matching the end of a JSX tag after attributes -- optional whitespace then `/>` or `>`. */
  get JSX_TAG_START_END() {
    return /^\s*(\/>|>)/
  }
  /** Regex matching a JSX attribute name plus optional trailing `=`. */
  get JSX_ATTRIBUTE_START() {
    return /^\s*([\w-]+\b)\s*(=?)\s*/
  }
  /** Characters which terminate a run of `JSXTextToken`. */
  get JSX_TEXT_END_CHARS() {
    return ["{", "<", ">", "}"]
  }

  /**
   * Match a JSX element at `start` of `text`, as `matchJSXElement()` does -- and any elements right after it:
   * then they're ONE implicit fragment, a `JSXFragmentToken` holding them all, as if written `<>...</>`.
   * - e.g. `return <ui-container>...</ui-container>` with `<ui-grid>...</ui-grid>` on the line below:
   *   the drawing is both, side by side.
   * - "Right after":  on the same line, or the NEXT line, indented at least as far as the line the first one
   *   starts on.  Not after a blank line, nor a less indented one:  that's the next statement's.
   * - Only at the top level:  inside an element, elements side by side are its children anyway.
   */
  matchJSXElements = (text: string, start = 0, end?: number): P.JSXElementToken | P.JSXFragmentToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    const first = this.matchJSXElement(text, start, end)
    if (!first) return undefined
    const lineStart = text.lastIndexOf("\n", first.start - 1) + 1
    const indent = this.eatWhitespace(text, lineStart, end) - lineStart
    const elements: P.Token[] = [first]
    while (true) {
      const next = this.matchJSXElement(text, this.nextElementStart(text, elements.at(-1)!.end, end, indent), end)
      if (!next) break
      elements.push(next)
    }
    if (elements.length === 1) return first
    const last = elements.at(-1)!
    return new P.JSXFragmentToken({
      start: first.start,
      raw: text.slice(first.start, last.end),
      children: elements,
      isImplicit: true
    })
  }

  /**
   * Where an element right after one ending at `from` would start -- see `matchJSXElements()`:
   * past spaces, and past ONE newline when the line after it is indented at least `indent`.
   * - `end` when there's no room for one:  `matchJSXElement()` then matches nothing.
   * - A subclass may end a run sooner:  spellx stops at a line its own tag starts (`SP.SpellxTokenizer`).
   */
  protected nextElementStart(text: string, from: number, end: number, indent: number): number {
    let at = this.eatWhitespace(text, from, end)
    if (text[at] === "\r") at++
    if (text[at] !== "\n") return text[at] === "<" ? at : end
    const lineStart = at + 1
    at = this.eatWhitespace(text, lineStart, end)
    return text[at] === "<" && at - lineStart >= indent ? at : end
  }

  /**
   * Match a single JSX element, including its children, at `start` of `text`, as `JSXElementToken`.
   * - Or an explicit fragment, `<>...</>`, as `JSXFragmentToken`:  see `matchJSXFragment()`.
   * - Ignores leading whitespace.
   */
  matchJSXElement = (text: string, start = 0, end?: number): P.JSXElementToken | P.JSXFragmentToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    const fragment = this.matchJSXFragment(text, start, end)
    if (fragment) return fragment

    const jsxElement = this.matchJSXChainTag(text, start, end) ?? this.matchJSXStartTag(text, start, end)
    if (!jsxElement) return undefined

    if (jsxElement.record.chain) {
      const children = this.matchJSXBranchChildren(text, jsxElement.next, end)
      if (children.length) {
        jsxElement.record.children = children as P.JSXElementToken[]
        jsxElement.record.raw = text.slice(start, children[children.length - 1]!.next)
      }
    } else if (!jsxElement.record.isUnaryTag) {
      const children = this.rawTextTags.includes(jsxElement.tagName)
        ? this.matchRawJSXChildren(jsxElement.tagName, text, jsxElement.next, end)
        : this.matchJSXChildren(jsxElement.tagName, text, jsxElement.next, end)
      if (children && children.length) {
        jsxElement.record.children = children as P.JSXElementToken[]
        jsxElement.record.raw = text.slice(start, children[children.length - 1].next)
      }
    }

    return jsxElement
  }

  /**
   * Match an explicit JSX fragment at `start` of `text`, `<>` children `</>`, as a `JSXFragmentToken`:
   * several elements side by side, with no element around them.
   * - Its children are matched as an element's are, up to its `</>` end tag, which is its last child.
   * - Ignores leading whitespace.
   */
  matchJSXFragment(text: string, start = 0, end?: number): P.JSXFragmentToken | undefined {
    if (typeof end !== "number" || end > text.length) end = text.length
    const tagStart = this.eatWhitespace(text, start, end)
    if (!this.matchStringAtHead("<>", text, tagStart, end)) return undefined
    const children = this.matchJSXChildren("", text, tagStart + 2, end) ?? []
    const last = children.at(-1)
    const fragmentEnd = last ? last.end : tagStart + 2
    return new P.JSXFragmentToken({ start, raw: text.slice(start, fragmentEnd), children })
  }

  /**
   * Match a single JSX start tag at `start` of `text`, including internal attributes, as a `JSXElementToken`.
   * - TODO: clean this stuff up, maybe with findFirstAtHead?
   * - TODO: check whitespace before/after tag
   */
  matchJSXStartTag(text: string, start = 0, end?: number) {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    let nextStart = this.eatWhitespace(text, start, end)
    // Make sure we start with `<`.
    if (text[nextStart] !== "<") return undefined

    const tagMatch = this.matchExpressionAtHead(this.JSX_TAG_START, text, nextStart, end)
    if (!tagMatch) return undefined

    let [matchText, tagName, endBit] = tagMatch
    nextStart += matchText.length

    const jsxElement = new P.JSXElementToken({ tagName, start })

    // If unary tag, mark as such and return.
    endBit = endBit.trim()
    if (endBit === "/>") {
      jsxElement.record.isUnaryTag = true
      jsxElement.record.raw = matchText
      return jsxElement
    }

    // If we didn't immediately get an end marker, attempt to match attributes
    if (endBit !== ">" && endBit !== "/>") {
      const named = this.matchJSXQuotedName(tagName, text, nextStart, end)
      if (named) nextStart = named.next
      const attrs = this.consume(this.matchJSXAttribute, text, nextStart, end)
      if (named || (attrs && attrs.length)) {
        jsxElement.record.attributes = [...(named ? [named] : []), ...(attrs ?? [])]
        if (attrs?.length) nextStart = attrs[attrs.length - 1].next
      }

      // see if we got an end marker after attributes
      const endBitMatch = this.matchExpressionAtHead(this.JSX_TAG_START_END, text, nextStart, end)
      if (endBitMatch) {
        if (endBitMatch[1] === "/>") jsxElement.record.isUnaryTag = true
        nextStart += endBitMatch[0].length
      } else {
        this.logger.warn("Missing expected end `>` for jsxElement", jsxElement, `\`${text.slice(start, nextStart)}\``)
        jsxElement.record.error = "No end >"
      }
    }
    jsxElement.record.raw = text.slice(start, nextStart)
    return jsxElement
  }

  /**
   * A tag's bare quoted name at `start`, `"one counter"` in `<example "one counter">`, as its `name` attribute --
   * only for one of `quotedNameTags`.
   */
  matchJSXQuotedName(tagName: string, text: string, start: number, end: number): P.JSXAttributeToken | undefined {
    if (!this.quotedNameTags.includes(tagName)) return undefined
    const value = this.matchText(text, start, end)
    if (!value) return undefined
    const next = this.eatWhitespace(text, value.next, end)
    return new P.JSXAttributeToken({ name: "name", start, value, raw: text.slice(start, next) })
  }

  /**
   * A CHAIN tag's head at `start` of `text`, `<otherwise if its done is yes>`, as a `JSXElementToken` with its `chain`
   * and `phrase` -- `undefined` if no word of `chainTags` starts a tag there.
   * - Its phrase runs to its `>`:  a `>` inside quotes, parens or braces is the phrase's (`findPhraseEnd()`).
   * - Ignores leading whitespace.
   */
  matchJSXChainTag(text: string, start = 0, end?: number): P.JSXElementToken | undefined {
    if (typeof end !== "number" || end > text.length) end = text.length
    const at = this.eatWhitespace(text, start, end)
    if (text[at] !== "<") return undefined
    const word = this.chainWords.find((candidate) => {
      const after = text[at + 1 + candidate.length]
      return text.slice(at + 1, at + 1 + candidate.length).toLowerCase() === candidate && /[\s>]/.test(after ?? "")
    })
    if (!word) return undefined
    const phraseStart = at + 1 + word.length
    const pos = this.findPhraseEnd(text, phraseStart, end, { stop: ">" })
    const raw = text.slice(phraseStart, pos)
    const lead = raw.length - raw.trimStart().length
    const contents = raw.trim()
    const element = new P.JSXElementToken({
      tagName: text.slice(at + 1, at + 1 + word.length),
      start,
      raw: text.slice(start, Math.min(pos + 1, end)),
      chain: this.chainTags[word],
      phrase: contents ? new P.JSXExpressionToken({ contents, raw: contents, start: phraseStart + lead }) : undefined
    })
    if (text[pos] !== ">") element.record.error = "No end >"
    return element
  }

  /** `chainTags`' words, longest first, so `otherwise if` is found before `otherwise`. */
  private get chainWords(): string[] {
    return Object.keys(this.chainTags).sort((one, other) => other.length - one.length)
  }

  /**
   * A chain branch's children at `start` of `text`:  up to the next branch of its chain, which it leaves for its
   * parent to match, or to the chain's closer, `</>` or `</if>`, which it takes as its last child.
   */
  matchJSXBranchChildren(text: string, start: number, end: number): P.Token[] {
    const children: P.Token[] = []
    let next = start
    while (next < end) {
      const at = this.eatWhitespace(text, next, end)
      const branch = this.matchJSXChainTag(text, at, end)
      if (branch && branch.record.chain !== "if") break
      const closer = this.matchJSXChainEnd(text, next, end)
      if (closer) {
        children.push(closer)
        break
      }
      const child = this.matchJSXChild("", text, next, end)
      if (!child) break
      children.push(child)
      next = child.next
    }
    return children
  }

  /**
   * The closer ending a chain at `start`:  `</>`, or one naming a word of `chainTags`, `</if>`, `</otherwise>` (as code
   * spell's writer names an element's closer).
   */
  private matchJSXChainEnd(text: string, start: number, end: number): P.JSXEndTagToken | undefined {
    const at = this.eatWhitespace(text, start, end)
    const closers = ["", ...this.chainWords]
    const word = closers.find((candidate) => text.startsWith(`</${candidate}>`, at))
    if (word === undefined) return undefined
    return new P.JSXEndTagToken({ raw: text.slice(start, at + word.length + 3), tagName: word, start })
  }

  /**
   * Match JSX element children of `<endTagName>` at `start` of `text`, as an array of `JSXElementToken`.
   * - Matches nested children and stops after matching end tag: `</endTagName>`.
   */
  matchJSXChildren(endTagName: string, text: string, start: number, end?: number) {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    const children = []
    let nesting = 1

    let nextStart = start
    while (true) {
      const child = this.matchJSXChild(endTagName, text, nextStart, end)
      if (!child) break
      children.push(child)
      nextStart = child.next

      // If we got an endTag for endTagName, update nesting and break out of loop if nesting !== 0
      if (child instanceof P.JSXEndTagToken && child.tagName === endTagName) {
        nesting--
        if (nesting === 0) break
        continue
      }
    }
    // TODO: how to surface this error???
    if (nesting !== 0) {
      this.logger.warn(`matchJSXChildren(${text.slice(start, nextStart + 10)}: didn't match end child!`)
    }

    return children
  }

  /**
   * Children of raw-text tag `<endTagName>` at `start` of `text`:  ONE `JSXTextToken` of everything up to
   * `</endTagName>`, then that end tag -- see `rawTextTags`.
   * - Where `emptyEndTagCloses` says so, `</>` ends it too, but only at a line's end (`<markdown>Hi</>`, or `</>` on a
   *   line of its own):  a `</>` inside its text (`` `</>` closes it ``) is text.
   * - No end tag:  the text runs to `end`, and there's no end tag token.
   */
  matchRawJSXChildren(endTagName: string, text: string, start: number, end?: number) {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined
    const named = `</${endTagName}>`
    const namedAt = text.indexOf(named, start)
    const emptyAt = this.emptyEndTagCloses ? Tokenizer.lineEndingEmptyEndTag(text, start, end) : -1
    const isEmpty = emptyAt !== -1 && (namedAt === -1 || emptyAt < namedAt)
    const endTag = isEmpty ? "</>" : named
    const found = isEmpty ? emptyAt : namedAt
    const textEnd = found === -1 || found + endTag.length > end ? end : found
    const children: P.Token[] = []
    if (textEnd > start) {
      const value = text.slice(start, textEnd)
      children.push(new P.JSXRawTextToken({ value, raw: value, start }))
    }
    if (textEnd < end) {
      children.push(new P.JSXEndTagToken({ raw: endTag, tagName: endTagName, start: textEnd }))
    } else {
      this.logger.warn(`matchRawJSXChildren(${text.slice(start, start + 20)}): no ${endTag}`)
    }
    return children
  }

  /** Where the first `</>` ending a line (spaces after it allowed) is, from `start` of `text` up to `end`;  else `-1`. */
  private static lineEndingEmptyEndTag(text: string, start: number, end: number): number {
    const pattern = /<\/>[ \t]*(?=\r?\n|$)/g
    pattern.lastIndex = start
    const found = pattern.exec(text.slice(0, end))
    return found ? found.index : -1
  }

  /**
   * Match a single JSX child as:
   *  - `</endTagName>`
   *  - `{ jsx expression }`
   *  - nested JSX element
   *  - (anything else) as jsxText expression.
   */
  matchJSXChild(endTagName: string, text: string, start = 0, end?: number) {
    return (
      this.matchJSXComment(text, start, end) ||
      this.matchJSXEndTag(endTagName, text, start, end) ||
      this.matchJSXExpression(text, start, end) ||
      this.matchJSXElement(text, start, end) ||
      // TODO: newline and indent?
      this.matchJSXText(text, start, end)
    )
  }

  /**
   * Attempt to match a specific end tag.
   * - Ignores leading whitespace.
   */
  matchJSXEndTag(endTagName: string, text: string, start = 0, end?: number) {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    const nextStart = this.eatWhitespace(text, start, end)
    const named = `</${endTagName}>`
    // `</>` closes any element where `emptyEndTagCloses` says so:  a spellx drawing's
    const endTag =
      this.emptyEndTagCloses && endTagName && this.matchStringAtHead("</>", text, nextStart, end) ? "</>" : named
    if (!this.matchStringAtHead(endTag, text, nextStart, end)) return undefined

    end = nextStart + endTag.length
    return new P.JSXEndTagToken({
      raw: text.slice(start, end),
      tagName: endTagName,
      start
    })
  }

  /**
   * Match a single JSX element attribute at `start` of `text`, as a `JSXAttributeToken`.
   * - `name` is the attribute name,
   * - `value` is the expression value as a single `Token`.
   */
  matchJSXAttribute(text: string, start = 0, end?: number) {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    // attempt to match an attribute name, including `=` if present.
    const result = this.matchExpressionAtHead(this.JSX_ATTRIBUTE_START, text, start, end)
    if (!result) return undefined

    // attributes must start with a word character
    const [match, name, equals] = result
    if (!this.WORD_START.test(name)) return undefined

    const attribute = new P.JSXAttributeToken({ name, start })
    let nextStart = start + match.length

    // if there was an equals char, parse the value
    if (equals) {
      const value = this.matchJSXAttributeValue(text, nextStart, end)
      if (value) {
        attribute.record.value = value
        nextStart = value.next
      }
    }
    // eat whitespace before the next attribute / tag end
    nextStart = this.eatWhitespace(text, nextStart, end)
    attribute.record.raw = text.slice(start, nextStart)
    return attribute
  }

  /**
   * Match JSX attribute value  at `start` of `text`.
   * - NOTE: this will be called immediately after the `=` (and subsequent whitespace).
   */
  matchJSXAttributeValue(text: string, start: number, end?: number): P.JSXAttributeValue | undefined {
    return (
      this.matchText(text, start, end) ||
      this.matchJSXExpression(text, start, end) ||
      this.matchJSXElement(text, start, end) ||
      this.matchJSXAttributeValueIdentifier(text, start, end) ||
      this.matchNumber(text, start, end)
    )
  }

  /**
   * Match a single identifer as a JSX attribute value at `start` of `text`, as `JSXEpression`.
   */
  matchJSXAttributeValueIdentifier = (text: string, start: number, end?: number): P.JSXExpressionToken | undefined => {
    const contents = this.matchWord(text, start, end)
    if (!contents) return undefined
    return new P.JSXExpressionToken({
      // TODO: `contents` as the token???
      contents,
      raw: contents.value,
      start
    })
  }

  /**
   * Match a JSX expression enclosed in curly braces, eg:  `{ ... }`.
   * - Handles nested curlies, quotes, etc.
   * - Ignores leading whitespace.
   */
  matchJSXExpression = (text: string, start = 0, end?: number): P.JSXExpressionToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    const nextStart = this.eatWhitespace(text, start, end)
    const endIndex = this.findMatchingDelimiter("{", "}", text, nextStart, end)
    if (endIndex === undefined) return undefined

    // Get contents, including leading and trailing whitespace.
    const contents = text.slice(nextStart + 1, endIndex)

    // return a new JSXExpression, advancing beyond the ending `}`.
    return new P.JSXExpressionToken({
      contents,
      raw: text.slice(start, endIndex + 1),
      start
    })
  }

  /**
   * A comment among markup's children at `start` of `text`, when `markupComments` says markup has them:
   * `<!-- ... -->` (to its `-->`, else to `end`), or a line of its own starting `//` (to its line's end).
   * - Ignores leading spaces and tabs.
   */
  matchJSXComment = (text: string, start = 0, end?: number): P.JSXCommentToken | undefined => {
    if (!this.markupComments) return undefined
    if (typeof end !== "number" || end > text.length) end = text.length
    const at = this.eatWhitespace(text, start, end)
    if (text.startsWith(HTML_COMMENT_START, at)) {
      const close = text.indexOf(HTML_COMMENT_END, at + HTML_COMMENT_START.length)
      const commentEnd = close < 0 || close + HTML_COMMENT_END.length > end ? end : close + HTML_COMMENT_END.length
      const inner = text.slice(at + HTML_COMMENT_START.length, close < 0 ? commentEnd : close)
      return new P.JSXCommentToken({
        start,
        raw: text.slice(start, commentEnd),
        value: inner.trim(),
        commentSymbol: HTML_COMMENT_START
      })
    }
    if (!text.startsWith("//", at) || !/^[ \t]*$/.test(text.slice(text.lastIndexOf("\n", at - 1) + 1, at)))
      return undefined
    const line = this.getLineAtHead(text, at, end).trimEnd()
    return new P.JSXCommentToken({
      start,
      raw: text.slice(start, at + line.length),
      value: line.replace(/^\/\/+/, "").trim(),
      commentSymbol: "//"
    })
  }

  /**
   * Match JSXText until one of `{`, `<`, `>` or `}`.
   * - NOTE: INCLUDES leading / trailing whitespace.
   * - With `markupComments`, it also ends before a line starting `//`:  a comment (`matchJSXComment()`).
   */
  matchJSXText = (text: string, start = 0, end?: number): P.JSXTextToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    // temporarily advance past whitespace (we'll include it in the output).
    const nextStart = this.eatWhitespace(text, start, end)
    let endIndex = this.findFirstAtHead(this.JSX_TEXT_END_CHARS, text, nextStart, end)
    if (this.markupComments && endIndex !== undefined) {
      const comment = /\n[ \t]*\/\//.exec(text.slice(nextStart, endIndex))
      if (comment) endIndex = nextStart + comment.index + comment[0].length - 2
    }
    // If the first non-whitespace char is in our END_CHARS, forget it.
    if (endIndex === nextStart) return undefined

    // if no match, we've got some sort of error
    if (endIndex === undefined) {
      this.logger.warn(`matchJSXText(${text.slice(start, start + 50)}): JSX seems to be unbalanced.`)
      return undefined
    }

    // include leading whitespace in the output.
    const value = text.slice(start, endIndex)
    return new P.JSXTextToken({
      value,
      raw: value,
      start
    })
  }

  ////////////////
  // ## Source Code -- Comment, Line, Block
  ////////////////

  /**
   * Regex splitting a comment line into its symbol (`--`, `//`, `#`, `##` ...), leading whitespace and text.
   * - Any run of `#` is a HEADING, like markdown's:  `#` for the top level, `##` below it, and so on --
   *   and ONLY at the start of a line, after any indent.  See `matchComment()`.
   */
  get COMMENT_START() {
    return /^(#+|--+|\/\/+)(\s*)(.*)/
  }

  /** Match a single-line comment at `start` of `text`, returning a `CommentToken` if matched. */
  matchComment = (text: string, start = 0, end?: number): P.CommentToken | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    const commentStart = text.slice(start, start + 2)
    const isHeading = text[start] === "#"
    if (commentStart !== "--" && commentStart !== "//" && !isHeading) return undefined
    // a heading only starts a line:  a `#` after anything else isn't a comment
    if (isHeading && !/^[ \t]*$/.test(text.slice(text.lastIndexOf("\n", start - 1) + 1, start))) return undefined

    // comments eat until the end of the line
    const line = this.getLineAtHead(text, start, end)
    const commentMatch = line.match(this.COMMENT_START)
    if (!commentMatch) return undefined

    const [raw, commentSymbol, initialWhitespace, value] = commentMatch
    return new P.CommentToken({
      value, // actual comment text
      commentSymbol, // actual comment symbol
      initialWhitespace, // whitespace between commentSymbol and comment value
      raw,
      start
    })
  }

  /**
   *  Break tokens into an array of arrays by `NewlineToken`s.
   * - Returns an array of lines WITHOUT the `NewlineToken`s but WITH any leading `IndentToken`s.
   * - Lines which are composed solely of whitespace are treated as blank.
   */
  breakIntoLines = (tokens: P.Token[]): P.LineToken[] => {
    const lines: P.LineToken[] = []
    let line = new P.LineToken({
      tokens: [],
      start: 0,
      line: 0,
      ch: 0,
      // indent is -1 as flag that we haven't set it yet
      indent: -1
    })
    lines.push(line)
    tokens.forEach((token) => {
      if (token instanceof P.NewlineToken) {
        line.record.newline = token
        if (line.indent === -1 && line.tokens.length) line.record.indent = 0
        line = new P.LineToken({
          tokens: [],
          start: token.start + 1,
          line: token.line! + 1,
          ch: 0,
          // indent is -1 as flag that we haven't set it yet
          indent: -1
        })
        lines.push(line)
      } else if (token instanceof P.IndentToken) {
        // pull out leading whitespace as `line.indent`
        line.record.indent = indentWidth(token.raw ?? "")
        line.record.leading = token.raw
      } else {
        // add to normal tokens in the line
        line.tokens.push(token)
      }
    })

    // remove the last `line` if it is completely empty
    const last = lines.at(-1)
    if (last && last?.tokens.length === 0 && !last.newline && !last.leading) lines.pop()

    // indent blank lines to the indent AFTER them
    // so a blank line doesn't break an indented block
    let startIndent = 0
    function getNextIndent(index: number): number {
      while (lines[index]) {
        if (lines[index].indent !== -1) return lines[index].indent
        index++
      }
      return startIndent
    }
    // REFACTOR: WAS: startIndent = getNextIndent(0)
    startIndent = getNextIndent(0) ?? 0
    lines.forEach((next, index) => {
      if (next.indent === -1) {
        // if we got tokens but no leading, indent is 0
        if (next.tokens.length) next.record.indent = 0
        // Otherwise find the next AFTER the current line
        else next.record.indent = getNextIndent(index + 1)
      }
    })
    return lines
  }

  /**
   * Break random `tokens` into array of `BlockToken`s by:
   * - first breaking into `LineToken`s and then
   * - creating nested `BlockToken`s as `line.indent` changes.
   */
  breakIntoIndentedBlocks = (tokens: P.Token[]): P.BlockToken[] => {
    // break into lines & return early if no lines
    const lines = this.breakIntoLines(tokens)
    if (lines.length === 0) return []

    // Establish the first block at the MINIMUM of all indents
    // in case the top of the block is indented LESS than somewhere below.
    // TODO: ??? seems like this should be a top-level error???
    const block = new P.BlockToken({
      start: 0,
      line: 0,
      ch: 0,
      indent: Math.min(...lines.map((line) => line.indent ?? 0)),
      tokens: []
    })

    // Stack of blocks -- we'll push and pop blocks on the stack as indent changes
    const stack = [block]
    lines.forEach((line) => {
      let topBlock = stack[stack.length - 1]
      // If indenting, push a new block
      while (line.indent > topBlock.indent) {
        const newBlock = new P.BlockToken({
          start: line.start,
          line: line.line,
          ch: line.ch,
          indent: topBlock.indent + 1,
          tokens: []
        })
        topBlock.tokens.push(newBlock)
        stack.push(newBlock)
        topBlock = newBlock
      }

      // If outdenting: pop block(s)
      while (line.indent < topBlock.indent) {
        stack.pop()
        topBlock = stack[stack.length - 1]
      }

      // add line to top block
      topBlock.tokens.push(line)
    })

    return [block]
  }

  ////////////////
  // ## Utility functions
  ////////////////

  /**
   * Characters treated as whitespace for tokenizing purposes -- space and tab.
   * - TODO: this creates a new array every time it's called.  We should cache it.
   */
  get WHITESPACE_CHARS() {
    return [" ", "\t"]
  }

  /**
   * Return the first char position after `start` of `text` which is NOT a whitespace char (space or tab).
   * - If `text[start]` is not whitespace, returns `start`,
   * - You can call this at any time to skip whitespace in the output.
   */
  eatWhitespace = (text: string, start = 0, end?: number): number => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return end

    let whiteSpaceEnd = start
    while (whiteSpaceEnd < end && this.WHITESPACE_CHARS.includes(text[whiteSpaceEnd])) {
      whiteSpaceEnd++
    }
    return whiteSpaceEnd
  }

  /**
   * Return characters up to, but not including, the next newline char after `start` of `text`.
   * - If `start` is a newline char or start >= end, returns empty string.
   * - If at the end of the string (eg: no more newlines), returns from start to end of `text`.
   */
  getLineAtHead = (text: string, start = 0, end?: number) => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return ""

    let newline = text.indexOf("\n", start)
    if (newline === -1 || newline > end) newline = end
    return text.slice(start, newline)
  }

  /** Return `true` if `string` appears at `start` of `text`. */
  matchStringAtHead = (string: string, text: string, start = 0, end?: number) => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return false

    const stringEnd = start + string.length
    if (stringEnd > end) return false
    return string === text.slice(start, stringEnd)
  }

  /**
   *  Match a regular expression starting at `start` of `text`, returning the regex match array.
   * - Returns `undefined` if no match.
   * - NOTE: The expression MUST start with `/^.../`
   */
  matchExpressionAtHead = (expression: RegExp, text: string, start = 0, end?: number): RegExpMatchArray | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    const head = text.slice(start, end)
    return head.match(expression) ?? undefined
  }

  /**
   * Find index of the matching SINGLE CHARACTER `endDelimiter` to match `startDelimiter`.
   * - Returns numeric index or `undefined` if no match or if first char is not `startDelimiter`.
   * - Assumes `text[start]` is the startDelimiter!
   * - Consumes quoted strings inside delimiters.
   * - Matches nested delimiters and handles escaped delimiters, e.g.
   *   - `findMatchingDelimiter("{", "}", "{{}}")` => 4
   *   - `findMatchingDelimiter("{", "}", "{\\{}")` => 4
   * - TESTME escaped delimiters, nested quotes
   */
  findMatchingDelimiter = (
    startDelimiter: string,
    endDelimiter: string,
    text: string,
    start = 0,
    end?: number
  ): number | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    if (text[start] !== startDelimiter) return undefined

    let nesting = 0
    let current = start
    while (current < end) {
      let char = text[current]
      // if startDelimiter, increase nesting
      if (char === startDelimiter) {
        nesting++
      }
      // if endDelimiter, decrease nesting and return if nesting back to 0
      else if (char === endDelimiter) {
        nesting--
        if (nesting === 0) return current
      }
      // if a single or double quote, skip until the matching quote
      else if (char === "'" || char === '"') {
        const token = this.matchText(text, current, end)
        if (token) {
          current = token.next
          // continue so we don't add 1 to curent below
          continue
        }
      }
      // If backslash, skip an extra char if it's either delimiter or a quote
      else if (char === "\\") {
        char = text[current + 1]
        if (char === startDelimiter || char === endDelimiter || char === "'" || char === '"') {
          current++
        }
      }
      current++
    }
    return undefined
  }

  /**
   * Where a PHRASE from `start` ends:  its first `stop` outside strings and brackets, e.g. a tag's `>` or a line's
   * body `:` -- else `end`.
   * - A string is skipped as `matchText()` reads one:  this tokenizer's `quoteSymbols` (spell's:  only `"`, as an
   *   apostrophe is its possessive), escapes too.
   * - `(`, `{` and `[` nest:  a `stop` inside them is the phrase's, `(more than 2 > 1)`.
   * - `lineEnds`:  a line break outside them ends it too, as spellx's tags do.
   * - Brackets that close are the other scan:  `findMatchingDelimiter()`.
   */
  findPhraseEnd(text: string, start: number, end: number, { stop, lineEnds = false }: PhraseEndOptions): number {
    let depth = 0
    let at = start
    while (at < end) {
      const char = text[at]!
      if ((this.quoteSymbols as readonly string[]).includes(char)) {
        const string = this.matchText(text, at, end)
        if (string) {
          at = string.next
          continue
        }
      }
      if (char === "(" || char === "{" || char === "[") depth++
      else if ((char === ")" || char === "}" || char === "]") && depth > 0) depth--
      else if (depth === 0 && (char === stop || (lineEnds && char === "\n"))) return at
      at++
    }
    return end
  }

  /**
   * Return the index of the first NON-ESCAPED character in `chars` after `text[start]`.
   * - Returns `undefined` if we didn't find a match.
   */
  findFirstAtHead = (chars: string | string[], text: string, start = 0, end?: number): number | undefined => {
    if (typeof end !== "number" || end > text.length) end = text.length
    if (start >= end) return undefined

    while (start < end) {
      const char = text[start]
      if (chars.includes(char)) return start
      // if we got an escape char, ignore the next char if it's in `chars`
      if (char === "\\" && chars.includes(text[start + 1])) start++
      start++
    }
    if (start >= end) return undefined
    return start
  }

  /**
   * Given a set of tokens, slice whitespace (indent, newline or normal whitespace) from the front.
   */
  removeLeadingWhitespace = (tokens: P.Token[], start = 0): P.Token[] => {
    while (tokens[start] instanceof P.WhitespaceToken) start++
    if (start === 0) return tokens
    return tokens.slice(start)
  }
}

/** Constructor props for `Tokenizer`. */
export type TokenizerProps = {
  /** See `Tokenizer.whitespacePolicy`. */
  whitespacePolicy?: P.WhitespacePolicy
  /** See `Tokenizer.quoteSymbols`. */
  quoteSymbols?: string[]
  /** See `Tokenizer.rawTextTags`. */
  rawTextTags?: string[]
  /** See `Tokenizer.quotedNameTags`. */
  quotedNameTags?: string[]
  /** See `Tokenizer.emptyEndTagCloses`. */
  emptyEndTagCloses?: boolean
  /** See `Tokenizer.chainTags`. */
  chainTags?: Record<string, P.JSXChainKind>
  /** See `Tokenizer.markupComments`. */
  markupComments?: boolean
}

/** How `Tokenizer.findPhraseEnd()` finds a phrase's end. */
export type PhraseEndOptions = {
  /** The character that ends it outside strings and brackets, e.g. `>` or `:`. */
  stop: string
  /** Does a line break outside brackets end it too? */
  lineEnds?: boolean
}

/** What starts a comment in markup, as the web writes one:  see `Tokenizer.markupComments`. */
export const HTML_COMMENT_START = "<!--"

/** What ends one. */
export const HTML_COMMENT_END = "-->"

/** Spaces a tab swallows:  fewer than a tab's width, right before it -- see `indentWidth()`. */
const SPACES_BEFORE_TAB = / {1,3}\t/g

/**
 * How deep leading whitespace `raw` indents a line:  one per tab or space,
 * except a few spaces right before a tab, which the tab swallows.
 * - So ` \t` is as deep as `\t`, as an editor shows it:  the tab goes to the same tab stop.
 * - Why:  a stray space before a tab otherwise nests the line under the one before,
 *   e.g. a property's `- its "value" is ...` read as more of the line above it.
 */
function indentWidth(raw: string): number {
  return raw.replace(SPACES_BEFORE_TAB, "\t").length
}
