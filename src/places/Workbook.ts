import { rowsInCommon } from "./CsvFile"
import { PlaceError, idOfRow, type PlaceRow } from "./places.types"
import { SheetTable } from "./SheetTable"

/** SheetJS, the library that reads and writes Excel files:  loaded only when a workbook is first read. */
export type SheetJs = typeof import("xlsx")

/** One sheet of a workbook, as SheetJS holds it. */
type SheetJsSheet = import("xlsx").WorkSheet

/** One cell, as SheetJS holds it. */
type SheetJsCell = import("xlsx").CellObject

/** What an `.xlsx` file starts with:  it's a zip file. */
const ZIP_START = [0x50, 0x4b, 0x03, 0x04]

/** An address that names an Excel workbook, by its ending:  `recipes.xlsx`. */
const WORKBOOK_ENDING = /\.xlsx(?:[?#]|$)/i

/** A date written as text, as a workbook's date cell reads:  `1977-05-25`, or `1977-05-25T10:30`. */
const DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/

/** A cell reference in a formula, its column and row each anchored by a `$` or not:  `D2`, `$D$2`. */
const CELL_REFERENCE = /(^|[^A-Za-z0-9_$.])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\d(A-Za-z_])/g

/** What every save says:  the free SheetJS writes no styles. */
export const WORKBOOK_STYLES_NOTE =
  "A workbook saved here keeps its values, formulas, other sheets and column widths, but not its cell colours and fonts"

/** What a save compared, row by row:  as `CsvSave`, but bytes. */
export type WorkbookSave = {
  /** The whole workbook after it. */
  bytes: Uint8Array
  /** The rows that are new. */
  added: string[]
  /** The rows that went somewhere else in the sheet. */
  moved: string[]
  /** The rows with a cell that changed. */
  edited: string[]
  /** The rows that are gone. */
  removed: string[]
}

/** Constructor props of a `Workbook`, and what reading a sheet's rows takes. */
export type WorkbookProps = {
  /** The column holding each row's id, on every sheet.  Left out:  rows are told apart by their whole text. */
  idColumn?: string | undefined
  /** The columns that hold numbers:  a workbook's cells say so themselves, so only text that reads as one. */
  numbers?: readonly string[] | undefined
}

/** One sheet, read:  its rows, and where each one is. */
type SheetRead = {
  /** Its sheet's name, in the workbook. */
  sheet: string
  /** The rows, as `SheetTable` makes them. */
  table: SheetTable
  /** Which row of the sheet names the columns, from 0:  `-1` for none. */
  headerAt: number
  /** Which row of the sheet holds each of `table.rows`, in order. */
  rowsAt: number[]
  /** The first column of the table, from 0. */
  firstColumn: number
  /** Why it's unclear which row a change means:  a row with a blank or repeated id. */
  whyUnclear: string | undefined
}

/****************
 * ### `Workbook`
 * An Excel workbook (`.xlsx`) as a place's rows:  each sheet one collection, named by its tab (epic `data` P38).
 *
 * ```ts
 * const workbook = new Workbook(bytes, await Workbook.sheetJs())
 * workbook.rowsOf("recipes")               // the "Recipes" tab's rows
 * workbook.saved("recipes", rows).bytes    // the workbook with those rows in it
 * ```
 *
 * - The rows are `SheetTable`'s, as a CSV file's are:  the first row with anything in it names the columns,
 *   and the id column, rows with no id and the notes all work the same.
 *   - The id column is every sheet's:  a sheet without it is `"not found"`, as a CSV file without it is.
 * - Numbers come out as numbers, and dates as text, `1977-05-25` (or `1977-05-25T10:30`):
 *   a workbook's date has no time zone, so it reads in the reader's own, as any date text does.
 * - Which sheet a collection is:  the tab of that name, in any case, spaces and dashes aside;
 *   a workbook with one tab answers any name, as a CSV file does.
 * - A SAVE (`saved()`) keeps what the program doesn't know:
 *   - every other sheet, columns the program doesn't read, formulas in cells nothing changed, column widths
 *   - each row stays on its sheet row while the rows keep their order;  blank rows between them stay
 *   - a row that moves takes its formulas with it, their relative references moved by as many rows
 *   - NOT cell colours and fonts:  the free SheetJS drops styles on a save (`WORKBOOK_STYLES_NOTE`)
 * - SheetJS's small build is about 270 KB (87 KB zipped), so it's loaded by a dynamic `import()` (`sheetJs()`),
 *   only when a workbook is first read:  no other page pays for it.
 * - Bytes in, bytes out:  knows nothing of files, servers or who's asking.
 *   `SheetPlace` reads one at an address;  `ExcelPlace`, in `spell/server/places`, writes one.
 ****************/
export class Workbook {
  /** The library, loaded. */
  private readonly sheetJs: SheetJs
  /** The workbook, as SheetJS holds it. */
  private readonly book: import("xlsx").WorkBook
  /** The column holding each row's id. */
  private readonly idColumn: string | undefined
  /** The columns that hold numbers. */
  private readonly numbers: readonly string[] | undefined

  /**
   * Read `bytes`:  `undefined` or empty, a new workbook with no sheets.
   * - throws `SyntaxError` for bytes that aren't an `.xlsx` workbook, which SheetJS would read as text;
   *   what SheetJS throws for one it can't read
   */
  constructor(bytes: Uint8Array | undefined, sheetJs: SheetJs, { idColumn, numbers }: WorkbookProps = {}) {
    this.sheetJs = sheetJs
    this.idColumn = idColumn
    this.numbers = numbers
    if (bytes?.length && !ZIP_START.every((byte, at) => bytes[at] === byte)) {
      throw new SyntaxError(
        "Workbook:  this isn't an Excel workbook (.xlsx):  save it as one, or read it as a CSV file"
      )
    }
    this.book = bytes?.length
      ? sheetJs.read(bytes, { type: "array", cellDates: true, UTC: true, cellStyles: true, cellFormula: true })
      : sheetJs.utils.book_new()
  }

  /**
   * SheetJS, loaded once, the first time it's asked for.
   * - Its small build, which reads and writes `.xlsx` and CSV only:  ~275 KB, against ~500 KB for the whole library.
   * - A script, not a module:  bundlers and node hand it over as the module's `default`.
   */
  static sheetJs(): Promise<SheetJs> {
    return (sheetJsLoad ??= import("xlsx/dist/xlsx.mini.min").then(
      (module) => (module as { default?: SheetJs }).default ?? module,
      (error: unknown) => {
        sheetJsLoad = undefined
        throw error
      }
    ))
  }

  /** Does `address` name a workbook, by its ending? */
  static isWorkbookAddress(address: string): boolean {
    return WORKBOOK_ENDING.test(address)
  }

  /** Its sheets' names, in order. */
  get sheets(): readonly string[] {
    return this.book.SheetNames
  }

  /** The sheet that holds `collection`:  its own tab, in any case, or the only one.  `undefined` if none does. */
  sheetFor(collection: string): string | undefined {
    const { sheets } = this
    const named = sheets.find((sheet) => sheet === collection) ?? sheets.find((sheet) => sameName(sheet, collection))
    return named ?? (sheets.length === 1 ? sheets[0] : undefined)
  }

  /**
   * The rows `collection` holds, with what a person should know about them.
   * - throws `PlaceError` `"not found"` for a collection no sheet holds, or an id column its sheet hasn't got
   */
  rowsOf(collection: string): { rows: PlaceRow[]; notes: string[]; columns: string[] } {
    const { table } = this.read(collection)
    return { rows: table.rows, notes: table.notes, columns: table.columns }
  }

  /**
   * The cells of `collection`'s row `at`, as text, in order:  what a row's version is made from.
   * - throws `TypeError` while its sheet has a row with a blank or repeated id:  a row isn't its sheet row then
   */
  cellsOfRow(collection: string, at: number): string[] {
    const read = this.read(collection)
    if (read.whyUnclear) throw new TypeError(`Workbook.cellsOfRow():  ${read.whyUnclear}`)
    return read.table.columns.map((_column, column) => cellText(this.cellAt(read, read.rowsAt[at]!, column)))
  }

  /** Why it's unclear which row of `collection` a change means:  `undefined` when it isn't.  - throws as `rowsOf()` */
  whyUnclear(collection: string): string | undefined {
    return this.read(collection).whyUnclear
  }

  /**
   * The workbook with `rows` in `collection`'s sheet, in that order:  see the class's notes on what a save keeps.
   * - A field left out of a row it already holds stays as it is;  left out of a new row, it's blank.
   * - A collection no sheet holds, in a workbook with none:  a new sheet of that name, its columns the first row's fields.
   * - throws `PlaceError`:
   *   - `"refused"`:  a row with a blank or repeated id, or a field it has no column for, since adding one moves every cell
   *   - `"not found"`:  a collection no sheet holds, in a workbook that has sheets
   */
  saved(collection: string, rows: readonly PlaceRow[]): WorkbookSave {
    const read = this.sheets.length ? this.read(collection) : this.newSheet(collection)
    if (read.whyUnclear) throw new PlaceError(read.whyUnclear, { cause: { kind: "refused", whyNot: "place" } })
    const { utils } = this.sheetJs
    const sheet = this.book.Sheets[read.sheet]!
    const columns = read.table.columns.length ? read.table.columns : Object.keys(rows[0] ?? {})
    for (const row of rows) refuseUnknownFields(row, columns)
    if (read.headerAt < 0 && columns.length) {
      read.headerAt = 0
      columns.forEach((column, at) => {
        sheet[utils.encode_cell({ r: 0, c: read.firstColumn + at })] = { t: "s", v: column }
      })
    }

    const oldKeys = read.table.rows.map((row) => this.keyOf(row, columns))
    const newKeys = rows.map((row) => this.keyOf(row, columns))
    const free = new Map<string, number[]>()
    oldKeys.forEach((key, at) => free.set(key, [...(free.get(key) ?? []), at]))
    const matched = newKeys.map((key) => free.get(key)?.shift())
    const stay = new Set(rowsInCommon(oldKeys, newKeys).keys())
    const save: WorkbookSave = { bytes: new Uint8Array(), added: [], moved: [], edited: [], removed: [] }
    const kept = new Set(matched)
    oldKeys.forEach((key, at) => {
      if (!kept.has(at)) save.removed.push(key)
    })

    // every old row's cells, before any is cleared:  a row that moves takes them with it
    const oldCells = read.rowsAt.map((sheetRow) => this.cellsInRow(sheet, sheetRow))
    for (const [at, sheetRow] of read.rowsAt.entries()) {
      for (const column of oldCells[at]!.keys()) delete sheet[utils.encode_cell({ r: sheetRow, c: column })]
    }

    // each row keeps a sheet row of the old ones, in order;  more go after the last
    const lastRow = read.rowsAt.at(-1) ?? read.headerAt
    rows.forEach((row, at) => {
      const sheetRow = read.rowsAt[at] ?? lastRow + (at - read.rowsAt.length + 1)
      const oldAt = matched[at]
      if (oldAt === undefined) save.added.push(newKeys[at]!)
      else if (!stay.has(at)) save.moved.push(newKeys[at]!)
      const cells = oldAt === undefined ? new Map<number, SheetJsCell>() : oldCells[oldAt]!
      const moveBy = oldAt === undefined ? 0 : sheetRow - read.rowsAt[oldAt]!
      for (const [column, cell] of cells) {
        sheet[utils.encode_cell({ r: sheetRow, c: column })] = movedBy(cell, moveBy)
      }
      const was = oldAt === undefined ? undefined : read.table.rows[oldAt]
      let isEdited = false
      columns.forEach((column, at) => {
        if (!column || !(column in row) || (was && row[column] === was[column])) return
        const address = utils.encode_cell({ r: sheetRow, c: read.firstColumn + at })
        const cell = cellFor(row[column], sheet[address] as SheetJsCell | undefined)
        if (was && cellText(cell) === cellText(sheet[address] as SheetJsCell | undefined)) return
        isEdited = true
        if (cell) sheet[address] = cell
        else delete sheet[address]
      })
      if (was && isEdited) save.edited.push(newKeys[at]!)
    })
    sheet["!ref"] = this.rangeOf(sheet)
    save.bytes = new Uint8Array(this.sheetJs.write(this.book, { type: "array", bookType: "xlsx", compression: true }))
    readCache.delete(this)
    return save
  }

  ////////////////
  // ## Reading
  ////////////////

  /** `collection`'s sheet, read once.  - throws as `rowsOf()` */
  private read(collection: string): SheetRead {
    const reads = readCache.get(this) ?? new Map<string, SheetRead>()
    readCache.set(this, reads)
    const known = reads.get(collection)
    if (known) return known
    const sheet = this.sheetFor(collection)
    if (sheet === undefined) {
      const tabs = this.sheets.map((each) => `"${each}"`).join(", ") || "none"
      throw new PlaceError(`Workbook:  no sheet holds "${collection}";  its sheets are ${tabs}`, {
        cause: { kind: "not found" }
      })
    }
    const read = this.readSheet(sheet, collection)
    reads.set(collection, read)
    return read
  }

  /** One sheet's rows:  the first row with anything in it names the columns, and blank rows are left out. */
  private readSheet(sheet: string, name: string): SheetRead {
    const { utils } = this.sheetJs
    const cells = this.book.Sheets[sheet]!
    const ref = cells["!ref"]
    const range = ref ? utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: -1, c: -1 } }
    const firstColumn = range.s.c
    const filled: number[] = []
    const cellsOfRows: unknown[][] = []
    for (let row = range.s.r; row <= range.e.r; row++) {
      const values: unknown[] = []
      for (let column = firstColumn; column <= range.e.c; column++) {
        values.push(cellValue(cells[utils.encode_cell({ r: row, c: column })] as SheetJsCell | undefined))
      }
      if (values.every((value) => value === "")) continue
      filled.push(row)
      cellsOfRows.push(values)
    }
    const { idColumn, numbers } = this
    const table = new SheetTable({ name, cells: cellsOfRows, idColumn, numbers })
    const rowsAt = filled.slice(1)
    const whyUnclear =
      table.rows.length === rowsAt.length
        ? undefined
        : `"${name}" has a row with a blank or repeated id in "${idColumn}", so it's unclear which row a change means:  fix it first`
    return { sheet, table, headerAt: filled[0] ?? -1, rowsAt, firstColumn, whyUnclear }
  }

  /** A sheet for `collection`, in a workbook with none. */
  private newSheet(collection: string): SheetRead {
    this.sheetJs.utils.book_append_sheet(this.book, {}, collection)
    const table = new SheetTable({ name: collection, cells: [] })
    return { sheet: collection, table, headerAt: -1, rowsAt: [], firstColumn: 0, whyUnclear: undefined }
  }

  /** The cell at `sheetRow`, the table's `column`. */
  private cellAt(read: SheetRead, sheetRow: number, column: number): SheetJsCell | undefined {
    const address = this.sheetJs.utils.encode_cell({ r: sheetRow, c: read.firstColumn + column })
    return this.book.Sheets[read.sheet]![address] as SheetJsCell | undefined
  }

  /** Every cell `sheetRow` holds, by its column, from 0. */
  private cellsInRow(sheet: SheetJsSheet, sheetRow: number): Map<number, SheetJsCell> {
    const { utils } = this.sheetJs
    const ref = sheet["!ref"]
    const found = new Map<number, SheetJsCell>()
    if (!ref) return found
    const { s, e } = utils.decode_range(ref)
    for (let column = s.c; column <= e.c; column++) {
      const cell = sheet[utils.encode_cell({ r: sheetRow, c: column })] as SheetJsCell | undefined
      if (cell) found.set(column, cell)
    }
    return found
  }

  /** The range every cell of `sheet` is in, as `A1:E9`. */
  private rangeOf(sheet: SheetJsSheet): string {
    const { utils } = this.sheetJs
    let top = Infinity
    let left = Infinity
    let bottom = 0
    let right = 0
    for (const address of Object.keys(sheet)) {
      if (address.startsWith("!")) continue
      const { r, c } = utils.decode_cell(address)
      top = Math.min(top, r)
      left = Math.min(left, c)
      bottom = Math.max(bottom, r)
      right = Math.max(right, c)
    }
    if (top === Infinity) return "A1"
    return utils.encode_range({ s: { r: top, c: left }, e: { r: bottom, c: right } })
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
          `Workbook.saved():  a row needs its id in "${this.idColumn}", or nothing says which row it is`
        )
      }
      return id
    }
    return columns
      .filter((column) => column)
      .map((column) => valueText(row[column]))
      .join(",")
  }
}

/** Each workbook's sheets, read:  dropped by a save. */
const readCache = new WeakMap<Workbook, Map<string, SheetRead>>()

/** SheetJS, loading or loaded. */
let sheetJsLoad: Promise<SheetJs> | undefined

/** Is `sheet` the tab `collection` names, ignoring case, spaces and dashes? */
function sameName(sheet: string, collection: string): boolean {
  const plain = (name: string) => name.toLowerCase().replace(/[\s_-]+/g, "")
  return plain(sheet) === plain(collection)
}

/** - throws `PlaceError` `"refused"`:  a new column would move every cell after it */
function refuseUnknownFields(row: PlaceRow, columns: readonly string[]): void {
  const unknown = Object.keys(row).find((field) => !columns.includes(field))
  if (unknown === undefined) return
  throw new PlaceError(`Workbook.saved():  the sheet has no column "${unknown}";  add it to the sheet's first row`, {
    cause: { kind: "refused", whyNot: "field" }
  })
}

////////////////
// ## Cells
////////////////

/** A cell's value, as a row holds it:  `""` for none. */
function cellValue(cell: SheetJsCell | undefined): unknown {
  if (!cell) return ""
  switch (cell.t) {
    case "n":
    case "b":
    case "s":
      return cell.v ?? ""
    case "d":
      return cell.v instanceof Date ? dateText(cell.v) : (cell.v ?? "")
    case "e":
      return cell.w ?? ""
    default:
      return ""
  }
}

/** A cell as text, for a row's version and for comparing. */
function cellText(cell: SheetJsCell | undefined): string {
  return valueText(cellValue(cell))
}

/** A value as text. */
function valueText(value: unknown): string {
  if (value === undefined || value === null) return ""
  return typeof value === "object" ? JSON.stringify(value) : `${value as string}`
}

/** A date cell's day, and its time if it has one:  as written in the workbook, with no time zone. */
function dateText(date: Date): string {
  const two = (number: number) => `${number}`.padStart(2, "0")
  const day = `${date.getUTCFullYear()}-${two(date.getUTCMonth() + 1)}-${two(date.getUTCDate())}`
  const [hours, minutes, seconds] = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()]
  if (!hours && !minutes && !seconds) return day
  return `${day}T${two(hours)}:${two(minutes)}${seconds ? `:${two(seconds)}` : ""}`
}

/**
 * The cell that holds `value`, in place of `old`:  `undefined` for a blank.
 * - A number is a number, a yes / no a boolean;  date text in a date cell stays a date, in its format.
 * - Its formula goes:  the program wrote a value.
 */
function cellFor(value: unknown, old: SheetJsCell | undefined): SheetJsCell | undefined {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value === "number") return { t: "n", v: value, ...(old?.z !== undefined && { z: old.z }) }
  if (typeof value === "boolean") return { t: "b", v: value }
  const text = valueText(value)
  const date = old?.t === "d" ? DATE_TEXT.exec(text) : null
  if (date && old) {
    const [year = 0, month = 1, day = 1, hours = 0, minutes = 0, seconds = 0] = date
      .slice(1)
      .map((part) => Number(part ?? 0))
    const v = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
    return { t: "d", v, ...(old.z !== undefined && { z: old.z }) }
  }
  return { t: "s", v: text }
}

/** `cell`, moved down by `rows` (up, if less than 0):  its formula's relative references move with it. */
function movedBy(cell: SheetJsCell, rows: number): SheetJsCell {
  if (!rows || !cell.f) return cell
  return { ...cell, f: formulaMovedBy(cell.f, rows) }
}

/**
 * `formula`, its relative row references moved by `rows`:  `D2*2` moved down one is `D3*2`;  `$D$2` stays.
 * - Text in quotes is left alone.
 */
export function formulaMovedBy(formula: string, rows: number): string {
  return formula
    .split('"')
    .map((part, at) =>
      at % 2
        ? part
        : part.replace(
            CELL_REFERENCE,
            (_all, before: string, colAnchor: string, column: string, rowAnchor: string, row: string) => {
              const moved = rowAnchor ? Number(row) : Number(row) + rows
              return `${before}${colAnchor}${column}${rowAnchor}${moved}`
            }
          )
    )
    .join('"')
}
