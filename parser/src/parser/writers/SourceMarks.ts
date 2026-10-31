import type { P } from "spell/parser/parser"

/**
 * One place in a source file a mark points at:  its file's path, its line and column, both from 0.
 */
export type SourcePlace = { path: string; line: number; column: number }

/**
 * A standard (v3) source map:  generated code's lines back to the spell they came from.
 * - SEE:  https://tc39.es/ecma426/
 */
export type SourceMapV3 = {
  version: 3
  /** the generated file's name, e.g. `Solitaire.spell.js` */
  file?: string
  /** each source's path, as the map names it */
  sources: string[]
  /** each source's text, so a debugger shows it without fetching it */
  sourcesContent?: Array<string | null>
  names: string[]
  /** the mappings, base-64 VLQ:  one `;`-separated group per generated line */
  mappings: string
  /** where what's drawn and made is written:  `SourceMarks.stamped()` reads it.  Debuggers skip an `x_` field. */
  x_spellPlaces?: SpellPlaceEntry[]
}

/****************
 * ### `SourceMarks`
 * Where each statement of a compiled program came from (epic `elemental-spell` P14):  a source map, made as it's written.
 * - While `during()` runs, `P.Writer.write()` puts a MARK at the end of the first code line of each statement it
 *   writes (`mark()`):  an inline comment, `/*@@sm3@@*\/`, numbered into the places it remembers.
 * - Inline, never a line of its own:  a writer's layout choices (one line or several, `{ x }`) see the same text,
 *   and the line-based passes after it (`SP.SpellDeclarations.split()`, a writer's `module()`) keep working.
 * - `extract()` then takes every mark out again, and the code is EXACTLY what it is unmarked;
 *   each mark's line becomes a mapping to its statement's place.
 * - A line without a mark of its own maps to nothing:  a debugger shows the statement lines.
 * - Knows nothing of spell's projects:  the caller says each node's file (`placeOf`).
 * - NEVER on while a writer runs outside `during()`:  a mark left in code would ship.
 * - What's drawn and made has marks too (epic `editor` P7), so the editor can say where a part of a running app is
 *   written:
 *   - `markDrawn()`:  a drawn tag's `h("ui-button"`;  `markMade()`:  a `new Card(...)`
 *   - `extract()` takes them out with the rest, and lists them in the map's `x_spellPlaces`:  the code is the same
 *   - `stamped()` writes them into the code the editor runs, and only that
 *   - `placeOfDrawn()`, `placeOfThing()` read them back
 *   - ONE map:  they're places in the statements' files, kept in the statements' source map
 ****************/
export class SourceMarks {
  /** the marks being made now, if any */
  private static current: SourceMarks | undefined

  /** each mark's place, by its number */
  private readonly places: SourcePlace[] = []

  /**
   * - `placeOf(node)`:  where statement `node` came from, or `undefined` for a node not to mark
   * - `placeOfPart(node)`:  the same for a drawn tag or a made thing;  none, no such marks
   */
  constructor(
    private readonly placeOf: (node: P.ASTNode) => SourcePlace | undefined,
    private readonly placeOfPart?: (node: P.ASTNode) => SourcePlace | undefined
  ) {}

  /**
   * Run `write()` with marks made:  what it returns, its marks still in it.
   * - Not nested:  the inner call's marks would be numbered in the outer's places.
   */
  static during<T>(marks: SourceMarks, write: () => T): T {
    const outer = SourceMarks.current
    SourceMarks.current = marks
    try {
      return write()
    } finally {
      SourceMarks.current = outer
    }
  }

  /**
   * `output`, written for `node`, with its mark -- if marks are being made and `node` has a place.
   * - At the end of its first line that's code, not a comment or a blank:
   *   `/** docs *\/` and a declaration's marker comment stay at their lines' starts,
   *   as `SP.SpellDeclarations.split()` reads them.
   */
  static mark(output: unknown, node: P.ASTNode): unknown {
    const marks = SourceMarks.current
    if (!marks || typeof output !== "string" || !output) return output
    const place = marks.placeOf(node)
    if (!place) return output
    let start = 0
    let inComment = false
    while (start <= output.length) {
      const end = output.indexOf("\n", start)
      const lineEnd = end === -1 ? output.length : end
      const line = output.slice(start, lineEnd).trim()
      const isComment = inComment || line === "" || line.startsWith("//") || line.startsWith("/*")
      if (line.startsWith("/*") && !line.includes("*/")) inComment = true
      else if (inComment && line.includes("*/")) inComment = false
      if (!isComment) {
        marks.places.push(place)
        return `${output.slice(0, lineEnd)}${MARK_OPEN}${marks.places.length - 1}${MARK_CLOSE}${output.slice(lineEnd)}`
      }
      if (end === -1) break
      start = end + 1
    }
    return output
  }

  /** The mark to put after a drawn tag's name, `h("ui-button"`, for `node`:  `""` when none is being made. */
  static markDrawn(node: P.ASTNode): string {
    return SourceMarks.partMark(node, "h")
  }

  /** `written`, the `new Card(...)` for `node`, between its marks;  as it is when none are being made. */
  static markMade(written: string, node: P.ASTNode): string {
    const open = SourceMarks.partMark(node, "new")
    return open ? `${open}${written}${SourceMarks.partMark(node, "end")}` : written
  }

  /** The next mark of `kind` for `node`:  `""` unless marks of parts are being made, and it has a place. */
  private static partMark(node: P.ASTNode, kind: PartKind): string {
    const marks = SourceMarks.current
    const place = marks?.placeOfPart?.(node)
    if (!marks || !place) return ""
    marks.places.push(place)
    return `${PART_OPEN}${kind}${PART_NUMBER}${marks.places.length - 1}${MARK_CLOSE}`
  }

  /**
   * `code`, a compiled file, with what's drawn and made saying where it's written:
   * what the editor runs, never what ships.
   * - `map`:  its source map, as `extract()` made it.  None, or one listing no parts:  `code` as it is.
   * - A drawn tag:  `h("ui-button", { "data-spell-at": "Card.spellml:12:4" }`, read back by `placeOfDrawn()`.
   * - A made thing:  `Object.defineProperty(new Card(), Symbol.for("spell.madeAt"), ...)`, read back by `placeOfThing()`.
   * - Lines stay where they are, and a statement's mapping is at its line's start:  the map still holds.
   */
  static stamped(code: string, map: string | undefined): string {
    const parsed = map ? (JSON.parse(map) as SourceMapV3) : undefined
    const parts = parsed?.x_spellPlaces
    if (!parsed || !parts?.length) return code
    const lines = code.split("\n")
    // last first, so what's left to do keeps its column
    for (const [line, column, kind, source, sourceLine, sourceColumn] of [...parts].reverse()) {
      const text = lines[line]
      if (text === undefined) continue
      const before = text.slice(0, column)
      const after = text.slice(column)
      const at = JSON.stringify(`${parsed.sources[source]}:${sourceLine}:${sourceColumn}`)
      if (kind === "h") lines[line] = `${before}${withDrawnPlace(after, at)}`
      else if (kind === "new") lines[line] = `${before}Object.defineProperty(${after}`
      else lines[line] = `${before}, Symbol.for(${JSON.stringify(MADE_AT)}), { value: ${at} })${after}`
    }
    return lines.join("\n")
  }

  /** Where a drawn `element` is written, as `stamped()` said:  `undefined` in code not stamped. */
  static placeOfDrawn(element: Element): SourcePlace | undefined {
    return placeFrom(element.getAttribute(DRAWN_AT))
  }

  /** Where `thing` was made (`a new card`), as `stamped()` said:  `undefined` in code not stamped. */
  static placeOfThing(thing: object): SourcePlace | undefined {
    return placeFrom((thing as Record<symbol, unknown>)[Symbol.for(MADE_AT)])
  }

  /**
   * `code`, a compiled file, carrying source map `map` inline (a `data:` URL), for code run from somewhere the map file
   * beside it can't be reached:  a temp file, a `blob:` URL.  No `map`:  pointing at none.
   * - Takes out the `sourceMappingURL` line a compile writes, which names the map file beside it.
   */
  static inline(code: string, map: string | undefined): string {
    const bare = code.replace(SOURCE_MAP_LINE, "\n")
    if (!map) return bare
    let binary = ""
    for (const byte of new TextEncoder().encode(map)) binary += String.fromCharCode(byte)
    return `${bare.trimEnd()}\n//# sourceMappingURL=data:application/json;base64,${btoa(binary)}\n`
  }

  /**
   * How long `text` is with no marks in it:  for a writer laying out a line by its length, so a map never changes the
   * layout, e.g. `P.TSWriter`'s one-line JSX.
   */
  static widthOf(text: string): number {
    return text.replace(MARKS, "").length
  }

  /**
   * `code` without its marks, and the source map they make.
   * - `sources`:  each source path the map names, with its text when known (`sourcesContent`).
   * - `file`:  the generated file's name.
   * - `nameOf(path)`:  the name the map gives a source, e.g. `Card.spell` for its path;  the path itself by default.
   */
  extract(
    code: string,
    {
      file,
      sources = new Map(),
      nameOf = (path) => path
    }: { file?: string; sources?: Map<string, string | undefined>; nameOf?: (path: string) => string } = {}
  ): { code: string; map: SourceMapV3 } {
    const paths = [...new Set([...sources.keys(), ...this.places.map((place) => place.path)])]
    const lines: string[] = []
    const mappings: string[] = []
    const parts: SpellPlaceEntry[] = []
    // the VLQ fields are deltas from the last segment written:  source, its line, its column
    let lastSource = 0
    let lastLine = 0
    let lastColumn = 0
    for (const line of code.split("\n")) {
      const marked = line.includes(PART_OPEN) ? this.withoutPartMarks(line, lines.length, paths, parts) : line
      let text = ""
      let segments: string[] = []
      let from = 0
      for (let at = marked.indexOf(MARK_OPEN); at !== -1; at = marked.indexOf(MARK_OPEN, from)) {
        const close = marked.indexOf(MARK_CLOSE, at)
        if (close === -1) break
        text += marked.slice(from, at)
        from = close + MARK_CLOSE.length
        const place = this.places[Number(marked.slice(at + MARK_OPEN.length, close))]
        if (!place || segments.length) continue
        // a mark sits at its line's end:  the mapping starts at the line's first code
        const source = paths.indexOf(place.path)
        segments = [vlq(0) + vlq(source - lastSource) + vlq(place.line - lastLine) + vlq(place.column - lastColumn)]
        ;[lastSource, lastLine, lastColumn] = [source, place.line, place.column]
      }
      text += marked.slice(from)
      if (segments.length) {
        const indent = text.length - text.trimStart().length
        segments = [vlq(indent) + segments[0]!.slice(1)]
      }
      lines.push(text)
      mappings.push(segments.join(","))
    }
    return {
      code: lines.join("\n"),
      map: {
        version: 3,
        ...(file ? { file } : {}),
        sources: paths.map(nameOf),
        sourcesContent: paths.map((path) => sources.get(path) ?? null),
        names: [],
        mappings: mappings.join(";"),
        ...(parts.length ? { x_spellPlaces: parts } : {})
      }
    }
  }

  /**
   * `line` of the code without its parts' marks, each listed in `parts`, at its column once EVERY mark is out.
   * - A statement's mark stays in, for `extract()`.
   */
  private withoutPartMarks(line: string, lineNumber: number, paths: string[], parts: SpellPlaceEntry[]): string {
    let kept = ""
    let column = 0
    let from = 0
    for (const found of line.matchAll(ANY_MARK)) {
      const between = line.slice(from, found.index)
      kept += between
      column += between.length
      from = found.index + found[0].length
      const place = this.places[Number(found[2])]
      if (found[1] === STATEMENT_MARK) kept += found[0]
      else if (place) {
        parts.push([lineNumber, column, found[1] as PartKind, paths.indexOf(place.path), place.line, place.column])
      }
    }
    return kept + line.slice(from)
  }
}

/** What a mark of a part is:  a drawn tag's name, the start of a made thing, its end. */
type PartKind = "h" | "new" | "end"

/** A part in a map's `x_spellPlaces`:  its line and column in the code, its kind, and its source, line and column. */
export type SpellPlaceEntry = [
  line: number,
  column: number,
  kind: PartKind,
  source: number,
  sourceLine: number,
  sourceColumn: number
]

/** `after`, the code after a drawn tag's name, with its place first in the tag's props:  it makes them when it has none. */
function withDrawnPlace(after: string, at: string): string {
  const prop = `${JSON.stringify(DRAWN_AT)}: ${at}`
  return after.startsWith(", {") ? `, { ${prop},${after.slice(", {".length)}` : `, { ${prop} }${after}`
}

/** `at`, a stamped place, `Card.spellml:12:4`, read:  `undefined` if it isn't one. */
function placeFrom(at: unknown): SourcePlace | undefined {
  const found = typeof at === "string" ? STAMPED_PLACE.exec(at) : null
  return found ? { path: found[1]!, line: Number(found[2]), column: Number(found[3]) } : undefined
}

/** The attribute that says where a drawn element is written, in the code the editor runs. */
const DRAWN_AT = "data-spell-at"

/** The key of the symbol that says where a thing was made, in the code the editor runs. */
const MADE_AT = "spell.madeAt"

/** A stamped place's text. */
const STAMPED_PLACE = /^(.+):(\d+):(\d+)$/

/** A mark's opening and closing:  an inline comment no writer writes itself. */
const MARK_OPEN = "/*@@sm"
const MARK_CLOSE = "@@*/"

/** A compile's `//# sourceMappingURL=...` line, at its end. */
const SOURCE_MAP_LINE = /\n\/\/# sourceMappingURL=[^\n]*\n?$/

/** A part's mark's opening, then its kind and number:  `/*@@part:h:3@@*\/`. */
const PART_OPEN = "/*@@part:"
const PART_NUMBER = ":"

/** What `ANY_MARK` calls a statement's mark. */
const STATEMENT_MARK = "sm"

/** Any mark on a line:  its kind, then its number. */
const ANY_MARK = /\/\*@@(?:part:(?=[a-z]+:)|(?=sm))([a-z]+):?(\d+)@@\*\//g

/** Every mark in a text. */
const MARKS = /\/\*@@(?:sm|part:[a-z]+:)\d+@@\*\//g

/** Base-64 digits, as source maps use them. */
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

/** `value` as a base-64 VLQ:  its sign in the lowest bit, five bits a digit, the sixth saying more follow. */
function vlq(value: number): string {
  let rest = value < 0 ? (-value << 1) | 1 : value << 1
  let out = ""
  do {
    let digit = rest & 31
    rest >>>= 5
    if (rest) digit |= 32
    out += BASE64[digit]
  } while (rest)
  return out
}
