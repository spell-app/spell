/**
 * Where an answer holds its rows:  the ONE way a list wrapped in an answer is unwrapped, for a read
 * (`RestPlace`), for a look at real rows (`PlaceLook`) and for an OpenAPI description's schemas (`PlaceSpec`).
 * - `{ count, results: [...] }`, `{ items: [...], total }`:  a field a list's rows usually go under.
 * - Else its one list:  `{ sources: [...], next_offset: 20 }`.
 * - Else its one list of THINGS, beside lists of plain values:  `{ sources: [...], warnings: ["..."] }`.
 * - Imports nothing:  the parser's ingest takes it by file.
 */

/** The fields a list's rows usually go under, in an answer that wraps them. */
export const ROWS_FIELDS: readonly string[] = ["results", "data", "items", "records", "rows"]

/** What a field holds, as `rowsFieldIn()` asks:  a list of things, a list of plain values, or no list. */
export type ListKind = "things" | "values" | undefined

/**
 * The field of `fields` that holds the rows:  `undefined` for none, or several it can't choose between.
 * - `kindOf`:  what a field's value (or its schema) holds.
 */
export function rowsFieldIn<Value>(
  fields: Readonly<Record<string, Value>>,
  kindOf: (value: Value) => ListKind
): string | undefined {
  const lists = Object.keys(fields).filter((field) => kindOf(fields[field]!) !== undefined)
  const named = ROWS_FIELDS.find((field) => lists.includes(field))
  if (named !== undefined || lists.length === 1) return named ?? lists[0]
  const things = lists.filter((field) => kindOf(fields[field]!) === "things")
  return things.length === 1 ? things[0] : undefined
}

/**
 * The rows in `body`, an answer that wraps them, and where:  `undefined` for an answer that isn't an object, or holds
 * no list it can tell is its rows.
 * - An empty list may be of things:  only a list holding a plain value is one of values.
 * - Several lists of things, every one empty:  no rows, under the first.
 */
export function wrappedRows(body: unknown): { rows: unknown[]; rowsAt: string } | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined
  const fields = body as Record<string, unknown>
  const rowsAt =
    rowsFieldIn(fields, kindOfValue) ??
    Object.keys(fields).find((field) => kindOfValue(fields[field]) === "things" && isEveryListEmpty(fields))
  return rowsAt === undefined ? undefined : { rows: fields[rowsAt] as unknown[], rowsAt }
}

/** What a value holds:  a list of things, unless it holds a plain value. */
function kindOfValue(value: unknown): ListKind {
  if (!Array.isArray(value)) return undefined
  return value.every((each) => !!each && typeof each === "object") ? "things" : "values"
}

/** Is every list in `fields` empty? */
function isEveryListEmpty(fields: Record<string, unknown>): boolean {
  return Object.values(fields).every((value) => !Array.isArray(value) || value.length === 0)
}

/**
 * The rows in `body`, an answer to a read of a list:  `undefined` for an answer that holds none.
 * - A bare list IS its rows, whatever `rowsAt` says:  a server whose description wraps its rows may answer without.
 * - Else those under `rowsAt`, when it's said;  else those under the field that wraps them, and where (`wrappedRows()`).
 */
export function rowsIn(body: unknown, rowsAt?: string): { rows: unknown[]; rowsAt?: string } | undefined {
  if (Array.isArray(body)) return { rows: body }
  if (rowsAt === undefined) return wrappedRows(body)
  const held = (body as Record<string, unknown> | null | undefined)?.[rowsAt]
  return Array.isArray(held) ? { rows: held, rowsAt } : undefined
}
