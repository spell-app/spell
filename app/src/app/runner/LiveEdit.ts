/****************
 * ### `LiveEdit`
 * What an edit changes in a running program, read from its compiled javascript, and whether the program can take it
 * as it runs (epic `editor`, Edit Without Redraw).
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
 * - Pure, and no parser:  it's part of the runner's bundle (`spell-runtime.js`).
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
    return new LiveEdit({
      kind: "live",
      text: nowStamped.liveText(),
      drawAgain: wasStamped.typesToDrawAfter(nowStamped)
    })
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
   * The types whose views draw again, going from `this` to `now`.
   * - A drawing that changed:  its type and the types under it.
   * - Anything else in a type that changed:  each type whose drawing names it, and its own if it's a getter:
   *   a live value reads it, and nothing tells it that it changed.
   * - A top-level function that changed:  everything, as any drawing may call it.
   * - A plain method no drawing names:  nothing draws.  It's used the next time it runs.
   * - A static that changed (a site's `static pages`):  its type, as what draws it may read it.
   * - A type added:  nothing draws it yet, so nothing of it.
   */
  typesToDrawAfter(now: Program): readonly string[] | "everything" {
    const textsOf = (program: Program, kind: ChunkKind) =>
      new Map(
        program.chunks.filter((chunk) => chunk.kind === kind).map((chunk) => [chunk.name!, chunk.lines.join("\n")])
      )
    const functionsBefore = textsOf(this, "function")
    for (const [name, text] of textsOf(now, "function")) {
      if (functionsBefore.get(name) !== text) return "everything"
    }
    const wasClasses = new Map(this.classes.map((chunk) => [chunk.name!, chunk]))
    const types = new Set<string>()
    const members = new Map(now.classes.map((chunk) => [chunk.name!, membersOf(chunk)]))
    for (const chunk of now.classes) {
      const was = wasClasses.get(chunk.name!)
      if (!was) continue
      const before = membersOf(was)
      for (const [key, member] of members.get(chunk.name!)!) {
        if (before.get(key)?.text === member.text) continue
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
    return [...types]
  }
}

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
