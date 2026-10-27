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
    // a line of a `<spell>` chunk, as written (epic `elemental-spell` P12):  a function, a member written as code
    const codeText = (line: P.LineToken) => {
      const [first] = line.tokens
      if (!first || first instanceof SP.SpellxTagToken || first instanceof SP.SpellxCloserToken) return undefined
      if (first instanceof SP.SpellxProseToken) return undefined
      return line.tokens.join("").trim() || undefined
    }
    const lines: string[] = []
    let inTemplate = false
    for (const item of root?.tokens ?? []) {
      if (item instanceof P.LineToken) {
        const twin = twinText(item)
        inTemplate = !!twin
        const line = twin ?? codeText(item)
        if (line) lines.push(line)
        continue
      }
      for (const member of item.tokens) {
        if (!(member instanceof P.LineToken)) continue
        const twin = inTemplate ? twinText(member) : undefined
        const code = twin ? undefined : codeText(member)
        if (twin) lines.push(`\t- ${twin}`)
        // a template's member written as code;  under a type written as code, its bulleted members only
        else if (code && (inTemplate || code.startsWith("- "))) lines.push(`\t${code}`)
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
      case "start":
        return {
          line: new P.LineToken({ ...this.line.record, tokens: this.expand(this.words.start) }),
          takesNextItem: false
        }
      default:
        return this.skipped()
    }
  }

  ////////////////
  // ## By tag
  ////////////////

  /**
   * A template:  `a "card" is a view :`, `solitaire is an app :` ...;  its members are its body.
   * - Its `menu-bar=`, a line ending its body:  `- its menu bar is "GameMenu"` (P10).
   */
  private template(): SpellxTwinLine {
    const regrouped = this.block && SpellxTwin.withGroupsOpened(this.block)
    if (regrouped)
      return new SpellxTwin(this.language, this.spell, this.words, this.line, this.head, regrouped).template()
    const { kind } = this.tag
    if (kind === "notebook") return this.notebook()
    const singleton = kind === "page" || kind === "app"
    const shape = singleton
      ? this.words.singleton
      : this.attribute("aka")
        ? this.words.templateAka
        : this.words.template
    const menuBar = this.attribute("menu-bar") ? [[this.bullet(), ...this.expand(this.words.menuBar)]] : []
    return this.lineAndBlock(this.expand(shape), [], menuBar)
  }

  /**
   * A notebook (epic `elemental-spell` P16):  a page, `counter notebook is a notebook :`, its body a drawing.
   * - Its members stay its members (`<property>`, `<action>` ...).
   * - Everything else is its content's drawing, `- to draw its content :`, in order:
   *   - markup, `<section>`, `<example "one counter">`, as written
   *   - each run of prose as a `<markdown>` block, a new block at each `##` heading:  a section of the page
   * - `locked`:  a line, `- its lock is locked`.
   * - Its own templates aren't in its block:  the tokenizer lifted them out, to after it (`liftNotebooks()`).
   */
  private notebook(): SpellxTwinLine {
    const members: Array<P.LineToken | P.BlockToken> = []
    const drawing: Array<P.LineToken | P.BlockToken> = []
    let prose: Array<SP.SpellxProseToken | null> = []
    let last: typeof members | undefined
    const endProse = () => {
      drawing.push(...this.markdownLines(prose))
      prose = []
    }
    for (const item of this.block?.tokens ?? []) {
      if (item instanceof P.BlockToken) {
        ;(last ?? drawing).push(item)
        continue
      }
      if (!(item instanceof P.LineToken)) continue
      const [first] = item.tokens
      if (first instanceof SP.SpellxProseToken && !first.note && item.tokens.length === 1) {
        prose.push(first)
        continue
      }
      // a blank line:  inside a run of prose, part of it
      if (!first) {
        if (prose.length) prose.push(null)
        continue
      }
      endProse()
      const isCloser = first instanceof SP.SpellxCloserToken && item.tokens.length === 1
      const isMember =
        (first instanceof SP.SpellxTagToken && ["declaration", "handler", "note"].includes(first.tag.category)) ||
        (first instanceof SP.SpellxProseToken && !!first.note)
      // a closer in the drawing (an `<html>` block's) compiles to nothing:  left out, so the markup around it joins
      if (isCloser) {
        if (last === members) members.push(item)
        continue
      }
      last = isMember ? members : drawing
      last.push(item)
    }
    endProse()
    const indent = this.block?.indent ?? (this.line.indent ?? 0) + 1
    const lineOf = (tokens: P.Token[]) =>
      new P.LineToken({ start: this.head.start, line: this.head.line, ch: this.head.ch, indent, tokens })
    const items: Array<P.LineToken | P.BlockToken> = [...members]
    if (this.tag.attributes.some((attribute) => attribute.name === "locked"))
      items.push(lineOf([this.bullet(), ...this.expand(this.words.notebookLocked)]))
    if (drawing.length) {
      items.push(lineOf([this.bullet(), ...this.expand(this.words.notebookContent)]))
      SpellxTwin.joinMarkup(drawing)
      const [first] = drawing
      items.push(
        new P.BlockToken({ start: first!.start, line: first!.line, ch: first!.ch, indent: indent + 1, tokens: drawing })
      )
    }
    const line = new P.LineToken({ ...this.line.record, tokens: this.expand(this.words.singleton) })
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
    const isMarkup = (item: P.Token | undefined): item is P.LineToken =>
      item instanceof P.LineToken &&
      item.tokens.length > 0 &&
      item.tokens.every((token) => token instanceof P.JSXElementToken || token instanceof P.JSXFragmentToken)
    // a comment line between two lines of markup (`<!-- ... -->`, `//`) is part of the run, and draws nothing
    const isComment = (item: P.Token | undefined): boolean =>
      item instanceof P.LineToken && item.tokens.length === 1 && item.tokens[0] instanceof P.CommentToken
    for (let index = 0; index < lines.length; index++) {
      let end = index
      while (isMarkup(lines[end])) {
        end++
        let after = end
        while (isComment(lines[after])) after++
        if (after > end && isMarkup(lines[after])) end = after
      }
      if (end - index < 2) continue
      const run = (lines.slice(index, end) as P.LineToken[]).filter((line) => !isComment(line))
      const children = run.flatMap((line) =>
        line.tokens.flatMap((token) =>
          token instanceof P.JSXFragmentToken && token.record.isImplicit ? (token.children ?? []) : [token]
        )
      )
      const [first] = run
      const fragment = new P.JSXFragmentToken({ start: first!.start, raw: "", children, isImplicit: true })
      lines.splice(index, end - index, new P.LineToken({ ...first!.record, tokens: [fragment] }))
    }
  }

  /**
   * A run of a notebook's `prose` as `<markdown>` blocks, a line each:  a new one at each `##` heading, so each
   * section of the page starts with its own (`markdown_block` draws them).
   * - Each block stands where its first line is, its text the lines as written, less their indent.
   */
  private markdownLines(prose: Array<SP.SpellxProseToken | null>): P.LineToken[] {
    const runs: Array<Array<SP.SpellxProseToken | null>> = []
    for (const token of prose) {
      if (!runs.length || (token && /^##\s/.test(`${token.value}`))) runs.push([])
      runs.at(-1)!.push(token)
    }
    return runs.flatMap((run) => {
      while (run.length && !run.at(-1)) run.pop()
      const [first] = run
      if (!first) return []
      // each line as written, less the indent its run's first line has:  a nested list stays nested
      const indentOf = (token: SP.SpellxProseToken) => "  ".repeat(Math.max(0, (token.ch ?? 0) - (first.ch ?? 0)))
      const text = run.map((token) => (token ? indentOf(token) + `${token.value}` : "")).join("\n")
      const end = run.at(-1)!.end
      const element = new P.JSXElementToken({
        tagName: MARKDOWN,
        start: first.start,
        raw: text,
        children: [
          new P.JSXTextToken({ value: text, raw: text, start: first.start }) as unknown as P.JSXElementToken,
          new P.JSXEndTagToken({ raw: `</${MARKDOWN}>`, tagName: MARKDOWN, start: end }) as unknown as P.JSXElementToken
        ]
      })
      const indent = this.block?.indent ?? 1
      return [
        new P.LineToken({ start: first.start, line: first.line, ch: first.ch, indent: indent + 1, tokens: [element] })
      ]
    })
  }

  /**
   * Template `block` with a group opened above each member written away from its group, `group="direction"`, and the
   * group it's among opened again below it (epic `elemental-spell` P16):  code spell's twin has no word for a member's
   * group, only the headings, `- group "direction"`, each member under the nearest above it.
   * - `undefined` when no member needs it:  `block` as it is.
   * - The headings it adds are `<group>` tags of their own, standing at the member, with no text of their own.
   */
  private static withGroupsOpened(block: P.BlockToken): P.BlockToken | undefined {
    const items = block.tokens
    let current: SP.SpellxTagToken | undefined
    let changed = false
    const out: Array<P.LineToken | P.BlockToken> = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      const head = item instanceof P.LineToken ? item.tokens[0] : undefined
      if (!SP.isSpellxTag(head)) {
        out.push(item)
        continue
      }
      if (head.tag.category === "declaration" && head.tag.kind === "group") {
        current = head
        out.push(item)
        continue
      }
      const group = head.tag.attributes.find((attribute) => attribute.name === "group")?.value
      if (!group || group.text === current?.tag.name?.text) {
        out.push(item)
        continue
      }
      // this member, its block and its closer:  under its own group, then back to the one it's among
      let count = items[index + 1] instanceof P.BlockToken ? 2 : 1
      const closer = items[index + count]
      if (
        closer instanceof P.LineToken &&
        closer.tokens.length === 1 &&
        closer.tokens[0] instanceof SP.SpellxCloserToken
      )
        count++
      out.push(SpellxTwin.groupLine(head, group, item as P.LineToken), ...items.slice(index, index + count))
      if (current?.tag.name) out.push(SpellxTwin.groupLine(head, current.tag.name, item as P.LineToken))
      index += count - 1
      changed = true
    }
    return changed ? new P.BlockToken({ ...block.record, tokens: out }) : undefined
  }

  /** A `<group>` line opening group `name`, standing at member `head`'s line. */
  private static groupLine(head: SP.SpellxTagToken, name: SP.SpellxText, line: P.LineToken): P.LineToken {
    const tag: SP.SpellxTag = {
      category: "declaration",
      kind: "group",
      word: "group",
      name,
      attributes: [],
      selfClosing: true
    }
    const token = new SP.SpellxTagToken({ start: head.start, raw: "", value: "", tag })
    return new P.LineToken({ ...line.record, tokens: [token] })
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
      case "menu":
        return this.menu()
      case "group":
        return this.lineAndBlock(this.expand(words.group))
      default:
        return this.skipped(this.language.parserMessage("spellx-not-yet", { tag: `<${tag.word}>` }))
    }
  }

  /**
   * A menu, ONE line naming its actions (Q34, Q41).
   * - `<menu "game menu">` holding `<action "deal" />`, `<action "-" />` and `<action "undo" />`
   *   is `its "game menu" is a menu of "deal" , "-" and "undo"`.
   * - Its block is the line's:  nothing left to parse under it.
   * - Its `description=` is its docstring, as every member's is.
   */
  private menu(): SpellxTwinLine {
    const tokens = this.expand(this.words.menu)
    const items = (this.block?.tokens ?? []).flatMap((item) => {
      const head = item instanceof P.LineToken ? item.tokens[0] : undefined
      if (!(head instanceof SP.SpellxTagToken) || head.tag.kind !== "action" || !head.tag.name) return []
      return [head.tag.name.quoted ?? this.quote(head.tag.name)]
    })
    items.forEach((item, index) => {
      if (index) tokens.push(...this.synthetic(index === items.length - 1 ? this.words.menuAnd : ","))
      tokens.push(item)
      spaceAfter(tokens)
    })
    // its description, `description="..."`, as comments ending its line:  its docstring
    const { description } = this.descriptionOf(this.block)
    const line = new P.LineToken({ ...this.line.record, tokens: [...tokens, ...description] })
    return { line, takesNextItem: !!this.block, swallowsNextItem: !!this.block }
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
   * - A word spellx doesn't know.
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
    // a body on its line under lines at the top of its block, `<action "deal" shortcut="meta+D">deal it</>`:
    // its own line after them, as code spell can't have both a body on its line and a block under it
    const inlineBelow = before.length && this.inlineBody.length ? this.inlineBody : []
    const lineTokens = [...tokens, ...(inlineBelow.length ? [] : this.inlineBody), ...description]
    spaceAfter(tokens)
    const twinLine = new P.LineToken({ ...line.record, tokens: lineTokens })
    const takesNextItem = !!this.block
    const extra = [...before, ...inlineBelow, ...after]
    if (!extra.length && rest === this.block?.tokens) return { line: twinLine, body: this.block, takesNextItem }
    const indent = this.block?.indent ?? (line.indent ?? 0) + 1
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
    const items = [...before.map(lineOf), ...below, ...rest, ...after.map(lineOf)]
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

  /**
   * What follows the head on its own line, before any closer ending it:  `if its rank is jack ...`.
   * - A comment after the closer stays, after the body:  `its rank</>   // ace = 1`.
   */
  private get inlineBody(): P.Token[] {
    const rest = this.line.tokens.slice(1)
    let closer = rest.length - 1
    while (closer >= 0 && !(rest[closer] instanceof SP.SpellxCloserToken)) closer--
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

/** The tag of a run of a notebook's prose, drawn as markdown:  `markdown_block`'s. */
const MARKDOWN = "markdown"

/** A tag's attributes that are never an event's parameters. */
const NOT_PARAMS = new Set(["name", "description", "group"])
