import type { PartEdit } from "spell/parser/core/core.types"
// Import directly:  the parser's barrel would bring the whole parser into the runner
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"

/****************
 * ### `LiveEdit`
 * What an edit changes in a running program, read from its compiled javascript,
 * and whether the program can take it as it runs (epic `editor`, Edit Without Redraw).
 * - `LiveEdit.between(before, after)`:  how the edit goes.
 *   - `same`:  nothing to do
 *   - `live`:  `text` is what to load, and `drawAgain` the types whose views draw again
 *   - `restart`:  it can't take this one, and `restartBecause` says why:  the app runs on, as it was
 * - What can be taken:  anything inside a type, and a type ADDED, with its top-level thing (epic `mockup` P4, J15):
 *   nothing running can be using a type that didn't exist, so it's loaded beside the rest, e.g. a site's new page.
 * - What can't:  a type removed or renamed, a property's type changing, a line at the program's top level
 *   (it would have to run again, on the running things).
 * - Reads the text a compile writes, so it's a line reader, as `startChanged()` is:
 *   - a top-level statement starts in the first column, and only a closing bracket continues one there
 *   - a member of a class starts two spaces in
 *   - `LiveEdit.test.ts` holds it to every built-in example's compiled code.
 * - A drawing's PARTS (a notebook's examples, `core.drawPart()`):
 *   when only some of them changed, `parts` says which, and only they draw again, not their type (epic `notebook` P4).
 *   - The changed part is found by its code, not its place.
 * - What changed only in where it's written (a line typed above it, in code the editor stamps):
 *   nothing draws, and `places` says where each drawn element is written now.
 * - Pure, and no parser:  it's part of the runner's bundle (`spell-runtime.js`).
 *   - Stamped places are read with `SourceMarks`, by its own file.
 ****************/
export class LiveEdit {
  /** How the edit goes -- see the class's docs. */
  readonly kind: LiveEditKind

  /** Why it needs a restart, for the console:  `kind === "restart"` only. */
  readonly restartBecause?: string

  /** The module to load:  the new program, with its top-level code left out and its things kept. */
  readonly text: string = ""

  /** The types whose views draw again, or `everything`. */
  readonly drawAgain: readonly string[] | "everything" = []

  /** The parts of drawings that changed, each drawn again alone (`core.drawPart()`), not its whole type. */
  readonly parts: readonly PartEdit[] = []

  /** Where each drawn element is written now, by where it was:  `Card.spellml:12:4`. */
  readonly places: ReadonlyMap<string, string> = new Map()

  private constructor(props: Partial<LiveEdit> & { kind: LiveEditKind }) {
    Object.assign(this, props)
    this.kind = props.kind
  }

  /**
   * How the edit from `before` to `after` goes.
   * - `not-live`:  a program this can't read for sure, e.g. one with a class it doesn't export:  today's run instead.
   */
  static between(before: ProgramText, after: ProgramText): LiveEdit {
    if (before.compiled === after.compiled && before.stamped === after.stamped) return new LiveEdit({ kind: "same" })
    const [was, now] = [Program.read(before.compiled), Program.read(after.compiled)]
    if (!was.canBeSwapped || !now.canBeSwapped) return new LiveEdit({ kind: "not-live" })
    const restartBecause = was.whyRestartFor(now)
    if (restartBecause) return new LiveEdit({ kind: "restart", restartBecause })
    const [wasStamped, nowStamped] = [Program.read(before.stamped), Program.read(after.stamped)]
    return new LiveEdit({ kind: "live", text: nowStamped.liveText(), ...wasStamped.drawingAfter(nowStamped) })
  }
}

/** A program's text:  as it compiled, and as it runs, with what's drawn saying where it's written. */
export type ProgramText = {
  /** The compiled javascript. */
  compiled: string
  /** The same, as `SourceMarks.stamped()` left it;  the same as `compiled` when nothing's stamped. */
  stamped: string
}

/** How an edit goes -- see `LiveEdit`. */
export type LiveEditKind = "same" | "live" | "restart" | "not-live"

/** What a top-level statement of a compiled program is. */
type ChunkKind =
  /** the imports, and everything that only says what the classes are:  run again as it's written */
  | "keep"
  /** a comment, or nothing:  it changes nothing */
  | "comment"
  | "class"
  | "function"
  /** `export const stock = new Pile()`, what the module's variable holds is the running program's */
  | "variable"
  /** a line of the program's start:  skipped */
  | "start"
  /** anything else at the top level:  it'd run again on the running things, so it's left out */
  | "code"

/** One top-level statement of a compiled program, with its lines. */
type Chunk = { kind: ChunkKind; at: number; lines: string[]; name?: string; parent?: string }

/** A compiled program, as its top-level statements. */
class Program {
  private constructor(
    private readonly lines: string[],
    readonly chunks: Chunk[]
  ) {}

  /** Read `code`'s top-level statements.  Pure. */
  static read(code: string): Program {
    const lines = code.split("\n")
    const chunks: Chunk[] = []
    let current: Chunk | undefined
    let isInTemplate = false
    lines.forEach((line, at) => {
      const startsOne = !isInTemplate && line.length > 0 && !CONTINUES_A_STATEMENT.test(line)
      if (startsOne) {
        current = { at, lines: [line], ...Program.kindOf(line) }
        chunks.push(current)
      } else current?.lines.push(line)
      if (((line.replace(/\\./g, "").match(/`/g)?.length ?? 0) & 1) === 1) isInTemplate = !isInTemplate
    })
    return new Program(lines, chunks)
  }

  /** What a statement starting with `line` is. */
  private static kindOf(line: string): Omit<Chunk, "at" | "lines"> {
    const declared = VARIABLE.exec(line)
    if (declared) return { kind: declared[1] ? "variable" : "keep", name: declared[2]! }
    const declaredClass = CLASS_LINE.exec(line)
    if (declaredClass) return { kind: "class", name: declaredClass[1]!, parent: declaredClass[2] }
    const declaredFunction = FUNCTION_LINE.exec(line)
    if (declaredFunction) return { kind: "function", name: declaredFunction[1]! }
    if (COMMENT_LINE.test(line)) return { kind: "comment" }
    if (line.startsWith(START_LINE)) return { kind: "start" }
    return { kind: KEPT_STATEMENT.test(line) ? "keep" : "code" }
  }

  /** Does it export every class it has?  Else the old and the new can't be matched up. */
  get canBeSwapped(): boolean {
    return !this.classes.some((chunk) => !chunk.lines[0]!.startsWith("export "))
  }

  private get classes(): Chunk[] {
    return this.chunks.filter((chunk) => chunk.kind === "class")
  }

  /**
   * The chunks of `kind`, as one text.
   * - Each without the blank lines it ends with:  they're where the next statement starts, which an added type moves.
   */
  private textOf(...kinds: ChunkKind[]): string {
    return this.chunks
      .filter((chunk) => kinds.includes(chunk.kind))
      .map(textOfChunk)
      .join("\n")
  }

  /** Why the running `this` can't become `now` as it runs:  `undefined` if it can. */
  whyRestartFor(now: Program): string | undefined {
    const wasTypes = new Map(this.classes.map((chunk) => [chunk.name!, chunk]))
    const nowTypes = new Map(now.classes.map((chunk) => [chunk.name!, chunk]))
    // a type added is taken:  nothing running can be one of it yet (epic `mockup` J15, A)
    for (const name of wasTypes.keys()) if (!nowTypes.has(name)) return `type ${name} is gone`
    for (const [name, chunk] of nowTypes) {
      const was = wasTypes.get(name)
      if (!was) continue
      if (was.parent !== chunk.parent) return `type ${name} is now a kind of ${chunk.parent ?? "nothing"}`
      const changed = Program.changedPropertyType(was, chunk)
      if (changed) return `${name}'s ${changed} changed its type`
    }
    const nowVariables = new Map(now.chunks.filter(isVariable).map((chunk) => [chunk.name!, textOfChunk(chunk)]))
    const wasVariables = new Map(this.chunks.filter(isVariable).map((chunk) => [chunk.name!, textOfChunk(chunk)]))
    for (const [name, text] of nowVariables) {
      // a variable added is made as it loads (`core.keptTopLevel()`):  e.g. a new page's own thing
      if (wasVariables.has(name) && wasVariables.get(name) !== text) return `the program's ${name} changed`
    }
    for (const name of wasVariables.keys()) if (!nowVariables.has(name)) return `the program's ${name} is gone`
    if (this.textOf("code", "start") !== now.textOf("code", "start")) return "a line at the program's top level changed"
    return undefined
  }

  /** The first property whose type differs between class `was` and `now`, if any. */
  private static changedPropertyType(was: Chunk, now: Chunk): string | undefined {
    const typesOf = (chunk: Chunk) =>
      new Map(
        [...chunk.lines.join("\n").matchAll(DECLARED_PROPERTY)].map(([, name, info]) => [name!, typeWordsOf(info!)])
      )
    const before = typesOf(was)
    for (const [name, type] of typesOf(now)) {
      if (before.has(name) && before.get(name) !== type) return name
    }
    return undefined
  }

  /**
   * The module to load for the running program to become this one.
   * - Same number of lines:  its source map still fits.
   * - Each exported variable is the running one's, through `core.keptTopLevel()`.
   * - The rest of the top level is left out:  it ran when the program started.
   */
  liveText(): string {
    const out = [...this.lines]
    for (const chunk of this.chunks) {
      if (chunk.kind === "code" || chunk.kind === "start") {
        chunk.lines.forEach((_line, index) => (out[chunk.at + index] = ""))
      } else if (chunk.kind === "variable") {
        const start = VARIABLE.exec(chunk.lines[0]!)![0]
        // its last line that isn't blank:  the blank ones after it are the file's, not the statement's
        let last = chunk.at + chunk.lines.length - 1
        while (last > chunk.at && !this.lines[last]!.trim()) last--
        out[chunk.at] =
          `${start}core.keptTopLevel(${JSON.stringify(chunk.name)}, () => (${chunk.lines[0]!.slice(start.length)}`
        out[last] = `${out[last]}))`
      }
    }
    return out.join("\n")
  }

  /**
   * What draws again, going from `this` to `now`:  the types whose views draw again, the parts, the places.
   * - A drawing that changed:  its type and the types under it.
   *   - Unless only its parts changed (`core.drawPart()`), in a type nothing's built on:  those parts alone.
   * - Anything else in a type that changed:  each type whose drawing names it, and its own if it's a getter:
   *   a live value reads it, and nothing tells it that it changed.
   * - A top-level function that changed:  everything, as any drawing may call it.
   * - A plain method no drawing names:  nothing draws.  It's used the next time it runs.
   * - Anything that changed only in where it's written:  nothing draws;  its drawn elements' new places.
   * - A drawing where one piece moved, the rest only where it's written:
   *   it draws again, its elements' new places said too (`movedApart()`).
   * - A static that changed (a site's `static pages`):  its type, as what draws it may read it.
   * - A type added:  nothing draws it yet, so nothing of it.
   */
  drawingAfter(now: Program): Pick<LiveEdit, "drawAgain" | "parts" | "places"> {
    const places = new Map<string, string>()
    const textsOf = (program: Program, kind: ChunkKind) =>
      new Map(
        program.chunks.filter((chunk) => chunk.kind === kind).map((chunk) => [chunk.name!, chunk.lines.join("\n")])
      )
    const functionsBefore = textsOf(this, "function")
    for (const [name, text] of textsOf(now, "function")) {
      const before = functionsBefore.get(name)
      if (before !== undefined && movedOnly(before, text, places)) continue
      if (before !== text) return { drawAgain: "everything", parts: [], places }
    }
    const wasClasses = new Map(this.classes.map((chunk) => [chunk.name!, chunk]))
    const types = new Set<string>()
    const parts: PartEdit[] = []
    const members = new Map(now.classes.map((chunk) => [chunk.name!, membersOf(chunk)]))
    const hasTypesUnder = new Set(now.classes.map((chunk) => chunk.parent))
    for (const chunk of now.classes) {
      const wasClass = wasClasses.get(chunk.name!)
      if (!wasClass) continue
      const before = membersOf(wasClass)
      for (const [key, member] of members.get(chunk.name!)!) {
        const was = before.get(key)
        if (was?.text === member.text) continue
        // a drawing made of parts first:  each part that only moved is found again by its new code
        if (member.isDrawing && was && !hasTypesUnder.has(chunk.name!)) {
          const edits = partsChanged(chunk.name!, was, member, places)
          if (edits) {
            parts.push(...edits)
            continue
          }
        }
        if (was && movedOnly(was.text, member.text, places)) continue
        // a drawing whose pieces only moved round (a part dragged, epic `notebook` P5):  it draws again whole, and
        // what it drew keeps its place, so a notebook's code editors follow their examples
        if (member.isDrawing && was) movedApart(was.text, member.text, places)
        if (member.isDrawing || member.isGetter || member.isStatic) types.add(chunk.name!)
        if (member.isDrawing || !member.name) continue
        const names = new RegExp(`\\b${member.name}\\b`)
        for (const [type, others] of members) {
          if ([...others.values()].some((other) => other.isDrawing && names.test(other.text))) types.add(type)
        }
      }
    }
    // the types under each, down the chain
    for (let grew = true; grew;) {
      grew = false
      for (const chunk of now.classes) {
        if (chunk.parent && types.has(chunk.parent) && !types.has(chunk.name!)) {
          types.add(chunk.name!)
          grew = true
        }
      }
    }
    return { drawAgain: [...types], parts, places }
  }
}

/**
 * Do `was` and `now` differ only in where what's drawn is written?  Then `places` gets each one's new place.
 * - SIDE EFFECT:  adds to `places`.
 */
function movedOnly(was: string, now: string, places: Map<string, string>): boolean {
  if (SourceMarks.withoutPlaces(was) !== SourceMarks.withoutPlaces(now)) return false
  const [before, after] = [SourceMarks.placesIn(was), SourceMarks.placesIn(now)]
  before.forEach((at, index) => {
    if (at !== after[index]) places.set(at, after[index]!)
  })
  return true
}

/**
 * The parts of drawing `was` that changed in `now`, type `type`'s (epic `notebook` P4):
 * `undefined` when anything else in it changed, or it takes arguments, so the drawing draws again whole.
 * - Each part is its code, `() => h(...)`, as `core.drawPart()` finds it again (`Function.toString()`).
 * - A part that changed only in where it's written keeps what it drew (`drawsAgain: false`):  `places` says where.
 * - SIDE EFFECT:  adds to `places`.
 */
function partsChanged(type: string, was: Member, now: Member, places: Map<string, string>): PartEdit[] | undefined {
  const member = now.name
  if (!member || !new RegExp(`^ {2}${member}\\(\\) \\{`).test(now.text)) return undefined
  const [before, after] = [partsOf(was.text), partsOf(now.text)]
  if (!before.parts.length || before.parts.length !== after.parts.length) return undefined
  if (!movedOnly(before.outside, after.outside, places)) return undefined
  const edits: PartEdit[] = []
  before.parts.forEach((code, index) => {
    const next = after.parts[index]!
    if (code === next) return
    const drawsAgain = !movedOnly(code, next, places)
    edits.push({ type, member, was: code, now: next, drawsAgain })
  })
  return edits
}

/**
 * Does drawing `now` differ from `was` only in where ONE of its pieces is (a part dragged elsewhere in it), and in
 * where each piece is written?  Then `places` gets each drawn element's new place (epic `notebook` P5).
 * - A piece:  an item of an array it returns, or a child of an `h()` call, however deep, `core.drawPart()`'s too.
 * - Each piece of `was` is tried out of its place, against each piece of `now` written the same:
 *   what's left must be the same, all but where it's written.
 * - `false` for anything else (two pieces moved, a word changed):  it draws again with no places said.
 * - SIDE EFFECT:  adds to `places`.
 */
function movedApart(was: string, now: string, places: Map<string, string>): boolean {
  const [before, after] = [returnedPieceOf(was), returnedPieceOf(now)]
  if (!before || !after) return false
  const nowPieces = piecesIn(after).slice(1)
  for (const moving of piecesIn(before).slice(1)) {
    const code = SourceMarks.withoutPlaces(was.slice(moving.start, moving.end))
    for (const landed of nowPieces) {
      if (SourceMarks.withoutPlaces(now.slice(landed.start, landed.end)) !== code) continue
      const rest = [written(was, before, moving), written(now, after, landed)]
      if (SourceMarks.withoutPlaces(rest[0]) !== SourceMarks.withoutPlaces(rest[1])) continue
      for (const [one, other] of [rest, [was.slice(moving.start, moving.end), now.slice(landed.start, landed.end)]]) {
        const [from, to] = [SourceMarks.placesIn(one!), SourceMarks.placesIn(other!)]
        from.forEach((at, index) => {
          if (at !== to[index]) places.set(at, to[index]!)
        })
      }
      return true
    }
  }
  return false
}

/** One piece of a drawing's code:  where it is, and the pieces it holds, in order. */
type Piece = { start: number; end: number; children: Piece[] }

/** The piece drawing member `text` returns, `return [...]` or `return h(...)`:  `undefined` for any other shape. */
function returnedPieceOf(text: string): Piece | undefined {
  const at = /^ {2}[\p{L}\p{N}_$]+\(\) \{\n\s*return /u.exec(text)
  if (!at) return undefined
  const start = at[0].length
  const end = text[start] === "[" ? closingParenthesis(text, start) + 1 : expressionEnd(text, start)
  return end > start ? pieceAt(text, start, end) : undefined
}

/** The piece of `text` from `start` to `end`:  an array's items, an `h()` call's children, else none. */
function pieceAt(text: string, start: number, end: number): Piece {
  const code = text.slice(start, end)
  let items: Array<{ start: number; end: number }> = []
  if (code.startsWith("[")) items = itemsIn(text, start + 1, end - 1)
  else if (code.startsWith("h(") && closingParenthesis(text, start + 1) === end - 1) {
    const args = itemsIn(text, start + 2, end - 1)
    // its tag, then its props if it has them:  the rest are its children
    items = args.slice(text[args[1]?.start ?? -1] === "{" ? 2 : 1)
  }
  return { start, end, children: items.map((item) => pieceAt(text, item.start, item.end)) }
}

/** Every piece in `piece`, itself first, then each one it holds, depth first. */
function piecesIn(piece: Piece): Piece[] {
  return [piece, ...piece.children.flatMap(piecesIn)]
}

/** `text`'s code for `piece`, with `left` left out:  its pieces, each written as it is, the gaps between them not. */
function written(text: string, piece: Piece, left: Piece): string {
  if (!piece.children.length) return text.slice(piece.start, piece.end)
  const head = text.slice(piece.start, piece.children[0]!.start)
  const tail = text.slice(piece.children.at(-1)!.end, piece.end)
  const children = piece.children.filter((child) => child !== left).map((child) => written(text, child, left))
  return `${head}${children.join(PIECE_GAP)}${tail}`
}

/** What stands between two pieces in `written()`:  never in code. */
const PIECE_GAP = "\u0000"

/** The items between `start` and `end` of `text`, split at its top-level commas, each trimmed. */
function itemsIn(text: string, start: number, end: number): Array<{ start: number; end: number }> {
  const items: Array<{ start: number; end: number }> = []
  let from = start
  const push = (to: number) => {
    const item = text.slice(from, to)
    const lead = item.length - item.trimStart().length
    if (item.trim()) items.push({ start: from + lead, end: from + item.trimEnd().length })
  }
  for (let at = start; at < end; at++) {
    const char = text[at]!
    if (char === '"' || char === "'") at = endOfQuote(text, at, char)
    else if (char === "`") at = endOfQuote(text, at, char)
    else if (char === "(" || char === "[" || char === "{") at = closingParenthesis(text, at)
    else if (char === ",") {
      push(at)
      from = at + 1
    }
    if (at < 0) return []
  }
  push(end)
  return items
}

/** Where the expression starting at `start` of `text` ends:  its line's end, past any brackets it opens. */
function expressionEnd(text: string, start: number): number {
  for (let at = start; at < text.length; at++) {
    const char = text[at]!
    if (char === '"' || char === "'" || char === "`") at = endOfQuote(text, at, char)
    else if (char === "(" || char === "[" || char === "{") at = closingParenthesis(text, at)
    else if (char === "\n") return at
    if (at < 0) return -1
  }
  return text.length
}

/**
 * Drawing `text`'s outermost parts, each its code (`() => h(...)`), and the rest with each part left out.
 * - A part inside another is the other's:  it draws only as that one draws.
 */
function partsOf(text: string): { parts: string[]; outside: string } {
  const parts: string[] = []
  let outside = ""
  let from = 0
  for (let at = text.indexOf(DRAW_PART, from); at >= 0; at = text.indexOf(DRAW_PART, from)) {
    const start = at + DRAW_PART.length
    const end = closingParenthesis(text, at + DRAW_PART.indexOf("("))
    if (end < 0) break
    parts.push(text.slice(start, end).trimEnd())
    outside += `${text.slice(from, start)}…`
    from = end
  }
  return { parts, outside: outside + text.slice(from) }
}

/**
 * Where the parenthesis opened at `open` in `text` closes:  `-1` if it doesn't.
 * - Skips what's in quotes, backquotes (with what's in their `${}`) and comments.
 */
function closingParenthesis(text: string, open: number): number {
  const closers: string[] = []
  for (let at = open; at < text.length; at++) {
    const char = text[at]!
    if (char === '"' || char === "'") at = endOfQuote(text, at, char)
    else if (char === "`") {
      // a template:  its text, then each `${` opens a bracket closed by its `}`
      for (at++; at < text.length && text[at] !== "`"; at++) {
        if (text[at] === "\\") at++
        else if (text[at] === "$" && text[at + 1] === "{") {
          const close = closingParenthesis(text, at + 1)
          if (close < 0) return -1
          at = close
        }
      }
    } else if (char === "/" && text[at + 1] === "/")
      at = text.indexOf("\n", at) < 0 ? text.length : text.indexOf("\n", at)
    else if (char === "/" && text[at + 1] === "*") at = text.indexOf("*/", at + 2) + 1 || text.length
    else if (char === "(" || char === "[" || char === "{") closers.push(CLOSER[char]!)
    else if (char === ")" || char === "]" || char === "}") {
      if (closers.pop() !== char) return -1
      if (!closers.length) return at
    }
  }
  return -1
}

/** The end of the quote opened at `open` by `quote`, its last character. */
function endOfQuote(text: string, open: number, quote: string): number {
  for (let at = open + 1; at < text.length; at++) {
    if (text[at] === "\\") at++
    else if (text[at] === quote) return at
  }
  return text.length
}

/** What closes each bracket. */
const CLOSER: Record<string, string> = { "(": ")", "[": "]", "{": "}" }

/** A part of a drawing, as compiled javascript draws it:  `core.drawPart(this, () => h(...))`. */
const DRAW_PART = "core.drawPart(this, "

/** One member of a compiled class. */
type Member = { name?: string; text: string; isDrawing: boolean; isGetter: boolean; isStatic: boolean }

/**
 * The members of class `chunk`, each by what it is:  `get value`, `set value`, `draw`.
 * - Comments don't count.
 * - A static block by its first line:  `static { this.declareProp("rank", ... }`.
 */
function membersOf(chunk: Chunk): Map<string, Member> {
  const members = new Map<string, Member>()
  let current: { key: string; member: Member } | undefined
  for (const line of chunk.lines.slice(1)) {
    if (MEMBER_COMMENT.test(line)) continue
    if (MEMBER_START.test(line)) {
      const method = MEMBER_NAME.exec(line)
      const isAccessor = method?.[1]
      const name = method?.[2]
      const key = name ? `${isAccessor ? `${isAccessor} ` : ""}${name}` : line.trim()
      current = {
        key,
        member: {
          name,
          text: line,
          isDrawing: !!name && !isAccessor && /^draw/.test(name),
          isGetter: isAccessor === "get",
          isStatic: STATIC_FIELD.test(line)
        }
      }
      members.set(key, current.member)
    } else if (current) current.member.text += `\n${line}`
  }
  return members
}

/** `chunk`'s text, without the blank lines it ends with. */
function textOfChunk(chunk: Chunk): string {
  return chunk.lines.join("\n").trimEnd()
}

/** Is `chunk` an exported variable? */
function isVariable(chunk: Chunk): boolean {
  return chunk.kind === "variable"
}

/** What says a property's type, in what's declared of it:  its `type:` and its `oneOf:`. */
function typeWordsOf(info: string): string {
  return [...info.matchAll(/\b(type|oneOf):\s*("[^"]*"|\[[^\]]*\]|[\w.]+)/g)].map(([whole]) => whole).join(" ")
}

/** A line that doesn't start a top-level statement:  blank, indented, or a closing bracket. */
const CONTINUES_A_STATEMENT = /^(?:\s|[}\])])/

/** `export const stock = `, or one with no `export`, which stays as it's written. */
const VARIABLE = /^(export\s+)?(?:const|let|var)\s+([\p{L}\p{N}_$]+)\s*=\s*/u

/** `export class Card extends TwoSidedView {`:  its name, and what it extends. */
const CLASS_LINE = /^(?:export\s+)?class\s+([\p{L}\p{N}_$]+)(?:\s+extends\s+([\p{L}\p{N}_$.]+))?/u

/** `export function testCard()`:  its name. */
const FUNCTION_LINE = /^(?:export\s+)?(?:async\s+)?function\*?\s+([\p{L}\p{N}_$]+)/u

/** A comment at the top level. */
const COMMENT_LINE = /^(?:\/\/|\/\*)/

/** A line of the program's start, as compiled -- see `startChanged()`. */
const START_LINE = "if (!core.isCarryingOver) "

/**
 * What says what the program's classes are, and is run again as written:
 * its imports, a section's heading, a class's own statement (`Card.declareProp(...)`), a stylesheet, an action's menu.
 */
const KEPT_STATEMENT =
  /^(?:import\s|export\s*\{|core\.(?:heading|describeAction|describeMenu|installStyles|useElement)\(|\p{Lu}[\p{L}\p{N}_$]*[.(]|Object\.defineProperty\(\p{Lu})/u

/** A property declared in a class:  its name, and what's said of it. */
const DECLARED_PROPERTY = /declareProp\("([^"]+)",\s*(\{.*?\})\s*\)/g

/** A comment among a class's members. */
const MEMBER_COMMENT = /^\s*(?:\/\/|\/\*|\*)/

/** A line two spaces in that isn't a closing bracket:  a member starts. */
const MEMBER_START = /^ {2}[^\s})\]]/

/** A static field's first line, not a method or a static block:  `  static pages = [`. */
const STATIC_FIELD = /^ {2}static\s+[\p{L}\p{N}_$]+\s*=/u

/** A method or accessor's first line:  `get ` or `set `, and its name. */
const MEMBER_NAME = /^ {2}(?:static\s+)?(?:async\s+)?\*?(?:(get|set)\s+)?([\p{L}\p{N}_$]+)\s*\(/u
