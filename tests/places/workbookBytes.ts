import * as XLSX from "xlsx"

/**
 * A workbook's bytes, for a test:  each sheet's rows (a cell as SheetJS takes it, or a plain value), and its column widths.
 * - A date is a date cell, by its UTC day and time, as a workbook holds one, with no time zone.
 */
export function workbookBytes(sheets: Record<string, unknown[][]>, widths?: number[]): Uint8Array {
  const book = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true, UTC: true })
    if (widths) sheet["!cols"] = widths.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(book, sheet, name)
  }
  return new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer)
}
