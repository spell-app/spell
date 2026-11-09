import { randomUUID } from "node:crypto"

import { LoadOnce } from "spell/util/LoadOnce"
import { ApiError, type ApiRequest } from "spell/util/fetching"
import { FieldNames } from "spell/places/FieldNames"
import { DEFAULT_CEILING } from "spell/places/PlaceQuery"
import {
  PlaceError,
  type ApplyAnswer,
  type ChangesAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceEvent,
  type PlaceLines,
  type PlaceRow,
  type RateLimit,
  type WatchTarget,
  type WhyNotWritable,
  type WriteAnswer,
  type WriteQuestion
} from "spell/places/places.types"
import { jsonIn, WebPlace } from "spell/places/WebPlace"
import { every } from "spell/util/timing"

import { PlaceEvents } from "./PlaceEvents"
import type { PlaceKeys } from "./PlaceKeys"
import { RateQueue } from "./RateQueue"

/** Airtable's address. */
const AIRTABLE_URL = "https://api.airtable.com/v0"

/** Airtable's limit per base, shared by everyone using it, and its batches:  a 429 lasts 30 seconds, and its answer doesn't say so. */
const BASE_LIMIT: RateLimit = { requests: 5, perSeconds: 1, changesPerRequest: 10, waitAfterHitSeconds: 30 }

/**
 * What it keeps to under `BASE_LIMIT`:  a little under, since what counts is when requests ARRIVE, and they don't arrive evenly.
 * - A request a moment late makes six in Airtable's second, and that costs 30 seconds of everyone's, so 4 a second is the better deal.
 */
const BASE_LIMIT_KEPT: RateLimit = { ...BASE_LIMIT, perSeconds: 1.25 }

/** Airtable's limit per key, across every base it reaches. */
const KEY_LIMIT: RateLimit = { requests: 50, perSeconds: 1, waitAfterHitSeconds: 30 }

/** The most a page of a list holds. */
const PAGE_SIZE = 100

/** The most changes a request can hold. */
const RECORDS_PER_REQUEST = BASE_LIMIT.changesPerRequest!

/** How many times a list starts again after Airtable lost its place in it. */
const MOST_RESTARTS = 3

/** How long an answer is shared, in seconds, for a place with no `checkedEvery`:  so tabs opening together are one read. */
const SHARED_SECONDS = 5

/** How many ids go in one formula when looking them up. */
const IDS_PER_LOOKUP = 50

/** The field a row's id is under, whichever column holds it. */
const ID_FIELD = "id"

/** Airtable lost its place in a list:  it asks to start again. */
const LOST_ITS_PLACE = /LIST_RECORDS_ITERATOR_NOT_AVAILABLE/

/** A record that isn't there, as a write's answer says it, by `type` or status. */
const NO_SUCH_RECORD = /ROW_DOES_NOT_EXIST|RECORD_NOT_FOUND|NOT_FOUND/

/** What a refused write says of one field:  a column that isn't there, or a value it can't hold. */
const ABOUT_A_FIELD = /UNKNOWN_FIELD_NAME|INVALID_VALUE_FOR_COLUMN/

/** How Airtable says a field is worked out, which only forum posts quote:  the manual test checks it. */
const WORKED_OUT_FIELD = /Field "(.+?)" cannot accept .*computed/i

/** The field types Airtable marks read only, from its field model. */
const READ_ONLY_TYPES = new Set([
  "aiText",
  "autoNumber",
  "button",
  "count",
  "createdBy",
  "createdTime",
  "externalSyncSource",
  "formula",
  "lastModifiedBy",
  "lastModifiedTime",
  "multipleLookupValues",
  "rollup"
])

/** The field types that hold several things, so nothing in them reads as an empty list. */
const LIST_TYPES = new Set([
  "multipleAttachments",
  "multipleCollaborators",
  "multipleLookupValues",
  "multipleRecordLinks",
  "multipleSelects"
])

/** The field types that hold words, so nothing in them reads as an empty text. */
const TEXT_TYPES = new Set(["email", "multilineText", "phoneNumber", "richText", "singleLineText", "url"])

/** Airtable's field type for a link to other records. */
const LINK_TYPE = "multipleRecordLinks"

/** Airtable's field type for a checkbox. */
const CHECKBOX_TYPE = "checkbox"

/****************
 * ### `AirtablePlace`
 * An Airtable base as a place, read and written:  each table a collection (epic `data` P19).
 *
 * ```ts
 * const keys = new PlaceKeys({ names: ["AIRTABLE_KEY"] })
 * new AirtablePlace({ base: "appXXXXXXXXXXXXXX", keyNamed: "AIRTABLE_KEY", keys, idColumn: "Spell id" })
 * ```
 *
 * - On a SERVER SIDE:  its token acts as whoever made it, and anyone can read a page.  So a browser reaches this through `PlaceServer` and
 *   `RemotePlace`, and a program's lines come with each request (`withLines()`).
 * - READS:  a whole list, in pages of 100, starting again if Airtable loses its place.  Filters are formulas, sorts Airtable's own.
 *   - Airtable leaves out every empty cell, so a cleared cell looks like one nobody mentioned:  each row gets them back, or a
 *     cell someone cleared would never clear here (`emptyValueFor()`).
 * - ONE READ, HOWEVER MANY TABS:  the same read in the same window is one request, so tabs don't count against the limit:
 *   a tab asking every 30 seconds, with 50 others, costs what one does.  `watch()` shares it too, on one `every()`.
 * - IDS:  with `idColumn`, a row's id is what the browser made, in a column of its own, and a new row is an upsert on that column:
 *   sending it again after a lost answer changes the one row (epic `data` I5).
 *   - A row someone added in Airtable has nothing in that column:  its id is Airtable's `rec...`.
 *   - With no `idColumn`, Airtable makes the id (`makesIds`), and a new row sent again after a lost answer is a second row:
 *     nothing in Airtable can stop that.  A program's line warns of it.
 * - WRITES:  always `PATCH`, only the fields named, and never `PUT`, which clears the rest.  Batches of 10, so not `atomic`.
 *   - Formulas, lookups, rollups and the like refuse a change:  `"refused"`, `"field"`, known from the base's schema before asking,
 *     or from the refusal if the key can't read it.  A new row just leaves them out:  a row put back by undo holds them.
 *   - A link takes one id or a list of them:  written from the child's side, as one parent, so nobody's list is rewritten.
 * - LIMITS:  through a `RateQueue` per base, 5 a second shared by everyone, and per key, 50.  A 429 stops all of it for 30 seconds.
 *   - Airtable's plans also cap calls a month:  1,000 on the free plan, which a line polling every 30 seconds uses in 8 hours.
 * - NO VERSIONS:  none of its pages describe a version check, so `versionCheck` is off.  Two people changing one field:  the last
 *   save wins it, with no notice.  Different fields both stand.  An edit in Airtable's own window is the same, found at the next read.
 * - BEHIND A ROOM:  a `Referee` takes this as its store, and hears Airtable's window by `watch()`:  it puts changes in order and says who lost, and
 *   each step waits for Airtable's write, so at most about 5 a second for the whole base.
 * - Node only.  Knows nothing of Spell's words.
 ****************/
export class AirtablePlace extends WebPlace implements Place {
  /** What it was made with:  each program's lines make another from it. */
  private readonly props: AirtablePlaceProps
  /** The base. */
  private readonly base: string
  /** Each collection's table and fields there. */
  private readonly collections: NonNullable<PlaceLines["collections"]>
  /** The column holding a row's id. */
  private readonly idColumn: string | undefined
  /** How long an answer is shared, in seconds. */
  private readonly sharedSeconds: number
  /** Everything under the base's limit. */
  private readonly baseQueue: RateQueue
  /** Everything under the key's limit. */
  private readonly keyQueue: RateQueue
  /** This place as each program's lines say. */
  private readonly withThoseLines = new Map<string, AirtablePlace>()
  /** What's been asked lately, by collection and query. */
  private readonly reads = new Map<string, SharedRead>()
  /** Goes up with each write to a collection:  a read begun before it can't be trusted to hold it. */
  private readonly writesTo = new Map<string, number>()
  /** Each table's records, by id and by `rec...`, as last seen. */
  private readonly records = new Map<string, RecordNames>()
  /** Each collection's column names, by the program's. */
  private readonly columnNames = new Map<string, FieldNames>()
  /** The collections whose names have read the base's schema. */
  private readonly namedFromSchema = new Set<string>()
  /** Each collection's rows as last read whole, as JSON by id:  what the next one's compared with. */
  private readonly lastRead = new Map<string, Map<string, { row: PlaceRow; json: string }>>()
  /** Each table's columns found to be read only, from a refusal. */
  private readonly foundReadOnly = new Map<string, Set<string>>()
  /** The collections someone's watching. */
  private readonly watched = new Set<string>()
  /** Who's watching, and what's changed so far. */
  private readonly events = new PlaceEvents({ onFirstWatcher: () => this.startPolling() })
  /** The base's schema, being read or read. */
  private schema: Promise<BaseSchema | undefined> | undefined
  /** The base's schema, once it's here:  `undefined` while it isn't, or if the key can't read it. */
  private knownSchema: BaseSchema | undefined
  /** Why the schema can't be read, for a note on each list. */
  private schemaNote: string | undefined

  constructor(props: AirtablePlaceProps) {
    const { base, keyNamed, keys, url = AIRTABLE_URL, collections = {}, idColumn, checkedEvery, queue } = props
    super({ url, keyNamed, keyFrom: keys.keyNamed, changeIdHeader: false })
    this.props = props
    this.base = base
    this.collections = collections
    this.idColumn = idColumn
    this.sharedSeconds = checkedEvery ?? SHARED_SECONDS
    this.baseQueue = queue ?? RateQueue.named(`Airtable base ${base}`, BASE_LIMIT_KEPT)
    this.keyQueue = RateQueue.named(`Airtable key ${keyNamed}`, KEY_LIMIT)
  }

  /** What it can do. */
  describe(): PlaceCapabilities {
    return {
      kind: "airtable",
      idOf: ID_FIELD,
      ...(this.idColumn === undefined && { makesIds: true }),
      filter: "every field",
      sort: "every field",
      select: "every field",
      page: "none",
      write: ["insert", "update", "delete"],
      atomic: false,
      versionCheck: false,
      live: "poll",
      rateLimit: BASE_LIMIT,
      abort: "soft"
    }
  }

  /**
   * This place as a program's lines say:  one for each set of lines, so what they share they keep sharing.
   * - throws `PlaceError` `"refused"` for a key this server side doesn't hold:  saying so beats reading with another
   */
  withLines({ keyNamed, ...lines }: PlaceLines): AirtablePlace {
    if (keyNamed !== undefined && keyNamed !== this.props.keyNamed) {
      throw new PlaceError(
        `AirtablePlace:  the program names the key "${keyNamed}", and this server side holds "${this.props.keyNamed}" for ${this.base}`,
        { cause: { kind: "refused", whyNot: "place" } }
      )
    }
    const name = JSON.stringify(lines)
    let place = this.withThoseLines.get(name)
    if (!place) this.withThoseLines.set(name, (place = new AirtablePlace({ ...this.props, ...lines })))
    return place
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * The rows of `collection` that `query` asks for, shared with whoever else asked the same just now.
   * - `page` isn't its to do:  it reads the whole list, so a page can't go stale, and the engine slices it.
   * - throws `PlaceError`:  refused for a key that can't reach it, over the ceiling;  anything else for no answer
   */
  list(collection: string, { filter, sort, select }: ListQuery, { signal }: PlaceContext): Promise<ListAnswer> {
    const read = this.sharedRead(collection, { filter, sort, select })
    return signal ? LoadOnce.abortable(read, signal) : read
  }

  /** What changed in `collection` since `token`, found by comparing what's there now.  - throws as `list()` */
  async changesSince(collection: string, token: string, context: PlaceContext): Promise<ChangesAnswer> {
    const { rows } = await this.list(collection, {}, context)
    return this.events.changesSince(collection, token) ?? { rows, removed: [], token: this.events.version }
  }

  /** Tell `onEvent` of each change to `target`:  all the watchers share one poll, on `every()`.  Returns what stops it. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    this.watched.add(target.collection)
    return this.events.watch(target, onEvent)
  }

  /** Read every watched collection now, and each time the window's over.  What finds a change tells it (`compareWithLast()`). */
  private startPolling(): () => void {
    const poll = () => {
      for (const collection of this.watched) {
        // best effort:  the next poll asks again
        void this.sharedRead(collection, {}).catch((ignored: unknown) => console.error("AirtablePlace poll:", ignored))
      }
    }
    poll()
    return every(this.sharedSeconds, poll)
  }

  /** The answer to `ask`:  one under way, or one new enough;  else a new one. */
  private sharedRead(collection: string, ask: ListQuery): Promise<ListAnswer> {
    const name = `${collection}\n${JSON.stringify(ask)}`
    const held = this.reads.get(name)
    const now = Date.now()
    if (held && (held.finishedAt === undefined || now - held.finishedAt < this.sharedSeconds * 1000)) return held.answer
    for (const [other, { finishedAt }] of this.reads) {
      if (finishedAt !== undefined && now - finishedAt >= this.sharedSeconds * 1000) this.reads.delete(other)
    }
    const read: SharedRead = { collection, answer: this.readNow(collection, ask) }
    this.reads.set(name, read)
    read.answer
      .then(() => (read.finishedAt = Date.now()))
      .catch(() => {
        // a failure is nobody's answer but its own askers'
        if (this.reads.get(name) === read) this.reads.delete(name)
      })
    return read.answer
  }

  /** Ask Airtable.  What a column it hasn't got stops being its to do, and is left to the engine. */
  private async readNow(collection: string, ask: ListQuery): Promise<ListAnswer> {
    const writesBefore = this.writesTo.get(collection) ?? 0
    const schema = await this.schemaOf()
    const table = this.tableOf(collection)
    const body = this.bodyFor(collection, ask, schema)
    let records: AirtableRecord[]
    let handled = { filter: !!body.filterByFormula, sort: !!body.sort, select: !!body.fields }
    try {
      records = await this.allRecords(table, body)
    } catch (error) {
      const isItsColumns = error instanceof PlaceError && error.cause?.whyNot === "field"
      if (!isItsColumns || !(body.filterByFormula || body.sort || body.fields)) throw error
      records = await this.allRecords(table, {})
      handled = { filter: false, sort: false, select: false }
    }
    const notes: string[] = []
    const rows = this.rowsFrom(records, collection, { select: handled.select ? ask.select : undefined, notes })
    const isWhole = !ask.filter && !ask.select
    if (isWhole && writesBefore === (this.writesTo.get(collection) ?? 0)) this.compareWithLast(collection, rows)
    if (this.schemaNote) notes.push(this.schemaNote)
    const readOnlyFields = this.readOnlyFieldsOf(collection)
    return {
      rows,
      handled,
      version: this.events.version,
      ...(notes.length && { notes }),
      ...(readOnlyFields.length && { readOnlyFields })
    }
  }

  /** What to ask for `ask`:  each part only if Airtable can do it. */
  private bodyFor(collection: string, { filter, sort, select }: ListQuery, schema: BaseSchema | undefined): ListBody {
    const hasColumn = (column: string) => this.hasColumn(schema, collection, column)
    const filterByFormula =
      filter && Object.keys(filter).length ? this.formulaFor(collection, filter, hasColumn) : undefined
    const sorted = sort?.map(({ field, descending }) => ({
      field: this.columnOf(collection, field),
      direction: descending ? "desc" : "asc"
    }))
    const canSort = sorted?.length && sorted.every(({ field }) => field !== undefined && hasColumn(field))
    const columns = select?.flatMap((field) => {
      const column = this.columnOf(collection, field)
      return column === undefined ? [] : [column]
    })
    const canSelect = columns?.every(hasColumn)
    return {
      ...(filterByFormula && { filterByFormula }),
      ...(canSort && { sort: sorted as { field: string; direction: string }[] }),
      ...(canSelect && { fields: this.idColumn === undefined ? columns : [...columns!, this.idColumn] })
    }
  }

  /** `filter` as a formula:  `undefined` if any of it can't be one, so the engine does it all. */
  private formulaFor(
    collection: string,
    filter: Record<string, unknown>,
    hasColumn: (column: string) => boolean
  ): string | undefined {
    const parts: string[] = []
    for (const [field, value] of Object.entries(filter)) {
      const literal = formulaLiteral(value)
      if (literal === undefined) return undefined
      if (field === ID_FIELD) {
        const byRecord = `RECORD_ID()=${literal}`
        parts.push(
          this.idColumn === undefined ? byRecord : `OR(${columnInFormula(this.idColumn)}=${literal},${byRecord})`
        )
        continue
      }
      const column = this.columnOf(collection, field)!
      if (!hasColumn(column)) return undefined
      parts.push(`${columnInFormula(column)}=${literal}`)
    }
    return parts.length === 1 ? parts[0] : `AND(${parts.join(",")})`
  }

  /**
   * Every record `body` asks for, page by page.
   * - Starts again if Airtable loses its place, up to `MOST_RESTARTS` times.
   * - throws `PlaceError` `"over the ceiling"`:  no use spending the base's limit on what the engine would refuse
   */
  private async allRecords(table: string, body: ListBody): Promise<AirtableRecord[]> {
    for (let restarts = 0; ; restarts++) {
      try {
        return await this.pagesOf(table, body)
      } catch (error) {
        const hasLostItsPlace = error instanceof PlaceError && LOST_ITS_PLACE.test(error.message)
        if (!hasLostItsPlace || restarts >= MOST_RESTARTS) throw error
      }
    }
  }

  /** One walk through a list. */
  private async pagesOf(table: string, body: ListBody): Promise<AirtableRecord[]> {
    const records: AirtableRecord[] = []
    let offset: string | undefined
    do {
      // a POST:  a long formula can't overrun Airtable's 16,000 characters of address
      const response = await this.answerTo(
        {
          url: `${this.url}/{base}/{table}/listRecords`,
          urlData: { base: this.base, table },
          method: "POST",
          data: { ...body, pageSize: PAGE_SIZE, ...(offset && { offset }) }
        },
        {}
      )
      const answer = (await jsonIn(response)) as { records: AirtableRecord[]; offset?: string }
      records.push(...answer.records)
      offset = answer.offset
      if (records.length > DEFAULT_CEILING.rows) {
        throw new PlaceError(`AirtablePlace:  "${table}" has more than ${DEFAULT_CEILING.rows} rows`, {
          cause: { kind: "over the ceiling" }
        })
      }
    } while (offset)
    return records
  }

  /** `records` as rows:  each id once, with the rest said in `notes`. */
  private rowsFrom(
    records: readonly AirtableRecord[],
    collection: string,
    { select, notes }: { select?: readonly string[] | undefined; notes: string[] }
  ): PlaceRow[] {
    const rows = new Map<string, PlaceRow>()
    const seenColumns = new Set(records.flatMap(({ fields }) => Object.keys(fields)))
    for (const record of records) {
      const row = this.rowOf(record, collection, seenColumns, select)
      const id = `${row[ID_FIELD] as string}`
      if (rows.has(id))
        notes.push(`"${collection}" has more than one row with the id "${id}":  only the first is shown`)
      else rows.set(id, row)
    }
    return [...rows.values()]
  }

  /** `record` as a row:  its id under `id`, each column by what the program calls it, every empty cell back in. */
  private rowOf(
    { id: recordId, fields }: AirtableRecord,
    collection: string,
    seenColumns: Iterable<string> = [],
    select?: readonly string[]
  ): PlaceRow {
    const table = this.tableOf(collection)
    const held = this.idColumn === undefined ? undefined : fields[this.idColumn]
    const id = held === undefined || held === null || held === "" ? recordId : `${held as string}`
    this.namesOf(table).note(id, recordId)
    const row: PlaceRow = { [ID_FIELD]: id }
    const types = this.knownSchema?.get(table)?.fields
    const columns = new Set([
      ...(types?.keys() ?? []),
      ...this.mappedColumns(collection),
      ...seenColumns,
      ...Object.keys(fields)
    ])
    for (const column of columns) {
      if (column === this.idColumn) continue
      const field = this.fieldNamed(collection, column)
      if (select && !select.includes(field)) continue
      row[field] =
        column in fields ? this.valueRead(fields[column], types?.get(column)) : emptyValueFor(types?.get(column)?.type)
    }
    return row
  }

  /** A cell's value:  a link's records by the ids this place knows them by, as one if it's a link to one. */
  private valueRead(value: unknown, field: SchemaField | undefined): unknown {
    if (field?.type !== LINK_TYPE || !Array.isArray(value)) return value
    const names = this.namesOf(this.tableById(field.options?.linkedTableId) ?? "")
    const ids = (value as string[]).map((recordId) => names.idFor(recordId))
    return field.options?.prefersSingleRecordLink ? (ids[0] ?? "") : ids
  }

  /** What's changed since `collection` was last read whole is told to whoever's watching;  the first read only remembers. */
  private compareWithLast(collection: string, rows: readonly PlaceRow[]): void {
    const last = this.lastRead.get(collection)
    const now = new Map(rows.map((row) => [`${row[ID_FIELD] as string}`, { row, json: JSON.stringify(row) }]))
    this.lastRead.set(collection, now)
    if (!last) return
    for (const [id, { row, json }] of now) {
      if (last.get(id)?.json !== json) this.events.tell({ collection, id, row })
    }
    for (const [id, { row }] of last) {
      if (!now.has(id)) this.events.tell({ collection, id, was: row })
    }
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes:  new rows, then changed ones, then deletes, each collection's in batches of 10.
   * - Everything it can refuse it refuses first, so nothing's half made by a mistake of ours.
   * - Not all or none:  a failure part way leaves the earlier batches made, and sending it all again is harmless with an `idColumn`.
   * - throws `PlaceError`:  refused, `"field"`, for a field that can't be written;  not found for an id it doesn't hold;
   *   anything else for no answer
   */
  async apply(changes: readonly PlaceChange[], _context: PlaceContext): Promise<ApplyAnswer> {
    await this.schemaOf()
    const plans = new Map<string, WritePlan>()
    for (const change of changes) {
      this.refuseIfUnwritable(change)
      let plan = plans.get(change.collection)
      if (!plan) plans.set(change.collection, (plan = new WritePlan()))
      plan.add(change)
    }
    const rows: PlaceRow[] = []
    for (const [collection, plan] of plans) {
      this.writesTo.set(collection, (this.writesTo.get(collection) ?? 0) + 1)
      try {
        rows.push(...(await this.write(collection, plan)))
      } finally {
        this.forgetReads(collection)
      }
    }
    return { rows, version: this.events.version }
  }

  /** The next read of `collection` asks Airtable:  it holds what was just written. */
  private forgetReads(collection: string): void {
    this.writesTo.set(collection, (this.writesTo.get(collection) ?? 0) + 1)
    for (const [name, read] of this.reads) if (read.collection === collection) this.reads.delete(name)
  }

  /** One collection's changes, in order. */
  private async write(collection: string, plan: WritePlan): Promise<PlaceRow[]> {
    const table = this.tableOf(collection)
    const rows: PlaceRow[] = []
    const newRecords = await Promise.all(plan.inserts.map((insert) => this.newRecordFor(collection, insert)))
    for (const batch of batchesOf(newRecords)) {
      const data =
        this.idColumn === undefined
          ? { records: batch }
          : { performUpsert: { fieldsToMergeOn: [this.idColumn] }, records: batch }
      rows.push(...(await this.sendRecords(collection, table, this.idColumn === undefined ? "POST" : "PATCH", data)))
    }
    const updateIds = [...plan.updates.keys()]
    const recordIds = await this.recordIdsFor(table, [...updateIds, ...plan.deletes])
    const updates = await Promise.all(
      updateIds.map(async (id) => ({
        id: this.recordIdOrDie(collection, id, recordIds),
        fields: await this.cellsFor(collection, plan.updates.get(id)!)
      }))
    )
    for (const batch of batchesOf(updates)) {
      rows.push(...(await this.sendRecords(collection, table, "PATCH", { records: batch })))
    }
    const deletes = plan.deletes.map((id) => this.recordIdOrDie(collection, id, recordIds))
    for (const batch of batchesOf(deletes)) await this.deleteRecords(table, batch)
    for (const id of plan.deletes) this.noteDeleted(collection, table, id)
    return rows
  }

  /**
   * A new row, as a record to send:  with the browser's id in its column.  One with no id gets one, so it can be sent again.
   * - Without what Airtable works out:  a row put back by undo holds those, as it read them, and they aren't a write anyone meant.
   */
  private async newRecordFor(collection: string, { id, fields }: WantedRow): Promise<{ fields: PlaceRow }> {
    const worksOut = this.readOnlyColumnsOf(collection)
    const cells = await this.cellsFor(
      collection,
      Object.fromEntries(
        Object.entries(fields).filter(([field]) => !worksOut.has(this.columnOf(collection, field) ?? ""))
      )
    )
    if (this.idColumn === undefined) return { fields: cells }
    return { fields: { ...cells, [this.idColumn]: id ?? randomUUID() } }
  }

  /** `fields`, as cells:  by column, a link's ids as records, and nothing for the id. */
  private async cellsFor(collection: string, fields: PlaceRow): Promise<PlaceRow> {
    const table = this.tableOf(collection)
    const cells: PlaceRow = {}
    for (const [field, value] of Object.entries(fields)) {
      if (field === ID_FIELD) continue
      const column = this.columnOf(collection, field)!
      const type = this.knownSchema?.get(table)?.fields.get(column)
      cells[column] = type?.type === LINK_TYPE ? await this.linkCell(value, type) : value
    }
    return cells
  }

  /** What a link column is sent:  always a list of `rec...`, from one id or several. */
  private async linkCell(value: unknown, field: SchemaField): Promise<string[]> {
    const ids = (Array.isArray(value) ? value : [value]).filter((id) => id !== "" && id !== null && id !== undefined)
    const table = this.tableById(field.options?.linkedTableId)
    if (!table) return ids as string[]
    const recordIds = await this.recordIdsFor(table, ids as string[])
    return (ids as string[]).map((id) => recordIds.get(id) ?? id)
  }

  /** Send `data`, and tell whoever's watching what it made. */
  private async sendRecords(
    collection: string,
    table: string,
    method: "POST" | "PATCH",
    data: object
  ): Promise<PlaceRow[]> {
    const response = await this.answerTo(
      { url: `${this.url}/{base}/{table}`, urlData: { base: this.base, table }, method, data },
      {}
    )
    const { records } = (await jsonIn(response)) as { records: AirtableRecord[] }
    const last = this.lastRead.get(collection)
    return records.map((record) => {
      const row = this.rowOf(record, collection)
      const id = `${row[ID_FIELD] as string}`
      last?.set(id, { row, json: JSON.stringify(row) })
      this.events.tell({ collection, id, row })
      return row
    })
  }

  /** Delete these records. */
  private async deleteRecords(table: string, recordIds: readonly string[]): Promise<void> {
    const query = recordIds.map((recordId) => `records%5B%5D=${encodeURIComponent(recordId)}`).join("&")
    await this.answerTo(
      { url: `${this.url}/{base}/{table}?${query}`, urlData: { base: this.base, table }, method: "DELETE" },
      {}
    )
  }

  /** `id` is gone:  nothing's left to find it by, and whoever's watching is told. */
  private noteDeleted(collection: string, table: string, id: string): void {
    this.namesOf(table).forget(id)
    const last = this.lastRead.get(collection)
    const was = last?.get(id)?.row
    last?.delete(id)
    this.events.tell({ collection, id, ...(was && { was }) })
  }

  /** The `rec...` of each of `ids`:  from what's been seen, else one lookup per `IDS_PER_LOOKUP`. */
  private async recordIdsFor(table: string, ids: readonly string[]): Promise<Map<string, string>> {
    const names = this.namesOf(table)
    const unknown = this.idColumn === undefined ? [] : ids.filter((id) => !names.recordFor(id))
    for (let start = 0; start < unknown.length; start += IDS_PER_LOOKUP) {
      const some = unknown.slice(start, start + IDS_PER_LOOKUP)
      const asked = some.map((id) => `${columnInFormula(this.idColumn!)}=${formulaLiteral(id)!}`)
      const found = await this.allRecords(table, {
        filterByFormula: `OR(${[...asked, ...some.map((id) => `RECORD_ID()=${formulaLiteral(id)!}`)].join(",")})`,
        fields: [this.idColumn!]
      })
      for (const { id: recordId, fields } of found)
        names.note(`${(fields[this.idColumn!] as string) ?? recordId}`, recordId)
    }
    return new Map(
      ids.flatMap((id) => {
        const recordId = this.idColumn === undefined ? id : names.recordFor(id)
        return recordId ? [[id, recordId] as const] : []
      })
    )
  }

  /** - throws `PlaceError` `"not found"` */
  private recordIdOrDie(collection: string, id: string, recordIds: ReadonlyMap<string, string>): string {
    const recordId = recordIds.get(id)
    if (recordId) return recordId
    throw new PlaceError(`AirtablePlace.apply():  "${collection}" holds nothing with the id "${id}"`, {
      cause: { kind: "not found" }
    })
  }

  /** - throws `PlaceError` `"refused"`, `"field"`, for a field `change` writes that can't be written */
  private refuseIfUnwritable({ kind, collection, fields = {} }: PlaceChange): void {
    if (kind !== "update") return
    for (const field of Object.keys(fields)) {
      if (this.canWrite({ collection, field }).canWrite) continue
      throw new PlaceError(
        `AirtablePlace.apply():  "${field}" of "${collection}" is worked out by Airtable (a formula, a lookup, a rollup ...), so it can't be written`,
        { cause: { kind: "refused", whyNot: "field" } }
      )
    }
  }

  /** A field Airtable works out takes no write, as far as this place has been able to find out. */
  canWrite({ collection, field }: WriteQuestion): WriteAnswer {
    if (field === undefined || field === ID_FIELD) return { canWrite: true }
    const column = this.columnOf(collection, field)!
    return this.readOnlyColumnsOf(collection).has(column) ? { canWrite: false, whyNot: "field" } : { canWrite: true }
  }

  /** Every column of `collection` known to take no write. */
  private readOnlyColumnsOf(collection: string): Set<string> {
    const table = this.tableOf(collection)
    const columns = new Set(this.foundReadOnly.get(table))
    for (const [column, { type }] of this.knownSchema?.get(table)?.fields ?? []) {
      if (READ_ONLY_TYPES.has(type)) columns.add(column)
    }
    return columns
  }

  /** Every field of `collection` known to take no write, by what the program calls it. */
  private readOnlyFieldsOf(collection: string): string[] {
    return [...this.readOnlyColumnsOf(collection)].map((column) => this.fieldNamed(collection, column))
  }

  ////////////////
  // ## The base's schema
  ////////////////

  /**
   * What the base says of its tables, read once:  which columns are read only, which are links, and what an empty cell is.
   * - NEVER throws:  it needs the key's `schema.bases:read`, and everything works without it, only less is known up front.
   */
  private schemaOf(): Promise<BaseSchema | undefined> {
    this.schema ??= this.readSchema().catch((error: unknown) => {
      if (error instanceof PlaceError) {
        this.schemaNote = `The key can't read this base's schema (it needs schema.bases:read), so a read-only field is only found when a write to it is refused`
      } else {
        // no answer:  ask again next time
        this.schema = undefined
      }
      return undefined
    })
    return this.schema
  }

  /** Ask for it. */
  private async readSchema(): Promise<BaseSchema> {
    const response = await this.answerTo(
      { url: `${this.url}/meta/bases/{base}/tables`, urlData: { base: this.base } },
      {}
    )
    const { tables } = (await jsonIn(response)) as { tables: SchemaTable[] }
    this.knownSchema = new Map(
      tables.map(({ id, name, fields }) => [name, { id, fields: new Map(fields.map((field) => [field.name, field])) }])
    )
    return this.knownSchema
  }

  /** Could `column` be asked for?  With no schema, nobody knows, so ask:  a no is caught, and left to the engine. */
  private hasColumn(schema: BaseSchema | undefined, collection: string, column: string): boolean {
    return schema?.get(this.tableOf(collection))?.fields.has(column) ?? true
  }

  /** The table with this id, as a link names it. */
  private tableById(tableId: string | undefined): string | undefined {
    for (const [name, { id }] of this.knownSchema ?? []) if (id === tableId) return name
    return undefined
  }

  ////////////////
  // ## Names
  ////////////////

  /** The table `collection` is in. */
  private tableOf(collection: string): string {
    return this.collections[collection]?.at ?? collection
  }

  /** The column `field` of `collection` is in:  the id column for a row's id, which has none without one. */
  private columnOf(collection: string, field: string): string | undefined {
    if (field === ID_FIELD) return this.idColumn
    return this.namesFor(collection).serverName(field)
  }

  /** What the program calls `column` of `collection`:  what a line says, else by its words (`Cuisine` is `cuisine`). */
  private fieldNamed(collection: string, column: string): string {
    return this.namesFor(collection).ourName(column)
  }

  /** `collection`'s column names:  what its lines say, then what it's read, and the base's schema as soon as it's known. */
  private namesFor(collection: string): FieldNames {
    let names = this.columnNames.get(collection)
    if (!names) this.columnNames.set(collection, (names = new FieldNames(this.collections[collection]?.fields)))
    const columns = this.knownSchema?.get(this.tableOf(collection))?.fields.keys()
    if (columns && !this.namedFromSchema.has(collection)) {
      this.namedFromSchema.add(collection)
      names.note(columns)
    }
    return names
  }

  /** The columns the program's lines name. */
  private mappedColumns(collection: string): string[] {
    return Object.values(this.collections[collection]?.fields ?? {})
  }

  /** What's known of `table`'s records. */
  private namesOf(table: string): RecordNames {
    let names = this.records.get(table)
    if (!names) this.records.set(table, (names = new RecordNames()))
    return names
  }

  ////////////////
  // ## Each request
  ////////////////

  /**
   * Every request waits its turn under the base's limit, and the key's.
   * - A write's answer can say a record's gone in its own words, as well as with a 404.
   */
  protected async answerTo(request: ApiRequest, context: PlaceContext, changeId?: string): Promise<Response> {
    const { signal } = context
    try {
      return await this.baseQueue.run(
        async () => {
          await this.keyQueue.run(async () => {}, { signal })
          return super.answerTo(request, context, changeId)
        },
        { signal }
      )
    } catch (error) {
      const isGone = error instanceof PlaceError && error.kind === "refused" && NO_SUCH_RECORD.test(error.message)
      if (!isGone) throw error
      throw new PlaceError(error.message, { cause: { kind: "not found" } })
    }
  }

  /** What Airtable said, in its own words:  its `type` first, which says which mistake it is. */
  protected async messageOf(error: ApiError): Promise<string> {
    const { type, message } = await airtableErrorIn(error)
    if (error.status === 401)
      return `AirtablePlace:  Airtable doesn't accept the key named "${this.props.keyNamed}";  make a new one at airtable.com/create/tokens`
    if (error.status === 403) {
      return `AirtablePlace:  Airtable says the key named "${this.props.keyNamed}" can't do this in ${this.base}:  check the base is added to the key, that it has data.records:read and data.records:write, and that the table has this name (${type})`
    }
    return `AirtablePlace:  ${[type, message].filter(Boolean).join(":  ") || error.message}`
  }

  /** A field it can't take is the field's fault, and one Airtable works out is remembered, so it's refused up front next time. */
  protected async whyNotOf(error: ApiError): Promise<WhyNotWritable> {
    const { type, message } = await airtableErrorIn(error)
    if (!ABOUT_A_FIELD.test(type)) return "place"
    const [, column] = WORKED_OUT_FIELD.exec(message) ?? []
    if (column) {
      const table = decodeURIComponent(new URL(error.response?.url ?? "http://x").pathname.split("/")[3] ?? "")
      let found = this.foundReadOnly.get(table)
      if (!found) this.foundReadOnly.set(table, (found = new Set()))
      found.add(column)
    }
    return "field"
  }
}

/** Constructor props of an `AirtablePlace`. */
export type AirtablePlaceProps = {
  /** The base's id, `app...`:  in its address on Airtable. */
  base: string
  /** The NAME of the key holding a personal access token, with `data.records:read`, `data.records:write` and, better, `schema.bases:read`. */
  keyNamed: string
  /** The keys this server side holds, where it finds that one. */
  keys: PlaceKeys
  /** Airtable's address:  a test's stub's, in a test. */
  url?: string
  /** Each collection's table, and the fields a program's lines name (`withLines()`):  any other column is matched by its words (`FieldNames`). */
  collections?: PlaceLines["collections"]
  /** The column holding each row's id.  Left out:  Airtable makes the ids, and a new row sent again can double. */
  idColumn?: string
  /** How often it's asked what changed, in seconds:  how long an answer's shared, and how often `watch()` reads. */
  checkedEvery?: number
  /** The queue under the base's limit:  left out, the ONE by the base's name.  A test's, in a test. */
  queue?: RateQueue
}

/** One read that's been asked for. */
type SharedRead = {
  /** The collection it's of. */
  collection: string
  /** Its answer. */
  answer: Promise<ListAnswer>
  /** When it finished:  left out, it's under way. */
  finishedAt?: number
}

/** A record, as Airtable holds it. */
type AirtableRecord = {
  /** Its `rec...`. */
  id: string
  /** Its cells, each empty one left out. */
  fields: PlaceRow
}

/** What a list asks. */
type ListBody = {
  /** Only rows this formula's true of. */
  filterByFormula?: string
  /** Their order. */
  sort?: { field: string; direction: string }[]
  /** Only these columns. */
  fields?: string[]
}

/** One column, as the base's schema says it. */
type SchemaField = {
  /** Its name. */
  name: string
  /** Its type, e.g. `singleLineText`. */
  type: string
  /** What a link says of itself. */
  options?: {
    /** The table it links to. */
    linkedTableId?: string
    /** It's meant to hold one. */
    prefersSingleRecordLink?: boolean
  }
}

/** One table, as Airtable answers. */
type SchemaTable = {
  /** Its `tbl...`. */
  id: string
  /** Its name. */
  name: string
  /** Its columns. */
  fields: SchemaField[]
}

/** The base's tables, by name, each column by name. */
type BaseSchema = Map<string, { id: string; fields: Map<string, SchemaField> }>

/** A row wanted:  its id, if it's got one yet, and its fields. */
type WantedRow = {
  /** Its id. */
  id?: string | undefined
  /** Its fields. */
  fields: PlaceRow
}

/****************
 * ### `RecordNames`
 * One table's records, as ids and as `rec...`, either way round:  learned from every answer.
 ****************/
class RecordNames {
  /** Each `rec...`, by id. */
  private readonly recordsById = new Map<string, string>()
  /** Each id, by `rec...`. */
  private readonly idsByRecord = new Map<string, string>()

  /** `id` is the record `recordId`. */
  note(id: string, recordId: string): void {
    this.recordsById.set(id, recordId)
    this.idsByRecord.set(recordId, id)
  }

  /** The `rec...` of `id`. */
  recordFor(id: string): string | undefined {
    return this.recordsById.get(id)
  }

  /** The id of `recordId`:  itself if it hasn't been seen. */
  idFor(recordId: string): string {
    return this.idsByRecord.get(recordId) ?? recordId
  }

  /** `id` is gone. */
  forget(id: string): void {
    const recordId = this.recordsById.get(id)
    this.recordsById.delete(id)
    if (recordId) this.idsByRecord.delete(recordId)
  }
}

/****************
 * ### `WritePlan`
 * What one `apply()` does to one collection, each thing's changes joined into one:  one `PATCH` of its fields, not one per field.
 * - A row added and changed or deleted in one batch is only ever one row, or none.
 ****************/
class WritePlan {
  /** Each new row, in order. */
  readonly inserts: WantedRow[] = []
  /** The fields written on each row that's there, by id. */
  readonly updates = new Map<string, PlaceRow>()
  /** Each id that's going. */
  readonly deletes: string[] = []

  /** Join `change` in. */
  add({ kind, id, fields = {} }: PlaceChange): void {
    if (kind === "insert") {
      this.inserts.push({ id, fields: { ...fields } })
      return
    }
    const adding = this.inserts.findIndex((insert) => insert.id === id)
    if (adding >= 0) {
      if (kind === "delete") this.inserts.splice(adding, 1)
      else Object.assign(this.inserts[adding]!.fields, fields)
      return
    }
    if (kind === "delete") {
      this.updates.delete(id!)
      this.deletes.push(id!)
      return
    }
    this.updates.set(id!, { ...this.updates.get(id!), ...fields })
  }
}

/** `items`, ten at a time. */
function batchesOf<T>(items: readonly T[]): T[][] {
  const batches: T[][] = []
  for (let start = 0; start < items.length; start += RECORDS_PER_REQUEST) {
    batches.push(items.slice(start, start + RECORDS_PER_REQUEST))
  }
  return batches
}

/** A column, as a formula names it. */
function columnInFormula(column: string): string {
  return `{${column.replace(/[{}\\]/g, "\\$&")}}`
}

/** A value, as a formula writes it:  `undefined` for one it can't. */
function formulaLiteral(value: unknown): string | undefined {
  if (typeof value === "string") return `"${value.replace(/[\\"]/g, "\\$&")}"`
  if (typeof value === "number") return `${value}`
  if (typeof value === "boolean") return value ? "TRUE()" : "FALSE()"
  if (value === null || value === undefined) return "BLANK()"
  return undefined
}

/**
 * What an empty cell of this type holds, as Airtable leaves all of them out:  `""`, `[]` and `false` alike.
 * - With no schema, nobody knows:  `null`, which still clears what was there.
 */
function emptyValueFor(type: string | undefined): unknown {
  if (type === CHECKBOX_TYPE) return false
  if (type && LIST_TYPES.has(type)) return []
  if (type && TEXT_TYPES.has(type)) return ""
  return null
}

/** What Airtable said in `error`'s answer:  its body is `{ error: { type, message } }`, or `{ error: "NOT_FOUND" }`. */
async function airtableErrorIn(error: ApiError): Promise<{ type: string; message: string }> {
  const said = (await error.response
    ?.clone()
    .json()
    .catch(() => undefined)) as { error?: string | { type?: string; message?: string } } | undefined
  const { error: what } = said ?? {}
  if (typeof what === "string") return { type: what, message: "" }
  return { type: what?.type ?? "", message: what?.message ?? "" }
}
