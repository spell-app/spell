import type { SourceMapV3, SourcePlace, SpellPlaceEntry } from "./SourceMarks"

/****************
 * ### `SourceMapLines`
 * A source map read back:  which line of the source a line of compiled code came from, and the reverse (epic `editor`,
 * Code Follows Along).
 * - The reading half of `P.SourceMarks`, over the one map it makes:  never a second map.
 * - By LINE, as the map is by statement:  a compiled line with no mapping of its own belongs to the last one above it.
 * - What's drawn and made counts too (the map's `x_spellPlaces`):  a drawn tag has a line of its own in a statement's
 *   several.
 * - A place's `path` is the map's name for the file, e.g. `Card.spell`.  Lines count from 0.
 * - Knows nothing of spell's projects, or of the editor.
 ****************/
export class SourceMapLines {
  /** Each compiled line with a place of its own, top to bottom. */
  private readonly lines: Array<{ line: number; place: SourcePlace }>

  /**
   * - `map`:  as `P.SourceMarks.extract()` made it, or its JSON
   * - throws `SyntaxError` for JSON that isn't JSON, as `JSON.parse()` does
   */
  constructor(map: SourceMapV3 | string) {
    const parsed = typeof map === "string" ? (JSON.parse(map) as SourceMapV3) : map
    const byLine = new Map(statementLinesOf(parsed))
    // a part's own line, except where a statement starts:  its mapping is the statement's
    for (const [line, , kind, source, sourceLine, column] of parsed.x_spellPlaces ?? ([] as SpellPlaceEntry[])) {
      if (kind === "end" || byLine.has(line)) continue
      byLine.set(line, { path: parsed.sources[source]!, line: sourceLine, column })
    }
    this.lines = [...byLine].sort(([a], [b]) => a - b).map(([line, place]) => ({ line, place }))
  }

  /** Where compiled `line` came from:  its own place, else the nearest above it;  `undefined` before the first. */
  placeOfLine(line: number): SourcePlace | undefined {
    let found: SourcePlace | undefined
    for (const each of this.lines) {
      if (each.line > line) break
      found = each.place
    }
    return found
  }

  /**
   * The compiled lines line `line` of `path` wrote:  its own, else those of the nearest line above it that wrote any.
   * - Nothing, for a file the map doesn't name or a line above its first.
   */
  linesOf(path: string, line: number): number[] {
    let nearest = -1
    for (const { place } of this.lines) {
      if (place.path === path && place.line <= line && place.line > nearest) nearest = place.line
    }
    return this.lines.filter(({ place }) => place.path === path && place.line === nearest).map((each) => each.line)
  }
}

/** Each compiled line `map`'s `mappings` give a place to, with that place:  a line's first segment. */
function statementLinesOf(map: SourceMapV3): Array<[number, SourcePlace]> {
  const lines: Array<[number, SourcePlace]> = []
  // the VLQ fields are deltas from the last segment read:  source, its line, its column
  let source = 0
  let line = 0
  let column = 0
  map.mappings.split(";").forEach((group, generated) => {
    let isFirst = true
    for (const segment of group ? group.split(",") : []) {
      const [, sourceDelta, lineDelta, columnDelta] = fromVlq(segment)
      if (sourceDelta === undefined) continue
      source += sourceDelta
      line += lineDelta ?? 0
      column += columnDelta ?? 0
      if (isFirst) lines.push([generated, { path: map.sources[source]!, line, column }])
      isFirst = false
    }
  })
  return lines
}

/** Base-64 digits, as source maps use them. */
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

/** The numbers in `segment`, a base-64 VLQ run:  each's sign in its lowest bit, five bits a digit, the sixth saying more follows. */
function fromVlq(segment: string): number[] {
  const numbers: number[] = []
  let value = 0
  let shift = 0
  for (const character of segment) {
    const digit = BASE64.indexOf(character)
    value += (digit & 31) * 2 ** shift
    shift += 5
    if (digit & 32) continue
    numbers.push(value % 2 ? -((value - 1) / 2) : value / 2)
    value = 0
    shift = 0
  }
  return numbers
}
