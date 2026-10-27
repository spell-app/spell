import { UI, UIT } from "spell/ui/core"

/****************
 * ### `TableRows`
 * A table made of `<ui-row>`s and `<ui-cell>`s, read as `TableSort` reads a native one (epic `ui-gaps` P7):
 * its rows, header cells, columns, and reordering its body rows (`client-sort`).  Plain DOM, no state.
 * - Rows are the table's own children;  cells, each row's.
 *   Tags by their CANONICAL name (`UI.vocabulary.canonicalTagFor()`), so a translated page's `<es-fila>` counts.
 * - A row is a header row with `header`, a footer row with `footer`;  every other row is the body.
 * - Columns count `span`s, as `TableSort` counts `colspan`s;  cells never span rows.
 * - STATIC and instance-free on purpose:  it holds no state, as `TableSort` doesn't.
 ****************/
export class TableRows {
  /** The rows of `table`, a `<ui-table>` DOM element, in order. */
  static rows(table: Element): Element[] {
    return [...table.children].filter((child) => TableRows.is(child, ROW))
  }

  /** The cells of `row`, in order. */
  static cells(row: Element): Element[] {
    return [...row.children].filter((child) => TableRows.is(child, CELL))
  }

  /** Is `row` a header row? */
  static isHeaderRow(row: Element): boolean {
    return TableRows.isOn(TableRows.value(row, HEADER))
  }

  /** Is `row` a footer row? */
  static isFooterRow(row: Element): boolean {
    return TableRows.isOn(TableRows.value(row, FOOTER))
  }

  /** Columns `cell` covers:  its `span`, at least 1. */
  static span(cell: Element): number {
    const span = Math.floor(Number(TableRows.value(cell, SPAN)))
    return Number.isFinite(span) && span > 1 ? span : 1
  }

  /** Columns of `table`:  the widest row's spans added up;  at least 1. */
  static columnCount(table: Element): number {
    let widest = 1
    for (const row of TableRows.rows(table)) {
      const width = TableRows.cells(row).reduce((sum, cell) => sum + TableRows.span(cell), 0)
      widest = Math.max(widest, width)
    }
    return widest
  }

  /** Every header cell of `table`'s header rows, row by row. */
  static headers(table: Element): Element[] {
    return TableRows.rows(table)
      .filter((row) => TableRows.isHeaderRow(row))
      .flatMap((row) => TableRows.cells(row))
  }

  /**
   * The header cell of `table` that `target` is in, or `undefined`.
   * - Only `table`'s own header rows:  a table nested in a cell doesn't count.
   */
  static header(table: Element, target: EventTarget | null): Element | undefined {
    for (let element = target instanceof Element ? target : null; element && element !== table;) {
      const row = element.parentElement
      if (row?.parentElement === table && TableRows.is(element, CELL) && TableRows.is(row, ROW))
        return TableRows.isHeaderRow(row) ? element : undefined
      element = row
    }
    return undefined
  }

  /** Column index of `cell` in its row, counting the `span`s before it. */
  static column(cell: Element): number {
    let column = 0
    for (let previous = cell.previousElementSibling; previous; previous = previous.previousElementSibling) {
      if (TableRows.is(previous, CELL)) column += TableRows.span(previous)
    }
    return column
  }

  /** The header for `column`:  the lowest header row's cell covering it (the most specific), if any. */
  static headerAt(table: Element, column: number): Element | undefined {
    const rows = TableRows.rows(table)
      .filter((row) => TableRows.isHeaderRow(row))
      .reverse()
    for (const row of rows) {
      const cell = TableRows.cellAt(row, column)
      if (cell) return cell
    }
    return undefined
  }

  /** `row`'s cell covering `column`, if any. */
  static cellAt(row: Element, column: number): Element | undefined {
    let start = 0
    for (const cell of TableRows.cells(row)) {
      const span = TableRows.span(cell)
      if (column < start + span) return cell
      start += span
    }
    return undefined
  }

  /**
   * Reorder `table`'s body rows by the text of their cell in `column` (`TableSort.compare()`).
   * - SIDE EFFECT:  moves row elements, only when the order changes;  header rows stay first, footer rows last.
   * - Rows without that cell sort last, in their order.
   */
  static sortRows(table: Element, column: number, direction: UIT.TableSortDirection, compare: Compare) {
    const sign = direction === "descending" ? -1 : 1
    const body = TableRows.rows(table).filter((row) => !TableRows.isHeaderRow(row) && !TableRows.isFooterRow(row))
    const texts = new Map(body.map((row) => [row, TableRows.cellAt(row, column)?.textContent?.trim()]))
    const sorted = [...body].sort((a, b) => compare(texts.get(a), texts.get(b), sign))
    if (sorted.every((row, index) => row === body[index])) return
    const footer = TableRows.rows(table).find((row) => TableRows.isFooterRow(row))
    for (const row of sorted) table.insertBefore(row, footer ?? null)
  }

  /**
   * Is `element` the canonical `tag` (or its translation on this page)?
   * - Before the runtime loads, the canonical tag only:  the translations are its.
   */
  private static is(element: Element, tag: string): boolean {
    const name = element.localName
    if (name === tag) return true
    return "vocabulary" in UI && UI.vocabulary.canonicalTagFor(name) === tag
  }

  /**
   * A row's or cell's attribute value, by its canonical name;  before its family loads, the attribute's text.
   * - NEVER throws:  a pending element has no definition yet (`valueNamed()` throws then).
   */
  private static value(element: Element, name: string): unknown {
    try {
      const value = (element as Element & { valueNamed?: (name: string) => unknown }).valueNamed?.(name)
      if (value !== undefined) return value
    } catch {
      // pending:  its text, below
    }
    return element.getAttribute(name) ?? undefined
  }

  /** A boolean attribute's value, or its text before the element upgrades (`""`, `"true"`), is on. */
  private static isOn(value: unknown): boolean {
    return value === true || value === "" || value === "true" || value === "yes"
  }
}

/** How two cell texts order (`TableSort.compare()`), handed in:  this file never imports `TableSort`. */
type Compare = (a: unknown, b: unknown, sign: number) => number

/** The row tag. */
const ROW = "ui-row"

/** The cell tag. */
const CELL = "ui-cell"

/** A row's `header`. */
const HEADER = "header"

/** A row's `footer`. */
const FOOTER = "footer"

/** A cell's `span`. */
const SPAN = "span"
