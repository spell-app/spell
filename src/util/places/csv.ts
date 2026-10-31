/** Where a field with no quotes ends. */
const FIELD_END = /[,\r\n]/g

/** What some programs start a text file with. */
const BYTE_ORDER_MARK = "﻿"

/**
 * The rows of a CSV file, as text:  commas between fields, double quotes around any field that needs them.
 * - As RFC 4180 says, and as spreadsheets write it:
 *   - a quoted field can hold commas and line ends;  `""` inside it is one `"`
 *   - lines end in `\n`, `\r\n` or `\r`;  the last line needn't end at all
 * - As spreadsheets read what's a little off:  a `"` inside an unquoted field is just a `"`, and text after a field's
 *   closing quote stays on the end of it.
 * - A line with nothing on it is no row, wherever it is.
 * - Every value is text:  what a column means is its reader's to say (`SheetTable`).
 * - A small copy of "A new syntax" in the coherence catalog, on purpose:  util sits under the parser, so it can't reach
 *   its tokenizer, and this is the one format it needs.
 * - throws `SyntaxError` for a quoted field that never closes, as in a file half saved
 */
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let at = csv.startsWith(BYTE_ORDER_MARK) ? BYTE_ORDER_MARK.length : 0
  if (at >= csv.length) return rows
  for (;;) {
    const { value, end } = csv[at] === '"' ? quotedField(csv, at, rows.length + 1) : plainField(csv, at)
    row.push(value)
    if (csv[end] === ",") {
      at = end + 1
      continue
    }
    if (row.length > 1 || row[0]) rows.push(row)
    row = []
    at = end + (csv.startsWith("\r\n", end) ? 2 : 1)
    if (at >= csv.length) return rows
  }
}

/** One field read from a CSV file. */
type CsvField = {
  /** Its text. */
  value: string
  /** Where the comma or line end after it is:  the file's length if it's the last. */
  end: number
}

/** The field with no quotes starting at `start`. */
function plainField(csv: string, start: number): CsvField {
  FIELD_END.lastIndex = start
  const end = FIELD_END.exec(csv)?.index ?? csv.length
  return { value: csv.slice(start, end), end }
}

/** The quoted field starting at `start`, on row `rowNumber`.  - throws `SyntaxError` if it never closes */
function quotedField(csv: string, start: number, rowNumber: number): CsvField {
  let value = ""
  let from = start + 1
  for (;;) {
    const close = csv.indexOf('"', from)
    if (close < 0)
      throw new SyntaxError(`parseCsv():  a quoted field on row ${rowNumber} never closes;  add its " at the end`)
    value += csv.slice(from, close)
    if (csv[close + 1] !== '"') {
      const rest = plainField(csv, close + 1)
      return { value: value + rest.value, end: rest.end }
    }
    value += '"'
    from = close + 2
  }
}
