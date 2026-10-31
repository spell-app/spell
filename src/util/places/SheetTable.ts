import { PlaceError, idOfRow, type PlaceRow } from "./places.types"

/** How many rows a note names before it just counts them. */
const ROWS_NAMED = 5

/****************
 * ### `SheetTable`
 * The cells of a sheet as a place's rows:  the first row names the columns, and each row after it is one row (epic `data` P7).
 * - What a CSV file (`SheetPlace`) and a Google Sheet (`GoogleSheetPlace`) share:  neither knows the other.
 * - Every row holds every column, `""` for a blank:  a sheet leaves trailing blanks off, and a short line is the same thing.
 * - A row with nothing in it is skipped, saying nothing:  people leave them between sections.
 * - Identity is what the author says:
 *   - `idColumn` names a column, and each row's id is in it
 *   - none named:  rows share no identity, and stay inside their list
 *   - a row with no id, or the same id as a row above, is LEFT OUT, and `notes` says which:
 *     one row per id is what the engine's cache holds, so a second one would silently overwrite the first
 * - What a person can get wrong in a sheet is a note, not a failure:  the rest of it still shows.
 *   Only a stated id column that isn't there throws, because then no row can be right.
 * - Knows nothing of files, addresses or requests.
 ****************/
export class SheetTable {
  /** What each column is called, in order:  `""` for one with no name, or one that repeats a name. */
  readonly columns: string[]
  /** The rows, with column names as fields. */
  readonly rows: PlaceRow[] = []
  /** What's wrong with it, in words for whoever keeps the sheet. */
  readonly notes: string[] = []
  /** Which row of the cells holds each id, from 0. */
  private readonly rowIndexes = new Map<string, number>()

  /** - throws `PlaceError` `"not found"` if `idColumn` isn't one of its columns */
  constructor({ name, cells, idColumn, numbers = [] }: SheetTableProps) {
    this.columns = this.columnsFrom(name, cells[0] ?? [])
    if (idColumn !== undefined && cells.length && !this.columns.includes(idColumn)) {
      throw new PlaceError(
        `SheetTable:  "${name}" has no column "${idColumn}" to take its ids from;  its columns are ${this.named()}`,
        { cause: { kind: "not found" } }
      )
    }
    const noId: number[] = []
    const repeated: number[] = []
    const overflowing: number[] = []
    cells.slice(1).forEach((cellsOfRow, index) => {
      const rowIndex = index + 1
      if (cellsOfRow.every(isBlank)) return
      if (cellsOfRow.slice(this.columns.length).some((cell) => !isBlank(cell))) overflowing.push(rowIndex + 1)
      const row = this.rowFrom(cellsOfRow, numbers)
      const id = idOfRow(row, idColumn)
      if (idColumn !== undefined) {
        if (!id) return void noId.push(rowIndex + 1)
        if (this.rowIndexes.has(id)) return void repeated.push(rowIndex + 1)
        this.rowIndexes.set(id, rowIndex)
      }
      this.rows.push(row)
    })
    if (noId.length) this.notes.push(`"${name}":  ${rowsNamed(noId)} no id in "${idColumn}", so left out`)
    if (repeated.length)
      this.notes.push(`"${name}":  ${rowsNamed(repeated)} an id a row above already has, so left out`)
    if (overflowing.length)
      this.notes.push(`"${name}":  ${rowsNamed(overflowing)} more cells than there are columns, and those are ignored`)
  }

  /** Which column this field is in, from 0:  `-1` if there's none. */
  columnIndexOf(field: string): number {
    return field ? this.columns.indexOf(field) : -1
  }

  /** Which row of the cells holds this id, from 0, the column names being row 0:  `undefined` if none does. */
  rowIndexOf(id: string): number | undefined {
    return this.rowIndexes.get(id)
  }

  /** The column names as trimmed text, with a repeat noted and blanked:  the first of a name wins. */
  private columnsFrom(name: string, header: readonly unknown[]): string[] {
    const seen = new Set<string>()
    return header.map((cell) => {
      const column = isBlank(cell) ? "" : `${cell as string}`.trim()
      if (!seen.has(column)) {
        seen.add(column)
        return column
      }
      if (column) this.notes.push(`"${name}":  two columns are called "${column}", and only the first is read`)
      return ""
    })
  }

  /** One row's cells, as fields by column. */
  private rowFrom(cells: readonly unknown[], numbers: readonly string[]): PlaceRow {
    const row: PlaceRow = {}
    this.columns.forEach((column, index) => {
      if (!column) return
      const cell = cells[index] ?? ""
      row[column] = numbers.includes(column) ? numberOrText(cell) : cell
    })
    return row
  }

  /** The columns, for a message. */
  private named(): string {
    return (
      this.columns
        .filter((column) => column)
        .map((column) => `"${column}"`)
        .join(", ") || "none"
    )
  }
}

/** Constructor props of a `SheetTable`. */
export type SheetTableProps = {
  /** What to call it in a note. */
  name: string
  /** Its cells, row by row:  the first row names the columns. */
  cells: readonly (readonly unknown[])[]
  /** The column holding each row's id.  Left out:  rows share no identity. */
  idColumn?: string | undefined
  /** The columns that hold numbers, for a sheet whose cells are all text:  a cell that isn't one stays as it is. */
  numbers?: readonly string[] | undefined
}

/** Nothing in it? */
function isBlank(cell: unknown): boolean {
  return cell === undefined || cell === null || cell === ""
}

/** `cell` as a number, if it reads as one. */
function numberOrText(cell: unknown): unknown {
  if (typeof cell !== "string" || !cell.trim()) return cell
  const number = Number(cell)
  return Number.isNaN(number) ? cell : number
}

/** `row 3 has`, or `rows 3, 4 and 5 have`, counting past a few:  what a note starts with. */
function rowsNamed(rowNumbers: readonly number[]): string {
  if (rowNumbers.length === 1) return `row ${rowNumbers[0]} has`
  const named = rowNumbers.slice(0, ROWS_NAMED).join(", ")
  const more = rowNumbers.length - ROWS_NAMED
  return `rows ${named}${more > 0 ? ` and ${more} more` : ""} have`
}
