/** Where a field with no quotes ends. */
const FIELD_END = /[,\r\n]/g

/** What some programs start a text file with. */
const BYTE_ORDER_MARK = "﻿"

/** What needs quotes in a CSV file. */
const NEEDS_QUOTES = /[",\r\n]/

/** One field of a line of a CSV file. */
export type CsvCell = {
  /** Its text, unquoted. */
  value: string
  /** Exactly as the file holds it:  what's written back while it hasn't changed. */
  raw: string
}

/** One line of a CSV file, which a quoted line end makes longer than one line of text. */
export type CsvLine = {
  /** Its fields:  one with nothing in it, for a line with nothing on it. */
  cells: CsvCell[]
  /** What ends it, as the file holds it:  `""` only on the last line. */
  ending: string
}

/** A CSV file's text, in pieces which put back together are that text, byte for byte. */
export type CsvLines = {
  /** The byte order mark it starts with:  `""` for none. */
  byteOrderMark: string
  /** Every line, those with nothing on them too. */
  lines: CsvLine[]
}

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
  return csvLinesIn(csv)
    .lines.filter(isCsvRow)
    .map(({ cells }) => cells.map(({ value }) => value))
}

/** Does `line` hold a row?  One with nothing on it doesn't. */
export function isCsvRow({ cells }: CsvLine): boolean {
  return cells.length > 1 || !!cells[0]?.value
}

/**
 * The lines of a CSV file, keeping what `parseCsv()` throws away:  how each field was written, each line's end, the blank lines.
 * - What lets a save change one line and leave the rest alone (`CsvFile`).
 * - throws `SyntaxError` for a quoted field that never closes, as in a file half saved
 */
export function csvLinesIn(csv: string): CsvLines {
  const byteOrderMark = csv.startsWith(BYTE_ORDER_MARK) ? BYTE_ORDER_MARK : ""
  const lines: CsvLine[] = []
  let cells: CsvCell[] = []
  let at = byteOrderMark.length
  if (at >= csv.length) return { byteOrderMark, lines }
  for (;;) {
    const { value, end } = csv[at] === '"' ? quotedField(csv, at, lines.length + 1) : plainField(csv, at)
    cells.push({ value, raw: csv.slice(at, end) })
    if (csv[end] === ",") {
      at = end + 1
      continue
    }
    const ending = csv.startsWith("\r\n", end) ? "\r\n" : (csv[end] ?? "")
    lines.push({ cells, ending })
    cells = []
    at = end + ending.length
    if (at >= csv.length) return { byteOrderMark, lines }
  }
}

/** `value`, as a CSV file holds it:  in quotes if it needs them, or if `quoted`. */
export function csvCellFor(value: string, quoted = false): string {
  return quoted || NEEDS_QUOTES.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** The text of `line`, with no line end:  its fields as the file holds them. */
export function csvLineText({ cells }: CsvLine): string {
  return cells.map(({ raw }) => raw).join(",")
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
