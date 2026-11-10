import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * A `.spell` file written as SPELLX (epic `elemental-spell` P12, Q19):
 * `SpellxWriter.write(file)` => its `.spellml` text, a fresh layout of the same program.
 * - The other way from `SX.CodeSpellWriter`, and the same idea:  each declaration line is written as the tag whose
 *   code-spell TWIN (`SP.SpellxTwin`) it is, so the `.spellml` compiles to exactly what the `.spell` did.
 * - Rule by rule, from the file's PARSE:  each line's statement says what it declares (`create_type`,
 *   `define_property_has`, `to_do_something` ...), and the language's twin words say how it's worded
 *   (`SP.SpellxTwinWords`), so a Spanish file is written in Spanish spellx too.
 *   - A template:  `<spell-view "card" template="two sided view">`, its kind by what it IS (a page, an app, a view,
 *     a thing), its members inside it
 *   - a member:  `<property>`, `<alias>`, `<action>`, `<draw>`, `<event>`, `<test>`, `<on ...>` ...;
 *     a property's own aliases as its `alias=`, an action's details as its attributes, a lone comment line above a
 *     member as its `description=`
 *   - a body:  its lines as written, at the same depth
 *   - a page that draws prose or examples:  `<spell-page "x" notebook>`, its drawing its own body again
 *     (`pageDrawing()`;  epic `notebook` P6, T2):
 *     its `<markdown>` blocks as loose prose, its sections as `##` headings
 * - What has no tag (a file's functions, tests and starting code, a member written another way):
 *   a `<spell>` chunk, holding its lines as written, one tab in (the tokenizer unwraps it:  `SP.SpellxTokenizer`).
 *   - So is a member whose drawing has the web's own elements, `<div>`, `<button>` (J83):  `drawsBareTags()`.
 * - Comments and blank lines stay as they are;  so do a body's lines.
 * - And markup alone, an example's body as the editor's Spell view of it shows it (`writeMarkup()`):
 *   each tag a bare name gives, written as that name again.
 * - NEVER throws:  a line it can't write as a tag goes in a `<spell>` chunk.
 * - Above `spell/parser/spell` in the import graph, as the rest of `SX`.
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
    const { tokenizer } = writer
    const [root] = tokenizer.breakIntoIndentedBlocks(tokenizer.tokenize(text))
    writer.writeBlock(root?.tokens ?? [], 0)
    while (writer.out.at(-1) === "") writer.out.pop()
    return `${writer.out.join("\n")}\n`
  }

  /**
   * The spellx `file` reads as, for people to look at:  the editors' "Show as Spellx" view of a `.spell` file.
   * - A `.spell` file:  written as spellx from its last parse, so unsaved edits show.
   * - A `.spellml` file:  its own text.
   * - A view only, never saved:  a template lives in ONE file, `.spell` or `.spellml`, never both
   *   (Owen, 2026-10-25, epic `elemental-spell` J95:  "one file").
   * - Throws `TypeError` if a `.spell` file hasn't been parsed yet.
   */
  static textOf(file: SP.SpellFile): string {
    if (file.form === "spellx") return file.contents ?? ""
    const { match, scope } = file
    if (!match || !scope)
      throw new TypeError(`SpellxWriter.textOf():  ${file.file} hasn't been parsed;  parse it first`)
    return SpellxWriter.write({ text: file.parseText, match, scope })
  }

  /**
   * Code spell `markup` (a drawing's, an example's body) as spellx (epic `notebook` P6):
   * each tag a bare name gives, written as that name again.
   * - e.g. `<ui-button>` ... `</ui-button>` => `<button>` ... `</button>`
   * - The way back from `SX.CodeSpellWriter.writeMarkup()`:
   *   what the editor's Spell view of an example saves, on a page that draws its body.
   * - `options.componentWord`:  the bare name a tag stands for, `undefined` for none (`SP.ComponentTags.wordFor()`);
   *   by default, a pack's, by the name after its prefix.
   * - Read by spell's own tokenizer, as a page's drawing:  only element names change.
   *   An `<html>` block's markup and a `<markdown>` block's text stay as written.
   * - NEVER throws:  markup it can't read is written as it is.
   */
  static writeMarkup(markup: string, options: SpellxMarkupOptions = {}): string {
    const language = options.language ?? SP.Language.forFile(options.path)
    const componentWord =
      options.componentWord ??
      ((tag: string) => {
        const word = tag.replace(/^[\p{Ll}]+-/u, "")
        return word !== tag && SP.ComponentPacks.tagFor(word, language.lang) === tag ? word : undefined
      })
    const { prefix, templates, attributes } = language.words.spellx!
    // read as a page that draws its body, in the language's own words, as `CodeSpellWriter.writeMarkup()` writes it
    const page = Object.keys(templates).find((word) => templates[word] === "page")
    const flag = Object.keys(attributes).find((word) => attributes[word] === SP.PAGE_DRAWS_BODY_FLAG)
    const head = `<${prefix}-${page} "markup" ${flag}>\n`
    const lines = markup.split("\n")
    const text = `${head}${lines.map((line) => `\t${line}`).join("\n")}\n</${prefix}-${page}>\n`
    const parser = language.parser.clone({ module: "spellx writer", form: "spellx" } as P.ParserProps)
    const edits: Array<{ start: number; end: number; text: string }> = []
    // blocks whose insides are written as they are
    const kept: Array<{ start: number; end: number }> = []
    const elements: P.JSXElementToken[] = []
    P.Tokenizer.forEachToken(parser.tokenizer.tokenize(text), (token) => {
      if (token instanceof P.JSXElementToken && !AS_WRITTEN.has(token.tagName)) return void elements.push(token)
      // a block read as markup (`<html><b>x</b></html>` on a line) or as spellx's own tag:  to its closer
      const block = /^<(\w+)>/.exec(`${token.raw ?? ""}`)?.[1]
      if (!block || !AS_WRITTEN.has(block)) return
      const closer = text.indexOf(`</${block}>`, token.start)
      kept.push({ start: token.start, end: closer < 0 ? text.length : closer + block.length + 3 })
    })
    for (const element of elements) {
      if (kept.some((block) => block.start <= element.start && element.end <= block.end)) continue
      const { tagName } = element
      const word = componentWord(tagName)
      if (!word) continue
      // its name just after its `<`:  a token's start can take in the white space before it
      const nameAt = text.indexOf("<", element.start) + 1
      edits.push({ start: nameAt, end: nameAt + tagName.length, text: word })
      const closer = element.isUnaryTag ? undefined : element.raw?.match(/<\/[^>]*>$/)?.[0]
      if (closer === `</${tagName}>`)
        edits.push({ start: element.end - closer.length, end: element.end, text: `</${word}>` })
    }
    let written = text
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      written = written.slice(0, edit.start) + edit.text + written.slice(edit.end)
    }
    return written
      .slice(head.length)
      .split("\n")
      .slice(0, lines.length)
      .map((line) => line.replace(/^\t/, ""))
      .join("\n")
  }

  /** The lines written so far. */
  private readonly out: string[] = []
  /** Writing the members of a page that draws prose or examples?  Its drawing is its own body (`pageDrawing()`). */
  private isInDrawnPage = false
  /** The source's lines. */
  private readonly lines: string[]
  /** Where each source line starts:  `P.getLineStarts()`. */
  private readonly lineStarts: number[]
  /** Each line's statement, by where its line token starts. */
  private readonly statements = new Map<number, P.Match>()
  /** The file's language. */
  private readonly language: SP.Language
  /** Its spellx words. */
  private readonly words: SP.SpellxWords
  /** Its twin words. */
  private readonly twins: SP.SpellxTwinWords
  /** Its tokenizer:  spell's, which reads a line's phrase as spell does (`colonAt()`). */
  private readonly tokenizer: P.Tokenizer

  private constructor(
    readonly text: string,
    readonly scope: P.Scope
  ) {
    this.lines = text.split("\n")
    this.lineStarts = P.getLineStarts(text)
    this.tokenizer = (scope.parser as SP.SpellParser).tokenizer
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
        this.out.push(`${indent}</>`)
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
    // a page drawing prose and examples, as `<spell-page "x" notebook>` reads as:
    // its flag back (epic `notebook` P1), and its drawing back as its own body (`pageDrawing()`, P6)
    const drawsBody = kind === "page" && !!body && this.drawsProseOrExamples(body)
    if (drawsBody) attributes.push(keyFor(this.words.attributes, SP.PAGE_DRAWS_BODY_FLAG))
    if (attributes.some((attribute) => attribute.endsWith('""'))) return undefined
    const head = `<${tagWord} ${quoted(name)}${attributes.map((attribute) => ` ${attribute}`).join("")}`
    return {
      lines: () => {
        if (!body) return [`${head} />`]
        const start = this.out.length
        this.out.push(`${head}>`)
        this.isInDrawnPage = drawsBody
        this.writeBlock(body.tokens, 1)
        this.isInDrawnPage = false
        this.out.push(`</>`)
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
    // a drawn page's drawing:  its own body again, when it can be
    const drawing = this.isInDrawnPage ? this.pageDrawing(line, body, statement, indent) : undefined
    if (drawing) return drawing
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
    return this.someMatch([line, ...(body ? [body] : [])], (node) => {
      const [element] = node.matched
      if (node.rule.name !== "jsxElement" || !(element instanceof P.JSXElementToken)) return false
      const { tagName } = node.data as SP.JSXMatchData
      return tagName === element.tagName && SP.isBareComponentName(tagName)
    })
  }

  /**
   * Does `body`, a page's, draw a `<markdown>` block or an `<example>`, so it's written with its flag again?
   * - That's what a page that draws its body reads as (`<spell-page "x" notebook>`, epic `notebook` P1).
   */
  private drawsProseOrExamples(body: P.BlockToken): boolean {
    return this.someMatch([body], (node) => PAGE_BODY_RULES.has(node.rule.name ?? ""))
  }

  /**
   * The drawing of a page that draws prose or examples, `- to draw it:` and its lines, as the page's OWN body
   * (epic `notebook` P6, T2).
   * - So a page that draws its body is written with no `<draw>`.
   * - Each `<markdown>` block:  its lines, as loose prose
   * - Each section the twin made for a `##` heading (`<section label="Try it">` with the page section's look):
   *   the heading, `## Try it`, then what it holds
   * - Everything else:  as written, at the body's indent
   * - Where loose text would read as something else, the block stays a `<markdown>` block:
   *   - right after another run of prose:  the two would read as one
   *   - a line that starts as markup, a hole or a comment would (`<`, `{`, `//`), or as a section (`## `)
   *   - an indented line:  a nested list's indent reads differently there
   * - `undefined`, so it's written as a `<draw>`, when its body can't say the same:
   *   - anything after a section that isn't one (the section would take it in)
   *   - a block, a line of several elements
   *   - a comment inside a section
   */
  private pageDrawing(
    line: P.LineToken,
    body: P.BlockToken | undefined,
    statement: P.Match,
    indent: string
  ): Written | undefined {
    const rule = statement.rule.name
    if ((rule !== "draw_it" && rule !== "to_do_something") || !body || groupText(statement, "slot") !== undefined)
      return undefined
    const text = this.lineText(line).replace(/^-\s+/, "")
    const colon = this.colonAt(text)
    if (colon < 0 || text.slice(colon + 1).trim() || normal(text.slice(0, colon)) !== normal(this.twins.draw))
      return undefined
    const out: string[] = []
    let isAfterProse = false
    let isInSections = false
    // a `<markdown>` block's lines as loose prose, `indent` in, if they'd read as the same block there
    const unwrapped = (element: P.JSXElementToken): string[] | undefined => {
      const raw = markdownText(element)
      if (raw === undefined || isAfterProse) return undefined
      const lines = raw.split("\n")
      if (lines.some((each) => /^\s+\S/.test(each) || LOOKS_LIKE_CODE.test(each))) return undefined
      return lines.map((each) => (each ? `${indent}${each}` : ""))
    }
    // an element (or a comment) as written, `indent` in:  its lines after the first at their place under it
    const asWritten = (element: P.Token): string[] => {
      const start = element.start + (/^\s*/.exec(this.text.slice(element.start, element.end))?.[0].length ?? 0)
      const lineStart = this.text.lastIndexOf("\n", start - 1) + 1
      const written = /^[ \t]*/.exec(this.text.slice(lineStart, start))![0]
      return this.text
        .slice(start, element.end)
        .split("\n")
        .map((each, index) =>
          index === 0 ? indent + each : each.startsWith(written) ? indent + each.slice(written.length) : each
        )
    }
    // the drawing's elements, in order:  markup on lines one after another is one line, its elements a fragment's
    const elements: P.Token[] = []
    for (const item of body.tokens) {
      if (!(item instanceof P.LineToken)) return undefined
      if (this.isQuiet(item)) {
        elements.push(item)
        continue
      }
      const [only] = item.tokens
      if (item.tokens.length !== 1) return undefined
      if (only instanceof P.JSXFragmentToken && only.record.isImplicit) elements.push(...childrenOf(only))
      else if (only instanceof P.JSXElementToken) elements.push(only)
      else return undefined
    }
    for (const element of elements) {
      if (element instanceof P.LineToken) {
        out.push(...this.sourceOf(element).map((each) => each.replace(/^\t/, "")))
        continue
      }
      const label = element instanceof P.JSXElementToken ? this.sectionLabelOf(element) : undefined
      if (label !== undefined) {
        if (out.length && out.at(-1) !== "") out.push("")
        out.push(`${indent}## ${label}`)
        isInSections = true
        // its first `<markdown>`:  the heading's own prose, right under it
        isAfterProse = false
        for (const child of childrenOf(element as P.JSXElementToken)) {
          if (!(child instanceof P.JSXElementToken)) return undefined
          const prose = unwrapped(child)
          out.push(...(prose ?? asWritten(child)))
          isAfterProse = !!prose
        }
        continue
      }
      if (isInSections) return undefined
      if (!(element instanceof P.JSXElementToken)) {
        // a comment:  prose after it may still join the prose before it
        out.push(...asWritten(element))
        continue
      }
      const prose = unwrapped(element)
      out.push(...(prose ?? asWritten(element)))
      isAfterProse = !!prose
    }
    return { lines: () => out }
  }

  /**
   * `element`'s label, when it's a section the twin makes for a `##` heading:
   * the page section's tag (or its pack's), its label and its look, nothing else (`SP.SpellxTwinWords.pageSection`).
   * - `undefined` for any other element.
   */
  private sectionLabelOf(element: P.JSXElementToken): string | undefined {
    const { tag, label, defaults } = this.twins.pageSection
    if (element.tagName !== tag && element.tagName !== SP.ComponentPacks.tagFor(tag, this.language.lang))
      return undefined
    const said = new Map((element.attributes ?? []).map((each) => [each.name, each.value?.value]))
    const look = Object.entries(defaults)
    if (said.size !== look.length + 1) return undefined
    if (look.some(([name, value]) => said.get(name) !== (value === true ? undefined : `"${value}"`))) return undefined
    const text = said.get(label)
    if (typeof text !== "string" || !/^"[^"]+"$/.test(text)) return undefined
    // its `[`s and `]`s were doubled, as an attribute's `[name]` is a fill-in
    return text.slice(1, -1).replace(/\[\[/g, "[").replace(/\]\]/g, "]")
  }

  /** Does any match of the statements of `items` (lines and blocks, every line in them), or inside one, pass `test`? */
  private someMatch(items: P.Token[], test: (node: P.Match) => boolean): boolean {
    const seen = new Set<P.Match>()
    const passes = (node: unknown): boolean => {
      if (Array.isArray(node)) return node.some(passes)
      if (!(node instanceof P.Match) || seen.has(node)) return false
      seen.add(node)
      if (test(node)) return true
      return node.matched.some(passes) || Object.values(node.data ?? {}).some(passes)
    }
    const lines = (item: P.Token): P.Token[] =>
      item instanceof P.BlockToken ? item.tokens.flatMap(lines) : item instanceof P.LineToken ? [item] : []
    return items.flatMap(lines).some((item) => passes(this.statements.get(item.start)))
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
    if (rule === "define_group") return this.group(text, body, statement, indent)
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
   * - `- its "symbol" is:` and its lines => `<property "symbol">` ... `</>`
   * - `- its "moves" is 0` => `<property "moves">0</>`
   * - `- its "count" is a number starting at 0` => `<property "count" type="number">0</>`
   */
  private property(text: string, body: P.BlockToken | undefined, statement: P.Match, indent: string) {
    const name = unquote(groupText(statement, "property"))
    if (!name || name.includes('"')) return undefined
    // what its place calls it, its words for none (`stored as "x"`, `or "unknown"`):  no attribute says them yet, so it stays a line
    const { nothing, storedAs } = statement.groups as { nothing?: P.Match; storedAs?: P.Match }
    if (nothing || storedAs) return undefined
    // a measure's unit (`a length in mm`):  `type=` would say only `length`, so it stays a line (epic `data` P33)
    const measured = (statement.groups as { specifier?: P.Match }).specifier
    if (measured && groupText(measured, "unit")) return undefined
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
    // `a number`, `a number starting at 0` => its `type=`, and the value it starts at
    const specifier = (statement.groups as { specifier?: P.Match }).specifier
    const typeWord = specifier && groupText(specifier, "datatype")
    if (typeWord && !groupText(specifier, "owner") && !body) {
      const start = groupText(specifier, "start")
      if (/\s/.test(typeWord) === false && !typeWord.includes('"') && rest.split(/\s+/)[1] === typeWord) {
        attributes.unshift(this.attribute("type", typeWord))
        return this.tag(indent, head, attributes, start, undefined, word)
      }
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

  /**
   * `- group "direction"` => `<group "direction" />` (epic `elemental-spell` P16):  a heading over the members after it.
   * - A group opened again further down (code spell's way to put a member away from the rest) is a `<group>` again:
   *   the same group, so it means the same, if not written `group=` on the member.
   */
  private group(text: string, body: P.BlockToken | undefined, statement: P.Match, indent: string) {
    if (body) return undefined
    const name = unquote(groupText(statement, "group"))
    if (!name || name.includes('"') || text !== fill(this.twins.group, { name: quoted(name) })) return undefined
    const word = keyFor(this.words.declarations, "group")
    return this.tag(indent, `<${word} ${quoted(name)}`, [], undefined, undefined, word)
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
    const colon = this.colonAt(text)
    if (colon < 0) return undefined
    const lead = normal(text.slice(0, colon))
    const inline = text.slice(colon + 1).trim()
    const slot = groupText(statement, "slot")
    const signature = groupText(statement, "signature")
    const isTest = !!groupMatch(statement, "asTest")
    let word: string
    let head: string
    let closer: string | undefined
    if (slot !== undefined) {
      if (lead !== normal(fill(this.twins.drawSlot, { words: slot }))) return undefined
      word = keyFor(this.words.declarations, "draw")
      head = `<${word} ${quoted(unquote(slot)!)}`
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
    const attributes: string[] = []
    // its details (`- shortcut meta+F`, `- enabled when ...`), first in its body:  its attributes
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
    if (groupText(statement, "undoable") !== undefined) return keyFor(this.words.attributes, "undoable")
    for (const [group, attribute] of DETAIL_GROUPS) {
      const value = groupText(statement, group)
      if (value === undefined) continue
      const plain = attribute === "undoable" || attribute === "icon" ? unquote(value) : value
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
      const colon = this.colonAt(text)
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
   * (`body`), or nothing (`/>`);  closed by `</>` (Owen, 2026-11-09:  every closer `</>`), or by `closer`.
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
        // a drawing's comments as markup's own, `<!-- ... -->` (Owen, 2026-10-26)
        const comments = word === keyFor(this.words.declarations, "draw") ? this.commentLinesIn(items) : new Set()
        const written = items.flatMap((item) => {
          const from = this.lineOf(firstStart(item))
          return this.sourceOf(item).map((line, index) => (comments.has(from + index) ? htmlComment(line) : line))
        })
        return [`${open}>`, ...written, `${indent}${closer ?? "</>"}`]
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

  /**
   * The source lines in `items` that are `//` comments alone:  a line of its own in a drawing, or one inside its
   * markup (`P.JSXCommentToken`).  Never one inside a `<markdown>` or `<css>` block, whose `//` is its own text.
   */
  private commentLinesIn(items: P.Token[]): Set<number> {
    const lines = new Set<number>()
    P.Tokenizer.forEachToken(items, (token) => {
      const isLine =
        token instanceof P.LineToken &&
        token.tokens.length === 1 &&
        token.tokens[0] instanceof P.CommentToken &&
        token.tokens[0].commentSymbol.startsWith("//")
      if (isLine) lines.add(this.lineOf(token.tokens[0]!.start))
      if (token instanceof P.JSXCommentToken && token.commentSymbol === "//") lines.add(this.lineOf(token.end - 1))
    })
    return lines
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
    return P.positionForOffset(this.lineStarts, offset).line
  }

  /**
   * Where `text`'s body colon is:  the first `:` outside quotes, parentheses and braces (`P.Tokenizer.findPhraseEnd()`);
   * -1 if none.
   */
  private colonAt(text: string): number {
    const colon = this.tokenizer.findPhraseEnd(text, 0, text.length, { stop: ":" })
    return text[colon] === ":" ? colon : -1
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
  ["undoneAs", "undoable"],
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

/** Options for `SpellxWriter.writeMarkup()`. */
export type SpellxMarkupOptions = {
  /** The file's path, which says its language. */
  path?: string
  /** Its language, over what its path says. */
  language?: SP.Language
  /** The bare name tag `tag` stands for:  `undefined` for a tag no bare name gives (`SP.ComponentTags.wordFor()`). */
  componentWord?: (tag: string) => string | undefined
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

/** Spell's own blocks in a drawing, their insides written as they are:  `<markdown>`'s text, `<html>`'s markup. */
const AS_WRITTEN: ReadonlySet<string> = new Set(["markdown", "html"])

/** A line of prose that a page's body would read as something else:  markup, a hole, a comment, a section. */
const LOOKS_LIKE_CODE = /^(<|\{|\/\/|##\s)/

/** `element`'s children that are elements or comments:  not its closer, nor the white space between them. */
function childrenOf(element: P.JSXElementToken | P.JSXFragmentToken): P.Token[] {
  return (element.children ?? []).filter(
    (child) => !(child instanceof P.JSXEndTagToken) && !(child instanceof P.JSXTextToken && !`${child.value}`.trim())
  )
}

/**
 * `element`'s text, when it's a `<markdown>` block with no attributes:
 * its lines between its tags, less their common indent.
 * - `undefined` for any other element, or a block on one line.
 */
function markdownText(element: P.Token): string | undefined {
  if (!(element instanceof P.JSXElementToken) || element.tagName !== "markdown") return undefined
  const match = /^<markdown>[ \t]*\n([^]*)\n[ \t]*<\/markdown>$/.exec(`${element.raw ?? ""}`)
  if (!match) return undefined
  const lines = match[1]!.split("\n")
  const indents = lines.filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)![0])
  const common = indents.reduce((shortest, each) => (each.length < shortest.length ? each : shortest), indents[0] ?? "")
  return lines.map((line) => (line.startsWith(common) ? line.slice(common.length) : line.trim())).join("\n")
}

/** What a page that draws its body draws, and only it:  its prose's `<markdown>` blocks, its `<example>`s. */
const PAGE_BODY_RULES = new Set(["markdown_block", "example_block"])

/** The key of `table` whose value is `value`:  the word written for it;  `value` itself if none. */
function keyFor(table: Record<string, unknown>, value: string): string {
  return Object.keys(table).find((key) => table[key] === value) ?? value
}

/** A `//` comment `line` as markup's comment, at its indent:  `\t// note` => `\t<!-- note -->`. */
function htmlComment(line: string): string {
  const [, indent, text] = /^(\s*)\/\/+\s?(.*)$/.exec(line) ?? [undefined, "", line]
  return text!.trim() ? `${indent}<!-- ${text!.trim()} -->` : `${indent}<!-- -->`
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
