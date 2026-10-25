import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"

/**
 * Code spell's TWIN of a spellx tag line:  the line it reads as (epic `elemental-spell` P6, Q69 A).
 * - A spellx file is read by spell's own rules, as a third style of spell beside sentences and the outline:
 *   each tag line is made into its twin's tokens, which `line` parses as the code-spell line would.
 *   - `<property "suit" one-of="clubs, diamonds" alias="is a (suit)" />` reads as
 *     `its "suit" is one of clubs, diamonds`, with `- it "is a (suit)"` indented under it
 *   - `<action "turn it over">` and its lines read as `to turn it over:` and the same lines
 *   - `<on mouse down>` reads as `on mouse down:`
 * - So a spellx tag compiles to exactly what its code-spell twin does:  the same rule parses it, makes the same
 *   match, the same AST.  Nothing is written as text in between (Q70).
 * - The twin's words are the language's (`SP.SpellxTwinWords`);  its other tokens are the file's own,
 *   where they sit:  the tag's name, attribute values and phrase (`SP.SpellxTagToken`), its body.
 *   - Its own words take the tag's place:  `SYNTHETIC`, with no text of their own in the file.
 * - A tag with a description, `description="..."`, gets it as a comment ending its twin's line:
 *   its docstring, as code spell's would be.
 * - Reads only tokens:  `SP.SpellxTokenizer` made them, and noted what's wrong (`SP.spellxErrorOf()`).
 * - Never a scope:  it's the same whatever has been declared, so a scan before parsing can read it (`skeletonOf()`).
 */
export class SpellxTwin {
  /**
   * The twin of `line`, if it starts with a spellx tag:  its line, and the body it takes.
   * - `next`:  the item after it, its indented block if it has one.
   * - `undefined`:  not a tag line, or its language has no twin words yet (it parses as it is, and fails).
   */
  static of(scope: P.Scope, line: P.LineToken, next: P.Token | undefined): SpellxTwinLine | undefined {
    if (!SP.isSpellxTag(line.tokens[0])) return undefined
    const parser = scope.parser as SP.SpellParser | undefined
    return SpellxTwin.for(SP.Language.of(scope), parser, line, next)
  }

  /**
   * The twin of `line`, read by `parser` (a spellx parser:  its language's), with no scope:  see `of()`.
   * - For what writes a spellx file's code-spell text, `SX.CodeSpellWriter` (epic `elemental-spell` P8).
   */
  static lineOf(line: P.LineToken, next: P.Token | undefined, parser: SP.SpellParser): SpellxTwinLine | undefined {
    return SpellxTwin.for(parser.language ?? SP.Language.default, parser, line, next)
  }

  /** The twin of `line`, read in `language` by `parser`:  see `of()`. */
  private static for(
    language: SP.Language,
    parser: SP.SpellParser | undefined,
    line: P.LineToken,
    next: P.Token | undefined
  ): SpellxTwinLine | undefined {
    const [head] = line.tokens
    if (!SP.isSpellxTag(head)) return undefined
    const words = language.words.spellx?.twins
    if (!words) return undefined
    const spell = parser?.spellTokenizer ?? SP.spellParser.spellTokenizer
    return new SpellxTwin(language, spell, words, line, head, next instanceof P.BlockToken ? next : undefined).make()
  }

  /**
   * The code-spell twin of each declaration in spellx `text`, one line each, for a scan BEFORE it's parsed:
   * a template's line, then each member's, bulleted and one tab in.
   * - So a spellx file's types and methods are known ahead, as a code-spell file's are:
   *   `SpellParser.declaredTypes()`, `declaredMethods()` read this instead of the spellx.
   * - e.g. `a "card" is a view :`, then `\t- to turn it over :`.
   */
  static skeletonOf(text: string, parser: SP.SpellParser): string {
    const tokenizer = parser.tokenizer
    const [root] = tokenizer.breakIntoIndentedBlocks(tokenizer.tokenize(text))
    const language = parser.language ?? SP.Language.default
    const twinText = (line: P.LineToken) =>
      SpellxTwin.for(language, parser, line, undefined)?.line.tokens.join("").trim()
    const lines: string[] = []
    for (const item of root?.tokens ?? []) {
      if (item instanceof P.LineToken) {
        const twin = twinText(item)
        if (twin) lines.push(twin)
        continue
      }
      for (const member of item.tokens) {
        const twin = member instanceof P.LineToken ? twinText(member) : undefined
        if (twin) lines.push(`\t- ${twin}`)
      }
    }
    return lines.join("\n")
  }

  /**
   * Parse errors for what the spellx tokenizer noted wrong on `line`'s tokens, each over its token.
   * - Its tag's head, a closer, a line of prose, the first token of a line indented less than its tag's body ...
   */
  static errorsIn(scope: P.Scope, line: P.LineToken): P.Match[] {
    const errors: P.Match[] = []
    for (const token of line.tokens) {
      const message = SP.spellxErrorOf(token)
      if (message) errors.push(SP.spellParser.createParseError(scope, [token], message))
    }
    return errors
  }

  /** Is `token` one of a twin's own words, standing in a tag's place with no text of its own? */
  static isSynthetic(token: P.Token): boolean {
    return !!(token.record as { synthetic?: boolean }).synthetic
  }

  /** The tag's head. */
  readonly tag: SP.SpellxTag

  private constructor(
    readonly language: SP.Language,
    readonly spell: P.Tokenizer,
    readonly words: SP.SpellxTwinWords,
    readonly line: P.LineToken,
    readonly head: SP.SpellxTagToken,
    readonly block: P.BlockToken | undefined
  ) {
    this.tag = head.tag
  }

  /** The twin. */
  private make(): SpellxTwinLine {
    const { tag } = this
    switch (tag.category) {
      case "template":
        return this.template()
      case "declaration":
        return this.declaration()
      case "handler":
        return this.lineAndBlock(this.expand(this.words.handlers[tag.kind] ?? "{phrase} :"))
      case "control":
        return this.lineAndBlock(this.expand(this.words.controls[tag.kind] ?? "{phrase}"))
      default:
        return this.skipped()
    }
  }

  ////////////////
  // ## By tag
  ////////////////

  /** A template:  `a "card" is a view :`, `solitaire is an app :` ...;  its members are its body. */
  private template(): SpellxTwinLine {
    const { kind } = this.tag
    const singleton = kind === "page" || kind === "app"
    const shape = singleton
      ? this.words.singleton
      : this.attribute("aka")
        ? this.words.templateAka
        : this.words.template
    return this.lineAndBlock(this.expand(shape))
  }

  /** A member:  a property, an alias, an action, a drawing, an event or a test. */
  private declaration(): SpellxTwinLine {
    const { words, tag } = this
    switch (tag.kind) {
      case "property":
        return this.property()
      case "alias":
        if (this.inlineBody.length || !this.block) return this.lineAndBlock(this.expand(words.alias))
        return this.lineAndBlock(this.expand(words.aliasBlock))
      case "action":
        return this.lineAndBlock(this.expand(words.action), this.actionDetails())
      case "test":
        return this.lineAndBlock(this.expand(words.test))
      case "draw":
        if (tag.selfClosing && tag.name) return this.lineAndBlock(this.expand(words.placePart))
        return this.lineAndBlock(this.expand(tag.name ? words.drawPart : words.draw))
      case "event":
        return this.lineAndBlock(this.event())
      default:
        // a menu:  P10's (Q34, Q41)
        return this.skipped(this.language.parserMessage("spellx-not-yet", { tag: `<${tag.word}>` }))
    }
  }

  /**
   * A property:  `its "suit" is one of clubs, diamonds`, `its "color" is one of red, black :` and its lines ...
   * - Each `alias=` is a line indented under it, `- it "is a (suit)"`:  its own aliases (Q13).
   */
  private property(): SpellxTwinLine {
    const shapes = this.words.property
    const list = this.attribute("one-of")
    const shape = this.inlineBody.length
      ? shapes.value
      : this.block
        ? list
          ? shapes.listBody
          : shapes.body
        : list
          ? shapes.list
          : shapes.bare
    const aliases = this.attributes("alias").map((alias) => [
      this.bullet(),
      ...this.expand(this.words.propertyAlias, { alias: alias.value })
    ])
    return this.lineAndBlock(this.expand(shape), [], aliases)
  }

  /** An action's details, each a line at the top of its body:  `- shortcut meta+T`, `- enabled when ...` (Q38). */
  private actionDetails(): P.Token[][] {
    const lines: P.Token[][] = []
    for (const attribute of this.tag.attributes) {
      const shape = this.words.actionDetails[attribute.name]
      if (shape) lines.push([this.bullet(), ...this.expand(shape, { [attribute.name]: attribute.value })])
    }
    return lines
  }

  /** An event its things send:  `it sends "flipped" with side as a direction` -- each attribute a parameter. */
  private event(): P.Token[] {
    const params = this.tag.attributes.filter((attribute) => !NOT_PARAMS.has(attribute.name))
    const tokens = this.expand(this.words.event)
    params.forEach((param, index) => {
      tokens.push(...this.synthetic(index ? this.words.eventAnd : this.words.eventWith))
      const named: SP.SpellxText = {
        text: param.word,
        start: param.start,
        tokens: this.spellTokens(param.word, param.start)
      }
      tokens.push(...this.expand(this.words.eventParam, { param: named, value: param.value }))
    })
    return tokens
  }

  /**
   * A tag with no twin:  its line and body are left out, `message` saying why (no message:  its token says).
   * - A word spellx doesn't know, a menu (P10).
   */
  private skipped(message?: string): SpellxTwinLine {
    if (message) SP.addSpellxError(this.head, message)
    return { line: this.line, takesNextItem: !!this.block, skipped: true }
  }

  ////////////////
  // ## Lines
  ////////////////

  /**
   * The twin:  `tokens`, then the tag's body on its own line, then its description;  and its block.
   * - `before`:  lines at the top of its block, e.g. an action's details;  `after`:  at its end, e.g. aliases.
   * - Its description, `description="..."` or a `<description>` first in its block (Q12), is comments ending its
   *   line, one a line:  its docstring, as the comments above code spell's twin would be.
   */
  private lineAndBlock(tokens: P.Token[], before: P.Token[][] = [], after: P.Token[][] = []): SpellxTwinLine {
    const { line } = this
    const { description, rest } = this.descriptionOf(this.block)
    // nothing to open:  no `:` ending its words, e.g. `<spell-thing "card" />` is `a "card" is a thing`
    const last = tokens.at(-1)
    const bodiless = !rest.length && !before.length && !after.length && !this.inlineBody.length
    if (bodiless && last && SpellxTwin.isSynthetic(last) && last.value === ":") tokens.pop()
    const lineTokens = [...tokens, ...this.inlineBody, ...description]
    spaceAfter(tokens)
    const twinLine = new P.LineToken({ ...line.record, tokens: lineTokens })
    const takesNextItem = !!this.block
    const extra = [...before, ...after]
    if (!extra.length && rest === this.block?.tokens) return { line: twinLine, body: this.block, takesNextItem }
    const indent = this.block?.indent ?? (line.indent ?? 0) + 1
    const lineOf = (lineTokens: P.Token[]) =>
      new P.LineToken({ start: this.head.start, line: this.head.line, ch: this.head.ch, indent, tokens: lineTokens })
    const items = [...before.map(lineOf), ...rest, ...after.map(lineOf)]
    if (!items.length) return { line: twinLine, takesNextItem, swallowsNextItem: takesNextItem }
    const body = new P.BlockToken({
      start: this.block?.start ?? this.head.start,
      line: this.block?.line ?? this.head.line,
      ch: this.block?.ch ?? this.head.ch,
      indent,
      tokens: items
    })
    return { line: twinLine, body, takesNextItem }
  }

  /**
   * The tag's description as comments, one a line, and the rest of `block`:
   * its `description=`, then a `<description>` first in its block -- that note's lines left out of the rest.
   */
  private descriptionOf(block: P.BlockToken | undefined): {
    description: P.Token[]
    rest: Array<P.LineToken | P.BlockToken>
  } {
    const description: P.Token[] = []
    const attribute = this.attribute("description")
    if (attribute) description.push(this.comment(attribute.text, attribute.start))
    const items = block?.tokens ?? []
    const [first] = items
    const head = first instanceof P.LineToken ? first.tokens[0] : undefined
    if (!(head instanceof SP.SpellxProseToken) || head.note !== "description" || first!.tokens.length !== 1)
      return { description, rest: items }
    // its text on its head's line, `<description>Flips it ...</>`, or on the lines indented under it
    let taken = 1
    if (head.value) description.push(this.comment(head.value, head.start))
    const lines = items[1]
    if (lines instanceof P.BlockToken) {
      taken++
      for (const each of lines.tokens) {
        const [prose] = each instanceof P.LineToken ? each.tokens : []
        if (prose instanceof SP.SpellxProseToken && prose.value)
          description.push(this.comment(prose.value, prose.start))
      }
    }
    // and its closer, `</description>`
    const closer = items[taken]
    if (closer instanceof P.LineToken && closer.tokens.length === 1 && closer.tokens[0] instanceof SP.SpellxCloserToken)
      taken++
    return { description, rest: items.slice(taken) }
  }

  /** What follows the head on its own line, before any closer ending it:  `if its rank is jack ...`. */
  private get inlineBody(): P.Token[] {
    const rest = this.line.tokens.slice(1)
    return rest.at(-1) instanceof SP.SpellxCloserToken ? rest.slice(0, -1) : rest
  }

  ////////////////
  // ## Words
  ////////////////

  /**
   * The tokens of twin `shape`:  its words the language's own (synthetic), its slots the tag's -- see
   * `SP.SpellxTwinWords`.
   * - `slots`:  more slots, e.g. an alias's `{alias}`, a parameter's `{param}`.
   * - A slot with nothing for it gives nothing:  the line then fails to parse, saying so.
   */
  private expand(shape: string, slots: Record<string, SP.SpellxText | undefined> = {}): P.Token[] {
    const tokens: P.Token[] = []
    for (const part of shape.match(/\{[^}]*\}|\S+/g) ?? []) {
      const slot = part.match(/^\{(?:(a|quoted) )?([^}]+)\}$/)
      if (!slot) {
        tokens.push(...this.synthetic(part))
        continue
      }
      const [, how, name] = slot
      const text = this.slot(name!, slots)
      if (how === "a") {
        const noun = text?.text.trim().split(/\s+/)[0]
        if (noun) tokens.push(...this.synthetic(this.indefiniteArticle(noun)))
      } else if (how === "quoted") {
        if (text?.quoted) tokens.push(text.quoted)
        spaceAfter(tokens)
      } else if (name === "name") {
        if (text?.quoted) tokens.push(text.quoted)
        else if (text) tokens.push(this.quote(text))
      } else tokens.push(...(text?.tokens ?? []))
      spaceAfter(tokens)
    }
    return tokens
  }

  /** The text for slot `name`:  from `slots`, else the tag's own. */
  private slot(name: string, slots: Record<string, SP.SpellxText | undefined>): SP.SpellxText | undefined {
    if (name in slots) return slots[name]
    const { tag } = this
    switch (name) {
      case "name":
      case "words":
        return tag.name
      case "phrase":
        return tag.phrase
      case "super":
        return this.attribute("template") ?? this.wordsText(this.words.supers[tag.kind] ?? tag.kind)
      default:
        return this.attribute(name)
    }
  }

  /** The value of the tag's (first) attribute `name`, in English. */
  private attribute(name: string): SP.SpellxText | undefined {
    return this.tag.attributes.find((attribute) => attribute.name === name)?.value
  }

  /** Every one of the tag's attributes named `name`, e.g. each `alias=`. */
  private attributes(name: string): Array<SP.SpellxAttribute & { value: SP.SpellxText }> {
    return this.tag.attributes.filter(
      (attribute): attribute is SP.SpellxAttribute & { value: SP.SpellxText } =>
        attribute.name === name && !!attribute.value
    )
  }

  /** Our language's indefinite article for `noun`:  `a`, `an`. */
  private indefiniteArticle(noun: string) {
    return (
      P.Inflector.using(this.language.inflector, () =>
        this.language.articles?.article("indefinite", noun, undefined)
      ) ?? "a"
    )
  }

  /** `words`, the language's own, as synthetic tokens standing at the tag. */
  private synthetic(words: string): P.Token[] {
    const tokens = this.spellTokens(words, 0)
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

  /** A text of `words`, synthetic, e.g. a template's default super-type, `view`. */
  private wordsText(words: string): SP.SpellxText {
    return { text: words, start: this.head.start, tokens: this.synthetic(words) }
  }

  /** `text`, quoted, as ONE synthetic `TextToken`:  for a name given without quotes. */
  private quote(text: SP.SpellxText): P.TextToken {
    const raw = `"${text.text}"`
    const token = new P.TextToken({ value: raw, raw, start: text.start, whitespace: " " })
    return token
  }

  /** An outline's bullet, `- `, for a line a tag's attribute adds to its body. */
  private bullet(): P.Token {
    return this.synthetic("-")[0]!
  }

  /** A comment ending a twin's line, holding `text` from `start`:  a line of its docstring. */
  private comment(text: string, start: number): P.Token {
    const value = text.trim()
    return new SP.SpellxProseToken({ start, raw: value, value, commentSymbol: "//", initialWhitespace: " " })
  }

  /** `text`, tokenized as spell, its tokens starting at `start`. */
  private spellTokens(text: string, start: number): P.Token[] {
    const tokens = this.spell.tokenize(text)
    P.Tokenizer.shiftTokens(tokens, start)
    return tokens
  }
}

/** What `SpellxTwin.of()` makes of a spellx tag line. */
export type SpellxTwinLine = {
  /** The line, as code spell's twin of it. */
  line: P.LineToken
  /** Its body, as its twin's:  the tag's indented lines, and any its attributes add. */
  body?: P.BlockToken
  /** Does the line take its own indented block, the item after it? */
  takesNextItem: boolean
  /** It takes that block, though nothing of it is left for its body:  a `<description>` alone, lifted out of it. */
  swallowsNextItem?: boolean
  /** A tag with no twin:  its line is an error, its block skipped. */
  skipped?: boolean
}

/**
 * A space after the last of `tokens`, if it has none:  the end of a slot's run, which a twin puts beside a word it was
 * never next to, e.g. a quoted name and the word after it.
 * - Never within a run:  `2 ... 10` and `jack, queen` keep their spacing, which their rules read.
 * - SIDE EFFECT:  sets its `whitespace`;  only twins read a tag's own tokens.
 */
function spaceAfter(tokens: P.Token[]) {
  const last = tokens.at(-1)
  if (last && !last.whitespace) last.record.whitespace = " "
}

/** A tag's attributes that are never an event's parameters. */
const NOT_PARAMS = new Set(["name", "description"])
