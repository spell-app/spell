import { ApiError, type ApiRequest } from "spell/util/fetching"
import {
  PlaceError,
  type ApplyAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceRow,
  type RateLimit
} from "spell/util/places/places.types"
import { SheetTable } from "spell/util/places/SheetTable"
import { jsonIn, WebPlace } from "spell/util/places/WebPlace"

import { GoogleToken } from "./GoogleToken"
import type { PlaceKeys } from "./PlaceKeys"
import { RateQueue } from "./RateQueue"

/** Google's address for spreadsheets. */
const SHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets"

/** Google's limit per person per project, for reads and for writes, each:  a service account is one person. */
const SHEETS_LIMIT: RateLimit = { requests: 60, perSeconds: 60 }

/** Numbers and true / false as what they are, and a date as the sheet shows it. */
const READ_AS = { valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "FORMATTED_STRING" }

/** The one part of a cell a write sets:  its formatting stays. */
const CELL_VALUE = "userEnteredValue"

/** Why Google says no to an account that hasn't been given the sheet. */
const NOT_SHARED_STATUS = 403

/****************
 * ### `GoogleSheetPlace`
 * A Google Sheet as a place, read and written:  each tab a collection, its first row the column names (epic `data` P7).
 *
 * ```ts
 * const keys = new PlaceKeys({ names: ["GOOGLE_SHEETS_KEY"] })
 * new GoogleSheetPlace({ spreadsheet: "1Bxi...", keyNamed: "GOOGLE_SHEETS_KEY", keys, idColumn: "id" })
 * ```
 *
 * - On a SERVER SIDE:  Google's write API takes no plain key, only a token from a service account's key file, which a page
 *   must never hold.  So a browser reaches this through `PlaceServer` and `RemotePlace`.
 *   - With no key at all, and read only:  `SheetPlace`, on the sheet's CSV address.
 * - READS:  one request for a whole tab.  Sheets' API can't filter, or pick columns without knowing them:  the engine does.
 * - WRITES:  a whole `apply()` is one read and ONE `spreadsheets:batchUpdate`, which Google applies all or none:  `atomic`.
 *   - A write's a value, never a formula:  text starting `=` stays text, so what someone typed can't run.
 *   - A field with no column is refused:  it doesn't add columns to someone's sheet.
 *   - No `idColumn`:  no write, since nothing says which row is which.
 *   - An insert with an id it holds changes that row, so sending it again doesn't double it.
 * - Limits:  through a `RateQueue` per kind of request and per key, as Google counts them.
 * - NO VERSIONS:  Sheets has none, so `versionCheck` is off:  the last save wins that cell.
 * - KNOWN RACE:  a row is found by reading, then written by its position, a moment later:  a person adding or removing a row
 *   above it in that moment sends the write to the wrong row.  Nothing in Sheets' API can make that conditional.
 * - A formula cell written over loses its formula:  this reads what it works out to, and can't tell.
 * - Node only.
 ****************/
export class GoogleSheetPlace extends WebPlace implements Place {
  /** The spreadsheet, by the id in its address. */
  private readonly spreadsheet: string
  /** The column holding each row's id. */
  private readonly idColumn: string | undefined
  /** The tab each collection is on, where it isn't called the same. */
  private readonly tabs: Readonly<Record<string, string>>
  /** The token on each request. */
  private readonly token: GoogleToken
  /** Each tab's number, by its title, once known:  what a write names it by. */
  private readonly sheetIds = new Map<string, number>()

  constructor({ spreadsheet, keyNamed, keys, idColumn, tabs = {}, url = SHEETS_URL }: GoogleSheetPlaceProps) {
    const token = new GoogleToken({ keyNamed, keys })
    super({ url, keyNamed, keyFrom: token.current, changeIdHeader: false })
    this.spreadsheet = spreadsheet
    this.idColumn = idColumn
    this.tabs = tabs
    this.token = token
  }

  /** What it can do:  be read whole, and written all or none if rows have ids. */
  describe(): PlaceCapabilities {
    const write = this.idColumn === undefined ? "none" : (["insert", "update", "delete"] as const)
    return {
      kind: "sheet",
      ...(this.idColumn !== undefined && { idOf: this.idColumn }),
      filter: "none",
      sort: "none",
      select: "none",
      page: "none",
      write,
      atomic: true,
      live: "poll",
      rateLimit: SHEETS_LIMIT,
      abort: "hard"
    }
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * Every row of `collection`'s tab.
   * - throws `PlaceError`:  refused for a sheet not shared with the account, not found for one that isn't there;
   *   anything else for no answer
   */
  async list(collection: string, _query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    const { rows, notes } = await this.tableOf(collection, context)
    return { rows, ...(notes.length && { notes }), handled: {} }
  }

  /** `collection`'s tab, now. */
  private async tableOf(collection: string, context: PlaceContext): Promise<SheetTable> {
    const range = `'${this.tabOf(collection).replaceAll("'", "''")}'`
    const response = await this.answerTo(
      {
        url: `${this.url}/{spreadsheet}/values/{range}`,
        urlData: { spreadsheet: this.spreadsheet, range },
        data: READ_AS
      },
      context
    )
    const { values = [] } = (await jsonIn(response)) as { values?: unknown[][] }
    return new SheetTable({ name: collection, cells: values, idColumn: this.idColumn })
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes, all or none, in one request.
   * - throws `PlaceError`:  refused for a place with no ids, or a field with no column;
   *   not found for an id it doesn't hold;  anything else for no answer
   */
  async apply(changes: readonly PlaceChange[], context: PlaceContext): Promise<ApplyAnswer> {
    if (this.idColumn === undefined) {
      throw new PlaceError(
        `GoogleSheetPlace.apply():  rows here have no id, so nothing says which one to change;  name an \`idColumn\``,
        {
          cause: { kind: "refused", whyNot: "place" }
        }
      )
    }
    const edits = new Map<string, TabEdit>()
    const rows: PlaceRow[] = []
    for (const change of changes) {
      const edit = await this.editOf(edits, change.collection, context)
      rows.push(...edit.make(change))
    }
    const requests = await this.requestsFor(edits, context)
    if (requests.length) {
      await this.answerTo(
        {
          url: `${this.url}/{spreadsheet}:batchUpdate`,
          urlData: { spreadsheet: this.spreadsheet },
          method: "POST",
          data: { requests }
        },
        context
      )
    }
    return { rows }
  }

  /** What's being done to `collection`'s tab:  reads it the first time. */
  private async editOf(edits: Map<string, TabEdit>, collection: string, context: PlaceContext): Promise<TabEdit> {
    let edit = edits.get(collection)
    if (!edit) {
      edit = new TabEdit({ collection, table: await this.tableOf(collection, context), idColumn: this.idColumn! })
      edits.set(collection, edit)
    }
    return edit
  }

  /** Every request those edits come to. */
  private async requestsFor(edits: ReadonlyMap<string, TabEdit>, context: PlaceContext): Promise<object[]> {
    const requests: object[] = []
    for (const [collection, edit] of edits) {
      requests.push(...edit.requests(await this.sheetIdOf(collection, context)))
    }
    return requests
  }

  /** The number of `collection`'s tab.  - throws `PlaceError` `"not found"` */
  private async sheetIdOf(collection: string, context: PlaceContext): Promise<number> {
    const tab = this.tabOf(collection)
    if (!this.sheetIds.has(tab)) await this.readSheetIds(context)
    const sheetId = this.sheetIds.get(tab)
    if (sheetId !== undefined) return sheetId
    throw new PlaceError(`GoogleSheetPlace:  the spreadsheet has no tab called "${tab}"`, {
      cause: { kind: "not found" }
    })
  }

  /** Learn each tab's number:  they stay the same when a tab's renamed, so its title is looked up again only when it's missed. */
  private async readSheetIds(context: PlaceContext): Promise<void> {
    const response = await this.answerTo(
      {
        url: `${this.url}/{spreadsheet}`,
        urlData: { spreadsheet: this.spreadsheet },
        data: { fields: "sheets.properties(sheetId,title)" }
      },
      context
    )
    const { sheets = [] } = (await jsonIn(response)) as SpreadsheetAnswer
    for (const { properties } of sheets) this.sheetIds.set(properties.title, properties.sheetId ?? 0)
  }

  ////////////////
  // ## Each request
  ////////////////

  /** Every request waits its turn under Google's limit:  reads and writes are counted apart. */
  protected answerTo(request: ApiRequest, context: PlaceContext, changeId?: string): Promise<Response> {
    const kind = request.method === undefined || request.method === "GET" ? "reads" : "writes"
    const queue = RateQueue.named(`Google Sheets ${kind} on ${this.keyNamed}`, SHEETS_LIMIT)
    return queue.run(() => super.answerTo(request, context, changeId), { signal: context.signal })
  }

  /** A 403 nearly always means one thing, and the fix is in Google's own screen. */
  protected messageOf(error: ApiError): Promise<string> | string {
    if (error.status !== NOT_SHARED_STATUS) return super.messageOf(error)
    const email = this.token.accountEmail
    return `GoogleSheetPlace:  Google says the account can't reach this sheet;  share it with ${email ?? "the service account"}, as an editor`
  }

  /** The tab `collection` is on. */
  private tabOf(collection: string): string {
    return this.tabs[collection] ?? collection
  }
}

/** Constructor props of a `GoogleSheetPlace`. */
export type GoogleSheetPlaceProps = {
  /** The spreadsheet's id:  in its address, between `/d/` and `/edit`. */
  spreadsheet: string
  /** The NAME of the key holding a service account's key file, as JSON. */
  keyNamed: string
  /** The keys this server side holds, where it finds that one:  what it makes from it goes in here, to be scrubbed too. */
  keys: PlaceKeys
  /** The column holding each row's id.  Left out:  rows share no identity, and it can't be written. */
  idColumn?: string
  /** The tab each collection is on, where it isn't called the same:  `{ recipes: "Family recipes" }`. */
  tabs?: Readonly<Record<string, string>>
  /** Google's address:  a test's stub's, in a test. */
  url?: string
}

/** What Google says of a spreadsheet's tabs:  only what `readSheetIds()` asks for. */
type SpreadsheetAnswer = {
  /** Each tab. */
  sheets?: {
    /** About it. */
    properties: {
      /** Its name. */
      title: string
      /** Its number:  left out for 0, as JSON from Google leaves out zeroes. */
      sheetId?: number
    }
  }[]
}

/****************
 * ### `TabEdit`
 * What one `apply()` does to one tab:  changes made in order, on what was read, then written as requests in an order that holds.
 * - Row positions are all as READ.  So the requests go:  cells, then new rows at the end, then deletes from the bottom up:
 *   nothing moves a row that's still to be written.
 * - A row inserted and changed or deleted in one batch is only ever one row, or none.
 ****************/
class TabEdit {
  /** The collection. */
  private readonly collection: string
  /** The tab, as read. */
  private readonly table: SheetTable
  /** The field holding a row's id. */
  private readonly idColumn: string
  /** Each new row, by id. */
  private readonly added = new Map<string, PlaceRow>()
  /** The fields written on each row it read, by the row's position. */
  private readonly written = new Map<number, PlaceRow>()
  /** Each row it read that's going, by position. */
  private readonly deleted = new Set<number>()

  constructor({ collection, table, idColumn }: { collection: string; table: SheetTable; idColumn: string }) {
    this.collection = collection
    this.table = table
    this.idColumn = idColumn
  }

  /** Make `change`:  its row, as it'll now be kept, unless it deleted one.  - throws `PlaceError`, as `apply()` */
  make({ kind, id, fields = {} }: PlaceChange): PlaceRow[] {
    if (id === undefined) {
      throw new TypeError(
        `GoogleSheetPlace.apply():  a change in "${this.collection}" needs an id;  this place makes none`
      )
    }
    for (const field of Object.keys(fields)) this.fieldOrDie(field)
    const rowIndex = this.table.rowIndexOf(id)
    const isThere = rowIndex !== undefined && !this.deleted.has(rowIndex)
    if (kind === "insert" && !isThere) {
      const row = { [this.idColumn]: id, ...fields }
      this.added.set(id, row)
      return [row]
    }
    if (this.added.has(id)) {
      if (kind !== "delete") return [Object.assign(this.added.get(id)!, fields)]
      this.added.delete(id)
      return []
    }
    if (!isThere) {
      throw new PlaceError(`GoogleSheetPlace.apply():  "${this.collection}" holds nothing with the id "${id}"`, {
        cause: { kind: "not found" }
      })
    }
    if (kind === "delete") {
      this.deleted.add(rowIndex)
      this.written.delete(rowIndex)
      return []
    }
    const written = Object.assign(this.written.get(rowIndex) ?? {}, fields)
    this.written.set(rowIndex, written)
    const shown = this.table.rows.find((row) => `${row[this.idColumn] as string}` === id)
    return [{ ...shown, ...written }]
  }

  /** These edits, as requests to `spreadsheets:batchUpdate`, on the tab numbered `sheetId`. */
  requests(sheetId: number): object[] {
    const cells = [...this.written].flatMap(([rowIndex, fields]) =>
      Object.entries(fields).map(([field, value]) => ({
        updateCells: {
          start: { sheetId, rowIndex, columnIndex: this.table.columnIndexOf(field) },
          rows: [{ values: [cellOf(value)] }],
          fields: CELL_VALUE
        }
      }))
    )
    const added = this.added.size
      ? [
          {
            appendCells: {
              sheetId,
              rows: [...this.added.values()].map((row) => ({
                values: this.table.columns.map((column) => cellOf(column ? row[column] : undefined))
              })),
              fields: CELL_VALUE
            }
          }
        ]
      : []
    const deletes = [...this.deleted]
      .sort((one, other) => other - one)
      .map((rowIndex) => ({
        deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } }
      }))
    return [...cells, ...added, ...deletes]
  }

  /** - throws `PlaceError` `"refused"`, `"field"`, if the tab has no column for it */
  private fieldOrDie(field: string): void {
    if (this.table.columnIndexOf(field) >= 0) return
    throw new PlaceError(
      `GoogleSheetPlace.apply():  "${this.collection}" has no column "${field}";  add it to the sheet first`,
      {
        cause: { kind: "refused", whyNot: "field" }
      }
    )
  }
}

/** `value` as a cell Google is sent:  always a value, never a formula. */
function cellOf(value: unknown): object {
  if (value === undefined || value === null) return {}
  if (typeof value === "number") return { userEnteredValue: { numberValue: value } }
  if (typeof value === "boolean") return { userEnteredValue: { boolValue: value } }
  return { userEnteredValue: { stringValue: typeof value === "string" ? value : JSON.stringify(value) } }
}
