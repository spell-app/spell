import { suggest } from "spell/util"

import { SP } from "spell-parser/spell"
import { SX } from "spell-parser/spellx"

/**
 * Reads a `.spellx` file into its CHUNK TREE (epic `elemental-spell` P3):  `SpellxReader.read(text)` => `SX.SpellxFile`.
 * - Spellx is spell's tag-shaped form:  a template in a prefixed tag, its members in short tags inside it,
 *   prose between them, every body raw spell.
 *   - `<spell-view "playing card" template="two sided view">` holds `<property "suit" one-of="...">`,
 *     `<alias>`, `<action>`, `<on mouse down>`, `<draw "front">` ...
 *   - The words are a CLOSED vocabulary, the file's language's (`SP.SpellxWords`):  any other is an error naming the
 *     closest one.
 * - Our own reader, never an HTML or JSX parser (Q5, Q8):  a body's `<` and `&` stay as written.
 * - What it reads, and how:
 *   - a TEMPLATE, then its MEMBERS line by line:  a line starting with a tag starts a member, any other is prose
 *   - a member's head:  its word, then a quoted name and attributes (`<property "suit" one-of="...">`), or,
 *     for a handler or a control, a spell PHRASE up to its `>` (`<on mouse down>`), `>` inside quotes or
 *     parens being text (Q45)
 *   - a member's BODY, line by line:  spell lines, each without the body's indent (Q7), with `<description>` /
 *     `<comment>` notes among them (Q14);  it ends at a closer on a line of its own, or at the end of its last line
 *   - a drawing's body, character by character:  MARKUP -- elements, text, `{holes}`, if-chains, loops,
 *     placed parts (Q43, Q55)
 *   - closers:  `</>` closes the innermost open tag (Q40), `</word>` the same but checked, `/>` ends a tag with
 *     nothing inside (Q47);  an `<otherwise>` goes on with the open `<if>`, ONE `</>` closing the chain (Q53)
 * - Never throws on a file:  what's wrong is a diagnostic (`SX.SpellxDiagnostic`), and reading goes on.
 * - Stands on `spell-parser/spell` for the language's words and messages;  compiles nothing.
 */
export class SpellxReader {
  /**
   * Read `text`, a `.spellx` file, into its chunk tree.
   * - `options.path`:  the file's path, which says its language (`Carta.es.spellx` is Spanish)
   * - `options.language`:  its language, over what its path says
   */
  static read(text: string, options: SpellxReadOptions = {}): SX.SpellxFile {
    return new SpellxReader(text, options).read()
  }

  /** the file's text */
  readonly text: string
  /** the file's path, if it has one */
  readonly path: string | undefined
  /** the file's language:  its words and messages */
  readonly language: SP.Language
  /** the language's spellx words, else English's */
  readonly words: SP.SpellxWords
  /** what's wrong, as found */
  readonly diagnostics: SX.SpellxDiagnostic[] = []

  constructor(text: string, options: SpellxReadOptions = {}) {
    this.text = text
    this.path = options.path
    this.language = options.language ?? SP.Language.forFile(options.path)
    const words = this.language.words.spellx ?? SP.Language.default.words.spellx
    if (!words) throw new TypeError("SpellxReader():  no language has spellx's words;  English's should")
    this.words = words
  }

  /** Read the whole file. */
  read(): SX.SpellxFile {
    const { children } = this.readMembers(undefined, 0)
    return new SX.SpellxFile({
      path: this.path,
      text: this.text,
      language: this.language,
      nodes: children,
      diagnostics: this.diagnostics
    })
  }

  ////////////////
  // ## Members:  a template's, a menu's, or the file's own
  ////////////////

  /**
   * Read members and prose from `start`, line by line, to `owner`'s closer -- or to the end, for the file itself.
   * - A line starting with a tag starts a member;  a line starting with a closer closes `owner`;
   *   any other line is prose.
   * - A template inside a template ends the outer one there, unclosed (`nested-template`):
   *   the caller reads it next.
   */
  private readMembers(owner: SX.SpellxTemplate | SX.SpellxDeclaration | undefined, start: number): MembersRead {
    const children: SX.SpellxNode[] = []
    let pos = start
    while (pos < this.text.length) {
      const first = this.firstCharOfLine(pos)
      if (first === undefined) {
        pos = this.nextLineStart(pos)
        continue
      }
      // a closer
      if (this.text.startsWith("</", first)) {
        const closer = this.readCloser(first)
        if (closer) {
          if (!owner) {
            this.report("error", "unexpected-closer", closer.span, { closer: this.slice(closer.span) })
            pos = closer.span.end
            continue
          }
          this.checkCloser(closer, owner)
          return { children, end: closer.span.end, closed: true }
        }
      }
      // a tag
      if (this.isTagStart(first)) {
        const tag = this.tagAt(first)
        if (tag.category === "template") {
          if (owner) {
            this.report("error", "nested-template", this.spanOfWord(tag), {
              tag: `<${tag.word}>`,
              outer: `<${owner.word}>`
            })
            return { children, end: first, closed: false }
          }
          const template = this.readTemplate(tag)
          children.push(template)
          pos = template.span.end
          continue
        }
        if (!owner && tag.category === "unknown") {
          this.reportUnknownWord(tag, this.templateWords())
          const member = this.readUnknownMember(tag)
          children.push(member)
          pos = member.span.end
          continue
        }
        if (!owner) {
          this.report("error", "outside-template", this.spanOfWord(tag), {
            tag: `<${tag.word}>`,
            template: `<${this.templateWords()[0]}>`
          })
        }
        const member = this.readMember(tag)
        children.push(member)
        pos = member.span.end
        continue
      }
      // prose
      const prose = this.readProse(pos)
      if (prose.node) children.push(prose.node)
      pos = prose.end
    }
    if (owner) this.report("error", "unclosed-tag", owner.headSpan, { tag: `<${owner.word}>` })
    return { children, end: this.text.length, closed: false }
  }

  /** Read a template:  its head, then its members to its closer. */
  private readTemplate(tag: TagWord & { category: "template" }): SX.SpellxTemplate {
    const head = this.readNamedHead(tag)
    const template: SX.SpellxTemplate = {
      kind: "template",
      type: tag.type,
      word: tag.word,
      name: head.name,
      nameSpan: head.nameSpan,
      attributes: head.attributes,
      children: [],
      headSpan: { start: tag.start, end: head.end },
      span: { start: tag.start, end: head.end }
    }
    if (head.selfClosing) return template
    const members = this.readMembers(template, head.end)
    template.children = members.children
    template.span.end = members.end
    return template
  }

  /** Read the member a tag starts, whatever its kind;  `unknown` and misplaced ones are reported, then read anyway. */
  private readMember(tag: TagWord): SX.SpellxNode {
    switch (tag.category) {
      case "declaration":
        return this.readDeclaration(tag)
      case "note":
        return this.readNote(tag)
      case "handler":
        return this.readHandler(tag)
      case "control":
        // an `<if>` or a loop among members:  read it as markup, so nothing after it is lost
        this.report("error", "misplaced-tag", this.spanOfWord(tag), {
          tag: `<${tag.word}>`,
          where: this.language.parserMessage("spellx-where-control")
        })
        return this.readControlAsMarkup(tag)
      case "template":
      case "unknown":
        this.reportUnknownWord(tag, this.memberWords())
        return this.readUnknownMember(tag)
    }
  }

  /** Read a declaration:  `<property "suit" ...>`, its body by its type. */
  private readDeclaration(tag: TagWord & { category: "declaration" }): SX.SpellxDeclaration {
    const head = this.readNamedHead(tag)
    const declaration: SX.SpellxDeclaration = {
      kind: "declaration",
      type: tag.type,
      word: tag.word,
      name: head.name,
      nameSpan: head.nameSpan,
      attributes: head.attributes,
      children: [],
      selfClosing: head.selfClosing,
      headSpan: { start: tag.start, end: head.end },
      span: { start: tag.start, end: head.end }
    }
    if (head.selfClosing) return declaration
    const body =
      tag.type === "draw"
        ? this.readMarkup(declaration, head.end)
        : tag.type === "menu"
          ? this.readMembers(declaration, head.end)
          : this.readBody(declaration, head.end, { notes: true })
    declaration.children = body.children
    declaration.span.end = body.end
    return declaration
  }

  /** Read a handler:  `<on mouse down>`, its phrase, then its body of spell lines. */
  private readHandler(tag: TagWord & { category: "handler" }): SX.SpellxHandler {
    const head = this.readPhraseHead(tag)
    const handler: SX.SpellxHandler = {
      kind: "handler",
      type: tag.type,
      word: tag.word,
      phrase: head.phrase,
      phraseSpan: head.phraseSpan,
      children: [],
      headSpan: { start: tag.start, end: head.end },
      span: { start: tag.start, end: head.end }
    }
    if (head.selfClosing) return handler
    const body = this.readBody(handler, head.end, { notes: true })
    handler.children = body.children
    handler.span.end = body.end
    return handler
  }

  /** Read a note:  `<description>...</>`, its text markdown. */
  private readNote(tag: TagWord & { category: "note" }): SX.SpellxNote {
    const head = this.readNamedHead(tag)
    const note: SX.SpellxNote = {
      kind: "note",
      type: tag.type,
      word: tag.word,
      text: "",
      textSpan: { start: head.end, end: head.end },
      headSpan: { start: tag.start, end: head.end },
      span: { start: tag.start, end: head.end }
    }
    if (head.selfClosing) return note
    const body = this.readBody(note, head.end, { notes: false })
    const lines = body.children.flatMap((child) => (child.kind === "code" ? child.lines : []))
    if (lines.length) {
      note.text = lines.map((line) => line.text).join("\n")
      note.textSpan = { start: lines[0]!.span.start, end: lines.at(-1)!.span.end }
    }
    note.span.end = body.end
    return note
  }

  /** Read a tag spellx doesn't know (already reported), so the file reads on:  as a declaration with a body of lines. */
  private readUnknownMember(tag: TagWord): SX.SpellxDeclaration {
    const head = this.readNamedHead(tag, { checkAttributes: false })
    const declaration: SX.SpellxDeclaration = {
      kind: "declaration",
      type: "action",
      word: tag.word,
      name: head.name,
      nameSpan: head.nameSpan,
      attributes: head.attributes,
      children: [],
      selfClosing: head.selfClosing,
      headSpan: { start: tag.start, end: head.end },
      span: { start: tag.start, end: head.end }
    }
    if (head.selfClosing) return declaration
    const body = this.readBody(declaration, head.end, { notes: true })
    declaration.children = body.children
    declaration.span.end = body.end
    return declaration
  }

  ////////////////
  // ## Bodies:  spell lines
  ////////////////

  /**
   * Read a body of spell lines from `start` (just past its owner's head) to its owner's closer.
   * - Text on the head's own line is its first line:  `<alias "is a face card">if its rank is jack ...</>`.
   * - Every other line loses the body's indent:  the first line's;  a line indented less is a warning (Q7).
   * - The closer:  on a line of its own, or at the end of the last line.
   *   A `</word>` that closes nothing of spellx's (`</ui-text>`) is spell, not a closer.
   * - `notes`:  whether `<description>` / `<comment>` start notes here;  a note's own body has none.
   */
  private readBody(owner: BodyOwner, start: number, { notes }: { notes: boolean }): MembersRead {
    const children: SX.SpellxNode[] = []
    let lines: SX.SpellxLine[] = []
    let bodyIndent: string | undefined
    const ownerIndent = this.indentOfLine(owner.headSpan.start)
    const flush = () => {
      while (lines.length && !lines.at(-1)!.text.trim()) lines.pop()
      if (lines.length)
        children.push({ kind: "code", lines, span: { start: lines[0]!.span.start, end: lines.at(-1)!.span.end } })
      lines = []
    }
    const done = (end: number, closed: boolean): MembersRead => {
      flush()
      if (!closed) this.report("error", "unclosed-tag", owner.headSpan, { tag: `<${owner.word}>` })
      return { children, end, closed }
    }

    // the rest of the head's own line
    let pos = start
    const headLineEnd = this.lineEndOf(pos)
    const inline = this.text.slice(pos, headLineEnd)
    if (inline.trim()) {
      const textStart = pos + (inline.length - inline.trimStart().length)
      const closer = this.closerAtEnd(textStart, headLineEnd, owner)
      const end = closer ? closer.span.start : headLineEnd
      const text = this.text.slice(textStart, end).trimEnd()
      if (text) lines.push({ text, indent: 0, span: { start: textStart, end: textStart + text.length } })
      if (closer) return done(closer.span.end, true)
    }
    pos = this.nextLineStart(headLineEnd)

    while (pos < this.text.length) {
      const lineEnd = this.lineEndOf(pos)
      const first = this.firstCharOfLine(pos)
      // a blank line:  kept inside a run, dropped at its end
      if (first === undefined) {
        if (lines.length) lines.push({ text: "", indent: lineEnd - pos, span: { start: lineEnd, end: lineEnd } })
        pos = this.nextLineStart(lineEnd)
        continue
      }
      // a closer on a line of its own
      if (this.text.startsWith("</", first)) {
        const closer = this.readCloser(first)
        if (closer && this.isCloserFor(closer, owner)) {
          this.checkCloser(closer, owner)
          return done(closer.span.end, true)
        }
      }
      // a note
      if (notes && this.isTagStart(first)) {
        const tag = this.tagAt(first)
        if (tag.category === "note") {
          flush()
          const note = this.readNote(tag)
          children.push(note)
          pos = note.span.end
          continue
        }
      }
      // a line of spell
      const indent = this.text.slice(pos, first)
      if (bodyIndent === undefined) {
        bodyIndent = indent
        if (indent.length <= ownerIndent.length) this.reportIndentedLess(pos, first, owner)
      } else if (!indent.startsWith(bodyIndent)) {
        this.reportIndentedLess(pos, first, owner)
      }
      const textStart = indent.startsWith(bodyIndent) ? pos + bodyIndent.length : first
      const closer = this.closerAtEnd(textStart, lineEnd, owner)
      const end = closer ? closer.span.start : lineEnd
      const text = this.text.slice(textStart, end).trimEnd()
      if (text || !closer)
        lines.push({ text, indent: textStart - pos, span: { start: textStart, end: textStart + text.length } })
      if (closer) return done(closer.span.end, true)
      pos = this.nextLineStart(lineEnd)
    }
    return done(this.text.length, false)
  }

  /** Report a body line indented less than its body (Q7:  a warning;  the editor keeps indents right). */
  private reportIndentedLess(lineStart: number, first: number, owner: BodyOwner) {
    this.report(
      "warning",
      "indented-less",
      { start: lineStart, end: first },
      {
        tag: `<${owner.word}>`
      }
    )
  }

  ////////////////
  // ## Markup:  a drawing's body
  ////////////////

  /**
   * Read a drawing's body from `start` (just past `owner`'s head) to `owner`'s closer, character by character:
   * elements, text, `{holes}`, if-chains, loops, placed parts and notes, each with its span.
   * - `owner`:  the `<draw>`, or an `<if>` / loop met among members (reported already), read as markup anyway.
   */
  private readMarkup(owner: SX.SpellxDeclaration | SX.SpellxChoice | SX.SpellxLoop, start: number): MembersRead {
    const root: MarkupFrame = { node: owner, children: [] }
    if (owner.kind === "choice") root.children = owner.branches[0]!.children
    else if (owner.kind === "loop") root.children = owner.children
    const stack: MarkupFrame[] = [root]
    let pos = start
    while (pos < this.text.length) {
      const frame = stack.at(-1)!
      const char = this.text[pos]
      if (char === "<" && this.text[pos + 1] === "/") {
        const closer = this.readCloser(pos)
        if (closer) {
          pos = closer.span.end
          if (this.closeMarkup(stack, closer)) return { children: root.children, end: pos, closed: true }
          continue
        }
      }
      if (char === "<" && this.isTagStart(pos)) {
        pos = this.readMarkupTag(stack, pos)
        continue
      }
      if (char === "{") {
        const hole = this.readHole(pos)
        this.appendMarkup(frame, hole)
        pos = hole.span.end
        continue
      }
      // text, to the next tag or hole
      let end = pos + 1
      while (end < this.text.length && !this.isMarkupBreak(end)) end++
      const text = this.markupText(pos, end)
      if (text) this.appendMarkup(frame, text)
      pos = end
    }
    for (const frame of stack.reverse()) {
      this.reportUnclosed(frame.node)
      this.endMarkupNode(frame.node, this.text.length)
    }
    return { children: root.children, end: this.text.length, closed: false }
  }

  /** Read the tag at `pos` into the markup on `stack`;  returns where reading goes on. */
  private readMarkupTag(stack: MarkupFrame[], pos: number): number {
    const frame = stack.at(-1)!
    const tag = this.tagAt(pos)
    switch (tag.category) {
      case "note": {
        const note = this.readNote(tag)
        frame.children.push(note)
        return note.span.end
      }
      case "control":
        return this.readMarkupControl(stack, tag)
      case "declaration":
        if (tag.type === "draw") return this.readMarkupDraw(stack, tag)
        // `<menu>`, `<action>` ... in a drawing are components (Q50):  the place decides
        return this.readElement(stack, tag)
      case "handler": {
        this.report("error", "misplaced-tag", this.spanOfWord(tag), {
          tag: `<${tag.word}>`,
          where: this.language.parserMessage("spellx-where-member")
        })
        const handler = this.readHandler(tag)
        this.appendMarkup(frame, handler)
        return handler.span.end
      }
      case "template":
        this.report("error", "nested-template", this.spanOfWord(tag), {
          tag: `<${tag.word}>`,
          outer: this.tagNameOf(stack[0]!.node)
        })
        return this.readElement(stack, tag)
      case "unknown":
        return this.readElement(stack, tag)
    }
  }

  /** Read an element's head;  one with a body goes on the stack, to be closed. */
  private readElement(stack: MarkupFrame[], tag: TagWord): number {
    const head = this.readNamedHead(tag, { checkAttributes: false, liftName: false })
    const element: SX.SpellxElement = {
      kind: "element",
      name: tag.word,
      attributes: head.attributes,
      children: [],
      selfClosing: head.selfClosing,
      headSpan: { start: tag.start, end: head.end },
      span: { start: tag.start, end: head.end }
    }
    this.appendMarkup(stack.at(-1)!, element)
    if (!head.selfClosing) stack.push({ node: element, children: element.children })
    return head.end
  }

  /**
   * Read a `<draw>` met in a drawing:  `<draw "front" />` places a part (Q55);
   * one with a body is a part DEFINED in a drawing, reported, and read as an element.
   */
  private readMarkupDraw(stack: MarkupFrame[], tag: TagWord & { category: "declaration" }): number {
    const frame = stack.at(-1)!
    const head = this.readNamedHead(tag)
    if (head.selfClosing && head.name !== undefined && head.nameSpan) {
      this.appendMarkup(frame, {
        kind: "place",
        word: tag.word,
        name: head.name,
        nameSpan: head.nameSpan,
        span: { start: tag.start, end: head.end }
      })
      return head.end
    }
    const name = head.name ?? ""
    this.report(
      "error",
      "part-in-drawing",
      { start: tag.start, end: head.end },
      {
        draw: `<${tag.word} "${name}">`,
        place: `<${tag.word} "${name}" />`
      }
    )
    const element: SX.SpellxElement = {
      kind: "element",
      name: tag.word,
      attributes: head.attributes,
      children: [],
      selfClosing: head.selfClosing,
      headSpan: { start: tag.start, end: head.end },
      span: { start: tag.start, end: head.end }
    }
    this.appendMarkup(frame, element)
    if (!head.selfClosing) stack.push({ node: element, children: element.children })
    return head.end
  }

  /**
   * Read a control tag in a drawing:  `<if>` starts a chain, `<otherwise ...>` goes on with the open one (Q53),
   * `<for each>` starts a loop.
   * - An `<otherwise>` after a `</>` that closed its `<if>`:  reported with a fix (drop that `</>`),
   *   then read as if it hadn't, so the chain stays one.
   */
  private readMarkupControl(stack: MarkupFrame[], tag: TagWord & { category: "control" }): number {
    const head = this.readPhraseHead(tag)
    const headSpan = { start: tag.start, end: head.end }
    if (tag.type === "for each") {
      const loop: SX.SpellxLoop = {
        kind: "loop",
        type: "for each",
        word: tag.word,
        phrase: head.phrase,
        phraseSpan: head.phraseSpan,
        children: [],
        headSpan,
        span: { ...headSpan }
      }
      this.appendMarkup(stack.at(-1)!, loop)
      if (!head.selfClosing) stack.push({ node: loop, children: loop.children })
      return head.end
    }
    const branch: SX.SpellxBranch = {
      kind: "branch",
      type: tag.type,
      word: tag.word,
      phrase: tag.type === "otherwise" ? undefined : head.phrase,
      phraseSpan: tag.type === "otherwise" ? undefined : head.phraseSpan,
      children: [],
      headSpan,
      span: { ...headSpan }
    }
    if (tag.type === "if") {
      const choice: SX.SpellxChoice = { kind: "choice", branches: [branch], span: { ...headSpan } }
      this.appendMarkup(stack.at(-1)!, choice)
      stack.push({ node: choice, children: branch.children })
      return head.end
    }
    // `<otherwise ...>`:  the open chain, else the one a `</>` just closed, else none
    let frame = stack.at(-1)!
    if (frame.node.kind !== "choice") {
      const closed = frame.closedChoice
      if (closed) {
        this.report("error", "otherwise-after-closed-if", headSpan, this.otherwiseParams(tag), {
          span: closed.closer,
          text: ""
        })
        frame.closedChoice = undefined
        frame = { node: closed.choice, children: [] }
        stack.push(frame)
      } else {
        this.report("error", "otherwise-without-if", headSpan, this.otherwiseParams(tag))
        const choice: SX.SpellxChoice = { kind: "choice", branches: [], span: { ...headSpan } }
        this.appendMarkup(frame, choice)
        frame = { node: choice, children: [] }
        stack.push(frame)
      }
    }
    const choice = frame.node as SX.SpellxChoice
    const previous = choice.branches.at(-1)
    if (previous) previous.span.end = tag.start
    choice.branches.push(branch)
    frame.children = branch.children
    return head.end
  }

  /** Read an `<if>` or a loop met among members (reported already), as markup, to its closer. */
  private readControlAsMarkup(tag: TagWord & { category: "control" }): SX.SpellxChoice | SX.SpellxLoop {
    const head = this.readPhraseHead(tag)
    const headSpan = { start: tag.start, end: head.end }
    const node: SX.SpellxChoice | SX.SpellxLoop =
      tag.type === "for each"
        ? {
            kind: "loop",
            type: "for each",
            word: tag.word,
            phrase: head.phrase,
            phraseSpan: head.phraseSpan,
            children: [],
            headSpan,
            span: { ...headSpan }
          }
        : {
            kind: "choice",
            branches: [
              {
                kind: "branch",
                type: tag.type,
                word: tag.word,
                phrase: tag.type === "otherwise" ? undefined : head.phrase,
                phraseSpan: tag.type === "otherwise" ? undefined : head.phraseSpan,
                children: [],
                headSpan,
                span: { ...headSpan }
              }
            ],
            span: { ...headSpan }
          }
    if (head.selfClosing) return node
    this.readMarkup(node, head.end)
    return node
  }

  /**
   * Close the innermost open markup tag with `closer`;  returns whether it closed the drawing itself.
   * - A named closer for a tag further out closes every one inside it, each reported unclosed;
   *   one for no open tag is reported, and closes the innermost anyway.
   */
  private closeMarkup(stack: MarkupFrame[], closer: Closer): boolean {
    let index = stack.length - 1
    if (closer.word !== undefined && !this.isCloserFor(closer, stack[index]!.node)) {
      let match = stack.length - 1
      while (match >= 0 && !this.isCloserFor(closer, stack[match]!.node)) match--
      if (match >= 0) {
        for (const frame of stack.slice(match + 1)) this.reportUnclosed(frame.node)
        index = match
      } else {
        this.report(
          "error",
          "mismatched-closer",
          closer.span,
          {
            closer: this.slice(closer.span),
            open: this.tagNameOf(stack[index]!.node)
          },
          { span: closer.span, text: "</>" }
        )
      }
    }
    const closed = stack[index]!.node
    for (const frame of stack.splice(index)) this.endMarkupNode(frame.node, closer.span.end, closer.span.start)
    if (index === 0) return true
    if (closed.kind === "choice") stack.at(-1)!.closedChoice = { choice: closed, closer: closer.span }
    return false
  }

  /** End a markup node at `end`;  an if-chain's last branch ends where its closer starts. */
  private endMarkupNode(node: MarkupOwner, end: number, closerStart = end) {
    node.span.end = end
    if (node.kind === "choice") {
      const last = node.branches.at(-1)
      if (last) last.span.end = closerStart
    }
  }

  /** Add `node` to the markup of `frame`;  anything but a note ends a just-closed chain's hope of an `<otherwise>`. */
  private appendMarkup(frame: MarkupFrame, node: SX.SpellxNode) {
    if (node.kind !== "note") frame.closedChoice = undefined
    frame.children.push(node)
  }

  /** A hole at `start`:  `{its rank}`, to its matching `}`, quotes and nested braces skipped. */
  private readHole(start: number): SX.SpellxHole {
    const end = this.matchingBrace(start)
    const code = this.text.slice(start + 1, end - 1)
    return { kind: "hole", code, codeSpan: { start: start + 1, end: end - 1 }, span: { start, end } }
  }

  /**
   * Markup text from `start` to `end`, as JSX reads it:  whitespace with a line break, at either end, comes off;
   * whitespace alone with a line break in it is no text at all.  `undefined` for none.
   */
  private markupText(start: number, end: number): SX.SpellxText | undefined {
    let from = start
    let to = end
    const leading = this.text.slice(start, end).match(/^\s*/)![0]
    if (leading.includes("\n")) from += leading.length
    const trailing = this.text.slice(from, end).match(/\s*$/)![0]
    if (trailing.includes("\n")) to -= trailing.length
    if (from >= to) return undefined
    return { kind: "text", text: this.text.slice(from, to), span: { start: from, end: to } }
  }

  /** Whether markup text ends at `pos`:  a tag, a closer, or a hole starts there. */
  private isMarkupBreak(pos: number) {
    const char = this.text[pos]
    if (char === "{") return true
    if (char !== "<") return false
    return this.text[pos + 1] === "/" ? this.readCloser(pos) !== undefined : this.isTagStart(pos)
  }

  ////////////////
  // ## Tags:  words and heads
  ////////////////

  /**
   * What the tag starting at `start` is, by its word in the language's spellx words:
   * a template, declaration, note, handler, control -- or unknown.
   * - A handler's or control's word may be several words (`otherwise if`, `de lo contrario si`):
   *   the longest that fits wins, and `otherwise` takes no phrase, so `<si no es una figura>` is an `<if>`.
   * - In a drawing, an unknown word is an element's name:  the caller decides.
   */
  private tagAt(start: number): TagWord {
    const wordStart = start + 1
    const first = this.text.slice(wordStart).match(WORD)![0]
    const firstEnd = wordStart + first.length
    const lower = first.toLowerCase()
    const { prefix, templates, declarations, notes } = this.words
    if (lower.startsWith(`${prefix}-`)) {
      const type = templates[lower.slice(prefix.length + 1)]
      if (type) return { category: "template", type, word: first, start, wordEnd: firstEnd }
    }
    const declaration = declarations[lower]
    if (declaration) return { category: "declaration", type: declaration, word: first, start, wordEnd: firstEnd }
    const note = notes[lower]
    if (note) return { category: "note", type: note, word: first, start, wordEnd: firstEnd }
    const phrased = this.phraseWordAt(start)
    if (phrased) return phrased
    return { category: "unknown", word: first, start, wordEnd: firstEnd }
  }

  /** The handler or control word of the tag at `start`, its longest spelling that fits -- see `tagAt()`. */
  private phraseWordAt(start: number): TagWord | undefined {
    const wordStart = start + 1
    const words: { word: string; end: number }[] = []
    let pos = wordStart
    while (words.length < MOST_WORDS_IN_A_TAG_WORD) {
      const word = this.text.slice(pos).match(WORD)?.[0]
      if (!word) break
      words.push({ word, end: pos + word.length })
      pos += word.length
      const gap = this.text.slice(pos).match(/^[ \t]+/)?.[0]
      if (!gap) break
      pos += gap.length
    }
    for (let count = words.length; count > 0; count--) {
      const written = this.text.slice(wordStart, words[count - 1]!.end)
      const key = written.toLowerCase().replace(/[ \t]+/g, " ")
      const wordEnd = words[count - 1]!.end
      const handler = this.words.handlers[key]
      if (handler) return { category: "handler", type: handler, word: written, start, wordEnd }
      const control = this.words.controls[key]
      if (!control) continue
      const phrase = this.phraseFrom(wordEnd).phrase
      // `<otherwise>` takes no phrase:  `<si no es una figura>` is `si`, with `no es una figura`
      if (control === "otherwise" && phrase) continue
      return { category: "control", type: control, word: written, start, wordEnd }
    }
    return undefined
  }

  /**
   * Read a named tag's head after its word:  an optional quoted name, then attributes, to its `>` or `/>`.
   * - `name="..."` names it too (Q39), unless `liftName` is off (an element's `name` is its own attribute).
   * - `checkAttributes`:  report an attribute the language doesn't know;  never for an event's, which are
   *   its parameters, nor an element's.
   */
  private readNamedHead(
    tag: TagWord,
    { checkAttributes = true, liftName = true }: { checkAttributes?: boolean; liftName?: boolean } = {}
  ): NamedHead {
    const head: NamedHead = { name: undefined, nameSpan: undefined, attributes: [], selfClosing: false, end: 0 }
    const checks = checkAttributes && !(tag.category === "declaration" && tag.type === "event")
    let pos = tag.wordEnd
    while (pos < this.text.length) {
      pos = this.skipSpace(pos)
      if (this.text.startsWith("/>", pos)) {
        head.selfClosing = true
        head.end = pos + 2
        return head
      }
      const char = this.text[pos]
      if (char === ">") {
        head.end = pos + 1
        return head
      }
      if ((char === '"' || char === "'") && head.name === undefined && !head.attributes.length) {
        const end = this.closingQuote(pos)
        head.name = this.text.slice(pos + 1, end - 1)
        head.nameSpan = { start: pos + 1, end: end - 1 }
        pos = end
        continue
      }
      const word = char && this.text.slice(pos).match(ATTRIBUTE_NAME)?.[0]
      if (!word) {
        pos++
        continue
      }
      const attribute = this.readAttribute(pos, word, tag)
      pos = attribute.span.end
      if (liftName && attribute.name === "name" && head.name === undefined && attribute.value !== undefined) {
        head.name = attribute.value
        head.nameSpan = attribute.valueSpan
        continue
      }
      if (checks && !(word.toLowerCase() in this.words.attributes)) this.reportUnknownAttribute(tag, attribute)
      head.attributes.push(attribute)
    }
    this.report("error", "unclosed-head", this.spanOfWord(tag), { tag: `<${tag.word}>` })
    head.end = this.text.length
    return head
  }

  /** Read one attribute at `start`, its name `word`:  `name`, `name="value"`, `name='value'`, `name={spell}`. */
  private readAttribute(start: number, word: string, tag: TagWord): SX.SpellxAttribute {
    const named = tag.category === "unknown" ? undefined : this.words.attributes[word.toLowerCase()]
    const attribute: SX.SpellxAttribute = {
      name: named ?? word,
      word,
      value: undefined,
      quote: undefined,
      span: { start, end: start + word.length },
      valueSpan: undefined
    }
    let pos = this.skipSpace(start + word.length)
    if (this.text[pos] !== "=") return attribute
    pos = this.skipSpace(pos + 1)
    const quote = this.text[pos]
    let end: number
    if (quote === '"' || quote === "'" || quote === "{") {
      end = quote === "{" ? this.matchingBrace(pos) : this.closingQuote(pos)
      attribute.quote = quote
      attribute.valueSpan = { start: pos + 1, end: end - 1 }
    } else {
      end = pos + (this.text.slice(pos).match(/^[^\s>]+/)?.[0].length ?? 0)
      if (this.text.startsWith("/>", end - 1)) end--
      attribute.valueSpan = { start: pos, end }
    }
    attribute.value = this.slice(attribute.valueSpan)
    attribute.span.end = end
    return attribute
  }

  /** Read a handler's or control's head after its word:  its phrase, to its `>` (or `/>`). */
  private readPhraseHead(tag: TagWord & { category: "handler" | "control" }): PhraseHead {
    const { phrase, phraseSpan, end, closed } = this.phraseFrom(tag.wordEnd)
    if (!closed) this.report("error", "unclosed-head", this.spanOfWord(tag), { tag: `<${tag.word}>` })
    if (!phrase && tag.type !== "otherwise")
      this.report("error", "missing-phrase", { start: tag.start, end }, { tag: `<${tag.word}>`, word: tag.word })
    const selfClosing = this.text.startsWith("/>", end - 2)
    return { phrase, phraseSpan, end, selfClosing }
  }

  /**
   * The phrase from `start` to its tag's `>`:  a `>` inside a string, parens or braces is the phrase's (Q45),
   * and a `/` just before the `>` ends the tag, not the phrase.
   * - Only `"` starts a string, as in `matchingBrace()`;  a phrase ends with its line.
   */
  private phraseFrom(start: number): { phrase: string; phraseSpan: SX.SpellxSpan; end: number; closed: boolean } {
    let pos = start
    let depth = 0
    let quote: string | undefined
    while (pos < this.text.length) {
      const char = this.text[pos]!
      if (quote) {
        if (char === quote) quote = undefined
      } else if (char === '"') quote = char
      else if (char === "(" || char === "{" || char === "[") depth++
      else if ((char === ")" || char === "}" || char === "]") && depth > 0) depth--
      else if (char === ">" && depth === 0) break
      if (char === "\n" && !quote && depth === 0) break
      pos++
    }
    const closed = this.text[pos] === ">"
    const end = closed ? pos + 1 : pos
    let textEnd = pos
    if (closed && this.text[pos - 1] === "/") textEnd--
    const raw = this.text.slice(start, textEnd)
    const phraseStart = start + (raw.length - raw.trimStart().length)
    const phrase = raw.trim()
    return { phrase, phraseSpan: { start: phraseStart, end: phraseStart + phrase.length }, end, closed }
  }

  ////////////////
  // ## Closers
  ////////////////

  /** The closer at `start` -- `</>` or `</word>` -- or `undefined` when `</` starts no closer there. */
  private readCloser(start: number): Closer | undefined {
    const match = this.text.slice(start).match(CLOSER)
    if (!match) return undefined
    return { word: match[1] || undefined, span: { start, end: start + match[0].length } }
  }

  /**
   * The closer ending the text from `start` to `end`, when it closes `owner` or is any spellx word's:
   * `...jack, queen or king</>`.  A `</ui-text>` ending a line of spell is spell.
   */
  private closerAtEnd(start: number, end: number, owner: BodyOwner): Closer | undefined {
    const line = this.text.slice(start, end).trimEnd()
    const at = line.lastIndexOf("</")
    if (at < 0) return undefined
    const closer = this.readCloser(start + at)
    if (!closer || closer.span.end !== start + line.length) return undefined
    return this.isCloserFor(closer, owner) ? closer : undefined
  }

  /**
   * Whether `closer` is `owner`'s:  `</>`, any spelling of its word, or another spellx word (a mismatch,
   * which `checkCloser()` reports).  A word spellx doesn't know (`</ui-text>`) is never a member's closer.
   */
  private isCloserFor(closer: Closer, owner: MarkupOwner | SX.SpellxTemplate | BodyOwner): boolean {
    if (closer.word === undefined) return true
    if (this.closes(closer.word, owner)) return true
    return owner.kind !== "element" && this.isSpellxWord(closer.word)
  }

  /** Report a named closer that isn't `owner`'s own word, with a fix:  `</>`. */
  private checkCloser(closer: Closer, owner: SX.SpellxTemplate | BodyOwner) {
    if (closer.word === undefined || this.closes(closer.word, owner)) return
    this.report(
      "error",
      "mismatched-closer",
      closer.span,
      { closer: this.slice(closer.span), open: `<${owner.word}>` },
      { span: closer.span, text: "</>" }
    )
  }

  /** Whether `word`, in a named closer, closes `node`:  any spelling of the same thing, or its first word. */
  private closes(word: string, node: MarkupOwner | SX.SpellxTemplate | BodyOwner): boolean {
    const lower = word.toLowerCase()
    const { prefix, templates, declarations, notes, handlers, controls } = this.words
    switch (node.kind) {
      case "template":
        return lower.startsWith(`${prefix}-`) && templates[lower.slice(prefix.length + 1)] === node.type
      case "declaration":
        return declarations[lower] === node.type || lower === node.word.toLowerCase()
      case "note":
        return notes[lower] === node.type || lower === node.word.toLowerCase()
      case "handler":
        return handlers[lower] === node.type || lower === firstWordOf(node.word)
      case "element":
        return lower === node.name.toLowerCase()
      case "choice": {
        const control = controls[lower]
        return (control !== undefined && control !== "for each") || lower === firstWordOf(node.branches[0]?.word ?? "")
      }
      case "loop":
        return controls[lower] === "for each" || lower === firstWordOf(node.word)
    }
  }

  /** Whether `word` is any of spellx's words, in the file's language. */
  private isSpellxWord(word: string) {
    const lower = word.toLowerCase()
    const { prefix, templates, declarations, notes, handlers, controls } = this.words
    if (lower.startsWith(`${prefix}-`) && lower.slice(prefix.length + 1) in templates) return true
    return [declarations, notes, handlers, controls].some((table) =>
      Object.keys(table).some((key) => firstWordOf(key) === lower)
    )
  }

  ////////////////
  // ## Prose
  ////////////////

  /**
   * Read a run of prose lines from `start`:  to the next line starting with a tag or a closer.
   * - Its text loses the indent its lines share;  blank lines at its ends are left out.
   */
  private readProse(start: number): { node: SX.SpellxProse | undefined; end: number } {
    const lines: { start: number; first: number; end: number }[] = []
    let pos = start
    while (pos < this.text.length) {
      const first = this.firstCharOfLine(pos)
      const lineEnd = this.lineEndOf(pos)
      if (first !== undefined) {
        if (this.text.startsWith("</", first) && this.readCloser(first)) break
        if (this.isTagStart(first)) break
        lines.push({ start: pos, first, end: lineEnd })
      }
      pos = this.nextLineStart(lineEnd)
    }
    if (!lines.length) return { node: undefined, end: pos }
    const shared = sharedIndent(lines.map((line) => this.text.slice(line.start, line.first)))
    const firstLine = lines[0]!
    const lastLine = lines.at(-1)!
    const span = {
      start: firstLine.first,
      end: lastLine.start + this.text.slice(lastLine.start, lastLine.end).trimEnd().length
    }
    const text = this.text
      .slice(firstLine.start, span.end)
      .split("\n")
      .map((line) => (line.startsWith(shared) ? line.slice(shared.length) : line.trimStart()))
      .join("\n")
      .trimStart()
    return { node: { kind: "prose", text, span }, end: pos }
  }

  ////////////////
  // ## Diagnostics
  ////////////////

  /** Record a problem, its message in the file's language. */
  private report(
    severity: SX.SpellxSeverity,
    problem: SX.SpellxProblem,
    span: SX.SpellxSpan,
    params: Record<string, string> = {},
    fix?: SX.SpellxFix
  ) {
    const message = this.language.parserMessage(`spellx-${problem}` as SP.ParserMessageKey, params)
    this.diagnostics.push(fix ? { severity, problem, message, span, fix } : { severity, problem, message, span })
  }

  /** Report an unknown tag word:  the closest of `words`, else them all. */
  private reportUnknownWord(tag: TagWord, words: string[]) {
    const span = this.spanOfWord(tag)
    const suggestion = suggest(tag.word, words)
    if (suggestion)
      this.diagnostics.push({
        severity: "error",
        problem: "unknown-word",
        message: this.language.parserMessage("spellx-unknown-word", {
          tag: `<${tag.word}>`,
          suggestion: `<${suggestion}>`
        }),
        span,
        fix: { span: { start: tag.start + 1, end: tag.wordEnd }, text: suggestion }
      })
    else
      this.diagnostics.push({
        severity: "error",
        problem: "unknown-word",
        message: this.language.parserMessage("spellx-unknown-word-here", {
          tag: `<${tag.word}>`,
          words: words.map((word) => `<${word}>`).join(", ")
        }),
        span
      })
  }

  /** Report an attribute the language doesn't know:  the closest it does, else them all. */
  private reportUnknownAttribute(tag: TagWord, attribute: SX.SpellxAttribute) {
    const names = Object.keys(this.words.attributes)
    const suggestion = suggest(attribute.word, names)
    const span = { start: attribute.span.start, end: attribute.span.start + attribute.word.length }
    this.diagnostics.push({
      severity: "error",
      problem: "unknown-attribute",
      message: suggestion
        ? this.language.parserMessage("spellx-unknown-attribute", {
            tag: `<${tag.word}>`,
            attribute: attribute.word,
            suggestion
          })
        : this.language.parserMessage("spellx-unknown-attribute-here", {
            tag: `<${tag.word}>`,
            attribute: attribute.word,
            attributes: names.map((name) => `"${name}"`).join(", ")
          }),
      span,
      ...(suggestion ? { fix: { span, text: suggestion } } : {})
    })
  }

  /** Report an open tag the file ends inside. */
  private reportUnclosed(node: MarkupOwner) {
    const headSpan = node.kind === "choice" ? node.branches[0]?.headSpan : node.headSpan
    if (headSpan) this.report("error", "unclosed-tag", headSpan, { tag: this.tagNameOf(node) })
  }

  /** The params of an `<otherwise>` message:  its tag, and the language's `<if>`. */
  private otherwiseParams(tag: TagWord) {
    return { tag: `<${tag.word}>`, if: `<${this.firstKeyOf(this.words.controls, "if")}>` }
  }

  ////////////////
  // ## Text helpers
  ////////////////

  /** Whether a tag starts at `pos`:  `<` and a word. */
  private isTagStart(pos: number) {
    return this.text[pos] === "<" && WORD_START.test(this.text[pos + 1] ?? "")
  }

  /** The first character of the line at `pos` that isn't a space or tab;  `undefined` for a blank line. */
  private firstCharOfLine(pos: number): number | undefined {
    const end = this.lineEndOf(pos)
    let first = pos
    while (first < end && (this.text[first] === " " || this.text[first] === "\t" || this.text[first] === "\r")) first++
    return first < end ? first : undefined
  }

  /** The end of the line `pos` is on:  the offset of its `\n`, or of the text's end. */
  private lineEndOf(pos: number) {
    const end = this.text.indexOf("\n", pos)
    return end < 0 ? this.text.length : end
  }

  /** The start of the line after the one ending at `lineEnd`. */
  private nextLineStart(lineEnd: number) {
    const end = this.lineEndOf(lineEnd)
    return Math.min(end + 1, this.text.length)
  }

  /** The indent of the line `pos` is on. */
  private indentOfLine(pos: number) {
    const start = this.text.lastIndexOf("\n", pos - 1) + 1
    return this.text.slice(start).match(/^[ \t]*/)![0]
  }

  /** Skip spaces, tabs and line breaks from `pos`. */
  private skipSpace(pos: number) {
    while (pos < this.text.length && /\s/.test(this.text[pos]!)) pos++
    return pos
  }

  /** Just past the quote closing the one at `start`;  the line's end when it has none. */
  private closingQuote(start: number) {
    const quote = this.text[start]!
    const end = this.text.indexOf(quote, start + 1)
    return end < 0 ? this.lineEndOf(start) : end + 1
  }

  /**
   * Just past the `}` matching the `{` at `start`, strings and nested braces skipped;  the text's end for none.
   * - Only `"` starts a string:  an apostrophe is spell's possessive, `{the score's time}`.
   */
  private matchingBrace(start: number) {
    let depth = 0
    let quote: string | undefined
    for (let pos = start; pos < this.text.length; pos++) {
      const char = this.text[pos]
      if (quote) {
        if (char === quote) quote = undefined
      } else if (char === '"') quote = char
      else if (char === "{") depth++
      else if (char === "}" && --depth === 0) return pos + 1
    }
    return this.text.length
  }

  /** The text of `span`. */
  private slice(span: SX.SpellxSpan) {
    return this.text.slice(span.start, span.end)
  }

  /** The span of a tag's word, from its `<`. */
  private spanOfWord(tag: TagWord): SX.SpellxSpan {
    return { start: tag.start, end: tag.wordEnd }
  }

  /** A markup node's tag as written, for a message:  `<text>`, `<if>`, `<draw>`. */
  private tagNameOf(node: MarkupOwner): string {
    if (node.kind === "element") return `<${node.name}>`
    if (node.kind === "choice") return `<${node.branches[0]?.word ?? "if"}>`
    return `<${node.word}>`
  }

  /** A template's tags, with the prefix:  `spell-view` ... */
  private templateWords() {
    return Object.keys(this.words.templates).map((word) => `${this.words.prefix}-${word}`)
  }

  /** The words a member's tag may be:  declarations, notes, handlers. */
  private memberWords() {
    const { declarations, notes, handlers } = this.words
    return [...Object.keys(declarations), ...Object.keys(notes), ...Object.keys(handlers)]
  }

  /** The first word in `table` meaning `meaning`, as a writer writes it -- else `meaning`. */
  private firstKeyOf(table: Record<string, string>, meaning: string) {
    return Object.keys(table).find((key) => table[key] === meaning) ?? meaning
  }
}

/** How to read a file -- see `SpellxReader.read()`. */
export type SpellxReadOptions = {
  /** the file's path:  its name says its language (`Carta.es.spellx`) */
  path?: string
  /** its language, over what its path says */
  language?: SP.Language
}

/** What a tag's word says it is, and where its word ends. */
type TagWord = { start: number; wordEnd: number; word: string } & (
  | { category: "template"; type: SP.SpellxTemplateKind }
  | { category: "declaration"; type: SP.SpellxDeclarationKind }
  | { category: "note"; type: SP.SpellxNoteKind }
  | { category: "handler"; type: SP.SpellxHandlerKind }
  | { category: "control"; type: SP.SpellxControlKind }
  | { category: "unknown" }
)

/** A named tag's head, read:  `<property "suit" one-of="...">`. */
type NamedHead = {
  name: string | undefined
  nameSpan: SX.SpellxSpan | undefined
  attributes: SX.SpellxAttribute[]
  selfClosing: boolean
  /** just past its `>` or `/>` */
  end: number
}

/** A handler's or control's head, read:  `<on mouse down>`. */
type PhraseHead = { phrase: string; phraseSpan: SX.SpellxSpan; selfClosing: boolean; end: number }

/** A closer:  `</>`, or `</word>` with its word. */
type Closer = { word: string | undefined; span: SX.SpellxSpan }

/** What a run of members, a body or a drawing read to. */
type MembersRead = { children: SX.SpellxNode[]; end: number; closed: boolean }

/** What owns a body of spell lines. */
type BodyOwner = SX.SpellxDeclaration | SX.SpellxHandler | SX.SpellxNote

/** What owns markup inside it. */
type MarkupOwner = SX.SpellxDeclaration | SX.SpellxElement | SX.SpellxChoice | SX.SpellxLoop | SX.SpellxHandler

/**
 * One open tag of a drawing, while it's read.
 * - `children`:  where what's read next goes -- an if-chain's, its last branch's
 * - `closedChoice`:  the if-chain a `</>` just closed in it, which an `<otherwise>` right after would go on with
 */
type MarkupFrame = {
  node: MarkupOwner
  children: SX.SpellxNode[]
  closedChoice?: { choice: SX.SpellxChoice; closer: SX.SpellxSpan }
}

/** A word of a tag:  letters, digits, `_` and `-`, accents too. */
const WORD = /^[\p{L}\p{M}\d_-]+/u

/** What a tag's word starts with:  a letter. */
const WORD_START = /^\p{L}/u

/** An attribute's name:  a word, `:` and `.` allowed, as in markup. */
const ATTRIBUTE_NAME = /^[\p{L}\p{M}\d_:.@-]+/u

/** A closer:  `</>`, or `</word>` with spaces before its `>`. */
const CLOSER = /^<\/([\p{L}\p{M}\d_-]*)[ \t]*>/u

/** The most words a handler's or control's word has:  `de lo contrario si`. */
const MOST_WORDS_IN_A_TAG_WORD = 4

/** The first word of `words`, lowercased. */
function firstWordOf(words: string) {
  return words.toLowerCase().split(/[ \t]+/)[0] ?? ""
}

/** The indent every one of `indents` starts with. */
function sharedIndent(indents: string[]) {
  let shared = indents[0] ?? ""
  for (const indent of indents) while (!indent.startsWith(shared)) shared = shared.slice(0, -1)
  return shared
}
