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
 *   - a line that doesn't parse alone, for a name another file declares (`if the stock is empty`):
 *     its block from its first word, as its project's parse draws it (`shapeOf()`;  epic `codemirror` I23)
 *   - a type's member that reads whole only in a list's body, for a type built on one another file declares
 *     (`it is droppable when`), or naming a type declared below it:
 *     read again (`rereadAsMember()`;  epic `codemirror` I26, I28)
 *   - a top-level line naming a type another file declares (`a square belongs to one board`):
 *     read again, that type a stand-in (`rereadWithStandInType()`;  I28)
 *   - among steps, a line that read as a declaration, or not at all:  the control line its first word starts
 *     (`para rango en ...`, `while waiting`;  `controlOf()`, I28)
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

  /** The lines whose statement read only part of them, a parse error after it (`it is droppable`, then `when`). */
  private readonly partlyRead = new Set<number>()

  /** Was the text parsed here, alone, with no project's parse of it?  Only then is a line read again (`rereadIn()`). */
  private isAlone = false

  /**
   * The indent the parse read each comment, or other aside, at, by line index.
   * - So one written out of line doesn't cut a band, as it doesn't cut a block (epic `language` I181).
   */
  private readonly asideIndents = new Map<number, number>()

  /** Where each line starts. */
  private readonly lineStarts: number[] = []

  /** Each line inside a start tag laid out over lines (`class="GameBar"` under `<toolbar`), by index:  markup too. */
  private readonly linesInTags = new Set<number>()

  /** Stretches every line takes from the parse, whatever it is:  yes and no, `'s`, `item`;  `order` low first. */
  private readonly overlays: Overlay[] = []

  /** Each value a list declares (`choice`), from the parse:  a pill of its own, painted over the rest of its line. */
  private readonly choices: Stretch[] = []

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
    private readonly parser: SP.SpellParser,
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
    this.findTagsOverLines()
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
    this.isAlone = !parsed
    try {
      match ??= parser.parse(this.text, "block")
    } catch {
      // the spans stand alone
    }
    if (!match) return
    this.read(match)
    const { tokenizer } = parser
    P.Tokenizer.forEachToken(match.tokens, (token) => {
      // a line with nothing at all on it sits where the next does, in `treeOf()`
      if (token instanceof P.LineToken && (token.tokens.length || token.leading) && tokenizer.isAside(token))
        this.asideIndents.set(this.lineIndexOf(token.start), token.indent)
    })
  }

  /**
   * Take in `match`'s reading:  each line's statement, its underlines, the overlays, the tags that declare;
   * then sort what's sorted.
   * - A line already read keeps its statement:  only the first reading of a line counts.
   */
  private read(match: P.Match) {
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
            const isError = (child: P.Match) => child.rule.name === PARSE_ERROR_RULE
            if (!isError(statement) && childrenOf(each).some(isError)) this.partlyRead.add(index)
          }
        }
      }
      this.overlaysOf(each)
      // a tag that declares the member it draws (`<number "score"/>`), not one said on a line of its own
      const { declares } = each.data as { declares?: DrawnDeclaration }
      if (declares && !declares.drawnOnly && each.start !== undefined) this.declaringTags.add(each.start)
      for (const child of childrenOf(each)) if (each.matched.includes(child) || this.isOfText(child)) walk(child)
    }
    walk(match)
    this.overlays.sort((a, b) => a.order - b.order)
    this.underlines.sort((a, b) => a.start - b.start)
  }

  /**
   * Is `match`, kept in its parent's `data`, of this text:  every word of it there, where it says it is?
   * - Not words a rule parsed on their own, counted from their own start:
   *   a text's fill-in (`"Your score:  [solitaire's score]"`), a markdown hole, `<ui-markdown>`'s attributes.
   *   Read as the text's, its `'s` made `solitaire is an app`'s `is` half bold (epic `codemirror` I27).
   */
  private isOfText(match: P.Match): boolean {
    let isOfText = true
    P.Tokenizer.forEachToken(match.tokens ?? [], (token) => {
      if (isOfText && isWordlike(token)) isOfText = SP.SpellHighlighter.isTokenOf(this.text, token)
    })
    return isOfText
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
    // `is one of ace, 2 ... 10, jack`:  each value its list's item
    for (const group of BubblyRoles.groupsWith(roles, "choice"))
      for (const list of groupNamed(match, group))
        for (const item of childrenOf(list))
          if (item.start !== undefined && item.end !== undefined)
            this.choices.push({ start: item.start, end: item.end })
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

  /**
   * The words of `match` outside every group's match:  the words of its syntax, `when`, `it`, `droppable`.
   * - never a comment's:  `of` in `-- a deck of playing cards`
   */
  private literalsOf(match: P.Match): Array<Stretch & { word: string }> {
    const groups: Stretch[] = Object.values(match.groups ?? {})
      .flat()
      .filter((each): each is P.Match => each instanceof P.Match && each.start !== undefined)
      .map((each) => ({ start: each.start!, end: each.end! }))
    for (const span of this.spans)
      if (span.kind === "comment" && span.end > match.start! && span.start < match.end!) groups.push(span)
    const words: Array<Stretch & { word: string }> = []
    for (const found of this.text.slice(match.start, match.end).matchAll(WORD)) {
      const start = match.start! + found.index
      const end = start + found[0].length
      if (!groups.some((group) => start >= group.start && end <= group.end)) words.push({ start, end, word: found[0] })
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
   * The text's lines, nested by indent:
   * a blank line sits where the next line does, and a comment where the parse read it (`asideIndents`).
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
        width: this.asideIndents.get(index) ?? indent,
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
   * - `inType`:  inside a type's body (a thing's, or a group's in one), whose lines are its members
   * - `inProperty`:  inside a property's body, its value worked out:  a line there that didn't parse is never given a
   *   declaration's shape (`shapeOf()`), as `the pile's suit is ...` under `it is droppable when`, read alone
   */
  private layout(
    lines: SourceLine[],
    { depth, level, inSteps = false, inType = false, inProperty = false }: LayoutPlace
  ): BubblyNode[] {
    const nodes: BubblyNode[] = []
    for (let index = 0; index < lines.length; index++) {
      let line = lines[index]!
      if (line.isBlank) {
        nodes.push({ kind: "gap", start: line.start })
        continue
      }
      let statement = this.isMarkup(line) ? undefined : this.statements.get(line.index)
      // a type's member that didn't read whole alone, for a type declared elsewhere:  read again, as a list's
      if (inType && statement && this.rereadAsMember(line)) statement = this.statements.get(line.index)
      // a top-level line naming a type declared elsewhere:  read again, that type a stand-in
      else if (!level && !inSteps && statement && this.rereadWithStandInType(line))
        statement = this.statements.get(line.index)
      // in a body of steps, a line that read as a declaration, or didn't read:  a control line, if its first word starts one
      const control =
        (inSteps || inProperty) && statement && line.children.length ? this.controlOf(line, statement) : ""
      if (control) {
        nodes.push(this.control(line, control, level, inSteps))
        continue
      }
      // a head that didn't parse, for a name declared elsewhere:  its shape from its first word (`shapeOf()`)
      const shape = statement?.rule.name === PARSE_ERROR_RULE ? this.shapeOf(line, { inType }) : undefined
      if (shape?.isControl && line.children.length) {
        nodes.push(this.control(line, shape.rule, level, inSteps))
        continue
      }
      if (shape?.band && !inSteps && !inProperty) {
        nodes.push(this.block(line, statement!, shape.band, line.children, { level, inType }, shape.rule))
        continue
      }
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
        nodes.push(this.block(line, statement, band, [...line.children, ...members], { level, inType }))
        continue
      }
      if (statement && row?.isControl && line.children.length) {
        nodes.push(this.control(line, statement.rule.name ?? "", level, inSteps))
        continue
      }
      nodes.push(this.lineOf(line, { depth }))
      nodes.push(...this.layout(line.children, { depth: depth + 1, level, inSteps, inType, inProperty }))
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

  /**
   * A declaration:  its head, then what's under it.
   * - `rule`:  the rule its head would have matched, for a head that didn't parse (`shapeOf()`)
   * - Its body is a type's members when it's a thing, or a group inside one (`inType`)
   */
  private block(
    line: SourceLine,
    statement: P.Match,
    partOfSpeech: BubblyPartOfSpeech,
    under: SourceLine[],
    { level, inType }: Pick<LayoutPlace, "level" | "inType">,
    rule = statement.rule.name ?? ""
  ): BubblyBlock {
    const row = BubblyPresentation.for(statement.rule) ?? {}
    const roles = BubblyRoles.of(statement.rule)
    return {
      kind: "block",
      rule,
      partOfSpeech,
      isGroup: !!row.isGroup,
      level,
      head: this.lineOf(line, { depth: 0, head: { statement, row, roles, partOfSpeech } }),
      body: this.layout(under, {
        depth: 0,
        level: level + 1,
        inSteps: partOfSpeech === "action",
        inType: partOfSpeech === "thing" || (!!row.isGroup && inType),
        inProperty: partOfSpeech === "property"
      })
    }
  }

  /**
   * A control line with steps under it (`if`, `for each`):  a block in the light grey of control lines,
   * its line plain on its band, its steps its body;  `rule`, the one it matched.
   * - No scope of its own:  a name it introduces (a loop's `card`) is the enclosing declaration's.
   */
  private control(line: SourceLine, rule: string, level: number, inSteps: boolean): BubblyBlock {
    return {
      kind: "block",
      rule,
      partOfSpeech: "control",
      isGroup: false,
      level,
      head: this.lineOf(line, { depth: 0 }),
      body: this.layout(line.children, { depth: 0, level: level + 1, inSteps })
    }
  }

  /**
   * The shape a line that didn't parse would have had, from its first word:  a control line or a declaration's head,
   * so it draws as its project's parse draws it (epic `codemirror` I23).
   * - Why:  laid out from its text alone, a line naming what another file declares (`the stock`, `moving a card`)
   *   doesn't parse, so `if the stock is empty` lost its block and its foot, and its height with them.
   * - The statement rules whose syntax starts with that word (`P.Sequence.firstWords`), in the parser's language:
   *   - one of them a control line (`if`, `for`, `repeat`), and none a declaration:  a control line
   *   - all of them declarations with one part of speech (`after`, `when`):  that declaration
   *   - else, a word that starts steps too (`to`, `a`, `the`):  `undefined`, a step
   *   - EXCEPT a type's name alone, `a card`, `a two sided view` (its article `reopen_type`'s first word),
   *     with lines under it:  reopening a type declared elsewhere, a thing's head
   *   - and a pronoun before a quoted name, `it "can go up" if ...`:  a property's head, the name it declares
   *   - and, in a type's body (`inType`), a quoted name first, `"card" is a new card with ...`:  a property's head
   * - A control line only with lines under it:  alone, it's a step (`if the pile is empty return`).
   */
  private shapeOf(line: SourceLine, { inType }: Pick<LayoutPlace, "inType">): LineShape | undefined {
    const words = this.text.slice(line.start, this.commentStart(line))
    if (inType && QUOTED_NAME_FIRST.test(words)) return { rule: QUOTED_GETTER_RULE, band: "property" }
    const word = /^[\p{L}]+/u.exec(words)?.[0]
    if (!word) return undefined
    const shape = BubblyLayout.shapesFor(this.parser).get(word)
    if (shape) return shape
    if (this.pronouns.has(word.toLowerCase()) && QUOTED_NAME_AFTER.test(words.slice(word.length)))
      return { rule: QUOTED_PROPERTY_RULE, band: "property" }
    // another type's, declared in a type's body:  `a card "is on top" if ...`, that type in another file
    if (this.smallWords.has(word.toLowerCase()) && TYPE_THEN_QUOTED_NAME.test(words.slice(word.length)))
      return { rule: QUOTED_PROPERTY_RULE, band: "property" }
    if (!line.children.length) return undefined
    return this.isArticle(word) && TYPE_NAME_ALONE.test(words.trimEnd())
      ? { rule: REOPEN_TYPE_RULE, band: "thing" }
      : undefined
  }

  /** Is `word` an article that starts reopening a type, `a` in `a card` (`reopen_type`'s first words)? */
  private isArticle(word: string): boolean {
    const reopen = this.parser.rules[REOPEN_TYPE_RULE]
    const articles = reopen instanceof P.Group ? reopen.rules : reopen ? [reopen] : []
    return articles.some((rule) => rule instanceof P.Sequence && rule.firstWords?.includes(word))
  }

  /**
   * The control rule `line` is, in a body of steps:  a line with steps under it that read as a declaration, or not at
   * all, whose first word starts a control line too (epic `codemirror` I28);  else `""`.
   * - Why:  a declaration can't be among steps.  Laid out from its text alone, Spanish's `para rango en rangos de carta`
   *   (`rangos` another file's) reads as `para ...`, an action;  `while waiting` doesn't read, and `while` starts
   *   declarations too (`while a card is over it`), so `shapeOf()` can't tell by its first word.
   * - A line that read as a control line, or a step, is left as it is.
   */
  private controlOf(line: SourceLine, statement: P.Match): string {
    const isError = statement.rule.name === PARSE_ERROR_RULE
    if (!isError && !BubblyRoles.of(statement.rule).band) return ""
    const word = /^[\p{L}]+/u.exec(this.text.slice(line.start, line.end))?.[0]
    return (word && BubblyLayout.controlsFor(this.parser).get(word)) || ""
  }

  /**
   * Read `line`, a type's member that didn't read whole alone, again, with the lines under it:
   * so it draws as its project's parse draws it (epic `codemirror` I26, I28).
   * - Why:  laid out from its text alone, a type built on one another file declares doesn't know what it is:
   *   - `a "foundation" is a pile`:  not known to be a list, so `it is droppable when`, a list's own line, reads
   *     only as far as `droppable`, a plain band;  and its body as the type's members, the property's band its
   *     project draws gone, a band of its own drawn round its body
   *   - `a card` (reopened):  no type at all, so `belongs to one pile` doesn't read
   *   - and a member naming a type declared BELOW it (`wiki pages are found at ...`) reads only as far as it knows
   * - Read in, the first that reads it:
   *   - its own scope, which by now knows every type the text declares, below it too (`wiki pages`)
   *   - a stand-in type's body, a list of things:  a list is a thing too, so either kind's members read
   *   - a stand-in list of what its line names after an article (`the piece`, `it is droppable when the piece ...`):
   *     a list's own line whose body names its item
   *   - Each stand-in its own scope, under the one the line was read in:  the names declared above it still known
   *     (`pile`), and nothing it declares reaches the parse the drawing reads.
   * - Taken only when its head reads whole (in a stand-in, as a declaration):
   *   its reading then replaces theirs, under it too.
   * - Only a line that didn't read whole, and only from a parse of the text here (`isAlone`):  a project's parse knows.
   * - The parser's own rules, so any language's:  `es soltable cuando`.
   * - Returns whether it was taken.
   */
  private rereadAsMember(line: SourceLine): boolean {
    const statement = this.statements.get(line.index)
    const isRead = statement?.rule.name !== PARSE_ERROR_RULE && !this.partlyRead.has(line.index)
    const scope = statement?.scope
    if (!this.isAlone || isRead || !scope?.parser) return false
    // its own scope's reading is the project's, whatever it reads as:  `wiki pages are found at ...` no declaration
    if (
      this.rereadIn(
        line,
        () => new P.Scope({ parentScope: scope }),
        () => true
      )
    )
      return true
    for (const itemType of [THING_TYPE, ...this.namesAfterArticles(line)])
      if (this.rereadIn(line, () => BubblyLayout.standInList(scope, itemType))) return true
    return false
  }

  /** A stand-in list type's body under `scope`, a list of `itemType`s (`rereadAsMember()`). */
  private static standInList(scope: P.Scope, itemType: string): P.Scope {
    const owner = new P.ProjectScope({ name: STAND_IN_TYPE, parentScope: scope })
    owner.types.add({ name: STAND_IN_TYPE, superType: LIST_TYPE, itemType })
    if (itemType !== THING_TYPE) owner.types.add({ name: itemType, superType: THING_TYPE })
    return new P.SubjectScope({ name: STAND_IN_TYPE, parentScope: owner, subject: STAND_IN_TYPE })
  }

  /**
   * Read `line`, a top-level line that didn't read alone, starting with an article (`a square belongs to one board`),
   * again, with its first words a stand-in type, a thing:
   * so it draws as its project's parse draws it (epic `codemirror` I28).
   * - Why:  laid out from its text alone, a type another file declares (`square`) isn't known, so the line doesn't
   *   read, and `shapeOf()` takes it for reopening a type, a thing's band, where its project's draws a property's.
   * - Its first word after the article, then its first two, its first three:  the first that reads whole as a
   *   declaration, but not as reopening a type (`shapeOf()` guesses that already).
   * - Only from a parse of the text here (`isAlone`).
   * - Returns whether it was taken.
   */
  private rereadWithStandInType(line: SourceLine): boolean {
    const statement = this.statements.get(line.index)
    const scope = statement?.scope
    if (!this.isAlone || statement?.rule.name !== PARSE_ERROR_RULE || !scope?.parser) return false
    const [article, ...words] = this.text.slice(line.start, this.commentStart(line)).trim().split(/\s+/)
    if (!article || !this.isArticle(article)) return false
    for (let count = 1; count < words.length && count <= MAX_TYPE_WORDS; count++) {
      if (!/^[\p{L}-]+$/u.test(words[count - 1]!)) return false
      const typeName = P.classCase(words.slice(0, count).join(" "))
      const standIn = () => {
        const owner = new P.ProjectScope({ name: STAND_IN_TYPE, parentScope: scope })
        owner.types.add({ name: typeName, superType: THING_TYPE })
        return owner
      }
      if (this.rereadIn(line, standIn, (rule) => isDeclaration(rule) && rule.name !== REOPEN_TYPE_RULE)) return true
    }
    return false
  }

  /**
   * Read `line` and the lines under it again in a new scope from `scopeFor()`:  taken when its head reads whole, as a
   * rule `isTaken` takes (a declaration, by default), its reading then replacing what was read of those lines.
   * - Its head alone first, then with its lines:
   *   each read in a scope of its own, so neither sees what the other declared.
   * - Returns whether it was taken.  NEVER throws.
   */
  private rereadIn(line: SourceLine, scopeFor: () => P.Scope, isTaken = isDeclaration): boolean {
    // its head alone first, so a body under it is read again only for a head that's taken:  `a card`'s whole body
    if (line.children.length && !this.readIn(line, line.end, scopeFor(), isTaken)) return false
    const head = this.readIn(line, (flattened(line.children).at(-1) ?? line).end, scopeFor(), isTaken)
    if (!head) return false
    this.forget(this.lineStarts[line.index]!, (flattened(line.children).at(-1) ?? line).end)
    this.read(head)
    return true
  }

  /**
   * The text from `line`'s start to `end` read in `scope`:  `line`'s match, when its head reads whole as a rule
   * `isTaken` takes;  else `undefined`.  NEVER throws.
   */
  private readIn(line: SourceLine, end: number, scope: P.Scope, isTaken: (rule: P.Rule) => boolean) {
    let match: P.Match | undefined
    try {
      // its lines alone, tokenized where they are in the text, so its matches' offsets are the text's
      const { tokenizer } = scope.parser as SP.SpellParser
      const tokens = tokenizer.tokenize(this.text, this.lineStarts[line.index]!, end)
      match = scope.parser!.parse(tokenizer.breakIntoIndentedBlocks(tokens), BLOCK_RULE, scope)
    } catch {
      return undefined
    }
    const head = match && BubblyLayout.lineMatchAt(match, line.start)
    const read = head ? childrenOf(head).filter((child) => child.rule.name !== COMMENT_RULE) : []
    const [statement] = read
    const isRead = read.length === 1 && statement!.rule.name !== PARSE_ERROR_RULE
    return isRead && isTaken(statement!.rule) ? head : undefined
  }

  /** The words after an article on `line`, not pronouns, each once:  `piece` in `it is droppable when the piece ...`. */
  private namesAfterArticles(line: SourceLine): string[] {
    const words = this.text.slice(line.start, this.commentStart(line)).match(/[\p{L}]+/gu) ?? []
    const names = new Set<string>()
    for (let index = 1; index < words.length; index++) {
      const [before, word] = [words[index - 1]!.toLowerCase(), words[index]!]
      if (this.smallWords.has(before) && !this.smallWords.has(word.toLowerCase())) names.add(P.classCase(word))
    }
    return [...names].slice(0, MAX_STAND_IN_ITEMS)
  }

  /** The line match in `match` whose statement starts at `start`. */
  private static lineMatchAt(match: P.Match, start: number): P.Match | undefined {
    if (match.rule.name === LINE_RULE && childrenOf(match).some((child) => child.start === start)) return match
    for (const child of childrenOf(match)) {
      const found = BubblyLayout.lineMatchAt(child, start)
      if (found) return found
    }
    return undefined
  }

  /** Forget what was read from `start` to `end`:  its lines' statements, its overlays, underlines and tags. */
  private forget(start: number, end: number) {
    const isInside = (each: Stretch) => each.start >= start && each.end <= end
    for (let index = this.lineIndexOf(start); index <= this.lineIndexOf(end); index++) {
      this.statements.delete(index)
      this.partlyRead.delete(index)
    }
    const keep = <T extends Stretch>(list: T[]) =>
      list.splice(0, list.length, ...list.filter((each) => !isInside(each)))
    keep(this.overlays)
    keep(this.choices)
    keep(this.underlines)
    for (const tag of this.declaringTags) if (tag >= start && tag < end) this.declaringTags.delete(tag)
  }

  /** Where `line`'s comment starts, or its end:  `a card  -- play the card on click`. */
  private commentStart(line: SourceLine): number {
    const comment = this.spans.find(
      (span) => span.kind === "comment" && span.start >= line.start && span.start < line.end
    )
    return comment?.start ?? line.end
  }

  /** Each first word's shape (`shapeOf()`), for `parser`'s statements:  worked out once a parser. */
  private static shapesFor(parser: SP.SpellParser): Map<string, LineShape | undefined> {
    let shapes = BubblyLayout.shapes.get(parser)
    if (shapes) return shapes
    const byWord = new Map<string, P.Rule[]>()
    const flatten = (rule: P.Rule): P.Rule[] => (rule instanceof P.Group ? rule.rules.flatMap(flatten) : [rule])
    const statements = parser.rules[STATEMENT]
    for (const rule of statements ? flatten(statements) : [])
      for (const word of rule instanceof P.Sequence ? (rule.firstWords ?? []) : [])
        byWord.set(word, [...(byWord.get(word) ?? []), rule])
    shapes = new Map()
    for (const [word, rules] of byWord) {
      const control = rules.find((rule) => BubblyPresentation.for(rule)?.isControl)
      const bands = rules.map((rule) => BubblyRoles.of(rule).band)
      if (control && !bands.some(Boolean)) shapes.set(word, { rule: control.name ?? "", isControl: true })
      else if (!control && bands.every((band) => band && band === bands[0]))
        shapes.set(word, { rule: rules[0]!.name ?? "", band: bands[0]! })
    }
    BubblyLayout.shapes.set(parser, shapes)
    return shapes
  }

  /** The control rule each first word starts, for `parser`'s statements (`controlOf()`):  worked out once a parser. */
  private static controlsFor(parser: SP.SpellParser): Map<string, string> {
    let controls = BubblyLayout.controls.get(parser)
    if (controls) return controls
    controls = new Map()
    const flatten = (rule: P.Rule): P.Rule[] => (rule instanceof P.Group ? rule.rules.flatMap(flatten) : [rule])
    const statements = parser.rules[STATEMENT]
    for (const rule of statements ? flatten(statements) : [])
      if (rule instanceof P.Sequence && BubblyPresentation.for(rule)?.isControl)
        for (const word of rule.firstWords ?? []) if (!controls.has(word)) controls.set(word, rule.name ?? "")
    BubblyLayout.controls.set(parser, controls)
    return controls
  }

  /** `controlsFor()`'s, by parser. */
  private static readonly controls = new WeakMap<SP.SpellParser, Map<string, string>>()

  /** `shapesFor()`'s, by parser. */
  private static readonly shapes = new WeakMap<SP.SpellParser, Map<string, LineShape | undefined>>()

  /** Does `line` declare a group? */
  private isGroupLine(line: SourceLine): boolean {
    const statement = this.statements.get(line.index)
    return !!statement && !!BubblyPresentation.for(statement.rule)?.isGroup
  }

  /** Is `line` a drawing's markup, `<text color={its color}>`? */
  private isMarkup(line: SourceLine): boolean {
    return this.text[line.start] === "<" || this.linesInTags.has(line.index)
  }

  /**
   * Each line a start tag runs on to (`linesInTags`):  its attributes laid out a line each, under `<toolbar`,
   * read just as they'd be on the tag's own line (epic `language` I151).
   * - A tag runs on past its line's end while its `>` hasn't come;  a line starting with a tag, or a blank one,
   *   ends it, as the tokenizer reads it (I145).
   * - A quoted value ends on its line, as `paintMarkup()` reads it.
   */
  private findTagsOverLines() {
    const lines = this.text.split("\n")
    let inTag = false
    lines.forEach((raw, index) => {
      const words = raw.trim()
      if (inTag && (!words || words.startsWith("<"))) inTag = false
      else if (inTag) this.linesInTags.add(index)
      else if (!words.startsWith("<")) return
      for (let at = 0; at < raw.length; at++) {
        const char = raw[at]!
        if (!inTag) {
          if (char === "<" && /[a-z]/i.test(raw[at + 1] ?? "")) inTag = true
        } else if (char === ">") inTag = false
        else if (char === '"' && !WORD_CHARACTER.test(raw[at - 1] ?? "")) {
          const close = raw.indexOf('"', at + 1)
          at = close < 0 ? raw.length : close
        } else if (char === "{") {
          const close = raw.indexOf("}", at + 1)
          at = close < 0 ? raw.length : close
        }
      }
    })
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
    for (const choice of this.choices)
      if (choice.start >= start && choice.end <= end) this.paintChoice(choice.start, choice.end)
    const codes = this.isMarkup(line) ? this.paintMarkup(start, end, this.linesInTags.has(line.index)) : []
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
   * A head's declarations, over what its spans said:
   * - an action's, ONE pill (`paintTyped()`);  any other's, each part that's a `declaration` a pill
   */
  private paintHead(head: Head) {
    const { statement, roles } = head
    // a drawing's head, `to draw its placeholder`:  what it draws a name, no pill (epic `language` I99)
    if (this.paintDrawing(head)) return
    if (head.partOfSpeech === "action") this.paintTyped(head)
    else
      for (const part of this.partsWith(statement, roles, "declaration")) this.paintRange(part.start, part.end, "input")
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
   * - `inTag`:  the line is inside a start tag begun on a line above (`linesInTags`), so it starts among its
   *   attributes (epic `language` I151).
   */
  private paintMarkup(start: number, end: number, inTag = false): BubblyCode[] {
    const { text } = this
    const codes: BubblyCode[] = []
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

  /**
   * Paint an overlay:  only over Spell's own words, when it says so (`overWordsOnly`).
   * - A name never takes a mark, nor the space after one:
   *   its commas stay plain, `**draggable**, **clickable two sided view**` (epic `language` J214)
   */
  private paintOverlay({ start, end, kind, overWordsOnly }: Overlay) {
    let afterMark = false
    for (let at = start; at < end; at++) {
      const paint = this.paint[at]
      const isMark: boolean = paint === "mark" || (afterMark && /\s/.test(this.text[at]!))
      afterMark = isMark
      if (overWordsOnly && paint !== "words") continue
      if (kind === "reference" && isMark) continue
      this.paint[at] = kind
    }
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

/** What a line that didn't parse is, by its first word (`shapeOf()`):  a control line, or a declaration's head. */
type LineShape = { rule: string; isControl?: true; band?: BubblyPartOfSpeech }

/** Where `BubblyLayout.layout()` lays lines out. */
type LayoutPlace = { depth: number; level: number; inSteps?: boolean; inType?: boolean; inProperty?: boolean }

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

/** The rule a line no other rule could read matches. */
const PARSE_ERROR_RULE = "parse_error"

/** The rule that reopens a type declared elsewhere, `a card`. */
const REOPEN_TYPE_RULE = "reopen_type"

/** The rule that declares a property by a quoted name, `it "can go up" if ...`. */
const QUOTED_PROPERTY_RULE = "quoted_type_expression"

/** A quoted name after a line's first word:  ` "can go up" if ...`. */
const QUOTED_NAME_AFTER = /^\s+"[^"]+"/

/** A type's name, then a quoted name, after an article:  ` card "is on top" if ...`. */
const TYPE_THEN_QUOTED_NAME = /^\s+[\p{L}][\p{L}-]*\s+"[^"]+"/u

/** An article and a name, nothing else:  `a card`, `a two sided view`. */
const TYPE_NAME_ALONE = /^[\p{L}]+( +[\p{L}]+)+$/u

/** The rule of a property worked out, `"card" is a new card with ...`:  a quoted name first, in a type's body. */
const QUOTED_GETTER_RULE = "property_value_getter"

/** A quoted name first, then a word:  `"card" is a new card with ...`. */
const QUOTED_NAME_FIRST = /^"[^"]+"\s+[\p{L}]/u

/** The most words a stand-in type takes (`rereadWithStandInType()`):  `a two sided view`'s three. */
const MAX_TYPE_WORDS = 3

/** The most stand-in lists of what a line names a member is read again in (`rereadAsMember()`). */
const MAX_STAND_IN_ITEMS = 3

/** The stand-in type a member that didn't read alone is read again in (`rereadAsMember()`). */
const STAND_IN_TYPE = "StandInList"

/** The built-in types it's made of:  a list of things. */
const LIST_TYPE = "List"
const THING_TYPE = "Thing"

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

/** Is `token` a word, symbol, number or text:  one with words of its own, not a line or block around others? */
function isWordlike(token: P.Token): boolean {
  return (
    token instanceof P.WordToken ||
    token instanceof P.SymbolToken ||
    token instanceof P.NumberToken ||
    token instanceof P.TextToken
  )
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

/** Is `rule` a declaration's, drawn on a band? */
function isDeclaration(rule: P.Rule): boolean {
  return !!BubblyRoles.of(rule).band
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
