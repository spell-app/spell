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
  BubblyRulePresentation
} from "./highlight.types"

/****************
 * ### `BubblyLayout`
 * Some Spell laid out in the BUBBLY LOOK, as data:  which lines are declarations (a head on a band, a body under it),
 * which are control lines (a light grey block holding their steps), and what each stretch of a line is to a reader
 * (what a person typed, a reference, a value ...).
 * - `BubblyLayout.of(text, parser)`:  a `BubblyDrawing`, offsets into `text`.
 * - From the parser's own reading of the code, alone, or as part of its project (`within`):
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
   * - `within`:  the project file it's the text of, so it reads as part of its project
   *   (`for rank in card ranks`, `card ranks` declared in another file);  alone, it couldn't parse.
   *   - Read in a scope of its own under the project's (`layoutScopeFor()`):  laying it out never changes the project.
   *   - A file not parsed yet in its project reads alone.
   */
  static of(text: string, parser: SP.SpellParser = SP.spellParser, { within }: BubblyLayoutOptions = {}): BubblyDrawing {
    return new BubblyLayout(text, parser, within && layoutScopeFor(within)).drawing
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

  /** Stretches every line takes from the parse, whatever it is:  phrases, quantities, `the color`, `item`;  `order` low first. */
  private readonly overlays: Overlay[] = []

  /** The names each enclosing declaration has introduced:  a name's first mention is bold, a later use semibold. */
  private readonly scopes: Array<Set<string>> = [new Set()]

  /** Words that point back (`it`, `its`):  drawn plain. */
  private readonly pronouns: Set<string>

  private constructor(
    private readonly text: string,
    parser: SP.SpellParser,
    scope?: P.Scope
  ) {
    this.pronouns = (parser.language ?? SP.Language.default).words.pronouns
    this.paint = Array.from({ length: text.length })
    this.spans = SP.SpellHighlighter.spans(text, parser)
    let at = 0
    for (const line of text.split("\n")) {
      this.lineStarts.push(at)
      at += line.length + 1
    }
    this.readParse(parser, scope)
    this.drawing = { text, nodes: this.layout(this.treeOf(), { depth: 0, level: 0 }) }
  }

  ////////////////
  // ## The parse
  ////////////////

  /**
   * Each line's statement, and the overlays every line takes;  a parse that throws leaves both empty.
   * - With `scope` (a project file's, `within`), read twice, alone and as part of its project, line by line the
   *   project's reading unless it couldn't parse the line:  its own declarations read only alone, as the project
   *   holds them already (`a "deck"` would be a second deck), and what names another file's things only within it.
   */
  private readParse(parser: SP.SpellParser, scope?: P.Scope) {
    const alone = this.reading(() => parser.parse(this.text, "block"))
    const within = scope && this.reading(() => scope.parser!.parse(this.text, "block", scope))
    const lines = new Set([...alone.statements.keys(), ...(within?.statements.keys() ?? [])])
    for (const index of lines) {
      const projects = within?.statements.get(index)
      const reading = projects && projects.rule.name !== PARSE_ERROR_RULE ? within! : alone
      const statement = reading.statements.get(index)
      if (statement) this.statements.set(index, statement)
      for (const overlay of reading.overlays) if (this.lineIndexOf(overlay.start) === index) this.overlays.push(overlay)
    }
    this.overlays.sort((a, b) => a.order - b.order)
  }

  /** What one parse says:  each line's statement, and the overlays its rules ask for. */
  private reading(parse: () => P.Match | undefined): { statements: Map<number, P.Match>; overlays: Overlay[] } {
    const statements = new Map<number, P.Match>()
    const overlays: Overlay[] = []
    let match: P.Match | undefined
    try {
      match = parse()
    } catch {
      // the spans stand alone
    }
    if (!match) return { statements, overlays }
    const seen = new Set<P.Match>()
    const walk = (each: P.Match) => {
      if (seen.has(each)) return
      seen.add(each)
      if (each.rule.name === LINE_RULE) {
        // a comment after the statement comes first in the line's match:  skip it
        const statement = childrenOf(each).find((child) => child.rule.name !== COMMENT_RULE)
        if (statement?.start !== undefined) {
          const index = this.lineIndexOf(statement.start)
          if (!statements.has(index)) statements.set(index, statement)
        }
      }
      overlays.push(...this.overlaysOf(each))
      for (const child of childrenOf(each)) walk(child)
    }
    walk(match)
    return { statements, overlays }
  }

  /** The overlays `match`'s row asks for, if it has one. */
  private overlaysOf(match: P.Match): Overlay[] {
    const row = BubblyPresentation.for(match.rule)
    if (!row || match.start === undefined || match.end === undefined) return []
    const overlays: Overlay[] = []
    const { start, end } = match
    if (row.takesArticle) {
      const reference = this.spans.find(
        (span) => span.start >= start && span.end <= end && REFERENCE_KINDS.has(span.kind)
      )
      if (reference && this.isSpellsOwnWords(start, reference.start))
        overlays.push({ start, end: reference.end, kind: "reference", order: 0 })
    }
    if (row.isValue) overlays.push({ start, end, kind: "value", order: 1 })
    if (row.isQuantity) {
      const number = this.spans.find((span) => span.start >= start && span.end <= end && span.kind === NUMBER)
      if (number) overlays.push({ start: number.start, end, kind: "quantity", order: 2 })
    }
    if (row.isPhrase) overlays.push({ start, end, kind: "phrase", order: 3 })
    for (const plain of descendantsNamed(match, row.plain))
      overlays.push({ start: plain.start!, end: plain.end!, kind: "words", order: 4 })
    return overlays
  }

  /** Is `text` from `start` to `end` only Spell's own words (keywords) and spaces? */
  private isSpellsOwnWords(start: number, end: number): boolean {
    for (let at = start; at < end; at++) {
      if (/\s/.test(this.text[at]!)) continue
      const span = this.spans.find((each) => each.start <= at && each.end > at)
      if (span?.kind !== KEYWORD) return false
    }
    return true
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
      const line = lines[index]!
      if (line.isBlank) {
        nodes.push({ kind: "gap", start: line.start })
        continue
      }
      const statement = this.isMarkup(line) ? undefined : this.statements.get(line.index)
      const row = statement && BubblyPresentation.for(statement.rule)
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

  /** A declaration:  its head, then what's under it, in a scope of its own. */
  private block(
    line: SourceLine,
    statement: P.Match,
    row: BubblyRulePresentation,
    under: SourceLine[],
    level: number
  ): BubblyBlock {
    this.scopes.push(new Set())
    try {
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
    } finally {
      this.scopes.pop()
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
    for (const overlay of this.overlays)
      if (overlay.start >= start && overlay.end <= end) this.paintRange(overlay.start, overlay.end, overlay.kind)
    if (head) this.paintHead(head)
    if (this.isMarkup(line)) this.paintMarkup(start, end)
    return { kind: "line", start, end, depth, pieces: this.piecesOf(start, end, head) }
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
  private kindOfSpan(kind: string, word: string, { inHead, head }: { inHead: boolean; head?: Head }): Paint {
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
        return inHead ? "input" : "constant"
      case "variable":
      case "params":
      case "property":
      case "type":
      case "title.function":
        if (this.pronouns.has(word.toLowerCase())) return "words"
        if (word.startsWith('"')) return inHead ? "input" : "value"
        // an action's parameters:  what its head introduces (`to play a card`)
        if (inHead && head?.partOfSpeech === "action" && (kind === "type" || kind === "params")) return "first-mention"
        return kind === "variable" || kind === "params" ? "variable" : "reference"
      default:
        return "words"
    }
  }

  /** A head's inputs and choices, over what its spans said. */
  private paintHead(head: Head) {
    const { statement, row } = head
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
    const end = Math.max(...[...inputs, ...params].map((each) => each.end!), 0)
    let from = statement.start! + lead[0].length
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

  /** Paint `start` to `end` as `paint`. */
  private paintRange(start: number, end: number, paint: Paint) {
    for (let at = start; at < end; at++) this.paint[at] = paint
  }

  /**
   * The painted stretch from `start` to `end`, cut into pieces:
   * - words of one name join, a space between (`two sided view`, `card setup`)
   * - a variable becomes a name's first mention, or a later use
   */
  private piecesOf(start: number, end: number, head: Head | undefined): BubblyPiece[] {
    const runs: Array<{ start: number; end: number; paint: Paint }> = []
    for (let at = start; at < end; at++) {
      const paint = this.paint[at] ?? "words"
      const last = runs.at(-1)
      if (last && last.paint === paint) last.end = at + 1
      else runs.push({ start: at, end: at + 1, paint })
    }
    // a single space between two stretches of one name:  one stretch
    for (let index = runs.length - 2; index > 0; index--) {
      const [before, gap, after] = [runs[index - 1]!, runs[index]!, runs[index + 1]!]
      if (
        JOINED.has(before.paint) &&
        before.paint === after.paint &&
        gap.paint === "words" &&
        this.text.slice(gap.start, gap.end) === " "
      ) {
        before.end = after.end
        runs.splice(index, 2)
      }
    }
    return runs.map(({ start: from, end: to, paint }) => ({
      start: from,
      end: to,
      kind: paint === "variable" ? this.mentionOf(this.text.slice(from, to), !!head) : paint
    }))
  }

  /** A variable's name:  its first mention in its scope, or a use. */
  private mentionOf(name: string, isHead: boolean): BubblyPieceKind {
    const key = name.toLowerCase()
    if (isHead || this.scopes.some((scope) => scope.has(key))) return "reference"
    this.scopes.at(-1)!.add(key)
    return "first-mention"
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

/**
 * A scope to read `file`'s text in, as part of its project, that the layout's parse can't change:
 * under the project's scope, so the project's types, constants and phrases are found there,
 * but its own (and the phrases it registers, on a clone of the file's parser) kept to itself.
 * - `undefined` when `file` hasn't been parsed in a project yet.
 */
function layoutScopeFor(file: SP.SpellFile): P.Scope | undefined {
  const fileScope = file.scope
  const projectScope = fileScope?.parentScope
  const parser = fileScope?.parser as SP.SpellParser | undefined
  if (!projectScope?.types || !parser) return undefined
  return new P.ProjectScope({
    name: file.file,
    path: file.path,
    parser: parser.clone({ module: file.path } as P.ParserProps),
    parentScope: projectScope
  })
}

/** A piece's kind, or a variable not yet told first mention from use. */
type Paint = BubblyPieceKind | "variable"

/** A stretch the parse paints over the spans, `order` low first. */
type Overlay = { start: number; end: number; kind: BubblyPieceKind; order: number }

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

/** The rule of a line that didn't parse. */
const PARSE_ERROR_RULE = "parse_error"

/** The rule of a comment at a line's end. */
const COMMENT_RULE = "comment"

/** The rule of a statement's body:  never walked into for a head's inputs. */
const BLOCK_RULE = "block"

/** Span kinds that name something:  bold. */
const REFERENCE_KINDS = new Set(["variable", "params", "property", "type", "title.function"])

/** A keyword span. */
const KEYWORD = "keyword"

/** A number span. */
const NUMBER = "number"

/** Operators drawn faint. */
const MARKS = new Set([",", ":"])

/** Kinds whose words, a space apart, are one name. */
const JOINED = new Set<Paint>(["reference", "input", "first-mention", "variable"])

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
