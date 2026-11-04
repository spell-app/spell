/**
 * A stub of Airtable's API, for `AirtablePlace`'s tests and the recipe box demo (epic `data` P19).
 * - Fair to what Airtable's pages say, checked 2026-10-31:
 *   - a token it didn't give out:  401;  `schema.bases:read` is a scope a token may not have:  403
 *   - 5 requests a second per base, past it a 429, and then every request 429 for 30 seconds, with no `retry-after`
 *   - a list's pages at most 100, `offset` when there's more, empty cells left out, a filter as a formula, `POST .../listRecords` too
 *   - `PATCH` touches the fields named;  `performUpsert` with one to three `fieldsToMergeOn`, not a worked-out field:
 *     none found makes one, one changes it, several fail;  a record with an `id` ignores it
 *   - 10 records a request:  Airtable's support page says this, and its API reference doesn't
 *   - `PUT` is deliberately not here:  a place that sent one would wipe what it didn't name, and this answers 405
 * - Guesses, marked for the manual test, as no page of Airtable's says:
 *   - what a worked-out field's refusal says (forum posts quote it)
 *   - how an unknown record's write fails:  a 422, `ROW_DOES_NOT_EXIST`
 *   - that a bad record in a batch fails the whole request
 *   - that a create answers in the order it was asked
 * - Node only;  a test helper.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"

/** The one token it gives out. */
export const AIRTABLE_STUB_TOKEN = "patStub.notARealToken"

/** The field types whose cells only Airtable writes. */
const WORKED_OUT = new Set(["formula", "rollup", "multipleLookupValues", "count", "createdTime", "autoNumber"])

/** The types `fieldsToMergeOn` takes, as Airtable's page lists them. */
const MERGE_TYPES = new Set(["number", "singleLineText", "multilineText", "singleSelect", "multipleSelects", "date"])

/** The most records a request can hold. */
const RECORDS_PER_REQUEST = 10

/** The most a page holds. */
const MOST_PER_PAGE = 100

/** One column. */
export type StubField = {
  /** Its name. */
  name: string
  /** Its type:  `singleLineText` if it's left out. */
  type?: string
  /** What a link says of itself. */
  options?: { linkedTableId?: string; prefersSingleRecordLink?: boolean }
  /** What a worked-out cell comes to. */
  worksOut?: (cells: Cells) => unknown
}

/** A record's cells. */
type Cells = Record<string, unknown>

/** One table. */
type StubTable = {
  /** Its `tbl...`. */
  id: string
  /** Its columns. */
  fields: StubField[]
  /** Its records. */
  records: { id: string; createdTime: string; cells: Cells }[]
}

/** One request it's had. */
export type StubAsk = {
  /** Its method. */
  method: string
  /** Its path. */
  path: string
  /** Its JSON. */
  body?: Record<string, unknown>
}

/****************
 * ### `AirtableStub`
 * One base, on a port of its own.
 ****************/
export class AirtableStub {
  /** Its tables, by name. */
  readonly tables = new Map<string, StubTable>()
  /** Each request it's had, oldest first. */
  readonly asks: StubAsk[] = []
  /** How long a limit hit lasts, in ms:  30 seconds, as Airtable's page says, unless a test can't wait. */
  penaltyMs = 30_000
  /** How many times the limit was tripped. */
  limitHits = 0
  /** The most requests in any one second. */
  busiestSecond = 0
  /** Can a token read the schema? */
  canReadSchema = true
  /** The base's id. */
  readonly base: string
  /** The next few requests are answered with a 429, whatever's been spent:  someone else on this base spent the limit. */
  private limited = 0
  /** The next few lists answer that Airtable lost its place. */
  private lostPlaces = 0
  /** When each recent request came. */
  private readonly recent: number[] = []
  /** Nothing's answered before this. */
  private penaltyUntil = 0
  /** The numbers in its ids. */
  private made = 0
  /** Where it is, once `start()` says. */
  private port = 0
  /** Its server. */
  private readonly server = createServer((request, reply) => void this.answer(request, reply))

  constructor(base = "appStubStubStub01") {
    this.base = base
  }

  /** Listen:  on `port`, or a free one. */
  async start(port = 0): Promise<this> {
    await new Promise<void>((done) => this.server.listen(port, "127.0.0.1", done))
    this.port = (this.server.address() as { port: number }).port
    return this
  }

  /** Stop. */
  stop(): Promise<void> {
    return new Promise((done) => {
      this.server.closeAllConnections()
      this.server.close(() => done())
    })
  }

  /** The address a place is told. */
  get url(): string {
    return `http://127.0.0.1:${this.port}/v0`
  }

  /** A table, with these columns and rows, each row by column. */
  addTable(name: string, fields: readonly StubField[], rows: readonly Cells[] = []): this {
    const table: StubTable = { id: `tbl${name}`, fields: [...fields], records: [] }
    this.tables.set(name, table)
    for (const cells of rows) table.records.push(this.newRecord(cells))
    return this
  }

  /** What's in `table`, as a person would see it there:  worked-out cells too. */
  rowsOf(table: string): (Cells & { recordId: string })[] {
    const { fields, records } = this.tables.get(table)!
    return records.map(({ id, cells }) => ({ recordId: id, ...cellsShown(fields, cells) }))
  }

  /** Someone changes a record in Airtable's own window:  nothing the place did. */
  editInAirtable(table: string, recordId: string, cells: Cells): void {
    Object.assign(this.tables.get(table)!.records.find(({ id }) => id === recordId)!.cells, cells)
  }

  /** Someone adds a row in Airtable's own window:  with nothing in Spell's id column.  Its `rec...`. */
  addInAirtable(table: string, cells: Cells): string {
    const record = this.newRecord(cells)
    this.tables.get(table)!.records.push(record)
    return record.id
  }

  /** The next `times` lists hear that Airtable lost its place. */
  losePlace(times = 1): void {
    this.lostPlaces = times
  }

  /** Answer the next `times` requests with a 429:  someone else on this base spent the limit. */
  limitNext(times = 1): void {
    this.limited = times
  }

  /** How many requests matched. */
  asksOf(method: string, path: RegExp): number {
    return this.asks.filter((ask) => ask.method === method && path.test(ask.path)).length
  }

  /** A new record. */
  private newRecord(cells: Cells) {
    return {
      id: `rec${String(++this.made).padStart(14, "0")}`,
      createdTime: new Date().toISOString(),
      cells: { ...cells }
    }
  }

  ////////////////
  // ## Answering
  ////////////////

  /** One request. */
  private async answer(request: IncomingMessage, reply: ServerResponse): Promise<void> {
    const url = new URL(request.url!, "http://stub")
    const path = decodeURIComponent(url.pathname)
    const text = await textOf(request)
    const method = request.method!
    const body = text ? (JSON.parse(text) as Record<string, unknown>) : undefined
    this.asks.push({ method, path, ...(body && { body }) })
    if (this.limited > 0 || this.isOverTheLimit()) {
      this.limited = Math.max(0, this.limited - 1)
      this.limitHits++
      return send(reply, 429, failure("RATE_LIMIT_REACHED", "Rate limit exceeded.  Please try again later"))
    }
    if (request.headers.authorization !== `Bearer ${AIRTABLE_STUB_TOKEN}`) {
      return send(reply, 401, failure("AUTHENTICATION_REQUIRED", "Authentication required"))
    }
    try {
      send(reply, 200, this.answerTo(method, path, url, body))
    } catch (error) {
      if (!(error instanceof StubRefusal)) throw error
      send(reply, error.status, failure(error.type, error.message))
    }
  }

  /** Is this one past 5 in a second, or within a limit's penalty?  Notes it. */
  private isOverTheLimit(): boolean {
    const now = Date.now()
    while (this.recent.length && this.recent[0]! <= now - 1000) this.recent.shift()
    this.recent.push(now)
    this.busiestSecond = Math.max(this.busiestSecond, this.recent.length)
    if (now < this.penaltyUntil) return true
    if (this.recent.length <= 5) return false
    this.penaltyUntil = now + this.penaltyMs
    return true
  }

  /** What to answer.  - throws `StubRefusal` */
  private answerTo(method: string, path: string, url: URL, body: Record<string, unknown> | undefined): object {
    const parts = path.split("/").filter(Boolean)
    if (parts[1] === "meta") return this.schema()
    if (parts[1] !== this.base)
      throw new StubRefusal(
        403,
        "INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND",
        "Invalid permissions, or the requested model was not found"
      )
    const table = this.tables.get(parts[2] ?? "")
    if (!table)
      throw new StubRefusal(
        403,
        "INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND",
        "Invalid permissions, or the requested model was not found"
      )
    if (parts[3] === "listRecords" && method === "POST") return this.list(table, body ?? {})
    if (method === "GET") return this.list(table, Object.fromEntries(url.searchParams))
    if (method === "POST") return this.create(table, body ?? {})
    if (method === "PATCH") return this.update(table, body ?? {})
    if (method === "DELETE") return this.remove(table, url.searchParams.getAll("records[]"))
    throw new StubRefusal(
      405,
      "METHOD_NOT_ALLOWED",
      `This stub takes no ${method}:  PUT would clear every field a request didn't name`
    )
  }

  /** `GET /meta/bases/{base}/tables`. */
  private schema(): object {
    if (!this.canReadSchema) throw new StubRefusal(403, "INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND", "Invalid permissions")
    const tables = [...this.tables].map(([name, { id, fields }]) => ({
      id,
      name,
      fields: fields.map(({ name: field, type = "singleLineText", options }) => ({
        id: `fld${field}`,
        name: field,
        type,
        ...(options && { options })
      }))
    }))
    return { tables }
  }

  /** A list's one page. */
  private list(table: StubTable, ask: Record<string, unknown>): object {
    if (this.lostPlaces > 0 && ask.offset) {
      this.lostPlaces--
      throw new StubRefusal(422, "LIST_RECORDS_ITERATOR_NOT_AVAILABLE", "Iteration has timed out")
    }
    const pageSize = Number(ask.pageSize ?? MOST_PER_PAGE)
    if (pageSize > MOST_PER_PAGE) throw new StubRefusal(422, "INVALID_REQUEST_UNKNOWN", "pageSize is at most 100")
    for (const field of (ask.fields as string[] | undefined) ?? []) this.columnOrDie(table, field)
    const shownOf = (cells: Cells) => cellsShown(table.fields, cells)
    let records = table.records
    if (ask.filterByFormula) {
      const passes = formula(`${ask.filterByFormula as string}`, (column) => this.columnOrDie(table, column))
      records = records.filter(({ id, cells }) => passes(id, shownOf(cells)))
    }
    for (const { field, direction } of [...((ask.sort as { field: string; direction?: string }[]) ?? [])].reverse()) {
      this.columnOrDie(table, field)
      const sign = direction === "desc" ? -1 : 1
      records = records.toSorted((one, other) => {
        const [a, b] = [shownOf(one.cells)[field], shownOf(other.cells)[field]] as [never, never]
        return a === b ? 0 : a > b ? sign : -sign
      })
    }
    const start = Number(`${(ask.offset as string | undefined) ?? "itr/0"}`.split("/")[1])
    const page = records.slice(start, start + pageSize)
    const end = start + pageSize
    return {
      records: page.map((record) => this.recordAnswer(table, record, ask.fields as string[] | undefined)),
      ...(end < records.length && { offset: `itr/${end}` })
    }
  }

  /** `POST`:  new records. */
  private create(table: StubTable, { records = [] }: Record<string, unknown>): object {
    const wanted = this.recordsOrDie(table, records)
    const made = wanted.map(({ fields }) => this.newRecord(fields ?? {}))
    table.records.push(...made)
    return { records: made.map((record) => this.recordAnswer(table, record)) }
  }

  /** `PATCH`:  the fields named, of each record;  with `performUpsert`, by what's in its merge columns. */
  private update(table: StubTable, { records = [], performUpsert }: Record<string, unknown>): object {
    const wanted = this.recordsOrDie(table, records)
    const { fieldsToMergeOn } = (performUpsert ?? {}) as { fieldsToMergeOn?: string[] }
    if (fieldsToMergeOn) this.mergeColumnsOrDie(table, fieldsToMergeOn)
    const found = wanted.map(({ id, fields = {} }) => ({
      fields,
      record:
        id !== undefined
          ? (table.records.find((record) => record.id === id) ?? missingRecord(id))
          : fieldsToMergeOn
            ? this.onlyMatch(table, fieldsToMergeOn, fields)
            : missingRecord("")
    }))
    const created: string[] = []
    const updated: string[] = []
    const changed = found.map(({ record, fields }) => {
      if (record) {
        updated.push(record.id)
        Object.assign(record.cells, fields)
        return record
      }
      const made = this.newRecord(fields)
      table.records.push(made)
      created.push(made.id)
      return made
    })
    return {
      ...(fieldsToMergeOn && { createdRecords: created, updatedRecords: updated }),
      records: changed.map((record) => this.recordAnswer(table, record))
    }
  }

  /** `DELETE`. */
  private remove(table: StubTable, ids: readonly string[]): object {
    if (ids.length > RECORDS_PER_REQUEST) throw new StubRefusal(422, "INVALID_RECORDS", "At most 10 records a request")
    for (const id of ids) if (!table.records.some((record) => record.id === id)) missingRecord(id)
    table.records = table.records.filter(({ id }) => !ids.includes(id))
    return { records: ids.map((id) => ({ id, deleted: true })) }
  }

  /** The one record `fields` matches on these columns:  `undefined` for none.  - throws for several, as Airtable's page says */
  private onlyMatch(table: StubTable, columns: readonly string[], fields: Cells) {
    const matches = table.records.filter(({ cells }) => columns.every((column) => cells[column] === fields[column]))
    if (matches.length > 1) throw new StubRefusal(422, "INVALID_RECORDS", "Several records match fieldsToMergeOn")
    return matches[0]
  }

  /** - throws `StubRefusal` for columns `fieldsToMergeOn` can't take */
  private mergeColumnsOrDie(table: StubTable, columns: readonly string[]): void {
    if (columns.length < 1 || columns.length > 3)
      throw new StubRefusal(422, "INVALID_REQUEST_UNKNOWN", "fieldsToMergeOn takes one to three")
    for (const column of columns) {
      const { type = "singleLineText" } = this.columnOrDie(table, column)
      if (!MERGE_TYPES.has(type))
        throw new StubRefusal(422, "INVALID_REQUEST_UNKNOWN", `"${column}" can't be merged on`)
    }
  }

  /** `records`, every cell of each checked:  a bad one fails the request.  - throws `StubRefusal` */
  private recordsOrDie(table: StubTable, records: unknown): { id?: string; fields?: Cells }[] {
    const wanted = records as { id?: string; fields?: Cells }[]
    if (wanted.length > RECORDS_PER_REQUEST)
      throw new StubRefusal(422, "INVALID_RECORDS", "At most 10 records a request")
    for (const { fields = {} } of wanted) {
      for (const [column, value] of Object.entries(fields)) this.cellOrDie(table, column, value)
    }
    return wanted
  }

  /** - throws `StubRefusal` for a value this column can't hold */
  private cellOrDie(table: StubTable, column: string, value: unknown): void {
    const { type = "singleLineText" } = this.columnOrDie(table, column)
    if (WORKED_OUT.has(type)) {
      throw new StubRefusal(
        422,
        "INVALID_VALUE_FOR_COLUMN",
        `Field "${column}" cannot accept a value because the field is computed`
      )
    }
    const isWrongType =
      value !== null &&
      ((type === "number" && typeof value !== "number") ||
        (type === "singleLineText" && typeof value !== "string") ||
        (type === "multipleRecordLinks" && !Array.isArray(value)))
    if (isWrongType) {
      throw new StubRefusal(422, "INVALID_VALUE_FOR_COLUMN", `Field "${column}" cannot accept the provided value`)
    }
  }

  /** - throws `StubRefusal` for a column that isn't there */
  private columnOrDie(table: StubTable, column: string): StubField {
    const field = table.fields.find(({ name }) => name === column)
    if (!field) throw new StubRefusal(422, "UNKNOWN_FIELD_NAME", `Unknown field name: "${column}"`)
    return field
  }

  /** A record as an answer holds it:  every empty cell left out. */
  private recordAnswer(
    { fields }: StubTable,
    { id, createdTime, cells }: StubTable["records"][number],
    only?: string[]
  ): object {
    const shown = Object.entries(cellsShown(fields, cells)).filter(
      ([column, value]) => !isEmpty(value) && (!only || only.includes(column))
    )
    return { id, createdTime, fields: Object.fromEntries(shown) }
  }
}

/** What a request failed with. */
class StubRefusal extends Error {
  /** The status it's answered with. */
  readonly status: number
  /** Airtable's name for it. */
  readonly type: string

  constructor(status: number, type: string, message: string) {
    super(message)
    this.status = status
    this.type = type
  }
}

/** - throws:  a write to a record that isn't there */
function missingRecord(id: string): never {
  throw new StubRefusal(422, "ROW_DOES_NOT_EXIST", `Record ID ${id} does not exist in this table`)
}

/** `cells`, with what's worked out, worked out. */
function cellsShown(fields: readonly StubField[], cells: Cells): Cells {
  const shown = { ...cells }
  for (const { name, worksOut } of fields) if (worksOut) shown[name] = worksOut(cells)
  return shown
}

/** Would Airtable leave this cell out? */
function isEmpty(value: unknown): boolean {
  return (
    value === undefined || value === null || value === "" || value === false || (Array.isArray(value) && !value.length)
  )
}

/** Airtable's shape of a failure. */
function failure(type: string, message: string): object {
  return { error: { type, message } }
}

/**
 * Only what `AirtablePlace` writes of Airtable's formula language:  `AND()`, `OR()`, `RECORD_ID()`, `{column}=value`.
 * - throws `StubRefusal` for anything else
 */
function formula(text: string, columnOrDie: (column: string) => unknown): (recordId: string, cells: Cells) => boolean {
  const call = /^(AND|OR)\((.*)\)$/s.exec(text)
  if (call) {
    const parts = splitTop(call[2]!).map((part) => formula(part, columnOrDie))
    return call[1] === "AND"
      ? (recordId, cells) => parts.every((part) => part(recordId, cells))
      : (recordId, cells) => parts.some((part) => part(recordId, cells))
  }
  const [, left, right] = /^(\{(?:\\.|[^}])*\}|RECORD_ID\(\))=(.*)$/s.exec(text) ?? []
  if (!left) throw new StubRefusal(422, "INVALID_FILTER_BY_FORMULA", `The formula "${text}" is invalid`)
  const wanted = literalIn(right!, text)
  if (left === "RECORD_ID()") return (recordId) => recordId === wanted
  const column = left.slice(1, -1).replace(/\\(.)/g, "$1")
  columnOrDie(column)
  return (_recordId, cells) => (wanted === null ? isEmpty(cells[column]) : (cells[column] ?? false) === wanted)
}

/** A formula's value. */
function literalIn(text: string, whole: string): unknown {
  if (text === "BLANK()") return null
  if (text === "TRUE()") return true
  if (text === "FALSE()") return false
  if (text.startsWith('"')) return text.slice(1, -1).replace(/\\(.)/g, "$1")
  const number = Number(text)
  if (Number.isNaN(number)) throw new StubRefusal(422, "INVALID_FILTER_BY_FORMULA", `The formula "${whole}" is invalid`)
  return number
}

/** `text`, split at its top level's commas. */
function splitTop(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let isInText = false
  let start = 0
  for (let at = 0; at < text.length; at++) {
    const char = text[at]!
    if (char === "\\") at++
    else if (char === '"') isInText = !isInText
    else if (!isInText && (char === "(" || char === "{")) depth++
    else if (!isInText && (char === ")" || char === "}")) depth--
    else if (!isInText && !depth && char === ",") {
      parts.push(text.slice(start, at))
      start = at + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

/** A request's body. */
async function textOf(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString()
}

/** Answer as JSON. */
function send(reply: ServerResponse, status: number, body: object): void {
  reply.writeHead(status, { "Content-Type": "application/json" })
  reply.end(JSON.stringify(body))
}
