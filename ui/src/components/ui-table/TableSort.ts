import { UIT } from "spell/ui/core"
import { TableRows } from "./TableRows"

/****************
 * ### `TableSort`
 * A table's columns, and sorting its rows, as static helpers:  which header a click hit, its column,
 * the header over a column, and reordering the body rows by cell text (`client-sort`).  Plain DOM, no state.
 * - ONE walk for every kind of table, handed how to read it, its SHAPE (`TableShape`:  its rows, a row's cells,
 *   a cell's span;  `TableSort.shapeOf()` picks):
 *   - a native `<table>` (`NATIVE`), through its elements and attributes,
 *     so a static server render's tables (linkedom, with no table API) read the same
 *   - a `<ui-table>` of `<ui-row>`s and `<ui-cell>`s (`TableRows`)
 * - Columns count spans:  `<th colspan="2">` covers columns 0 and 1, the next header is column 2.
 *   NOTE: `rowspan`s from rows above are not counted (a structured table's lower header row numbers its own
 *   cells), and a spanning cell in the body answers for its FIRST column.
 * - Comparison:  `Intl.Collator(undefined, { numeric: true })` -- `item 9` before `item 10`, locale-aware,
 *   stable (`Array.prototype.sort`).
 * - STATIC and instance-free on purpose:  it holds no state, and the element and its static render share it.
 ****************/
export class TableSort {
  /** How `table` is read:  a native `<table>`'s shape, else a rows-mode `<ui-table>`'s (`TableRows`). */
  static shapeOf(table: Element): TableShape {
    return table.localName === NATIVE_TABLE ? NATIVE : TableRows
  }

  /**
   * The header cell of `table` that `target` is in, or `undefined`.
   * - Only `table`'s own header rows:  a table nested in a cell doesn't count.
   */
  static header(table: Element, target: EventTarget | null): Element | undefined {
    const shape = TableSort.shapeOf(table)
    const rows = shape.headerRows(table)
    for (let element = target instanceof Element ? target : null; element && element !== table;) {
      // a table nested inside:  its cells are its own
      if (element.localName === table.localName) return undefined
      const row = element.parentElement
      if (row && rows.includes(row) && shape.cells(row).includes(element)) {
        return shape.isHeader(element) ? element : undefined
      }
      element = row
    }
    return undefined
  }

  /** Every header cell of `table`'s header rows, row by row. */
  static headers(table: Element): Element[] {
    const shape = TableSort.shapeOf(table)
    return shape.headerRows(table).flatMap((row) => shape.cells(row).filter((cell) => shape.isHeader(cell)))
  }

  /** Can `header` (a native one, or a `<ui-cell>`) sort?  Not with `data-sortable="false"` or Fomantic's `class="disabled"`. */
  static isSortable(header: Element): boolean {
    return (
      header.getAttribute(UIT.TABLE_SORT_OPT_OUT.attribute) !== UIT.TABLE_SORT_OPT_OUT.value &&
      !header.classList.contains(UIT.DISABLED)
    )
  }

  /** Column index of `cell`, a cell of `table`, in its row:  the spans before it added up. */
  static column(table: Element, cell: Element): number {
    const shape = TableSort.shapeOf(table)
    let column = 0
    for (const before of cell.parentElement ? shape.cells(cell.parentElement) : []) {
      if (before === cell) break
      column += shape.span(before)
    }
    return column
  }

  /** The header for `column`:  the lowest header row's header cell covering it (the most specific), if any. */
  static headerAt(table: Element, column: number): Element | undefined {
    const shape = TableSort.shapeOf(table)
    for (const row of shape.headerRows(table).reverse()) {
      const cell = TableSort.cellAt(table, row, column)
      if (cell && shape.isHeader(cell)) return cell
    }
    return undefined
  }

  /** `row`'s cell covering `column`, if any;  `row` is one of `table`'s. */
  static cellAt(table: Element, row: Element, column: number): Element | undefined {
    const shape = TableSort.shapeOf(table)
    let start = 0
    for (const cell of shape.cells(row)) {
      const span = shape.span(cell)
      if (column < start + span) return cell
      start += span
    }
    return undefined
  }

  /** `header`'s `data-key`, for `ui-sorting`'s detail. */
  static key(header: Element): string | undefined {
    return header.getAttribute(UIT.TABLE_SORT_KEY) ?? undefined
  }

  /**
   * Reorder each group of `table`'s body rows by the text of their cell in `column`.
   * - SIDE EFFECT:  moves rows, only when the order changes (so a sorted table sees no mutation);
   *   header rows stay first, footer rows last.
   * - Rows without that cell sort last, in their order.
   */
  static sortRows(table: Element, column: number, direction: UIT.TableSortDirection) {
    const shape = TableSort.shapeOf(table)
    const sign = direction === "descending" ? -1 : 1
    for (const rows of shape.bodies(table)) {
      const texts = new Map(rows.map((row) => [row, TableSort.cellAt(table, row, column)?.textContent?.trim()]))
      const sorted = [...rows].sort((a, b) => TableSort.compare(texts.get(a), texts.get(b), sign))
      if (sorted.every((row, index) => row === rows[index])) continue
      shape.place(table, sorted)
    }
  }

  /**
   * Order of two values under `sign` (`1` ascending, `-1` descending).
   * - `undefined` / `null` / `""` last, whatever the direction;  two numbers numerically;
   *   else the collator over their text.
   */
  static compare(a: unknown, b: unknown, sign: number): number {
    const missingA = a == null || a === ""
    const missingB = b == null || b === ""
    if (missingA || missingB) return Number(missingA) - Number(missingB)
    if (typeof a === "number" && typeof b === "number") return (a - b) * sign
    return COLLATOR.compare(TableSort.text(a), TableSort.text(b)) * sign
  }

  /** A value as text:  primitives `String()`ed, `null` / `undefined` empty, anything else as JSON. */
  static text(value: unknown): string {
    if (value == null) return ""
    if (typeof value === "object") return JSON.stringify(value)
    return String(value as string | number | boolean | bigint | symbol)
  }
}

/**
 * How one kind of table is read:  what `TableSort`'s walk needs of it.
 * - `TableSort`'s own for a native `<table>`;  `TableRows` for a `<ui-table>` of `<ui-row>`s.
 */
export type TableShape = {
  /** the table's header rows, top first */
  headerRows(table: Element): Element[]
  /** the body rows that sort together, each group in order:  a native table's per `<tbody>`, a rows-mode table's one */
  bodies(table: Element): Element[][]
  /** a row's cells, in order */
  cells(row: Element): Element[]
  /** the columns a cell covers:  at least 1 */
  span(cell: Element): number
  /** is `cell`, a cell of a header row, a header:  a native `<th>`;  any cell of a rows-mode header row */
  isHeader(cell: Element): boolean
  /** put a group's rows back, sorted (`sorted` holds every row of one group) */
  place(table: Element, sorted: Element[]): void
}

/** A native table's tag. */
const NATIVE_TABLE = "table"

/**
 * A native `<table>`, read through its elements and attributes:  linkedom has no table API (`tHead`, `rows`, `cells`,
 * `colSpan`), and the browser's agrees with them.
 */
const NATIVE: TableShape = {
  headerRows: (table) => [...table.querySelectorAll(":scope > thead > tr")],
  bodies: (table) =>
    [...table.querySelectorAll(":scope > tbody")].map((body) => [...body.querySelectorAll(":scope > tr")]),
  cells: (row) => [...row.children].filter((cell) => cell.localName === "td" || cell.localName === "th"),
  span: (cell) => TableRows.spanOf(cell.getAttribute("colspan")),
  isHeader: (cell) => cell.localName === "th",
  place: (_table, sorted) => sorted[0]?.parentElement?.append(...sorted)
}

/** Numeric-aware collator for cell text and data values:  one per page. */
const COLLATOR = new Intl.Collator(undefined, { numeric: true })
