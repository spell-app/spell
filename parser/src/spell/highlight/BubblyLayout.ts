import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { BubblyPresentation } from "./BubblyPresentation"
import type {
  BubblyBlock,
  BubblyDrawing,
  BubblyLayoutOptions,
  BubblyLine,
  BubblyNode,
  BubblyPartOfSpeech,
  BubblyPiece,
  BubblyPieceKind,
  BubblyRulePresentation,
  BubblyUnderline
} from "./highlight.types"
import type { DrawnDeclaration } from "spell/parser/spell/rules/JSX/JSX.shared"

/****************
 * ### `BubblyLayout`
 * Some Spell laid out in the BUBBLY LOOK, as data:  which lines are declarations (a head on a band, a body under it),
 * which are control lines (a light grey block holding their steps), what each stretch of a line is to a reader
 * (what a person typed, a name, a value ...), and which stretches are underlined (one value, one question).
 * - `BubblyLayout.of(text, parser)`:  a `BubblyDrawing`, offsets into `text`.
 * - From the parser's own reading of the code, alone, or its project's (`within`):
 *   - its coloured spans (`SP.SpellHighlighter.spans()`):  references, values, marks, comments
 *   - its parse as a block:  each line's rule, which `SP.BubblyPresentation` says how to present
 *     (a band or not, which parts are inputs, a block for a control line)
 *   - its indent:  what's under what, so a line that doesn't parse still sits where it should
 * - Another language's Spell lays out with its own parser (`SP.Language.for("es").parser`):  the table is by rule
 *   name, the same in every language;  only its pronouns (`its`, `su`) are its own words.
 * - Pure data, no HTML:  the app draws it (`BubblyHtml`), and so will Monaco (epic `language` P50) and VS Code (P51).
 * - NEVER throws:  a parse that fails lays out every line as a step, coloured by its tokens.
 ****************/
export class BubblyLayout {
  /**
   * `text` laid out in the bubbly look, read by `parser` (English's by default).
   * - `within`:  the project file it's the text of:  its project's own parse of it is the one read, so it draws as the
   *   compiler sees it (`card ranks` declared in another file), and nothing is parsed twice.
   *   - Only while that parse is of this very text (`isParseOf()`):  else, as a file just edited, it reads alone.
   */
  static of(
    text: string,
    parser: SP.SpellParser = SP.spellParser,
    { within }: BubblyLayoutOptions = {}
  ): BubblyDrawing {
    const projects = within && BubblyLayout.isParseOf(within, text) ? within.match : undefined
    return new BubblyLayout(text, parser, projects).drawing
  }

  /** Is `file`'s parse, in its project, of `text`, so its matches' offsets are `text`'s? */
  static isParseOf(file: SP.SpellFile, text: string): boolean {
    return !!file.match && file.inputLines?.join("\n") === text
  }

  /** The drawing. */
  readonly drawing: BubblyDrawing

  /** What each character of the text is, before it's cut into pieces. */
  private readonly paint: Array<Paint | undefined>

  /** The coloured spans, in order. */
  private readonly spans: SP.SpellHighlightSpan[]

  /** Each line's statement, by line index. */
  private readonly statements = new Map<number, P.Match>()

  /** Where each line starts. */
  private readonly lineStarts: number[] = []

  /** Stretches every line takes from the parse, whatever it is:  yes and no, `'s`, `item`;  `order` low first. */
  private readonly overlays: Overlay[] = []

  /** Every statement's underlines, from the parse:  each line takes those inside it. */
  private readonly underlines: BubblyUnderline[] = []

  /** Where each tag that declares a member starts:  `BubblyDrawing.declaringTags`. */
  private readonly declaringTags = new Set<number>()

  /** Words that point back (`it`, `its`):  drawn plain. */
  private readonly pronouns: Set<string>

  /** The words that say an ability (`draggable`):  a name, in a head whose row `namesAbility`. */
  private readonly abilityWord: RegExp

  private constructor(
    private readonly text: string,
    parser: SP.SpellParser,
    parsed?: P.Match
  ) {
    this.pronouns = (parser.language ?? SP.Language.default).words.pronouns
    this.abilityWord = parser.declarations.abilityWord
    this.paint = Array.from({ length: text.length })
    this.spans = SP.SpellHighlighter.spans(text, parser, parsed)
    let at = 0
    for (const line of text.split("\n")) {
      this.lineStarts.push(at)
      at += line.length + 1
    }
    this.readParse(parser, parsed)
    this.drawing = {
      text,
      nodes: this.layout(this.treeOf(), { depth: 0, level: 0 }),
      declaringTags: [...this.declaringTags].sort((a, b) => a - b)
    }
  }

  ////////////////
  // ## The parse
  ////////////////

  /**
   * Each line's statement, and the overlays every line takes, from `parsed` (its project's parse) or a parse of its
   * own;  a parse that throws leaves both empty.
   */
  private readParse(parser: SP.SpellParser, parsed?: P.Match) {
    let match = parsed
    try {
      match ??= parser.parse(this.text, "block")
    } catch {
      // the spans stand alone
    }
    if (!match) return
    const seen = new Set<P.Match>()
    const walk = (each: P.Match) => {
      if (seen.has(each)) return
      seen.add(each)
      if (each.rule.name === LINE_RULE) {
        // a comment after the statement comes first in the line's match:  skip it
        const statement = childrenOf(each).find((child) => child.rule.name !== COMMENT_RULE)
        if (statement?.start !== undefined) {
          const index = this.lineIndexOf(statement.start)
          if (!this.statements.has(index)) {
            this.statements.set(index, statement)
            this.underlineStatement(statement)
          }
        }
      }
      this.overlaysOf(each)
      // a tag that declares the member it draws (`<number "score"/>`), not one said on a line of its own
      const { declares } = each.data as { declares?: DrawnDeclaration }
      if (declares && !declares.drawnOnly && each.start !== undefined) this.declaringTags.add(each.start)
      for (const child of childrenOf(each)) walk(child)
    }
    walk(match)
    this.overlays.sort((a, b) => a.order - b.order)
    this.underlines.sort((a, b) => a.start - b.start)
  }

  /** The overlays `match`'s row asks for, if it has one. */
  private overlaysOf(match: P.Match) {
    const row = BubblyPresentation.for(match.rule)
    if (!row || match.start === undefined || match.end === undefined) return
    const { start, end } = match
    // yes and no:  Spell's words, but a value written in
    if (row.isValue) this.overlays.push({ start, end, kind: "value", order: 0, overWordsOnly: true })
    if (row.isNamePart) this.overlays.push({ start, end, kind: "reference", order: 1 })
    // `a new foundation`:  its words to the end of its kind one name, bold (epic `language` I98)
    const [kind] = row.namesThrough ? [match.groups[row.namesThrough]].flat() : []
    if (kind?.end !== undefined) this.overlays.push({ start, end: kind.end, kind: "reference", order: 1 })
    for (const plain of descendantsNamed(match, row.plain))
      this.overlays.push({ start: plain.start!, end: plain.end!, kind: "words", order: 2 })
  }

  ////////////////
  // ## Underlines:  one value, one question
  ////////////////

  /**
   * Underline `statement`'s values and questions, outermost only (`BubblyUnderline`);  a head's only in what it draws
   * as a step (its row's `steps`), a drawing's markup none.
   */
  private underlineStatement(statement: P.Match) {
    if (this.text[statement.start!] === "<") return
    const row = BubblyPresentation.for(statement.rule)
    if (!row?.head) return this.underlineIn(statement)
    for (const step of descendantsNamed(statement, row.steps)) this.underlineIn(step)
  }

  /**
   * Underline `match`:  whole, when it's a value or a question;  else each value and question in it.
   * - A value:  an expression (`its pile`, `a new deck`), but not a statement, nor one written in (`10`, `king`).
   * - An expression holding others (`a is b`, `(x and y)`) underlines its parts:  `underlineCombination()`.
   */
  private underlineIn(match: P.Match) {
    if (match.rule.name === BLOCK_RULE) return
    const row = BubblyPresentation.for(match.rule)
    const { start, end } = match
    if (row?.isValue) return
    if (start !== undefined && end !== undefined) {
      if (row?.isQuantity) {
        const [number] = descendantsNamed(match, [NUMBER_RULE])
        if (number) return this.underline(number.start!, end, "quantity")
      }
      if (row?.isQuestion) return this.underline(start, end, "question")
      if (isCombination(match)) return this.underlineCombination(match)
      if (!row?.isCombination && isExpression(match.rule)) return this.underline(start, end, "value")
    }
    // what a step sets (`set <the score> to`):  ONE underline of its own, whole, its name bold in it (epic `language` I98)
    const sets = new Set((row?.sets ?? []).flatMap((group) => [match.groups[group]].flat()))
    for (const child of childrenOf(match)) {
      if (!sets.has(child)) this.underlineIn(child)
      else if (child.start !== undefined && child.end !== undefined) this.underline(child.start, child.end, "value")
    }
  }

  /**
   * An expression of operands and operators, `the pile's suit is the card's suit and the card is on top of its pile`:
   * each operand its own value, but a question (`is on top of its pile`) one with the thing it asks of;
   * the operators that combine them (`is`, `and`, `- 1`) plain between.
   * - The thing a question asks of:  what's before it back to the last `and` or `or` (`isJoin`), as the compiler
   *   binds it (`CompoundExpression`'s precedence):  every question binds tighter than those, and no tighter than
   *   arithmetic.
   */
  private underlineCombination(match: P.Match) {
    const { lhs, rhsChain } = match.groups as { lhs?: P.Match; rhsChain?: P.Match }
    // each part:  a match to underline in, or an underline worked out here;  `operand`, an operator's right side
    const parts: Array<{ match: P.Match; operand?: P.Match } | BubblyUnderline> = lhs ? [{ match: lhs }] : []
    let segment = 0
    let segmentStart = lhs?.start ?? match.start
    for (const suffix of rhsChain?.matched ?? []) {
      if (!(suffix instanceof P.Match) || suffix.start === undefined || suffix.end === undefined) continue
      const row = BubblyPresentation.for(suffix.rule)
      const operand = suffix.groups.expression as P.Match | undefined
      const last = parts.at(-1)
      if (row?.isQuestion && segmentStart !== undefined) {
        parts.splice(segment, parts.length - segment, { start: segmentStart, end: suffix.end, kind: "question" })
      } else if (row?.continuesValue && last && parts.length > segment) {
        const from =
          "kind" in last ? last.start : (last.operand ?? (last.match === lhs ? last.match : undefined))?.start
        if (from !== undefined) parts.splice(-1, 1, { start: from, end: suffix.end, kind: "value" })
      } else {
        if (row?.isJoin) {
          segment = parts.length
          segmentStart = operand?.start
        }
        parts.push({ match: suffix, operand })
      }
    }
    for (const part of parts) {
      if ("kind" in part) this.underline(part.start, part.end, part.kind)
      else if (part.match === lhs) this.underlineIn(part.match)
      // an operator:  its words plain, what's in it (its right side) underlined
      else for (const child of childrenOf(part.match)) this.underlineIn(child)
    }
  }

  /** Underline `start` to `end`, as `kind`:  one on each line it's on, its spaces at either end left out. */
  private underline(start: number, end: number, kind: BubblyUnderline["kind"]) {
    let from = start
    for (const piece of this.text.slice(start, end).split("\n")) {
      const trimmed = piece.trim()
      if (trimmed) {
        const at = from + piece.indexOf(trimmed)
        this.underlines.push({ start: at, end: at + trimmed.length, kind })
      }
      from += piece.length + 1
    }
  }

  ////////////////
  // ## Lines into a tree, by indent
  ////////////////

  /**
   * The text's lines, nested by indent:  a blank line sits where the next line does.
   * - EXCEPT a blank line with an indent of its own (the caret on a new line in a body):  it sits at that indent,
   *   so it's part of the block above it, and the block's foot goes under it (Owen, 2026-11-11)
   */
  private treeOf(): SourceLine[] {
    const lines: SourceLine[] = this.text.split("\n").map((raw, index) => {
      const lineStart = this.lineStarts[index]!
      const words = raw.replace(/\r$/, "")
      const indent = /^[ \t]*/.exec(words)![0].length
      return {
        index,
        start: lineStart + indent,
        end: lineStart + (words.trim() ? words.trimEnd().length : indent),
        width: indent,
        isBlank: !words.trim() && !indent,
        children: []
      }
    })
    while (lines.at(-1)?.isBlank) lines.pop()
    for (let index = lines.length - 1; index >= 0; index--)
      if (lines[index]!.isBlank) lines[index]!.width = lines[index + 1]?.width ?? 0
    const root: SourceLine = { index: -1, start: 0, end: 0, width: -1, isBlank: false, children: [] }
    const stack = [root]
    for (const line of lines) {
      while (stack.at(-1)!.width >= line.width && stack.length > 1) stack.pop()
      stack.at(-1)!.children.push(line)
      stack.push(line)
    }
    return root.children
  }

  ////////////////
  // ## The tree into blocks and lines
  ////////////////

  /**
   * `lines`, laid out:  `depth`, a plain line's indent in its body;  `level`, how deep a declaration sits.
   * - `inSteps`:  inside an action's body, which holds only steps:  a line there that reads as a declaration
   *   is a parse gone astray (Spanish's `para rango en ...`, a loop, read as `to ...` with no project around it)
   */
  private layout(lines: SourceLine[], { depth, level, inSteps = false }: LayoutPlace): BubblyNode[] {
    const nodes: BubblyNode[] = []
    for (let index = 0; index < lines.length; index++) {
      let line = lines[index]!
      if (line.isBlank) {
        nodes.push({ kind: "gap", start: line.start })
        continue
      }
      const statement = this.isMarkup(line) ? undefined : this.statements.get(line.index)
      const row = statement && BubblyPresentation.for(statement.rule)
      // a head going on onto the lines under it (`if its rank > 1` then `and its rank < 5`):  one head
      if (statement && (row?.head || row?.isControl)) line = this.continued(line, statement)
      if (statement && row?.head && !inSteps) {
        // a group holds the declarations after it, up to the next group;  the blank lines before that stay outside
        let members: SourceLine[] = []
        if (row.isGroup) {
          let last = index + 1
          while (last < lines.length && !this.isGroupLine(lines[last]!)) last++
          while (last > index + 1 && lines[last - 1]!.isBlank) last--
          members = lines.slice(index + 1, last)
          index = last - 1
        }
        nodes.push(this.block(line, statement, row, [...line.children, ...members], level))
        continue
      }
      if (statement && row?.isControl && line.children.length) {
        nodes.push(this.control(line, statement, level, inSteps))
        continue
      }
      nodes.push(this.lineOf(line, { depth }))
      nodes.push(...this.layout(line.children, { depth: depth + 1, level, inSteps }))
    }
    return nodes
  }

  /**
   * `line`, a head or a control line, with the lines its statement goes on onto (`SP.JoinedLines`) part of it:
   * `if its rank > 1 and`, then `its rank < 5` under it, is ONE head, not a step in its body.
   * - Its end is the last of those lines' end;  what's under them is its body.
   * - Those lines:  the ones under it that start before its body does (or, with no body, before it ends).
   * - `line` itself when it goes on onto none.
   */
  private continued(line: SourceLine, statement: P.Match): SourceLine {
    const body = (statement.data as { body?: P.Match }).body
    const headEnd = body?.start ?? statement.end
    if (headEnd === undefined || headEnd <= line.end) return line
    const continuation = flattened(line.children).filter((each) => !each.isBlank && each.start < headEnd)
    if (!continuation.length) return line
    const isContinuation = (each: SourceLine) => continuation.includes(each)
    return {
      ...line,
      end: continuation.at(-1)!.end,
      children: [line, ...continuation].flatMap((each) => each.children.filter((child) => !isContinuation(child)))
    }
  }

  /** A declaration:  its head, then what's under it. */
  private block(
    line: SourceLine,
    statement: P.Match,
    row: BubblyRulePresentation,
    under: SourceLine[],
    level: number
  ): BubblyBlock {
    const partOfSpeech: BubblyPartOfSpeech = row.head!
    return {
      kind: "block",
      rule: statement.rule.name ?? "",
      partOfSpeech,
      isGroup: !!row.isGroup,
      level,
      head: this.lineOf(line, { depth: 0, head: { statement, row, partOfSpeech } }),
      body: this.layout(under, { depth: 0, level: level + 1, inSteps: partOfSpeech === "action" })
    }
  }

  /**
   * A control line with steps under it (`if`, `for each`):  a block in the light grey of control lines,
   * its line plain on its band, its steps its body.
   * - No scope of its own:  a name it introduces (a loop's `card`) is the enclosing declaration's.
   */
  private control(line: SourceLine, statement: P.Match, level: number, inSteps: boolean): BubblyBlock {
    return {
      kind: "block",
      rule: statement.rule.name ?? "",
      partOfSpeech: "control",
      isGroup: false,
      level,
      head: this.lineOf(line, { depth: 0 }),
      body: this.layout(line.children, { depth: 0, level: level + 1, inSteps })
    }
  }

  /** Does `line` declare a group? */
  private isGroupLine(line: SourceLine): boolean {
    const statement = this.statements.get(line.index)
    return !!statement && !!BubblyPresentation.for(statement.rule)?.isGroup
  }

  /** Is `line` a drawing's markup, `<text color={its color}>`? */
  private isMarkup(line: SourceLine): boolean {
    return this.text[line.start] === "<"
  }

  ////////////////
  // ## A line's pieces
  ////////////////

  /** `line`'s pieces:  a head's (`head`), a drawing's markup, or a step's. */
  private lineOf(line: SourceLine, { depth, head }: { depth: number; head?: Head }): BubblyLine {
    const { start, end } = line
    this.paintSpans(start, end, head)
    for (const overlay of this.overlays) if (overlay.start >= start && overlay.end <= end) this.paintOverlay(overlay)
    if (head) this.paintHead(head)
    if (this.isMarkup(line)) this.paintMarkup(start, end)
    const underlines = this.underlines.filter((each) => each.start >= start && each.end <= end)
    return { kind: "line", start, end, depth, pieces: this.piecesOf(start, end, underlines), underlines }
  }

  /** Paint each span from `start` to `end` as what it is:  in a head, what was typed is an input. */
  private paintSpans(start: number, end: number, head: Head | undefined) {
    this.paintRange(start, end, "words")
    const steps = head ? descendantsNamed(head.statement, head.row.steps) : []
    for (const span of this.spans) {
      if (span.end <= start || span.start >= end) continue
      const word = this.text.slice(span.start, span.end)
      const inHead = !!head && !steps.some((step) => span.start >= step.start! && span.end <= step.end!)
      this.paintRange(span.start, span.end, this.kindOfSpan(span.kind, word, { inHead, head }))
    }
  }

  /** What a span of `kind` is to a reader. */
  private kindOfSpan(kind: string, word: string, { inHead }: { inHead: boolean; head?: Head }): Paint {
    switch (kind) {
      case "comment":
        return "comment"
      case "section":
        return "heading"
      case "operator":
        return MARKS.has(word) ? "mark" : "words"
      case "string":
      case "number":
        return inHead ? "input" : "value"
      case "literal":
        return inHead ? "input" : "value"
      case "variable":
      case "params":
      case "property":
      case "type":
      case "title.function":
        if (this.pronouns.has(word.toLowerCase())) return "words"
        if (word.startsWith('"')) return inHead ? "input" : "value"
        return "reference"
      default:
        return "words"
    }
  }

  /** A head's inputs and choices, over what its spans said;  the words that say an ability, names. */
  private paintHead(head: Head) {
    const { statement, row } = head
    if (row.namesAbility)
      for (const span of this.spans)
        if (
          span.kind === KEYWORD &&
          span.start >= statement.start! &&
          span.end <= statement.end! &&
          this.abilityWord.test(this.text.slice(span.start, span.end))
        )
          this.paintRange(span.start, span.end, "reference")
    for (const input of descendantsNamed(statement, row.inputs)) this.paintRange(input.start!, input.end!, "input")
    if (row.typedAfterLead) this.paintTyped(head)
    for (const list of descendantsNamed(statement, row.choices))
      for (const item of childrenOf(list)) this.paintChoice(item.start!, item.end!)
  }

  /**
   * An action head's words after its first, to the end of its last input, as ONE pill (`typedAfterLead`):
   * each stretch between its parameters, its own spaces at either end left out.
   */
  private paintTyped({ statement, row, partOfSpeech }: Head) {
    const { text } = this
    const lead = /^\S+\s*/.exec(text.slice(statement.start!, statement.end!))
    if (!lead) return
    const inputs = descendantsNamed(statement, row.inputs)
    // a test's words are all its name:  nothing in it is a parameter
    const params =
      partOfSpeech === "action" ? descendantsNamed(statement, row.params).map((param) => this.bracketed(param)) : []
    let end = Math.max(...[...inputs, ...params].map((each) => each.end!), 0)
    let from = statement.start! + lead[0].length
    // a quoted name with parameters, `to "count the points for a card on a pile"`:  drawn as the unquoted one is,
    // its `"` marks faint at either end;  one with none stays one quoted pill
    const quoted = params.length ? this.quotedName(statement, from) : undefined
    if (quoted) {
      for (let at = quoted.start; at < quoted.end; at++) if (this.paint[at] === "input") this.paint[at] = "words"
      this.paintRange(quoted.start, quoted.start + 1, "mark")
      this.paintRange(quoted.end - 1, quoted.end, "mark")
      from = quoted.start + 1
      end = quoted.end - 1
    }
    for (const param of [...params.filter((each) => each.start < end), { start: end, end }].sort(
      (a, b) => a.start - b.start
    )) {
      const words = text.slice(from, param.start)
      const trimmed = words.trim()
      if (trimmed) {
        const at = from + words.indexOf(trimmed)
        this.paintRange(at, at + trimmed.length, "input")
      }
      from = Math.max(from, param.end)
    }
  }

  /** The stretch of `statement`'s quoted name, its `"` marks included, when it starts at `from`;  else `undefined`. */
  private quotedName(statement: P.Match, from: number): { start: number; end: number } | undefined {
    const signature = (statement.groups as { signature?: P.Match }).signature
    if (!signature || signature.start !== from || this.text[from] !== '"') return undefined
    const end = signature.end!
    return this.text[end - 1] === '"' && end - from > 1 ? { start: from, end } : undefined
  }

  /** `param`'s stretch, with the brackets round it if it has them:  `(a card)`. */
  private bracketed(param: P.Match): { start: number; end: number } {
    const { text } = this
    let start = param.start!
    let end = param.end!
    while (start > 0 && text[start - 1] === " ") start--
    if (text[start - 1] === "(") start--
    else start = param.start!
    let after = end
    while (text[after] === " ") after++
    if (text[after] === ")") end = after + 1
    return { start, end }
  }

  /** One of a list's values, a pill of its own:  its words, not the `,` or `or` its item may hold. */
  private paintChoice(start: number, end: number) {
    const separators = this.spans.filter(
      (span) =>
        span.start >= start &&
        span.end <= end &&
        (span.kind === KEYWORD || MARKS.has(this.text.slice(span.start, span.end)))
    )
    let from = start
    for (const separator of [...separators, { start: end, end }]) {
      const words = this.text.slice(from, separator.start)
      const trimmed = words.trim()
      if (trimmed) {
        const at = from + words.indexOf(trimmed)
        this.paintRange(at, at + trimmed.length, "choice")
      }
      from = separator.end
    }
  }

  /** A drawing's markup:  `<`, `>`, `=`, `{`, `}` faint, a tag's name a shade, a quoted value a pill. */
  private paintMarkup(start: number, end: number) {
    const { text } = this
    let inTag = false
    for (let at = start; at < end; at++) {
      const char = text[at]!
      if (char === "<" && /[/a-z]/i.test(text[at + 1] ?? "")) {
        inTag = true
        const name = /^<\/?([\w-]*)/.exec(text.slice(at, end))!
        const markEnd = at + name[0].length - name[1]!.length
        this.paintRange(at, markEnd, "mark")
        this.paintRange(markEnd, at + name[0].length, "tag")
        at += name[0].length - 1
      } else if (inTag && (char === ">" || (char === "/" && text[at + 1] === ">"))) {
        const length = char === "/" ? 2 : 1
        this.paintRange(at, at + length, "mark")
        at += length - 1
        inTag = false
      } else if (inTag && char === "=") {
        this.paintRange(at, at + 1, "mark")
      } else if (inTag && char === '"') {
        const close = text.indexOf('"', at + 1)
        const stop = close < 0 || close >= end ? end : close + 1
        this.paintRange(at, stop, "input")
        at = stop - 1
      } else if (char === "{" || char === "}") {
        this.paintRange(at, at + 1, "mark")
      }
    }
  }

  /** Paint an overlay:  only over Spell's own words, when it says so (`overWordsOnly`). */
  private paintOverlay({ start, end, kind, overWordsOnly }: Overlay) {
    for (let at = start; at < end; at++) if (!overWordsOnly || this.paint[at] === "words") this.paint[at] = kind
  }

  /** Paint `start` to `end` as `paint`. */
  private paintRange(start: number, end: number, paint: Paint) {
    for (let at = start; at < end; at++) this.paint[at] = paint
  }

  /**
   * The painted stretch from `start` to `end`, cut into pieces:
   * - words of one name join, a space between (`two sided view`, `card setup`)
   * - cut where each of `underlines` starts and ends, so it starts and ends with a piece
   */
  private piecesOf(start: number, end: number, underlines: BubblyUnderline[]): BubblyPiece[] {
    const cuts = new Set(underlines.flatMap((each) => [each.start, each.end]))
    const runs: BubblyPiece[] = []
    for (let at = start; at < end; at++) {
      const paint = this.paint[at] ?? "words"
      const last = runs.at(-1)
      if (last && last.kind === paint && !cuts.has(at)) last.end = at + 1
      else runs.push({ start: at, end: at + 1, kind: paint })
    }
    // a single space between two stretches of one name:  one stretch, unless an underline starts or ends there
    for (let index = runs.length - 2; index > 0; index--) {
      const [before, gap, after] = [runs[index - 1]!, runs[index]!, runs[index + 1]!]
      if (
        JOINED.has(before.kind) &&
        before.kind === after.kind &&
        gap.kind === "words" &&
        this.text.slice(gap.start, gap.end) === " " &&
        !cuts.has(gap.start) &&
        !cuts.has(after.start)
      ) {
        before.end = after.end
        runs.splice(index, 2)
      }
    }
    return runs
  }

  /** The line `offset` is on. */
  private lineIndexOf(offset: number): number {
    let low = 0
    let high = this.lineStarts.length - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if (this.lineStarts[middle]! <= offset) low = middle
      else high = middle - 1
    }
    return low
  }
}

////////////////
// ## Types and helpers
////////////////

/** What a character is painted. */
type Paint = BubblyPieceKind

/** A stretch the parse paints over the spans, `order` low first;  `overWordsOnly`:  only over Spell's own words. */
type Overlay = { start: number; end: number; kind: BubblyPieceKind; order: number; overWordsOnly?: boolean }

/** Where `BubblyLayout.layout()` lays lines out. */
type LayoutPlace = { depth: number; level: number; inSteps?: boolean }

/** A declaration's head being laid out. */
type Head = { statement: P.Match; row: BubblyRulePresentation; partOfSpeech: BubblyPartOfSpeech }

/** One line of the source, and the lines indented under it. */
type SourceLine = {
  /** its index in the text */
  index: number
  /** its first character past its indent */
  start: number
  /** one past its last, trailing spaces left out */
  end: number
  /** its indent's width, in characters */
  width: number
  /** nothing on it, not even an indent:  it sits where the next line does */
  isBlank: boolean
  /** the lines under it */
  children: SourceLine[]
}

/** The rule every line of a block matches:  its first child past a trailing comment is the line's statement. */
const LINE_RULE = "line"

/** The rule of a comment at a line's end. */
const COMMENT_RULE = "comment"

/** The rule of a statement's body:  never walked into for a head's inputs. */
const BLOCK_RULE = "block"

/** A keyword span. */
const KEYWORD = "keyword"

/** The rule of a number written in, `300` in `pause for 300 msec`. */
const NUMBER_RULE = "number"

/** Operators drawn faint. */
const MARKS = new Set([",", ":"])

/** Kinds whose words, a space apart, are one name. */
const JOINED = new Set<Paint>(["reference", "input"])

/** The alias of every expression rule:  a value, unless it's a statement too or written in. */
const EXPRESSION = "expression"

/** ... and of every statement. */
const STATEMENT = "statement"

/** `lines` and every line under them, in order. */
function flattened(lines: SourceLine[]): SourceLine[] {
  return lines.flatMap((line) => [line, ...flattened(line.children)])
}

/** `match`'s child matches:  in `matched`, and in `data` (where some rules keep theirs), errors left out. */
function childrenOf(match: P.Match): P.Match[] {
  const children = new Set<P.Match>()
  for (const item of match.matched) if (item instanceof P.Match) children.add(item)
  for (const [key, value] of Object.entries(match.data ?? {})) {
    if (key === "errors") continue
    for (const item of [value].flat()) if (item instanceof P.Match && item !== match) children.add(item)
  }
  return [...children]
}

/** `match`'s descendants whose rule is one of `names`, outermost only, never inside its body;  with offsets. */
function descendantsNamed(match: P.Match, names: readonly string[] | undefined): P.Match[] {
  if (!names?.length) return []
  const found: P.Match[] = []
  const walk = (each: P.Match) => {
    for (const child of childrenOf(each)) {
      if (child.rule.name === BLOCK_RULE) continue
      if (names.includes(child.rule.name ?? "") && child.start !== undefined && child.end !== undefined)
        found.push(child)
      else walk(child)
    }
  }
  walk(match)
  return found
}

/** Is `rule` an expression, a value, and not a statement (its twin, `play the card`, is a statement too)? */
function isExpression(rule: P.Rule): boolean {
  const aliases = [rule.alias ?? []].flat()
  return aliases.includes(EXPRESSION) && !aliases.includes(STATEMENT)
}

/** Is `match` operands and the operators between them (`CompoundExpression`'s shape:  its `lhs` and `rhsChain`)? */
function isCombination(match: P.Match): boolean {
  return !!BubblyPresentation.for(match.rule)?.isCombination && "rhsChain" in (match.groups ?? {})
}
