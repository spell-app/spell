import {
  canDoAll,
  idOfRow,
  MovedVersions,
  PlaceError,
  type ApplyAnswer,
  type ListAnswer,
  type ListHandled,
  type ListQuery,
  type PageKind,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceErrorKind,
  type PlaceRow,
  type SelectingContext
} from "./places.types"
import { jsonIn, renamed, turnedRound, valueAt, WebPlace, type WebPlaceProps } from "./WebPlace"

/** How many rows it asks for at a time on a place that pages, when nobody says. */
const REST_PAGE_SIZE = 100

/** The answers that mean "someone got there first", on a place with versions. */
const OUT_OF_DATE_STATUSES = new Set([409, 412, 428])

/** What it can do, unless it's told otherwise:  a plain web service, read and written, and nothing else promised. */
const REST_CAPABILITIES: PlaceCapabilities = {
  idOf: "id",
  filter: "none",
  sort: "none",
  select: "none",
  page: "none",
  write: ["insert", "update", "delete"],
  atomic: false,
  live: "poll",
  abort: "hard"
}

/** What each part of a query is called in the URL, unless a place says otherwise. */
const REST_PARAMS: RestParams = { sort: "sort", select: "fields", limit: "limit", offset: "offset", cursor: "cursor" }

/** A `<...>; rel="next"` in a `Link` header. */
const NEXT_LINK = /<([^>]+)>\s*;[^,]*\brel="?next"?/

/** A cursor that's a whole address, as a `Link` header gives. */
const IS_ADDRESS = /^(https?:)?\/\//

/****************
 * ### `RestPlace`
 * A plain web service as a place:  a mapping of its paths and field names, and nothing else (epic `data` P4).
 *
 * ```ts
 * new RestPlace({
 *   url: "https://example.com/api",
 *   collections: { recipes: { path: "/meals{/id}", fields: { title: "name" }, rowsAt: "data" } },
 *   can: { filter: ["cuisine"], sort: "every field", page: "cursor" },
 *   versions: { field: "version" }
 * })
 * ```
 *
 * - What it does for itself is what `can` says, and every list says so (`handled`):  the engine does the rest.
 * - Reads:  `list()` a page, `getMany()` one `GET` per id.
 * - Writes:  `POST`, `PATCH` (or `PUT`, the whole record:  `update`), `DELETE`, one at a time, in order.
 *   Each carries its `changeId` in a header, and `keepalive` when the page is going away.
 * - With `versions`, an update says what it was made from, in `If-Match`:
 *   - a server that's moved on answers 409, 412 or 428:  `"out of date"`, and the engine merges per field (`PendingChanges`)
 *   - `versionOf()` knows each thing's version from what it last read or wrote
 *   - no version known yet (only `GET`s carry an `ETag`, and a list has none):  `"out of date"` without asking, so the
 *     engine reads the thing and merges, which finds the version
 * - With none, the last save wins the whole record:  `versionCheck` is off, and the compiler can warn of that.
 * - A key is named, never written:  `WebPlace`.
 * - Rows have OUR field names everywhere but on the wire.
 ****************/
export class RestPlace extends WebPlace implements Place {
  /** What it says it can do. */
  private readonly capabilities: PlaceCapabilities
  /** Each collection's mapping. */
  private readonly collections: Readonly<Record<string, RestCollection>>
  /** How it knows versions. */
  private readonly versions: RestVersions | undefined
  /** How it updates. */
  private readonly updateMethod: "PATCH" | "PUT"
  /** What each part of a query is called. */
  private readonly params: RestParams
  /** How many rows it asks for at a time. */
  private readonly pageSize: number
  /** Each thing's version, as last read or written, by collection and id. */
  private readonly seenVersions = new Map<string, string>()

  constructor({ collections = {}, can, versions, update = "PATCH", params, pageSize, ...rest }: RestPlaceProps) {
    super(rest)
    this.collections = collections
    this.versions = versions
    this.updateMethod = update
    this.params = { ...REST_PARAMS, ...params }
    this.pageSize = pageSize ?? REST_PAGE_SIZE
    this.capabilities = { ...REST_CAPABILITIES, ...can, ...(versions && { versionCheck: true }) }
  }

  /** What it can do. */
  describe(): PlaceCapabilities {
    return this.capabilities
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * One page of `collection`, doing what `can` says, and saying what it did.
   * - throws `PlaceError` for an answer that means something;  `TypeError` for an answer that isn't a list
   */
  async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    const { page, at, size } = this.pageOf(query)
    const handled: ListHandled = {}
    const data = page === "cursor" && at && IS_ADDRESS.test(at) ? {} : this.paramsFor(collection, query, handled)
    if (page === "offset") Object.assign(data, { [this.params.limit]: size, [this.params.offset]: Number(at ?? 0) })
    if (page === "cursor") {
      if (query.page?.size !== undefined) data[this.params.limit] = query.page.size
      if (at && !IS_ADDRESS.test(at)) data[this.params.cursor] = at
    }
    const url = at && IS_ADDRESS.test(at) ? at : this.pathOf(collection)
    const response = await this.answerTo({ url, urlData: {}, data }, context)
    const body = await jsonIn(response)
    const { rowsAt, nextAt } = this.mappingOf(collection)
    const rows = valueAt(body, rowsAt)
    if (!Array.isArray(rows)) {
      throw new TypeError(
        `RestPlace.list():  "${collection}" didn't answer with a list${rowsAt ? ` at "${rowsAt}"` : ""};  say where it is with \`rowsAt\``
      )
    }
    const nextPage = this.nextPageOf({ page, at, size, count: rows.length, body, nextAt, response })
    return {
      rows: (rows as PlaceRow[]).map((row) => this.noted(collection, row)),
      ...(nextPage !== undefined && { nextPage }),
      handled
    }
  }

  /** The rows of `collection` with these ids:  one request each.  An id it doesn't hold is left out. */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext): Promise<PlaceRow[]> {
    const rows = await Promise.all(ids.map((id) => this.rowOrNothing(collection, id, context)))
    return rows.filter((row) => !!row)
  }

  /** The version of this thing as it last read or wrote it. */
  versionOf(collection: string, id: string): string | undefined {
    return this.seenVersions.get(versionKey(collection, id))
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes, one at a time, in order.
   * - A version a change in this same batch just moved on from follows it:  one edit to two fields is one conflict at most.
   * - throws `PlaceError`:  refused, not found or out of date;  anything else for no answer.
   *   What came before it in the batch stays made;  the engine sends each alone, with the same ids.
   */
  async apply(changes: readonly PlaceChange[], context: PlaceContext): Promise<ApplyAnswer> {
    const rows: PlaceRow[] = []
    const moved = new MovedVersions()
    for (const change of changes) {
      const version = moved.versionFor(change)
      const row = await this.makeChange({ ...change, ...(version !== undefined && { version }) }, context)
      if (row) rows.push(row)
      if (change.id !== undefined) moved.note(change, version, this.versionOf(change.collection, change.id))
    }
    return { rows }
  }

  /** Answers of 409, 412 and 428 mean someone got there first, on a place with versions. */
  protected errorKindFor(status: number): PlaceErrorKind {
    if (this.versions && OUT_OF_DATE_STATUSES.has(status)) return "out of date"
    return super.errorKindFor(status)
  }

  /** Make one change:  its row, as the server now keeps it, if it said. */
  private async makeChange(change: PlaceChange, context: PlaceContext): Promise<PlaceRow | undefined> {
    const { kind, collection, id, changeId } = change
    if (kind === "delete") {
      const url = this.pathOf(collection)
      await this.answerTo({ url, urlData: { id: id! }, method: "DELETE" }, context, changeId)
      this.seenVersions.delete(versionKey(collection, id!))
      return undefined
    }
    const response = await (kind === "insert" ? this.insert(change, context) : this.update(change, context))
    const row = (await jsonIn(response)) as PlaceRow | undefined
    const answered = valueAt(row, this.mappingOf(collection).rowAt) as PlaceRow | undefined
    return answered && typeof answered === "object"
      ? this.noted(collection, answered, response)
      : this.noteVersionOnly(collection, id, response)
  }

  /** `POST` a new thing. */
  private insert({ collection, fields = {}, changeId }: PlaceChange, context: PlaceContext): Promise<Response> {
    const url = this.pathOf(collection)
    return this.answerTo(
      { url, urlData: {}, method: "POST", data: this.onTheWire(collection, fields) },
      context,
      changeId
    )
  }

  /** `PATCH` the fields, or `PUT` the whole record as it stands now.  - throws `PlaceError` `"out of date"`:  see the class */
  private async update(
    { collection, id, fields = {}, version, changeId }: PlaceChange,
    context: PlaceContext
  ): Promise<Response> {
    if (this.versions && version === undefined) {
      throw new PlaceError(`RestPlace.apply():  no version known yet for "${id}" in "${collection}";  read it first`, {
        cause: { kind: "out of date" }
      })
    }
    const url = this.pathOf(collection)
    const wire = this.onTheWire(collection, fields)
    const isWhole = this.updateMethod === "PUT"
    const data = isWhole ? { ...(await this.wholeRowOnTheWire(collection, id!, context)), ...wire } : wire
    const headers = this.versions && version !== undefined ? { "If-Match": version } : undefined
    return this.answerTo(
      { url, urlData: { id: id! }, method: this.updateMethod, data, ...(headers && { headers }) },
      context,
      changeId
    )
  }

  /** The record as the server keeps it now, for a `PUT`.  Its version field is the server's to set. */
  private async wholeRowOnTheWire(collection: string, id: string, context: PlaceContext): Promise<PlaceRow> {
    const url = this.pathOf(collection)
    const response = await this.answerTo({ url, urlData: { id } }, context)
    const whole = valueAt(await jsonIn(response), this.mappingOf(collection).rowAt) as PlaceRow
    const field = this.versions && "field" in this.versions ? this.wireName(collection, this.versions.field) : undefined
    if (field === undefined) return whole
    const { [field]: _version, ...rest } = whole
    return rest
  }

  ////////////////
  // ## The mapping
  ////////////////

  /** The row of `collection` with this id;  `undefined` if there's none. */
  private async rowOrNothing(collection: string, id: string, context: PlaceContext): Promise<PlaceRow | undefined> {
    try {
      const response = await this.answerTo({ url: this.pathOf(collection), urlData: { id } }, context)
      return this.noted(
        collection,
        valueAt(await jsonIn(response), this.mappingOf(collection).rowAt) as PlaceRow,
        response
      )
    } catch (error) {
      if (error instanceof PlaceError && error.kind === "not found") return undefined
      throw error
    }
  }

  /** The filter, sort and selection of `query` that it can do, as URL params.  Notes what it did in `handled`. */
  private paramsFor(collection: string, query: ListQuery, handled: ListHandled): Record<string, unknown> {
    const { filter = {}, sort = [], select } = query
    const { filter: canFilter, sort: canSort, select: canSelect, idOf } = this.capabilities
    const data: Record<string, unknown> = {}
    const filtering = Object.keys(filter)
    if (filtering.length && canDoAll(canFilter, filtering)) {
      Object.assign(data, this.onTheWire(collection, filter))
      handled.filter = true
    }
    if (
      sort.length &&
      canDoAll(
        canSort,
        sort.map(({ field }) => field)
      )
    ) {
      const order = sort.map(({ field, descending }) => `${descending ? "-" : ""}${this.wireName(collection, field)}`)
      data[this.params.sort] = order.join(",")
      handled.sort = true
    }
    if (select && canDoAll(canSelect, select)) {
      const versionField = this.versions && "field" in this.versions ? this.versions.field : undefined
      const wanted = new Set([
        ...select,
        ...(idOf === undefined ? [] : [idOf]),
        ...(versionField ? [versionField] : [])
      ])
      data[this.params.select] = [...wanted].map((field) => this.wireName(collection, field)).join(",")
      handled.select = true
    }
    return data
  }

  /** How to page this query. */
  private pageOf({ page }: ListQuery): { page: PageKind; at: string | undefined; size: number } {
    return { page: this.capabilities.page, at: page?.at, size: page?.size ?? this.pageSize }
  }

  /**
   * What to ask for next.
   * - By offset:  a full page means there may be more.
   * - By cursor:  what the answer says at `nextAt`, else its `Link` header.
   */
  private nextPageOf({ page, at, size, count, body, nextAt, response }: NextPageAsk): string | undefined {
    if (page === "offset") return count === size ? String(Number(at ?? 0) + size) : undefined
    if (page !== "cursor") return undefined
    const named = valueAt(body, nextAt)
    if (nextAt !== undefined)
      return named === null || named === undefined || named === "" ? undefined : `${named as string}`
    return NEXT_LINK.exec(response.headers.get("Link") ?? "")?.[1]
  }

  /** `collection`'s mapping:  all defaults if it's not named. */
  private mappingOf(collection: string): RestCollection {
    return this.collections[collection] ?? {}
  }

  /** `collection`'s address template. */
  private pathOf(collection: string): string {
    return `${this.url}${this.mappingOf(collection).path ?? `/${collection}{/id}`}`
  }

  /** `row`'s fields, named as the server names them. */
  private onTheWire(collection: string, row: PlaceRow): PlaceRow {
    return renamed(row, this.mappingOf(collection).fields ?? {})
  }

  /** What the server calls this field. */
  private wireName(collection: string, field: string): string {
    return this.mappingOf(collection).fields?.[field] ?? field
  }

  /** `row` from the server, named our way, its version noted.  `response`:  where an `ETag` may be. */
  private noted(collection: string, wireRow: PlaceRow, response?: Response): PlaceRow {
    const row = renamed(wireRow, turnedRound(this.mappingOf(collection).fields ?? {}))
    const id = idOfRow(row, this.capabilities.idOf)
    if (id !== undefined) this.noteVersion(collection, id, row, response)
    return row
  }

  /** A write answered with no row:  only its version can be noted. */
  private noteVersionOnly(collection: string, id: string | undefined, response: Response): undefined {
    if (id !== undefined) this.noteVersion(collection, id, {}, response)
  }

  /** Remember this thing's version:  the row's field, or the answer's `ETag`.  None to be found:  the old one stands. */
  private noteVersion(collection: string, id: string, row: PlaceRow, response: Response | undefined): void {
    if (!this.versions) return
    const version = "field" in this.versions ? row[this.versions.field] : response?.headers.get("ETag")
    if (version !== undefined && version !== null) {
      this.seenVersions.set(versionKey(collection, id), `${version as string | number}`)
    }
  }
}

/** Constructor props of a `RestPlace`. */
export type RestPlaceProps = WebPlaceProps & {
  /** Each collection's mapping, by the name we call it.  One not named:  `/<name>{/id}`, and the same field names. */
  collections?: Readonly<Record<string, RestCollection>>
  /** What this API does for itself, over a plain one that does nothing.  Declared per API:  they vary. */
  can?: Partial<Omit<PlaceCapabilities, "page">> & { page?: Exclude<PageKind, "range"> }
  /** How it knows what version a thing is at.  Left out:  it doesn't, so the last save wins the whole record. */
  versions?: RestVersions
  /** How it updates:  `PATCH`, the fields changed (the default), or `PUT`, the whole record. */
  update?: "PATCH" | "PUT"
  /** What each part of a query is called in the URL, over `sort`, `fields`, `limit`, `offset` and `cursor`. */
  params?: Partial<RestParams>
  /** How many rows it asks for at a time on a place that pages by offset, when nobody says;  default 100. */
  pageSize?: number
}

/** How one collection maps onto the server. */
export type RestCollection = {
  /** Its address under `url`, a template (`Api.url()`):  `/meals{/id}`.  Left out:  `/<name>{/id}`. */
  path?: string
  /** Each field's name on the server, by ours:  `{ title: "name" }`.  One not named:  the same on both. */
  fields?: Readonly<Record<string, string>>
  /** Where a list's rows are in its answer, a dotted path:  `data.items`.  Left out:  the answer is the list. */
  rowsAt?: string
  /** Where one row is in its answer, a dotted path.  Left out:  the answer is the row. */
  rowAt?: string
  /** Where a list's next cursor is in its answer, a dotted path.  Left out:  its `Link` header. */
  nextAt?: string
}

/**
 * How a place knows a thing's version:
 * - `{ field }`:  every row holds it, under this field of ours
 * - `{ header: "ETag" }`:  only answers about one thing carry it, in that header
 */
export type RestVersions = { field: string } | { header: "ETag" }

/** What each part of a query is called in the URL. */
export type RestParams = {
  /** The order:  `title,-rating`. */
  sort: string
  /** The fields wanted:  `id,title`. */
  select: string
  /** How many rows. */
  limit: string
  /** Where to start, on a place that pages by offset. */
  offset: string
  /** Where to start, on a place that pages by cursor. */
  cursor: string
}

/** What `nextPageOf()` looks at. */
type NextPageAsk = {
  /** How it pages. */
  page: PageKind
  /** Where this page started. */
  at: string | undefined
  /** How many rows it asked for. */
  size: number
  /** How many it got. */
  count: number
  /** The answer's JSON. */
  body: unknown
  /** Where the next cursor is in it. */
  nextAt: string | undefined
  /** The answer, for its `Link` header. */
  response: Response
}

/** Where a thing's version is kept. */
function versionKey(collection: string, id: string): string {
  return `${collection}\n${id}`
}
