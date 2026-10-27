import { E, UI } from "spell/ui/core"

/****************
 * ### `TableRows`
 * How a table made of `<ui-row>`s and `<ui-cell>`s is read (epic `ui-gaps` P7):  its shape for `TableSort`'s walk
 * (`TableShape`:  the class itself is it), and the rows-mode grid's own questions (its rows, its column count).
 * - Plain DOM, no state.
 * - Rows are the table's own children;  cells, each row's.
 *   Tags by their CANONICAL name (`UI.vocabulary.canonicalTagFor()`), so a translated page's `<es-fila>` counts.
 * - A row is a header row with `header`, a footer row with `footer`;  every other row is the body.
 * - Every cell of a header row is a header;  columns count `span`s, as a native table's count `colspan`s;
 *   cells never span rows.
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
    return TableRows.isOn(row, HEADER)
  }

  /** Is `row` a footer row? */
  static isFooterRow(row: Element): boolean {
    return TableRows.isOn(row, FOOTER)
  }

  /** Columns `cell` covers:  its `span`, a whole number, at least 1. */
  static span(cell: Element): number {
    return TableRows.spanOf(TableRows.value(cell, SPAN))
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

  ////////////////
  // ## Its shape, for `TableSort`
  ////////////////

  /** The header rows of `table`, top first. */
  static headerRows(table: Element): Element[] {
    return TableRows.rows(table).filter((row) => TableRows.isHeaderRow(row))
  }

  /** The body rows, one group:  every row but the header and footer rows. */
  static bodies(table: Element): Element[][] {
    return [TableRows.rows(table).filter((row) => !TableRows.isHeaderRow(row) && !TableRows.isFooterRow(row))]
  }

  /** Every cell of a header row is a header. */
  static isHeader(_cell: Element): boolean {
    return true
  }

  /** Put the body rows back, sorted:  before the first footer row, header rows staying first. */
  static place(table: Element, sorted: Element[]) {
    const footer = TableRows.rows(table).find((row) => TableRows.isFooterRow(row))
    for (const row of sorted) table.insertBefore(row, footer ?? null)
  }

  /**
   * A span from what a `span` or `colspan` attribute says (`"2"`, `2`):  a whole number, at least 1.
   * - Static:  a native table's `colspan` (`TableSort`) and `<ui-cell>`'s own read through it too.
   */
  static spanOf(value: unknown): number {
    const span = Math.floor(Number(value))
    return Number.isFinite(span) && span > 1 ? span : 1
  }

  ////////////////
  // ## Reading the elements
  ////////////////

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

  /** Is boolean attribute `name` of `element` on:  its value, or its text before the element upgrades (`""`, `"true"`)? */
  private static isOn(element: Element, name: string): boolean {
    const value = TableRows.value(element, name)
    return E.Converters.boolean(typeof value === "boolean" || typeof value === "string" ? value : undefined, name)
  }
}

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
