import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { BubblyPresentation } from "./BubblyPresentation"
import { BubblyRoles } from "./BubblyRoles"
import type {
  BubblyBlock,
  BubblyCode,
  BubblyDrawing,
  BubblyLayoutOptions,
  BubblyLine,
  BubblyNode,
  BubblyPartOfSpeech,
  BubblyPiece,
  BubblyPieceKind,
  BubblyRole,
  BubblyRulePresentation,
  BubblyRuleRoles,
  BubblyPillName,
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
 * - Pure data, no HTML:  the app draws it (`BubblyHtml`), and so do the app's code editor (epic `codemirror` P3) and VS Code (P51).
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

  /** The names inside the head pill being laid out, bold:  `BubblyLine.pillNames` (`paintTyped()`). */
  private pillNames: BubblyPillName[] = []

  /** Where each tag that declares a member starts:  `BubblyDrawing.declaringTags`. */
  private readonly declaringTags = new Set<number>()

  /** Words that point back (`it`, `its`):  drawn plain. */
  private readonly pronouns: Set<string>

  /** Words a blank's kind follows, never part of it:  its language's articles and pronouns (`a`, `el`, `its`). */
  private readonly smallWords: Set<string>

  private constructor(
    private readonly text: string,
    parser: SP.SpellParser,
    parsed?: P.Match
  ) {
    const { words } = parser.language ?? SP.Language.default
    this.pronouns = words.pronouns
    this.smallWords = new Set([...words.memberStopWords, ...words.pronouns])
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

  /** The overlays `match`'s roles ask for:  a value written in, a name, Spell's own words. */
  private overlaysOf(match: P.Match) {
    const roles = BubblyRoles.of(match.rule)
    if (match.start === undefined || match.end === undefined) return
    const { start, end } = match
    // yes and no:  Spell's words, but a value written in
    if (roles.match === "written value")
      this.overlays.push({ start, end, kind: "value", order: 0, overWordsOnly: true })
    // `'s`:  part of the name before it
    if (roles.match === "name") this.overlays.push({ start, end, kind: "reference", order: 1 })
    // `a new foundation` (epic `language` I98), `draggable`, `it is droppable when`
    for (const name of this.partsWith(match, roles, "name"))
      this.overlays.push({ ...name, kind: "reference", order: 1 })
    for (const plain of this.partsWith(match, roles, "plain")) this.overlays.push({ ...plain, kind: "words", order: 2 })
  }

  /**
   * The parts of `match` its `roles` give `role`:  each group's match, and each word of its syntax (`literal`).
   * - A word of its syntax:  a word of its match outside every group's.
   */
  private partsWith(match: P.Match, roles: BubblyRuleRoles, role: BubblyRole): Stretch[] {
    const parts: Stretch[] = []
    for (const group of BubblyRoles.groupsWith(roles, role))
      for (const each of groupNamed(match, group)) parts.push({ start: each.start!, end: each.end! })
    if (roles.literal)
      parts.push(...this.literalsOf(match).filter(({ word }) => BubblyRoles.ofLiteral(roles, word) === role))
    return parts.sort((a, b) => a.start - b.start)
  }

  /** The words of `match` outside every group's match:  the words of its syntax, `when`, `it`, `droppable`. */
  private literalsOf(match: P.Match): Array<Stretch & { word: string }> {
    const groups = Object.values(match.groups ?? {})
      .flat()
      .filter((each): each is P.Match => each instanceof P.Match && each.start !== undefined)
    const words: Array<Stretch & { word: string }> = []
    for (const found of this.text.slice(match.start, match.end).matchAll(WORD)) {
      const start = match.start! + found.index
      const end = start + found[0].length
      if (!groups.some((group) => start >= group.start! && end <= group.end!))
        words.push({ start, end, word: found[0] })
    }
    return words
  }

  ////////////////
  // ## Underlines:  one value, one question
  ////////////////

  /**
   * Underline `statement`'s values and questions, outermost only (`BubblyUnderline`);  a head's only in what it draws
   * as a step (its row's `steps`), and an action's blanks;  a drawing's markup none.
   */
  private underlineStatement(statement: P.Match) {
    if (this.text[statement.start!] === "<") return
    const roles = BubblyRoles.of(statement.rule)
    if (!roles.band) return this.underlineIn(statement)
    const row = BubblyPresentation.for(statement.rule)
    for (const step of descendantsNamed(statement, row?.steps)) this.underlineIn(step)
    if (this.pillOf(statement, roles))
      for (const blank of this.blanksOf(statement, roles, row)) this.underline(blank.start, blank.end, "value")
  }

  /**
   * Underline `match`:  whole, when it's a value or a question;  else each value and question in it.
   * - A value:  an expression (`its pile`, `a new deck`), but not a statement, nor one written in (`10`, `king`).
   * - An expression holding others (`a is b`, `(x and y)`) underlines its parts:  `underlineCombination()`.
   */
  private underlineIn(match: P.Match) {
    if (match.rule.name === BLOCK_RULE) return
    const row = BubblyPresentation.for(match.rule)
    const roles = BubblyRoles.of(match.rule)
    const { start, end } = match
    if (roles.match === "written value") return
    if (start !== undefined && end !== undefined) {
      // a quantity:  from its number to its end, `300 msec`;  a measure written out with no number rule in it, whole
      if (roles.match === "quantity") {
        const [number] = descendantsNamed(match, [NUMBER_RULE])
        return this.underline(number?.start ?? start, end, "quantity")
      }
      if (roles.match === "action call" && BubblyLayout.isOwnCall(match)) return this.underline(start, end, "call")
      if (BubblyRoles.groupsWith(roles, "value").length) return this.underlineEach(match, roles)
      if (roles.match === "question") return this.underline(start, end, "question")
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
   * - The thing a question asks of:  what's before it back to the last `and` or `or` (`isJoin`),
   *   as the compiler binds it (`CompoundExpression`'s precedence):
   *   every question binds tighter than those, and no tighter than arithmetic.
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
      const roles = BubblyRoles.of(suffix.rule)
      const operand = suffix.groups.expression as P.Match | undefined
      const last = parts.at(-1)
      if (roles.match === "question" && segmentStart !== undefined) {
        parts.splice(segment, parts.length - segment, { start: segmentStart, end: suffix.end, kind: "question" })
      } else if (roles.match === "value" && last && parts.length > segment) {
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

  /**
   * Is `match`, a call of an action, one of an action a project declares (this one, or one it imports)?
   * - Not a built-in template's (`turn the card face up`, a two sided view's):  that's Spell's own, as `add ... to` is.
   * - By the method the call found as it parsed, where that was declared;  else by the type the action is on
   *   (a call whose receiver's type isn't known, `turn its last card face up`, finds no method).
   */
  private static isOwnCall(match: P.Match): boolean {
    const { method } = match.data as { method?: P.ScopeMethod }
    if (method) return !SP.builtInTemplateFileFor(method.declaredAt?.path ?? "")
    const { thisType } = match.rule as P.Rule & { thisType?: P.Datatype }
    // a template's class, `TwoSidedView`
    return !(thisType && Object.values(SP.BUILT_IN_TEMPLATES).includes(thisType))
  }

  /**
   * A rule whose groups are `value`s, ONE value from the first to the last (`each_in_statement`'s `item` and `list`):
   * `add each card in the cards to the stock`:  `each card in the cards` ONE value, from its `each` to the list's end;
   * the rest of the statement underlined as it would be, but for what's inside that stretch.
   * - A call of the project's own around it (`deal each card in the deck`) is underlined whole, the stretch inside it.
   * - Its `each` (or `the`, `the cards in the stock`):  the word before the item, when the rule reads it there.
   */
  private underlineEach(match: P.Match, roles: BubblyRuleRoles) {
    const values = new Set(BubblyRoles.groupsWith(roles, "value"))
    const groups = Object.entries(match.groups ?? {})
    const valueGroups = groups.filter(([name]) => values.has(name)).map(([, each]) => [each].flat()[0] as P.Match)
    const [item, list] = [valueGroups[0], valueGroups.at(-1)]
    const before = this.underlines.length
    for (const [name, each] of groups) if (!values.has(name) && each instanceof P.Match) this.underlineIn(each)
    if (item?.start === undefined || list?.end === undefined) return
    // never from the list's start:  a contraction's list (`del mazo`) starts with an article read apart, `el`
    const from = BubblyLayout.eachStart(match, item)
    const to = list.end
    const inner = this.underlines.splice(before)
    if (inner.some((each) => each.start <= from && each.end >= to)) return void this.underlines.push(...inner)
    this.underlines.push(...inner.filter((each) => each.end <= from || each.start >= to))
    this.underline(from, to, "value")
  }

  /** Where `match`'s `each` starts:  the word before its `item`, when its rule reads that word there;  else the item. */
  private static eachStart(match: P.Match, item: P.Match): number {
    const tokens = match.tokens ?? []
    let at = tokens.findIndex((token) => token.start >= item.start!) - 1
    while (at >= 0 && tokens[at] instanceof P.WhitespaceToken) at--
    const word = (match.rule as P.Sequence).rules?.[1]
    // `.length`:  an optional word (`the?`) reads nothing as a match too
    const said = at >= 0 ? word?.parse(match.scope, tokens.slice(at)) : undefined
    return said?.length ? tokens[at]!.start : item.start!
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
      const band = statement && BubblyRoles.of(statement.rule).band
      // a head going on onto the lines under it (`if its rank > 1` then `and its rank < 5`):  one head
      if (statement && (band || row?.isControl)) line = this.continued(line, statement)
      if (statement && band && !inSteps) {
        // a group holds the declarations after it, up to the next group;  the blank lines before that stay outside
        let members: SourceLine[] = []
        if (row?.isGroup) {
          let last = index + 1
          while (last < lines.length && !this.isGroupLine(lines[last]!)) last++
          while (last > index + 1 && lines[last - 1]!.isBlank) last--
          members = lines.slice(index + 1, last)
          index = last - 1
        }
        nodes.push(this.block(line, statement, band, [...line.children, ...members], level))
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
    partOfSpeech: BubblyPartOfSpeech,
    under: SourceLine[],
    level: number
  ): BubblyBlock {
    const row = BubblyPresentation.for(statement.rule) ?? {}
    const roles = BubblyRoles.of(statement.rule)
    return {
      kind: "block",
      rule: statement.rule.name ?? "",
      partOfSpeech,
      isGroup: !!row.isGroup,
      level,
      head: this.lineOf(line, { depth: 0, head: { statement, row, roles, partOfSpeech } }),
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
    this.pillNames = []
    this.paintSpans(start, end, head)
    for (const overlay of this.overlays) if (overlay.start >= start && overlay.end <= end) this.paintOverlay(overlay)
    if (head) this.paintHead(head)
    const codes = this.isMarkup(line) ? this.paintMarkup(start, end) : []
    const underlines = this.underlines.filter((each) => each.start >= start && each.end <= end)
    const pieces = this.piecesOf(start, end, [...underlines, ...codes])
    const { pillNames } = this
    return {
      kind: "line",
      start,
      end,
      depth,
      pieces,
      underlines,
      ...(codes.length ? { codes } : {}),
      ...(pillNames.length ? { pillNames } : {})
    }
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

  /**
   * A head's declarations and choices, over what its spans said:
   * - an action's, ONE pill (`paintTyped()`);  any other's, each part that's a `declaration` a pill
   */
  private paintHead(head: Head) {
    const { statement, row, roles } = head
    this.paintKind(head)
    // a drawing's head, `to draw its placeholder`:  what it draws a name, no pill (epic `language` I99)
    if (this.paintDrawing(head)) return
    if (head.partOfSpeech === "action") this.paintTyped(head)
    else
      for (const part of this.partsWith(statement, roles, "declaration")) this.paintRange(part.start, part.end, "input")
    for (const list of descendantsNamed(statement, row.choices))
      for (const item of childrenOf(list)) this.paintChoice(item.start!, item.end!)
  }

  /**
   * The kind a type's head says it is (`namesKind`), bold whole, ONE name (epic `language` I111):
   * `a "deck" is a **list of cards**`, `una "pila" es una **lista visible de cartas**`.
   * - It ends where its row's group ends (`instanceType`, `superType`), from the parse.
   * - It starts after the first article past the name (`is a`, `es una`), past any more small words.
   * - Its abilities are in it, wherever they are, and the commas between them (epic `language` I112):
   *   `a "card" is a **draggable, clickable two sided view**`, `a "pile" is a **viewable, droppable list of cards**`.
   */
  private paintKind({ statement, row }: Head) {
    if (!row.namesKind) return
    const groups = statement.groups as Record<string, P.Match | P.Match[] | undefined>
    const [kind] = [groups[row.namesKind]].flat()
    if (kind?.start === undefined || kind.end === undefined) return
    const names = [groups.type, groups.aka].flat().filter((each) => each?.end !== undefined && each.end <= kind.start!)
    const nameEnd = Math.max(...names.map((each) => each!.end!), statement.start!)
    let from: number | undefined
    let pastArticle = false
    for (const word of this.text.slice(nameEnd, kind.start).matchAll(/\S+/g)) {
      const at = nameEnd + word.index
      const isSmall = this.smallWords.has(word[0].toLowerCase())
      if (!pastArticle) pastArticle = isSmall
      else if (!isSmall) {
        from = at
        break
      }
    }
    this.paintRange(from ?? kind.start, kind.end, "reference")
  }

  /**
   * A drawing's head (`namesWhatItDraws`), its words Spell's own, so names, not a pill:
   * its verb and the part it draws bold, a pronoun or a word between them plain;  `true` if it was one.
   * - `to <draw> it`, `to <draw> its <front>`, `to <draw> its <placeholder>`, `to <draw> each <item>`;
   *   `para <dibujarla>`, `para <dibujar> su <marcador>`
   * - `to draw it` too, though English leaves it to `to_do_something`:  its method is the drawing's, `draw()`
   * - Quoted (`to "draw its back"`), it stays one quoted pill, as any quoted name with no blanks.
   */
  private paintDrawing({ statement, row }: Head): boolean {
    const groups = statement.groups as { phrase?: P.Match; slot?: P.Match; signature?: P.Match }
    const signature = groups.signature?.data as { methodName?: string; args?: unknown[] } | undefined
    const drawsIt =
      signature?.methodName === DRAW_METHOD && !signature.args?.length && this.text[groups.signature!.start!] !== '"'
    if (!row.namesWhatItDraws && !drawsIt) return false
    const words = groups.phrase ?? groups.slot ?? (drawsIt ? groups.signature : undefined)
    if (words?.start === undefined || words.end === undefined) return !!row.namesWhatItDraws
    const lead = /^\S+\s*/.exec(this.text.slice(statement.start!, words.end))?.[0].length ?? 0
    const from = groups.slot ? statement.start! + lead : words.start
    const found = [...this.text.slice(from, words.end).matchAll(/\S+/g)].map((word) => ({
      start: from + word.index,
      end: from + word.index + word[0].length,
      word: word[0]
    }))
    const [verb] = found
    const last = found.at(-1)
    if (verb) this.paintRange(verb.start, verb.end, "reference")
    if (groups.slot) this.paintRange(groups.slot.start!, groups.slot.end!, "reference")
    else if (last && last !== verb && !this.pronouns.has(last.word.toLowerCase()))
      this.paintRange(last.start, last.end, "reference")
    return true
  }

  /**
   * An action head's pill:  what a person typed, ONE pill,
   * from its first `declaration` or `blank` to its last `declaration` (`pillOf()`, epic `language` I109):
   * `to <play a card>`, `after <putting a card on a pile>`, `when <a card is dropped>`, `when <creating solitaire>`.
   * - Its blanks are in it, each its own dotted line (`blanksOf()`), its kind word bold, `a **card**`:
   *   what the spans painted a name there before the pill (`pillNames`)
   * - Quoted, `to "play a card"`, its `"` marks are its pill's own, at either end, as any quoted input's.
   */
  private paintTyped({ statement, row, roles }: Head) {
    const pill = this.pillOf(statement, roles)
    if (!pill) return
    // each blank's kind:  the names the parse read in it;  a create hook's, its words past its small words
    const byParse = !row.blankAfterVerb
    for (const blank of this.blanksOf(statement, roles, row))
      this.pillNames.push(...this.namesIn(blank.start, blank.end, { byParse }))
    this.paintRange(pill.start, pill.end, "input")
  }

  /**
   * An action head's pill:  from its first `declaration` or `blank` part to its last `declaration`'s end;
   * `undefined` for a head with none.
   */
  private pillOf(statement: P.Match, roles: BubblyRuleRoles): Stretch | undefined {
    const declared = this.partsWith(statement, roles, "declaration")
    if (!declared.length) return undefined
    const starts = [...declared, ...this.ownBlanks(statement, roles)].map(({ start }) => start)
    const pill = { start: Math.min(...starts), end: Math.max(...declared.map(({ end }) => end)) }
    return pill.end > pill.start ? pill : undefined
  }

  /**
   * A blank's bold words, from `start` to `end`:  the runs painted a name, `card` in `a card`;
   * none painted one, or not `byParse` (a create hook's), its words past the small words it starts with
   * (`smallWords`), `pile` in `a pile`, `solitario` in `el solitario`.
   */
  private namesIn(start: number, end: number, { byParse = true }: { byParse?: boolean } = {}): BubblyPillName[] {
    const names = byParse ? this.namedRuns(start, end) : []
    if (names.length) return names
    let from = start
    for (const word of this.text.slice(start, end).matchAll(/\S+/g)) {
      const at = start + word.index
      if (at !== from || !this.smallWords.has(word[0].toLowerCase())) break
      from = at + word[0].length
      while (this.text[from] === " ") from++
    }
    return from < end ? [{ start: from, end }] : []
  }

  /** The runs from `start` to `end` painted a name, a single space between two words of one joined. */
  private namedRuns(start: number, end: number): BubblyPillName[] {
    const names: BubblyPillName[] = []
    for (let at = start; at < end; at++) {
      if (this.paint[at] !== "reference") continue
      const last = names.at(-1)
      // `card image`:  one name
      if (last && (last.end === at || (last.end === at - 1 && this.text[at - 1] === " "))) last.end = at + 1
      else names.push({ start: at, end: at + 1 })
    }
    return names
  }

  /**
   * An action head's blanks, each underlined in its pill:
   * - its own parts that are a `blank`, each with the article before it:  `when <a card> is dropped`
   * - in its declarations, the parts their rules say are a `blank`:
   *   an action's parameters, `to play <a card>`, `to move (<a card>) to (<a pile>)` (`method_signature`'s)
   * - EXCEPT a create hook's (`blankAfterVerb`, a check of its own):
   *   its signature but its first word, `when creating <a card image>`, `when creating <it>`
   */
  private blanksOf(statement: P.Match, roles: BubblyRuleRoles, row: BubblyRulePresentation | undefined): Stretch[] {
    if (row?.blankAfterVerb) {
      const [made] = [statement.groups[row.blankAfterVerb]].flat() as Array<P.Match | undefined>
      if (made?.start === undefined || made.end === undefined) return []
      const verb = /^\S+\s*/.exec(this.text.slice(made.start, made.end))?.[0].length ?? 0
      return made.start + verb < made.end ? [{ start: made.start + verb, end: made.end }] : []
    }
    const blanks = this.ownBlanks(statement, roles)
    const walk = (match: P.Match) => {
      if (match.rule.name === BLOCK_RULE) return
      const blank = this.partsWith(match, BubblyRoles.of(match.rule), "blank")
      if (blank.length) blanks.push(...blank)
      else for (const child of childrenOf(match)) walk(child)
    }
    for (const declared of BubblyRoles.groupsWith(roles, "declaration"))
      for (const each of groupNamed(statement, declared)) walk(each)
    return blanks.sort((a, b) => a.start - b.start)
  }

  /** `statement`'s own parts that are a `blank`, each from the article before it:  `when <a card> is dropped`. */
  private ownBlanks(statement: P.Match, roles: BubblyRuleRoles): Stretch[] {
    return this.partsWith(statement, roles, "blank").map(({ start, end }) => {
      const before = /(\S+)\s+$/.exec(this.text.slice(statement.start, start))
      const isArticle = !!before && this.smallWords.has(before[1]!.toLowerCase())
      return { start: isArticle ? start - before[0].length : start, end }
    })
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

  /**
   * A drawing's markup:  `<`, `>`, `=`, `{`, `}` faint, a tag's name a shade, a quoted value a pill;
   * returns its CODE, each `{…}` (`BubblyLine.codes`).
   * - A `{` starts code up to its own `}`:  what's in it is Spell, drawn as its spans say, a `"` there a text's
   *   (`onClick={say "hi"}`), never the tag's quoted value.
   *   - A `{` with no `}` on its line (`padding={small" spacing="xs">`, typed half way) is a faint mark alone,
   *     so the tag's other attributes still draw as they're written (epic `editor` I144).
   * - In a tag, a `"` right after a word (`small"`) is drawn plain:  never a value's start, which would pair the
   *   tag's quotes off by one, every pill after it over the wrong words (I144).
   */
  private paintMarkup(start: number, end: number): BubblyCode[] {
    const { text } = this
    const codes: BubblyCode[] = []
    let inTag = false
    for (let at = start; at < end; at++) {
      const char = text[at]!
      if (char === "{") {
        const close = this.closingBrace(at, end)
        this.paintRange(at, at + 1, "mark")
        if (close < 0) continue
        this.paintRange(close, close + 1, "mark")
        codes.push({ start: at, end: close + 1 })
        at = close
      } else if (char === "<" && /[/a-z]/i.test(text[at + 1] ?? "")) {
        inTag = true
        const name = /^<\/?([\w-]*)/.exec(text.slice(at, end))!
        const markEnd = at + name[0].length - name[1]!.length
        this.paintRange(at, markEnd, "mark")
        this.paintRange(markEnd, at + name[0].length, "tag")
        at += name[0].length - 1
      } else if (!inTag) {
        if (char === "}") this.paintRange(at, at + 1, "mark")
      } else if (char === ">" || (char === "/" && text[at + 1] === ">")) {
        const length = char === "/" ? 2 : 1
        this.paintRange(at, at + length, "mark")
        at += length - 1
        inTag = false
      } else if (char === "=" || char === "}") {
        this.paintRange(at, at + 1, "mark")
      } else if (char === '"' && !WORD_CHARACTER.test(text[at - 1] ?? "")) {
        const close = text.indexOf('"', at + 1)
        const stop = close < 0 || close >= end ? end : close + 1
        this.paintRange(at, stop, "input")
        at = stop - 1
      } else {
        // an attribute's name, or a stray `"`:  plain, whatever a span said of it
        this.paintRange(at, at + 1, "words")
      }
    }
    return codes
  }

  /** Where the `}` closing the `{` at `open` is, before `end`:  its own, past any `{…}` and `"…"` in it;  else -1. */
  private closingBrace(open: number, end: number): number {
    const { text } = this
    let depth = 0
    for (let at = open; at < end; at++) {
      const char = text[at]
      if (char === '"') {
        const close = text.indexOf('"', at + 1)
        if (close < 0 || close >= end) return -1
        at = close
      } else if (char === "{") depth++
      else if (char === "}" && --depth === 0) return at
    }
    return -1
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
   * - cut where each of `stretches` starts and ends (its underlines, its code), so it starts and ends with a piece;
   *   but for an underline inside a pill, a head's blank (`to play <a card>`):  the pill stays one piece
   */
  private piecesOf(start: number, end: number, stretches: Array<{ start: number; end: number }>): BubblyPiece[] {
    // never inside a pill:  a head's blank underlined in it (`to play <a card>`) leaves it ONE piece
    const isInPill = (at: number) => this.paint[at - 1] === "input" && this.paint[at] === "input"
    const cuts = new Set(stretches.flatMap((each) => [each.start, each.end]).filter((at) => !isInPill(at)))
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
type Head = {
  statement: P.Match
  row: BubblyRulePresentation
  roles: BubblyRuleRoles
  partOfSpeech: BubblyPartOfSpeech
}

/** A stretch of the text. */
type Stretch = { start: number; end: number }

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

/** The method a drawing's head makes, `to draw it` => `draw()`, in every language. */
const DRAW_METHOD = "draw"

/** A word of a rule's syntax (`literalsOf()`). */
const WORD = /[\p{L}\p{N}_]+/gu

/** Operators drawn faint. */
const MARKS = new Set([",", ":"])

/** A letter, digit or `_`:  a `"` right after one, in a tag, is a stray, never a value's start (I144). */
const WORD_CHARACTER = /[\p{L}\p{N}_]/u

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

/**
 * The matches of `match`'s group `name`, with offsets:  its own, else its parts':
 * - a part a `{rule}` with no group name of its own matched, named for its rule (`{bare_type_arg}`)
 * - an unnamed part's group (a repeat's, `method_signature`'s `( {method_arg} )`)
 */
function groupNamed(match: P.Match, name: string): P.Match[] {
  const hasOffsets = (each: unknown): each is P.Match =>
    each instanceof P.Match && each.start !== undefined && each.end !== undefined
  const own = [match.groups?.[name]].flat().filter(hasOffsets)
  if (own.length) return own
  return childrenOf(match).flatMap((child) => {
    if (child.rule.name === name) return hasOffsets(child) ? [child] : []
    return child.rule.name ? [] : groupNamed(child, name)
  })
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
