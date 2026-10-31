import { csvCellFor, csvLinesIn, csvLineText, isCsvRow, type CsvCell, type CsvLine } from "./csv"
import { PlaceError, idOfRow, type PlaceRow } from "./places.types"
import { SheetTable } from "./SheetTable"

/** A line end for a file that hasn't got one yet. */
const FIRST_LINE_END = "\n"

/** What a save compared, each row by its id, or by its whole text when it has none:  the first thing a test or a person asks. */
export type CsvSave = {
  /** The file's whole text after it:  every line nothing changed, byte for byte. */
  text: string
  /** The rows that are new. */
  added: string[]
  /** The rows that went somewhere else in the file. */
  moved: string[]
  /** The rows with a cell that changed.  With no id column there are none:  see `CsvFile`. */
  edited: string[]
  /** The rows that are gone. */
  removed: string[]
}

/****************
 * ### `CsvFile`
 * A CSV file's text, as rows, which saves by comparing new rows with old and changing only the lines that differ (epic `data` P14).
 * - So a diff in git or VS Code shows the row added, the row moved and the cell edited, and nothing else.
 *   - A line nothing changed goes back byte for byte:  its quoting, its line end, cells past the last column.
 *   - A line with an edited cell keeps every other cell as it was, and that cell's quotes if it had them.
 *   - The file's byte order mark, its blank lines, and whether its last line ends, all stay.
 * - WHICH ROW IS WHICH:
 *   - with `idColumn`, by the id, so an edit and a move at once are both understood
 *   - with none, by the row's whole text:  a row added or moved is found, but an edited row reads as one gone and one new
 * - WHAT STAYED AND WHAT MOVED is the longest run of rows in the same order in both (`rowsInCommon()`):  the fewest lines to change.
 * - A new row, a moved row:  right after the row it now follows, and blank lines stay with the row above them.
 * - Columns come from `SheetTable`, as a read's do.  What the table leaves out of a read (a row with a blank or repeated id)
 *   makes it unclear what a change means, so `whyUnclear` says so, and `saved()` won't.
 * - Plain text in, plain text out:  knows nothing of files, servers or who's asking.  `CsvPlace`, in `spell/server/places`, is the place.
 ****************/
export class CsvFile {
  /** Its rows, as a read shows them:  the column names as fields. */
  readonly rows: readonly PlaceRow[]
  /** What each column is called, in order. */
  readonly columns: readonly string[]
  /** What a person should know about it. */
  readonly notes: readonly string[]
  /** Why it's unclear which row a change means:  a row with a blank or repeated id.  Left out:  it isn't. */
  readonly whyUnclear: string | undefined
  /** The column holding each row's id. */
  private readonly idColumn: string | undefined
  /** The byte order mark it starts with. */
  private readonly byteOrderMark: string
  /** Every line. */
  private readonly lines: readonly CsvLine[]
  /** Which of `lines` names the columns:  `-1` for none. */
  private readonly headerAt: number
  /** Which of `lines` hold `rows`, in order. */
  private readonly rowLines: readonly CsvLine[]
  /** The text it was made from. */
  private readonly text: string

  /** - throws `SyntaxError` for a file half saved;  `PlaceError` `"not found"` for an `idColumn` it hasn't got */
  constructor(text: string, { name, idColumn, numbers }: CsvFileProps) {
    const { byteOrderMark, lines } = csvLinesIn(text)
    this.text = text
    this.byteOrderMark = byteOrderMark
    this.lines = lines
    this.idColumn = idColumn
    this.headerAt = lines.findIndex(isCsvRow)
    this.rowLines = lines.slice(this.headerAt + 1).filter((line) => isCsvRow(line) && !isBlankRow(line))
    const header = lines[this.headerAt]
    const cells = [...(header ? [header] : []), ...this.rowLines].map((line) => line.cells.map(({ value }) => value))
    const table = new SheetTable({ name, cells, idColumn, numbers })
    this.columns = table.columns
    this.rows = table.rows
    this.notes = table.notes
    if (table.rows.length !== this.rowLines.length) {
      this.whyUnclear = `"${name}" has a row with a blank or repeated id in "${idColumn}", so it's unclear which row a change means:  fix it first`
    }
  }

  /**
   * The cells of row `at` of `rows`, as text, in order, the ones past the last column too:  what a row's version is made from.
   * - throws `TypeError` while `whyUnclear`:  a row isn't its line then
   */
  cellsOfRow(at: number): string[] {
    if (this.whyUnclear) throw new TypeError("CsvFile.cellsOfRow():  check `whyUnclear` first")
    return this.rowLines[at]!.cells.map(({ value }) => value)
  }

  /**
   * The file with `rows` in it, in that order, and only the lines that differ changed.
   * - A field left out of a row it already holds stays as it is;  left out of a new row, it's blank.
   * - A file with no columns yet takes them from the first row's fields.
   * - throws `PlaceError` `"refused"`:  `whyUnclear`, or a field it has no column for, since adding one would change every line
   */
  saved(rows: readonly PlaceRow[]): CsvSave {
    if (this.whyUnclear) throw new PlaceError(this.whyUnclear, { cause: { kind: "refused", whyNot: "place" } })
    if (!this.columns.length && !rows.length) return { text: this.text, added: [], moved: [], edited: [], removed: [] }
    const columns = this.columns.length ? this.columns : Object.keys(rows[0] ?? {})
    for (const row of rows) this.refuseUnknownFields(row, columns)

    const oldKeys = this.rows.map((row) => this.keyOf(row, columns))
    const newKeys = rows.map((row) => this.keyOf(row, columns))
    const { stay, moved } = matchRows(oldKeys, newKeys)
    const matched = new Map([...stay, ...moved])
    const stayed = new Set(stay.values())

    const save: CsvSave = { text: "", added: [], moved: [], edited: [], removed: [] }
    const quoted = this.columnsAlwaysQuoted(columns)
    /** Row `at` of `rows`, as a line:  the line it was, with what's changed, or a new one. */
    const lineOf = (at: number): CsvLine => {
      const oldAt = matched.get(at)
      if (oldAt === undefined) {
        save.added.push(newKeys[at]!)
        return this.newLine(rows[at]!, columns, quoted)
      }
      if (moved.has(at)) save.moved.push(newKeys[at]!)
      const line = this.lineWith(this.rowLines[oldAt]!, this.rows[oldAt]!, rows[at]!, columns, quoted)
      if (line !== this.rowLines[oldAt]) save.edited.push(newKeys[at]!)
      return line
    }
    const kept = new Set(matched.values())
    oldKeys.forEach((key, at) => {
      if (!kept.has(at)) save.removed.push(key)
    })

    const written: CsvLine[] = []
    let next = 0
    /** Every row up to the next that stays where it is:  they go here, right after the one above them. */
    const writeRowsUpToOneThatStays = () => {
      for (; next < rows.length && !stay.has(next); next++) written.push(lineOf(next))
    }
    if (this.headerAt < 0) {
      written.push(...this.lines, this.newHeader(columns))
      writeRowsUpToOneThatStays()
    }
    const rowAtLine = new Map(this.rowLines.map((line, at) => [line, at]))
    this.lines.forEach((line, at) => {
      if (this.headerAt < 0) return
      const rowAt = rowAtLine.get(line)
      if (rowAt === undefined) written.push(line)
      else if (stayed.has(rowAt)) written.push(lineOf(next++))
      else return
      if (at >= this.headerAt) writeRowsUpToOneThatStays()
    })
    save.text = this.textOf(written)
    return save
  }

  ////////////////
  // ## Comparing
  ////////////////

  /** What tells `row` from the others:  its id, or all of its text. */
  private keyOf(row: PlaceRow, columns: readonly string[]): string {
    if (this.idColumn !== undefined) {
      const id = idOfRow(row, this.idColumn)
      if (id === undefined) {
        throw new TypeError(
          `CsvFile.saved():  a row needs its id in "${this.idColumn}", or nothing says which row it is`
        )
      }
      return id
    }
    return columns
      .filter((column) => column)
      .map((column) => cellText(row[column]))
      .join(",")
  }

  /** - throws `PlaceError` `"refused"`:  a new column would change every line of the file */
  private refuseUnknownFields(row: PlaceRow, columns: readonly string[]): void {
    const unknown = Object.keys(row).find((field) => !columns.includes(field))
    if (unknown === undefined) return
    throw new PlaceError(`CsvFile.saved():  the file has no column "${unknown}";  add it to the file's first line`, {
      cause: { kind: "refused", whyNot: "field" }
    })
  }

  ////////////////
  // ## Writing lines
  ////////////////

  /** `line`, holding `row`, its cells changed where `row` says something other than `was`:  `line` itself if nothing did. */
  private lineWith(
    line: CsvLine,
    was: PlaceRow,
    row: PlaceRow,
    columns: readonly string[],
    quoted: ReadonlySet<number>
  ): CsvLine {
    let cells: CsvCell[] | undefined
    for (const [field, value] of Object.entries(row)) {
      if (value === was[field]) continue
      const at = columns.indexOf(field)
      const old = line.cells[at]
      const text = cellText(value)
      if (old?.value === text) continue
      cells ??= [...line.cells]
      while (cells.length < at) cells.push({ value: "", raw: "" })
      cells[at] = { value: text, raw: csvCellFor(text, old?.raw ? old.raw.startsWith('"') : quoted.has(at)) }
    }
    return cells ? { cells, ending: line.ending } : line
  }

  /** A line for a new row, quoted as its columns are. */
  private newLine(row: PlaceRow, columns: readonly string[], quoted: ReadonlySet<number>): CsvLine {
    const cells = columns.map((column, at) => {
      const value = column ? cellText(row[column]) : ""
      return { value, raw: csvCellFor(value, quoted.has(at)) }
    })
    return { cells, ending: "" }
  }

  /** The line that names `columns`, in a file that has none. */
  private newHeader(columns: readonly string[]): CsvLine {
    return { cells: columns.map((value) => ({ value, raw: csvCellFor(value) })), ending: "" }
  }

  /** Which columns have quotes on every cell that holds anything:  a file written that way stays that way. */
  private columnsAlwaysQuoted(columns: readonly string[]): ReadonlySet<number> {
    const quoted = new Set<number>()
    if (!this.rowLines.length) return quoted
    columns.forEach((_column, at) => {
      const held = this.rowLines.flatMap(({ cells }) => cells[at]?.raw || [])
      if (held.length && held.every((raw) => raw.startsWith('"'))) quoted.add(at)
    })
    return quoted
  }

  /**
   * `lines` as the file's text.
   * - A line that lost its place at the end of the file gets a line end;  the new last line ends as the last one did.
   */
  private textOf(lines: readonly CsvLine[]): string {
    const lineEnd = this.lines.find(({ ending }) => ending)?.ending ?? FIRST_LINE_END
    const lastEnds = !this.lines.length || !!this.lines.at(-1)!.ending
    const text = lines
      .map((line, at) => {
        const isLast = at === lines.length - 1
        return csvLineText(line) + (isLast && !lastEnds ? "" : line.ending || lineEnd)
      })
      .join("")
    return this.byteOrderMark + text
  }
}

/** Constructor props of a `CsvFile`. */
export type CsvFileProps = {
  /** What to call it in a message. */
  name: string
  /** The column holding each row's id.  Left out:  rows are told apart by their whole text. */
  idColumn?: string | undefined
  /** The columns that hold numbers. */
  numbers?: readonly string[] | undefined
}

/** A value as a CSV file holds it. */
function cellText(value: unknown): string {
  if (value === undefined || value === null) return ""
  return typeof value === "object" ? JSON.stringify(value) : `${value as string}`
}

/** A line with commas and nothing else:  `SheetTable` skips it, and so does a save. */
function isBlankRow({ cells }: CsvLine): boolean {
  return cells.every(({ value }) => !value)
}

////////////////
// ## Which row is which
////////////////

/** Each new row's old row, by where each one is. */
type RowMatches = {
  /** The rows that stay where they are, in order:  a new row's place to its old one's. */
  stay: Map<number, number>
  /** The rows that are in both, but go somewhere else. */
  moved: Map<number, number>
}

/**
 * Which new rows are which old rows.
 * - Those in `rowsInCommon()` stay;  of the rest, an old and a new with one key are the same row, moved, first to first.
 */
function matchRows(oldKeys: readonly string[], newKeys: readonly string[]): RowMatches {
  const stay = rowsInCommon(oldKeys, newKeys)
  const stayed = new Set(stay.values())
  const free = new Map<string, number[]>()
  oldKeys.forEach((key, at) => {
    if (stayed.has(at)) return
    const places = free.get(key)
    if (places) places.push(at)
    else free.set(key, [at])
  })
  const moved = new Map<number, number>()
  newKeys.forEach((key, at) => {
    if (stay.has(at)) return
    const oldAt = free.get(key)?.shift()
    if (oldAt !== undefined) moved.set(at, oldAt)
  })
  return { stay, moved }
}

/**
 * The longest run of rows in the same order in both lists, as each new row's place to its old one's:  a longest common subsequence.
 * - The rows at each end that match come first, as a save usually changes few;  the middle goes by Hunt and Szymanski:
 *   every pair of matching rows, kept while each is further on in both than the last.
 *   So a thousand rows with unique ids takes a thousand steps, not a million.
 */
export function rowsInCommon(oldKeys: readonly string[], newKeys: readonly string[]): Map<number, number> {
  const pairs = new Map<number, number>()
  let start = 0
  while (start < oldKeys.length && start < newKeys.length && oldKeys[start] === newKeys[start]) {
    pairs.set(start, start)
    start++
  }
  let oldEnd = oldKeys.length
  let newEnd = newKeys.length
  while (oldEnd > start && newEnd > start && oldKeys[oldEnd - 1] === newKeys[newEnd - 1]) {
    pairs.set(--newEnd, --oldEnd)
  }

  const placesOf = new Map<string, number[]>()
  for (let at = oldEnd - 1; at >= start; at--) {
    const places = placesOf.get(oldKeys[at]!)
    if (places) places.push(at)
    else placesOf.set(oldKeys[at]!, [at])
  }
  /** The best run of each length, by its last pair:  each pair remembers the one before it. */
  type Run = { oldAt: number; newAt: number; before: Run | undefined }
  const runs: Run[] = []
  for (let newAt = start; newAt < newEnd; newAt++) {
    for (const oldAt of placesOf.get(newKeys[newAt]!) ?? []) {
      let low = 0
      let high = runs.length
      while (low < high) {
        const middle = (low + high) >> 1
        if (runs[middle]!.oldAt < oldAt) low = middle + 1
        else high = middle
      }
      runs[low] = { oldAt, newAt, before: runs[low - 1] }
    }
  }
  for (let run = runs.at(-1); run; run = run.before) pairs.set(run.newAt, run.oldAt)
  return pairs
}
