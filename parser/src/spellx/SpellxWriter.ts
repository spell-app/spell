import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"

/**
 * A `.spell` file written as SPELLX (epic `elemental-spell` P12, Q19):
 * `SpellxWriter.write(file)` => its `.spellx` text, a fresh layout of the same program.
 * - The other way from `SX.CodeSpellWriter`, and the same idea:  each declaration line is written as the tag whose
 *   code-spell TWIN (`SP.SpellxTwin`) it is, so the `.spellx` compiles to exactly what the `.spell` did.
 * - Rule by rule, from the file's PARSE:  each line's statement says what it declares (`create_type`,
 *   `define_property_has`, `to_do_something` ...), and the language's twin words say how it's worded
 *   (`SP.SpellxTwinWords`), so a Spanish file is written in Spanish spellx too.
 *   - A template:  `<spell-view "card" template="two sided view">`, its kind by what it IS (a page, an app, a view,
 *     a thing), its members inside it
 *   - a member:  `<property>`, `<alias>`, `<action>`, `<draw>`, `<event>`, `<test>`, `<on ...>` ...;
 *     a property's own aliases as its `alias=`, an action's details as its attributes, a lone comment line above a
 *     member as its `description=`
 *   - a body:  its lines as written, at the same depth
 * - What has no tag (a file's functions, tests and starting code, a member written another way):
 *   a `<spell>` chunk, holding its lines as written, one tab in (the tokenizer unwraps it:  `SP.SpellxTokenizer`).
 *   - So is a member whose drawing has the web's own elements, `<div>`, `<button>` (J83):  `drawsBareTags()`.
 * - Comments and blank lines stay as they are;  so do a body's lines.
 * - NEVER throws:  a line it can't write as a tag goes in a `<spell>` chunk.
 * - Above `spell-parser/spell` in the import graph, as the rest of `SX`.
 */
export class SpellxWriter {
  /**
   * `file`, a parsed `.spell` file, as spellx text.
   * - `text`:  its source
   * - `match`:  its parse (a `block`)
   * - `scope`:  its file scope, which says its language and knows its types
   */
  static write({ text, match, scope }: SpellxWriteInput): string {
    const writer = new SpellxWriter(text, scope)
    writer.indexStatements(match)
    const tokenizer = (scope.parser as SP.SpellParser).tokenizer
    const [root] = tokenizer.breakIntoIndentedBlocks(tokenizer.tokenize(text))
    writer.writeBlock(root?.tokens ?? [], 0)
    while (writer.out.at(-1) === "") writer.out.pop()
    return `${writer.out.join("\n")}\n`
  }

  /** The lines written so far. */
  private readonly out: string[] = []
  /** The source's lines. */
  private readonly lines: string[]
  /** Where each source line starts. */
  private readonly lineStarts: number[] = [0]
  /** Each line's statement, by where its line token starts. */
  private readonly statements = new Map<number, P.Match>()
  /** The file's language. */
  private readonly language: SP.Language
  /** Its spellx words. */
  private readonly words: SP.SpellxWords
  /** Its twin words. */
  private readonly twins: SP.SpellxTwinWords

  private constructor(
    readonly text: string,
    readonly scope: P.Scope
  ) {
    this.lines = text.split("\n")
    for (let index = 0; index < text.length; index++) if (text[index] === "\n") this.lineStarts.push(index + 1)
    this.language = SP.Language.of(scope)
    const words = this.language.words.spellx ?? SP.Language.default.words.spellx
    if (!words?.twins) throw new TypeError("SpellxWriter():  this language has no spellx twin words")
    this.words = words
    this.twins = words.twins
  }

  ////////////////
  // ## Blocks
  ////////////////

  /**
   * Write `items` (a block's lines and blocks) at `depth`:  0 the file, 1 a template's members.
   * - Each run of lines with no tag goes in one `<spell>` chunk;  blank and comment lines after it stay outside.
   */
  private writeBlock(items: P.Token[], depth: number) {
    const indent = "\t".repeat(depth)
    let chunk: string[] = []
    let tail: string[] = []
    const flush = () => {
      if (chunk.length) {
        this.out.push(`${indent}<${this.words.prefix}>`)
        for (const line of chunk) this.out.push(line.trim() ? `\t${line}` : "")
        this.out.push(`${indent}</${this.words.prefix}>`)
      }
      this.out.push(...tail)
      chunk = []
      tail = []
    }
    let lastLine: number | undefined
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      const next = items[index + 1]
      const body = item instanceof P.LineToken && next instanceof P.BlockToken ? next : undefined
      if (body) index++
      const source = this.sourceOf(item, body)
      // the blank lines before it, as written
      const firstLine = this.lineOf(firstStart(item))
      if (lastLine !== undefined && firstLine > lastLine + 1) {
        const blanks = Array.from({ length: firstLine - lastLine - 1 }, () => "")
        if (chunk.length) tail.push(...blanks)
        else this.out.push(...blanks)
      }
      lastLine = firstLine + source.length - 1
      // a blank or comment line:  as it is, after a chunk if one's open
      if (item instanceof P.LineToken && !body && this.isQuiet(item)) {
        if (chunk.length) tail.push(...source)
        else this.out.push(...source)
        continue
      }
      const statement = item instanceof P.LineToken ? this.statements.get(item.start) : undefined
      const written =
        statement && item instanceof P.LineToken
          ? depth === 0
            ? this.template(item, body, statement)
            : this.member(item, body, statement, indent)
          : undefined
      if (!written) {
        chunk.push(...tail, ...source)
        tail = []
        continue
      }
      flush()
      // a lone comment line just above a member:  its description
      if (depth > 0 && written.description !== undefined) this.takeDescription(written, indent)
      this.out.push(...written.lines(written.description))
    }
    flush()
  }

  /**
   * The comment line just written above a member, if it's one alone, as its description:  taken off the page.
   * - Only a `//` line, with no `"` in it, after a blank or non-comment line.
   */
  private takeDescription(written: Written, indent: string) {
    written.description = undefined
    const last = this.out.at(-1)
    const before = this.out.at(-2)
    const comment = last?.match(/^\s*\/\/\s?(.*)$/)?.[1]
    if (comment === undefined || !comment.trim() || comment.includes('"')) return
    if (before !== undefined && /^\s*(\/\/|#|--)/.test(before)) return
    if (!last!.startsWith(indent) || last!.slice(indent.length).startsWith("\t")) return
    this.out.pop()
    written.description = comment.trim()
  }

  ////////////////
  // ## Templates
  ////////////////

  /** A template's line and its members, if `statement` declares one. */
  private template(line: P.LineToken, body: P.BlockToken | undefined, statement: P.Match): Written | undefined {
    const rule = statement.rule.name ?? ""
    if (!TEMPLATE_RULES.has(rule)) return undefined
    const name = unquote(groupText(statement, "type"))
    const aka = groupText(statement, "aka")
    if (!name || name.includes('"')) return undefined
    const superPhrase = this.superPhraseOf(line, statement, aka ? "aka" : "type")
    if (!superPhrase) return undefined
    const singleton = rule === "create_one_of_a_kind"
    const kind = this.templateKind(statement, superPhrase, singleton)
    const tagWord = `${this.words.prefix}-${keyFor(this.words.templates, kind)}`
    const plainSuper = this.twins.supers[kind]
    const attributes: string[] = []
    if (aka) attributes.push(this.attribute("aka", unquote(aka)!))
    if (superPhrase !== plainSuper) attributes.push(this.attribute("template", superPhrase))
    if (attributes.some((attribute) => attribute.endsWith('""'))) return undefined
    const head = `<${tagWord} ${quoted(name)}${attributes.map((attribute) => ` ${attribute}`).join("")}`
    return {
      lines: () => {
        if (!body) return [`${head} />`]
        const start = this.out.length
        this.out.push(`${head}>`)
        this.writeBlock(body.tokens, 1)
        this.out.push(`</${tagWord}>`)
        // written in place:  hand back nothing more
        return this.out.splice(start)
      }
    }
  }

  /**
   * What a template is made from, as written:  `two sided view` in `a playing card aka card is a two sided view where:`.
   * - The words after the name (or its aka), less the language's `is` and an article, up to the body's opener.
   */
  private superPhraseOf(line: P.LineToken, statement: P.Match, after: string): string | undefined {
    const group = groupMatch(statement, after)
    if (!group) return undefined
    const opener = groupMatch(statement, "with_nested_statements")
    const lineEnd = this.lineEndOf(line.start)
    const end = opener ? opener.start : lineEnd
    const rest = this.text
      .slice(group.end, end)
      .replace(/\s*:\s*$/, "")
      .trim()
    const isWord = this.twins.singleton.split(/\s+/)[1]!
    const words = rest.split(/\s+/)
    if (words[0]?.toLowerCase() !== isWord.toLowerCase() || words.length < 3) return undefined
    return words.slice(2).join(" ")
  }

  /** The kind of template `statement` declares:  `view`, `page template`, `app` ... -- by what its type IS. */
  private templateKind(statement: P.Match, superPhrase: string, singleton: boolean): string {
    const type = this.declaredType(statement)
    const plain = (kind: string) => this.twins.supers[kind]
    const is = (kind: string) => (type ? type.isA(kind) : superPhrase === plain(kind))
    if (is("page")) return singleton ? "page" : "page template"
    if (is("app")) return singleton ? "app" : "app template"
    if (is("view") || superPhrase.endsWith(` ${plain("view")}`)) return "view"
    return "thing"
  }

  /** The type `statement` declares, found up the scopes by what declared it. */
  private declaredType(statement: P.Match): P.TypeScope | undefined {
    const declared = (statement.data as { declared?: unknown }).declared
    if (declared instanceof P.TypeScope) return declared
    for (let scope: P.Scope | undefined = this.scope; scope; scope = scope.parentScope) {
      const found = scope.types?.get().find((type) => type.declaredBy === statement)
      if (found) return found
    }
    return undefined
  }

  ////////////////
  // ## Members
  ////////////////

  /** A template's member as its tag, if it has one:  by its statement's rule. */
  private member(
    line: P.LineToken,
    body: P.BlockToken | undefined,
    statement: P.Match,
    indent: string
  ): Written | undefined {
    // a drawing with the web's own elements (`<div>`):  spellx would read them as components, so it stays code spell
    if (this.drawsBareTags(line, body)) return undefined
    // its trailing comment, `- its "value" is 1   // ace = 1`:  after the tag's first line, never inside its body
    const last = line.tokens.at(-1)
    const comment = last instanceof P.CommentToken && last !== line.tokens[0] ? last : undefined
    const lineText = comment ? this.text.slice(line.start, comment.start) : this.lineText(line)
    const text = lineText.trim().replace(/^-\s+/, "")
    const written = this.memberTag(text, body, statement, indent)
    if (!written || !comment) return written
    const trailing = this.text.slice(comment.start, this.lineEndOf(comment.start)).trimEnd()
    return {
      ...written,
      lines: (description) => {
        const [first, ...rest] = written.lines(description)
        return [`${first}\t${trailing}`, ...rest]
      }
    }
  }

  /**
   * Does `line` or its `body` draw a tag spellx would read as a component's bare name (`<div>`, `<button>`)
   * (epic `elemental-spell` J83)?
   * - Code spell writes such a tag as the web's;  spellx looks it up in the packs, so `<div>` is an error there and
   *   `<button>` is Spell UI's.  So the member is written as code spell, in a `<spell>` chunk, and means the same.
   * - Spell's own tag words (`<children/>`) and names with `-` or a capital (`<ui-text>`) read the same in both.
   * - Every element, by its parse:  the ones inside a `{...}` too.
   */
  private drawsBareTags(line: P.LineToken, body: P.BlockToken | undefined): boolean {
    const seen = new Set<P.Match>()
    const draws = (node: unknown): boolean => {
      if (Array.isArray(node)) return node.some(draws)
      if (!(node instanceof P.Match) || seen.has(node)) return false
      seen.add(node)
      const [element] = node.matched
      if (node.rule.name === "jsxElement" && element instanceof P.JSXElementToken) {
        const { tagName } = node.data as SP.JSXMatchData
        if (tagName === element.tagName && SP.isBareComponentName(tagName)) return true
      }
      return node.matched.some(draws) || Object.values(node.data ?? {}).some(draws)
    }
    const lines = (item: P.Token): P.Token[] =>
      item instanceof P.BlockToken ? item.tokens.flatMap(lines) : item instanceof P.LineToken ? [item] : []
    return [line, ...(body ? lines(body) : [])].some((item) => draws(this.statements.get(item.start)))
  }

  /** A member's tag, from its line's `text` without its comment:  by its statement's rule. */
  private memberTag(
    text: string,
    body: P.BlockToken | undefined,
    statement: P.Match,
    indent: string
  ): Written | undefined {
    const rule = statement.rule.name ?? ""
    if (ALIAS_RULES.has(rule)) return this.alias(text, body, statement, indent)
    if (PROPERTY_RULES.has(rule)) return this.property(text, body, statement, indent)
    if (rule === "declare_event") return this.event(text, body, statement, indent)
    if (rule === "draw_it" || rule === "to_do_something") return this.action(text, body, statement, indent)
    return this.handler(text, body, indent)
  }

  /** `- it "is a face card" if ...` => `<alias "is a face card">if ...</>`. */
  private alias(text: string, body: P.BlockToken | undefined, statement: P.Match, indent: string) {
    const name = unquote(groupText(statement, "alias") ?? groupText(statement, "signature"))
    if (!name || name.includes('"')) return undefined
    const lead = fill(this.twins.alias, { name: quoted(name) })
    if (!text.startsWith(lead)) return undefined
    const rest = text.slice(lead.length).trim()
    const word = keyFor(this.words.declarations, "alias")
    const head = `<${word} ${quoted(name)}`
    if (!rest && !body) return this.tag(indent, head, [], undefined, undefined, word)
    if (rest === ":" && body) return this.tag(indent, head, [], undefined, body, word)
    if (rest && rest !== ":" && !body) return this.tag(indent, head, [], rest, undefined, word)
    return undefined
  }

  /**
   * `- its "suit" is one of clubs, hearts` and its aliases => `<property "suit" one-of="clubs, hearts" alias="..." />`;
   * - `- its "symbol" is:` and its lines => `<property "symbol">` ... `</property>`
   * - `- its "moves" is 0` => `<property "moves">0</>`
   */
  private property(text: string, body: P.BlockToken | undefined, statement: P.Match, indent: string) {
    const name = unquote(groupText(statement, "property"))
    if (!name || name.includes('"')) return undefined
    const lead = fill(this.twins.property.value, { name: quoted(name) })
    if (!text.startsWith(`${lead} `) && text !== lead && !text.startsWith(`${lead}:`)) return undefined
    const rest = text.slice(lead.length).trim()
    const listLead = fill(this.twins.property.list, { name: quoted(name), "one-of": "\u0000" })
      .split("\u0000")[0]!
      .slice(lead.length)
      .trim()
    // its own aliases, written as its `alias=`;  its other lines, its body
    const aliases: string[] = []
    const others: P.Token[] = []
    for (const item of this.itemsOf(body)) {
      const alias = item instanceof P.LineToken ? this.ownAlias(item) : undefined
      if (alias !== undefined) aliases.push(alias)
      else others.push(item)
    }
    const attributes = aliases.map((alias) => this.attribute("alias", alias))
    const word = keyFor(this.words.declarations, "property")
    const head = `<${word} ${quoted(name)}`
    const otherBody = others.some((item) => !(item instanceof P.LineToken && this.isQuiet(item))) ? others : undefined
    if (rest.startsWith(`${listLead} `)) {
      const hasColon = rest.endsWith(":")
      const oneOf = rest.slice(listLead.length, hasColon ? -1 : undefined).trim()
      if (!oneOf || oneOf.includes('"')) return undefined
      attributes.unshift(this.attribute("one-of", oneOf))
      if (hasColon !== !!otherBody) return undefined
      return this.tag(indent, head, attributes, undefined, otherBody, word)
    }
    if (rest === ":") return otherBody ? this.tag(indent, head, attributes, undefined, otherBody, word) : undefined
    if (!rest || body) return undefined
    return this.tag(indent, head, attributes, rest, undefined, word)
  }

  /** An alias line under a property, `- it "is a (suit)"`:  its text, for the property's `alias=`. */
  private ownAlias(line: P.LineToken): string | undefined {
    const statement = this.statements.get(line.start)
    if (!statement || !ALIAS_RULES.has(statement.rule.name ?? "")) return undefined
    const name = unquote(groupText(statement, "alias") ?? groupText(statement, "signature"))
    if (!name || name.includes('"')) return undefined
    const text = this.lineText(line).replace(/^-\s+/, "")
    return text === fill(this.twins.propertyAlias, { "quoted alias": quoted(name) }) ? name : undefined
  }

  /** `- it sends "flipped" with count as a number` => `<event "flipped" count="number" />`. */
  private event(text: string, body: P.BlockToken | undefined, statement: P.Match, indent: string) {
    if (body) return undefined
    const name = unquote(groupText(statement, "event"))
    if (!name || name.includes('"')) return undefined
    const lead = fill(this.twins.event, { name: quoted(name) })
    if (!text.startsWith(lead)) return undefined
    let rest = text.slice(lead.length).trim()
    const attributes: string[] = []
    if (rest) {
      const withWord = this.twins.eventWith
      if (!rest.startsWith(`${withWord} `)) return undefined
      rest = rest.slice(withWord.length).trim()
      const asWord = this.twins.eventParam.split(/\s+/)[1]!
      const andWord = this.twins.eventAnd
      for (const part of rest.split(new RegExp(`\\s+${andWord}\\s+|,\\s*`))) {
        const words = part.trim().split(/\s+/)
        if (words.length < 3 || words[1] !== asWord) return undefined
        const value = words.slice(ARTICLES.test(words[2]!) && words.length > 3 ? 3 : 2).join(" ")
        attributes.push(`${words[0]}=${quoted(value)}`)
      }
    }
    const word = keyFor(this.words.declarations, "event")
    return this.tag(indent, `<${word} ${quoted(name)}`, attributes, undefined, undefined, word)
  }

  /**
   * `- to turn it over:` and its lines => `<action "turn it over">`, its details as attributes;
   * `- to test card setup:` => `<test "card setup">`;  `- to draw it:` => `<draw>`;
   * `- to draw its front:` => `<draw "front">`.
   */
  private action(text: string, body: P.BlockToken | undefined, statement: P.Match, indent: string) {
    const colon = colonAt(text)
    if (colon < 0) return undefined
    const lead = normal(text.slice(0, colon))
    const inline = text.slice(colon + 1).trim()
    const part = groupText(statement, "part")
    const signature = groupText(statement, "signature")
    const isTest = !!groupMatch(statement, "asTest")
    let word: string
    let head: string
    let closer: string | undefined
    if (part !== undefined) {
      if (lead !== normal(fill(this.twins.drawPart, { words: part }))) return undefined
      word = keyFor(this.words.declarations, "draw")
      head = `<${word} ${quoted(unquote(part)!)}`
    } else if (signature !== undefined && isTest) {
      if (lead !== normal(fill(this.twins.test, { words: signature }))) return undefined
      word = keyFor(this.words.declarations, "test")
      head = `<${word} ${quoted(signature)}`
      closer = "</>"
    } else if (lead === normal(this.twins.draw)) {
      word = keyFor(this.words.declarations, "draw")
      head = `<${word}`
    } else if (signature !== undefined) {
      if (lead !== normal(fill(this.twins.action, { words: signature }))) return undefined
      word = keyFor(this.words.declarations, "action")
      head = `<${word} ${quoted(signature)}`
    } else return undefined
    if (head.split('"').length > 3) return undefined
    // its details (`- shortcut meta+F`, `- enabled when ...`), first in its body:  its attributes
    const attributes: string[] = []
    const rest: P.Token[] = []
    for (const item of this.itemsOf(body)) {
      const detail = !rest.length && item instanceof P.LineToken ? this.detailOf(item) : undefined
      if (detail) attributes.push(detail)
      else rest.push(item)
    }
    if (inline && (body || attributes.length)) return undefined
    const restBody = rest.length ? rest : undefined
    if (!inline && !restBody) return undefined
    return this.tag(indent, head, attributes, inline || undefined, restBody, word, closer)
  }

  /** An action's detail line as its attribute:  `- shortcut meta+F` => `shortcut="meta+F"`. */
  private detailOf(line: P.LineToken): string | undefined {
    const statement = this.statements.get(line.start)
    if (statement?.rule.name !== "action_detail") return undefined
    for (const [group, attribute] of DETAIL_GROUPS) {
      const value = groupText(statement, group)
      if (value === undefined) continue
      const plain = attribute === "undone-as" || attribute === "icon" ? unquote(value) : value
      if (!plain || plain.includes('"')) return undefined
      return this.attribute(attribute, plain)
    }
    return undefined
  }

  /** `- on mouse down:` and its lines => `<on mouse down>` ... `</>`. */
  private handler(text: string, body: P.BlockToken | undefined, indent: string) {
    for (const [kind, shape] of Object.entries(this.twins.handlers)) {
      const lead = shape.split("{phrase}")[0]!
      if (!text.startsWith(lead)) continue
      const colon = colonAt(text)
      if (colon < 0) return undefined
      const phrase = text.slice(lead.length, colon).trim()
      const inline = text.slice(colon + 1).trim()
      if (!phrase || phrase.includes(">") || (inline && body) || (!inline && !body)) return undefined
      const word = keyFor(this.words.handlers, kind)
      return this.tag(
        indent,
        `<${word} ${phrase}`,
        [],
        inline || undefined,
        body ? body.tokens : undefined,
        word,
        "</>"
      )
    }
    return undefined
  }

  ////////////////
  // ## Writing a tag
  ////////////////

  /**
   * A member's tag:  `head` and its `attributes`, then its body on its own line (`inline`), or its body's lines
   * (`body`), or nothing (`/>`);  closed by `closer`, else `</word>` for a body of lines and `</>` for one on its line.
   */
  private tag(
    indent: string,
    head: string,
    attributes: string[],
    inline: string | undefined,
    body: P.BlockToken | P.Token[] | undefined,
    word: string,
    closer?: string
  ): Written {
    return {
      description: "",
      lines: (description) => {
        const all = description ? [...attributes, this.attribute("description", description)] : attributes
        const open = `${indent}${head}${all.map((attribute) => ` ${attribute}`).join("")}`
        if (inline !== undefined) return [`${open}>${inline}</>`]
        if (!body) return [`${open} />`]
        const items = body instanceof P.BlockToken ? body.tokens : body
        return [`${open}>`, ...items.flatMap((item) => this.sourceOf(item)), `${indent}${closer ?? `</${word}>`}`]
      }
    }
  }

  /** An attribute in the file's language:  `canonical` its English name, e.g. `one-of` => `uno-de="..."`. */
  private attribute(canonical: string, value: string): string {
    return `${keyFor(this.words.attributes, canonical)}=${quoted(value)}`
  }

  ////////////////
  // ## The source
  ////////////////

  /** Each line's statement, by where its line starts:  from the parse. */
  private indexStatements(match: P.Match) {
    const visit = (node: P.Match | P.Token) => {
      if (!(node instanceof P.Match)) return
      if (node.rule.name === "line") {
        const [line] = node.tokens
        const statement = node.matched.find(
          (child): child is P.Match =>
            child instanceof P.Match && child.rule.name !== "comment" && child.rule.name !== "blank_line"
        )
        if (line && statement) this.statements.set(line.start, statement)
      }
      for (const child of node.matched) visit(child)
    }
    visit(match)
  }

  /** `line` and `body`'s source lines, as written. */
  private sourceOf(line: P.Token, body?: P.BlockToken): string[] {
    const first = this.lineOf(firstStart(line))
    const last = this.lineOf(Math.max(lastEnd(body ?? line) - 1, firstStart(line)))
    return this.lines.slice(first, last + 1)
  }

  /** `line`'s text, trimmed:  its first source line. */
  private lineText(line: P.LineToken): string {
    return this.lines[this.lineOf(line.start)]!.trim()
  }

  /** Is `line` blank, or only a comment? */
  private isQuiet(line: P.LineToken): boolean {
    const text = this.lineText(line)
    return !text || (!this.statements.has(line.start) && /^(\/\/|#|--)/.test(text))
  }

  /** The items of `body`, or none. */
  private itemsOf(body: P.BlockToken | undefined): P.Token[] {
    return body ? [...body.tokens] : []
  }

  /** The line `offset` is on, from 0. */
  private lineOf(offset: number): number {
    let low = 0
    let high = this.lineStarts.length - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if (this.lineStarts[middle]! <= offset) low = middle
      else high = middle - 1
    }
    return low
  }

  /** Where the line holding `offset` ends. */
  private lineEndOf(offset: number): number {
    const end = this.text.indexOf("\n", offset)
    return end < 0 ? this.text.length : end
  }
}

/** The rules that declare a template, by what's written:  `a "card" is a view`, `solitaire is an app`. */
const TEMPLATE_RULES = new Set(["create_type", "create_list_type", "create_viewable_list_type", "create_one_of_a_kind"])

/** The rules that declare a property, outline style. */
const PROPERTY_RULES = new Set(["define_property_has", "property_value_getter"])

/** The rules that declare an alias. */
const ALIAS_RULES = new Set(["quoted_property_formula", "quoted_type_expression"])

/** An action detail's group, and its attribute. */
const DETAIL_GROUPS: Array<[string, string]> = [
  ["keys", "shortcut"],
  ["enabled", "enabled-when"],
  ["selected", "selected-when"],
  ["undoneAs", "undone-as"],
  ["icon", "icon"]
]

/** An article before an event parameter's kind, in the languages spell speaks. */
const ARTICLES = /^(a|an|un|una)$/i

/** What `writeBlock()` gets for a line it can write as a tag. */
type Written = {
  /** Its lines, given its description, if one is taken. */
  lines: (description?: string) => string[]
  /** `""`:  it takes a description;  `undefined`:  it doesn't, or has none. */
  description?: string
}

/** What `SpellxWriter.write()` needs. */
export type SpellxWriteInput = {
  /** The `.spell` file's text. */
  text: string
  /** Its parse:  its `block` match. */
  match: P.Match
  /** Its file scope. */
  scope: P.Scope
}

/** `template` with each `{key}` filled from `values`;  a key with no value left as written. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (all, key: string) => values[key] ?? all).replace(/\s+:$/, " :")
}

/** `text` with spaces evened out and no colon at its end. */
function normal(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\s*:$/, "").trim()
}

/** Where `text`'s body colon is:  the first `:` outside quotes, parentheses and braces;  -1 if none. */
function colonAt(text: string): number {
  let depth = 0
  let quote = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '"') quote = !quote
    else if (quote) continue
    else if (char === "(" || char === "{" || char === "[") depth++
    else if (char === ")" || char === "}" || char === "]") depth--
    else if (char === ":" && depth === 0) return index
  }
  return -1
}

/** The key of `table` whose value is `value`:  the word written for it;  `value` itself if none. */
function keyFor(table: Record<string, string>, value: string): string {
  return Object.keys(table).find((key) => table[key] === value) ?? value
}

/** `text` in double quotes. */
function quoted(text: string): string {
  return `"${text}"`
}

/** `text` without the quotes around it, trimmed. */
function unquote(text: string | undefined): string | undefined {
  const trimmed = text?.trim()
  return trimmed?.replace(/^"(.*)"$/, "$1")
}

/** `match`'s group `name`, as a match:  the first, if several. */
function groupMatch(match: P.Match, name: string): P.Match | undefined {
  const group = (match.groups as Record<string, unknown>)[name]
  const first = Array.isArray(group) ? group[0] : group
  return first instanceof P.Match ? first : undefined
}

/** `match`'s group `name`, as written:  its text, trimmed. */
function groupText(match: P.Match, name: string): string | undefined {
  const group = (match.groups as Record<string, unknown>)[name]
  if (group === undefined || group === null) return undefined
  const first = Array.isArray(group) ? group[0] : group
  const text = first instanceof P.Match ? first.inputText : String(first)
  return String(text).trim()
}

/** Where `token` starts:  its first leaf's start. */
function firstStart(token: P.Token): number {
  return token.start
}

/** Where `token` ends:  its last leaf's end. */
function lastEnd(token: P.Token): number {
  if (token instanceof P.BlockToken || token instanceof P.LineToken) {
    const last = token.tokens.at(-1)
    if (last) return Math.max(lastEnd(last), token.start)
  }
  return token.end
}
