import { E, UIT } from "spell/ui/core"
import { TableSort } from "./TableSort"

/****************
 * ### `TableEditing`
 * What `<ui-table editable>` reads and writes, as static helpers:  a column's kind of value,
 * what a cell shows and its editor holds, a typed value read back, and a pasted block of cells as edits.
 * - Plain data, no DOM and no Solid:  so each rule is tested on its own (`TableEditing.test.ts`).
 * - STATIC and instance-free on purpose, as `TableSort` is.
 ****************/
export class TableEditing {
  /**
   * The data-mode columns of `rows` with no `columnDefs`:  the first row's keys.
   * - A row that isn't a plain object (a program's thing) names them by its `toJSON()`, without its `$` keys:
   *   its own fields, never what its class keeps on the side;  each headed by its words (`filmTitle` => `film title`).
   * - An `id` column is read only:  it says which thing a row is.
   */
  static columnsOf(rows: readonly UIT.TableRow[]): UIT.TableColumn[] {
    const first = rows[0]
    if (!first) return []
    const plain = Object.getPrototypeOf(first) === Object.prototype || Object.getPrototypeOf(first) === null
    const shape =
      !plain && typeof (first as { toJSON?: unknown }).toJSON === "function"
        ? ((first as { toJSON(): unknown }).toJSON() as Record<string, unknown>)
        : first
    const keys = (shape && typeof shape === "object" ? Object.keys(shape) : []).filter((key) => !key.startsWith("$"))
    return keys.map((key) => ({
      key,
      ...(!plain && { header: E.kebabCase(key).replaceAll("-", " ") }),
      ...(key === ID && { readOnly: true })
    }))
  }

  /**
   * The kind of value `column` holds:  its `type`, else what its rows' first value is.
   * - a number `number`, `true` / `false` `yes-no`, a `Date` `date`;  `choices` make it a `choice`;  else `text`
   */
  static typeOf(column: UIT.TableColumn, rows: readonly UIT.TableRow[]): UIT.TableCellType {
    if (column.type) return column.type
    if (column.choices?.length) return "choice"
    const value = rows.map((row) => row[column.key]).find((one) => one !== undefined && one !== null && one !== "")
    if (typeof value === "number") return "number"
    if (typeof value === "boolean") return "yes-no"
    if (value instanceof Date) return "date"
    return "text"
  }

  /** What a cell of `column` shows for `value`:  a choice's words, a date's day, else its text. */
  static textFor(column: UIT.TableColumn, type: UIT.TableCellType, value: unknown): string {
    if (type === "yes-no") return ""
    const choice = TableEditing.choiceFor(column, value)
    if (choice) return choice.text ?? TableSort.text(choice.value)
    if (type === "date" && value instanceof Date) return TableEditing.dayOf(value)
    return TableSort.text(value)
  }

  /**
   * What a cell's editor starts with for `value`:  its text;  a date as `2026-11-07`;
   * a choice or link as its place in `choices` (`"2"`), or `""` for none.
   */
  static draftFor(column: UIT.TableColumn, type: UIT.TableCellType, value: unknown): string {
    if (type === "choice" || type === "link") {
      const index = (column.choices ?? []).findIndex((choice) => choice.value === value)
      return index < 0 ? "" : String(index)
    }
    if (type === "date") return value instanceof Date ? TableEditing.dayOf(value) : TableSort.text(value)
    return TableSort.text(value)
  }

  /**
   * The value `draft`, an editor's text, stands for in `column`.
   * - `number`:  a number;  blank, or not one, is `undefined`
   * - `date`:  a `Date` when the cell held one (`was`), else the day as text
   * - `choice` / `link`:  the choice at that place in `choices`, by its text too (a pasted word)
   * - `yes-no`:  `true` for `true`, `yes`, `x`, `1`, `✓`
   * - `text`:  the text
   */
  static valueFrom(column: UIT.TableColumn, type: UIT.TableCellType, draft: string, was?: unknown): unknown {
    const text = draft.trim()
    switch (type) {
      case "number": {
        if (!text) return undefined
        const number = Number(text.replaceAll(",", ""))
        return Number.isFinite(number) ? number : undefined
      }
      case "date":
        if (!text) return undefined
        return was instanceof Date ? new Date(`${text}T00:00`) : text
      case "yes-no":
        return YES.test(text)
      case "choice":
      case "link": {
        const choices = column.choices ?? []
        const byPlace = /^\d+$/.test(text) ? choices[Number(text)] : undefined
        const byWords = choices.find((choice) => (choice.text ?? TableSort.text(choice.value)) === text)
        return (byPlace ?? byWords)?.value
      }
      default:
        return draft
    }
  }

  /** Is `a` the same value as `b`, as a cell shows it?  Dates by their time. */
  static isSame(a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
    return a === b || ((a === undefined || a === null || a === "") && (b === undefined || b === null || b === ""))
  }

  /**
   * A pasted block's cells:  rows by line, cells by tab, as Excel and Google Sheets copy them.
   * - A last empty line (what a copy ends with) is dropped;  `\r\n` reads as `\n`.
   */
  static cellsOf(text: string): string[][] {
    const lines = text.replaceAll("\r\n", "\n").split("\n")
    if (lines.length > 1 && lines.at(-1) === "") lines.pop()
    return lines.map((line) => line.split("\t"))
  }

  /**
   * `cells`, pasted at row `row` and column `column` of `rows` (as shown) and `columns`:  the edits it makes.
   * - Over a row:  a `set` for each cell that changes;  a read-only column is passed over.
   * - Past the last row:  an `add` for each line, with what it fills.
   * - Cells past the last column are dropped.
   */
  static pasteEdits({ rows, columns, types, row, column, cells }: PasteAt): UIT.TableEdit[] {
    const edits: UIT.TableEdit[] = []
    cells.forEach((line, lineIndex) => {
      const target = rows[row + lineIndex]
      const values: UIT.TableRow = {}
      line.forEach((draft, cellIndex) => {
        const at = column + cellIndex
        const col = columns[at]
        if (!col || col.readOnly) return
        const was = target?.[col.key]
        const value = TableEditing.valueFrom(col, types[at] ?? "text", draft, was)
        if (!target) values[col.key] = value
        else if (!TableEditing.isSame(value, was)) edits.push({ kind: "set", row: target, key: col.key, value, was })
      })
      if (!target && Object.keys(values).length) edits.push({ kind: "add", values })
    })
    return edits
  }

  /**
   * `rows` with `edits` done to them, as new objects:  what a table with no page writing its things shows.
   * - The rows it hasn't changed stay the same objects;  never changes one in place.
   */
  static applied(rows: readonly UIT.TableRow[], edits: readonly UIT.TableEdit[]): UIT.TableRow[] {
    // a row changed twice is found by its newest object
    const newest = new Map<UIT.TableRow, UIT.TableRow>()
    let next = [...rows]
    for (const edit of edits) {
      if (edit.kind === "add") {
        next.push({ ...edit.values })
        continue
      }
      const current = newest.get(edit.row) ?? edit.row
      if (edit.kind === "remove") {
        next = next.filter((row) => row !== current)
        continue
      }
      const changed = { ...current, [edit.key]: edit.value }
      newest.set(edit.row, changed)
      next = next.map((row) => (row === current ? changed : row))
    }
    return next
  }

  /** The choice of `column` holding `value`, if it has choices. */
  private static choiceFor(column: UIT.TableColumn, value: unknown): UIT.TableChoice | undefined {
    return column.choices?.find((choice) => choice.value === value)
  }

  /** `date`'s day, as a date field writes it:  `2026-11-07`, in local time. */
  private static dayOf(date: Date): string {
    const pad = (number: number) => String(number).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
}

/** What `pasteEdits()` is handed. */
type PasteAt = {
  /** the rows, in the order shown */
  rows: readonly UIT.TableRow[]
  /** the columns */
  columns: readonly UIT.TableColumn[]
  /** each column's kind of value */
  types: readonly UIT.TableCellType[]
  /** the cursor's row */
  row: number
  /** the cursor's column */
  column: number
  /** the pasted cells, by line */
  cells: readonly (readonly string[])[]
}

/** The column that says which thing a row is:  never edited. */
const ID = "id"

/** Pasted or typed text that means yes in a `yes-no` column. */
const YES = /^(?:true|yes|y|x|1|✓|✔)$/i
