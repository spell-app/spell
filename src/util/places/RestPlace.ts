import {
  ANY_FIELD,
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
import { FieldNames, type NameStyle } from "./FieldNames"
import { jsonIn, valueAt, WebPlace, type WebPlaceProps } from "./WebPlace"

/** How many rows it asks for at a time on a place that pages, when nobody says. */
const REST_PAGE_SIZE = 100

/** The answers that mean "someone got there first", on a place with versions. */
const OUT_OF_DATE_STATUSES = new Set([409, 412, 428])

/** What it can do, unless it's told otherwise:  a plain web server, read and written, and nothing else promised. */
const REST_CAPABILITIES: PlaceCapabilities = {
  kind: "web server",
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
 * A plain web server as a place:  a mapping of its paths and field names, and nothing else (epic `data` P4).
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
 *   A list under one thing is read at its own address (`ListQuery.under`):  a post's comments, `/posts/1/comments`.
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
 *   A server's field matches ours by its words (`FieldNames`):  `hair_color` is our `hairColor`, with nothing said.
 *   `fields` names only what differs, and `namesLike` how the server spells a name it hasn't sent yet.
 ****************/
export class RestPlace extends WebPlace implements Place {
  /** What it says it can do. */
  private readonly capabilities: PlaceCapabilities
  /** Each collection's mapping. */
  private readonly collections: Readonly<Record<string, RestCollection>>
  /** What's the same of every collection. */
  private readonly allCollections: RestCollection | undefined
  /** How it knows versions. */
  private readonly versions: RestVersions | undefined
  /** How it updates. */
  private readonly updateMethod: "PATCH" | "PUT"
  /** What each part of a query is called. */
  private readonly params: RestParams
  /** How many rows it asks for at a time. */
  private readonly pageSize: number
  /** It was told how many to ask for, so a server that pages by its own next link is asked for that many too. */
  private readonly asksForPageSize: boolean
  /** Each thing's version, as last read or written, by collection and id. */
  private readonly seenVersions = new Map<string, string>()
  /** Each named operation's address. */
  private readonly operations: Readonly<Record<string, string>>
  /** How the server spells a field's name, for one it hasn't sent yet. */
  private readonly namesLike: NameStyle | undefined
  /** The query parameter it searches with, and which of our fields it searches. */
  private readonly searches: RestSearch | undefined
  /** Each collection's field names, made when it's first used. */
  private readonly fieldNames = new Map<string, FieldNames>()
  /** Fields a program named for a collection after it was made:  `addFields()`. */
  private readonly addedFields = new Map<string, Record<string, string>>()

  constructor({
    collections = {},
    allCollections,
    can,
    versions,
    update = "PATCH",
    params,
    pageSize,
    operations,
    namesLike,
    searches,
    ...rest
  }: RestPlaceProps) {
    super(rest)
    this.namesLike = namesLike
    this.searches = searches
    this.operations = operations ?? {}
    this.collections = collections
    this.allCollections = allCollections
    this.versions = versions
    this.updateMethod = update
    this.params = { ...REST_PARAMS, ...params }
    this.pageSize = pageSize ?? REST_PAGE_SIZE
    this.asksForPageSize = pageSize !== undefined
    this.capabilities = {
      ...REST_CAPABILITIES,
      ...can,
      ...(versions && { versionCheck: true }),
      // which fields it decides as it's asked:  a field it doesn't search it leaves the engine, which reads again
      ...(searches && { search: "every field" as const })
    }
  }

  /** What it can do. */
  describe(): PlaceCapabilities {
    return this.capabilities
  }

  /**
   * SIDE EFFECT:  `collection`'s fields are also named `fields`, ours to the server's:  a type's `stored as`, known once it's read.
   * - A spelling already read stays:  only one that's new joins.
   */
  addFields(collection: string, fields: Readonly<Record<string, string>>): void {
    if (!Object.keys(fields).length) return
    this.addedFields.set(collection, { ...this.addedFields.get(collection), ...fields })
    this.fieldNames.delete(collection)
  }

  /**
   * `POST` to a named operation's address:  what the server answers.
   * - A row of `collection` goes in the server's own names, as a write does.
   * - throws `TypeError` for an operation it wasn't told of;  `PlaceError` for an answer that means something
   */
  async call(name: string, input: unknown, context: SelectingContext, collection?: string): Promise<unknown> {
    const path = this.operations[name]
    if (path === undefined) {
      throw new TypeError(`RestPlace.call():  nobody says where "${name}" is;  name it in \`operations\``)
    }
    const data = collection && input ? this.onTheWire(collection, input as PlaceRow) : input
    const response = await this.answerTo({ url: path, urlData: {}, method: "POST", data: data as never }, context)
    return jsonIn(response)
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
      // its next link says the rest, the size asked for included:  PokéAPI's `?offset=2000&limit=2000`
      if (query.page?.size !== undefined) data[this.params.limit] = query.page.size
      else if (this.asksForPageSize && !at) data[this.params.limit] = this.pageSize
      if (at && !IS_ADDRESS.test(at)) data[this.params.cursor] = at
    }
    const url =
      at && IS_ADDRESS.test(at)
        ? at
        : query.under
          ? this.addressUnder(query.under)
          : this.listAddress(collection, handled)
    const response = await this.answerTo({ url, urlData: {}, data }, context)
    const body = await jsonIn(response)
    const { rowsAt, nextAt, askedBy } = this.mappingOf(collection)
    const held = valueAt(body, rowsAt)
    // asked for by a query, it may answer with one thing, not a list:  Open-Meteo's forecast for one place
    const rows = askedBy && isOneRow(held) ? [held] : held
    if (!Array.isArray(rows)) {
      throw new TypeError(
        `RestPlace.list():  "${collection}" didn't answer with a list${rowsAt ? ` at "${rowsAt}"` : ""};  say where it is with \`rowsAt\``
      )
    }
    const nextPage = this.nextPageOf({ page, at, size, count: rows.length, body, nextAt, response })
    return {
      rows: (rows as unknown[]).map((row) => this.noted(collection, this.rowOf(collection, row))),
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
      await this.answerTo({ ...this.thingAddress(collection, id!), method: "DELETE" }, context, changeId)
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
    const wire = this.onTheWire(collection, fields)
    const isWhole = this.updateMethod === "PUT"
    const data = isWhole ? { ...(await this.wholeRowOnTheWire(collection, id!, context)), ...wire } : wire
    const headers = this.versions && version !== undefined ? { "If-Match": version } : undefined
    return this.answerTo(
      { ...this.thingAddress(collection, id!), method: this.updateMethod, data, ...(headers && { headers }) },
      context,
      changeId
    )
  }

  /** The record as the server keeps it now, for a `PUT`.  Its version field is the server's to set. */
  private async wholeRowOnTheWire(collection: string, id: string, context: PlaceContext): Promise<PlaceRow> {
    const response = await this.answerTo(this.thingAddress(collection, id), context)
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
      const response = await this.answerTo(this.thingAddress(collection, id), context)
      const row = this.noted(
        collection,
        valueAt(await jsonIn(response), this.mappingOf(collection).rowAt) as PlaceRow,
        response
      )
      // a server whose lists name each row by its address, and whose rows don't name themselves (PokéAPI's):
      // the id it was asked for is its id, so it's the same thing its list gave
      const { idOf } = this.capabilities
      if (idOf !== undefined && idOfRow(row, idOf) === undefined) row[idOf] = id
      return row
    } catch (error) {
      if (error instanceof PlaceError && error.kind === "not found") return undefined
      throw error
    }
  }

  /** The filter, sort and selection of `query` that it can do, as URL params.  Notes what it did in `handled`. */
  private paramsFor(collection: string, query: ListQuery, handled: ListHandled): Record<string, unknown> {
    const { filter = {}, search = {}, sort = [], select } = query
    const { filter: canFilter, sort: canSort, select: canSelect, idOf } = this.capabilities
    const data: Record<string, unknown> = {}
    const filtering = Object.keys(filter)
    const { askedBy } = this.mappingOf(collection)
    // what it's asked for by goes as the query:  the server's answer is the one for those values, whatever it says it holds
    if (filtering.length && (canDoAll(canFilter, filtering) || isAskedBy(askedBy, filtering))) {
      Object.assign(data, this.onTheWire(collection, filter))
      handled.filter = true
    }
    // one parameter, so one field's text:  two at once stay the engine's
    const searching = Object.values(search)
    if (this.searches && searching.length === 1 && isSearched(this.searches, Object.keys(search)[0]!)) {
      data[this.searches.param] = searching[0]
      handled.search = true
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

  /** Where a list of `collection` is asked for:  a search's own address, when it searched and has one (`RestSearch.at`). */
  private listAddress(collection: string, handled: ListHandled): string {
    const at = handled.search ? this.searches?.at : undefined
    return at === undefined ? this.pathOf(collection) : `${this.url}${at}`
  }

  /**
   * A list's row as a row:  a plain id is a row holding only its id (epic `data` P34), as the Met Museum lists
   * `"objectIDs": [436524, ...]`, each read whole from its own address (`its lists give only each one's "objectID"`).
   */
  private rowOf(collection: string, row: unknown): PlaceRow {
    if (typeof row !== "string" && typeof row !== "number") return row as PlaceRow
    const idOf = this.capabilities.idOf ?? REST_CAPABILITIES.idOf!
    return { [this.wireName(collection, idOf)]: row }
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

  /** `collection`'s mapping:  what it says, over what's said of every collection;  all defaults if neither says. */
  private mappingOf(collection: string): RestCollection {
    const own = this.collections[collection]
    const added = this.addedFields.get(collection)
    const fields = { ...this.allCollections?.fields, ...own?.fields, ...added }
    return { ...this.allCollections, ...own, fields }
  }

  /** Where the thing with this id is:  an id that's a whole address is where it is, as on a server whose rows name themselves. */
  private thingAddress(collection: string, id: string): { url: string; urlData: { id?: string } } {
    return IS_ADDRESS.test(id) ? { url: id, urlData: {} } : { url: this.pathOf(collection), urlData: { id } }
  }

  /** Where a list under one thing is:  a path under its address, or a whole address (`ListQuery.under`). */
  private addressUnder(under: string): string {
    return IS_ADDRESS.test(under) ? under : `${this.url}${under}`
  }

  /** `collection`'s address template. */
  private pathOf(collection: string): string {
    return `${this.url}${this.mappingOf(collection).path ?? `/${collection}{/id}`}`
  }

  /** `row`'s fields, named as the server names them. */
  private onTheWire(collection: string, row: PlaceRow): PlaceRow {
    return this.namesOf(collection).toServer(row)
  }

  /** What the server calls this field. */
  private wireName(collection: string, field: string): string {
    return this.namesOf(collection).serverName(field)
  }

  /** `collection`'s field names:  what's named, and what it's read. */
  private namesOf(collection: string): FieldNames {
    let names = this.fieldNames.get(collection)
    if (!names) {
      names = new FieldNames(this.mappingOf(collection).fields, this.namesLike)
      this.fieldNames.set(collection, names)
    }
    return names
  }

  /** `row` from the server, named our way, its version noted.  `response`:  where an `ETag` may be. */
  private noted(collection: string, wireRow: PlaceRow, response?: Response): PlaceRow {
    const row = withPictures(this.namesOf(collection).fromServer(wireRow), this.mappingOf(collection).pictures)
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
  /** What's the same of every collection:  each one's own mapping wins, field by field. */
  allCollections?: RestCollection
  /** What this API does for itself, over a plain one that does nothing.  Declared per API:  they vary. */
  can?: Partial<Omit<PlaceCapabilities, "page">> & { page?: Exclude<PageKind, "range"> }
  /** Each named operation's address under `url`, by its name:  `{ publish: "/recipes/publish" }`, for `call()`. */
  operations?: Readonly<Record<string, string>>
  /** How it knows what version a thing is at.  Left out:  it doesn't, so the last save wins the whole record. */
  versions?: RestVersions
  /** How it updates:  `PATCH`, the fields changed (the default), or `PUT`, the whole record. */
  update?: "PATCH" | "PUT"
  /** What each part of a query is called in the URL, over `sort`, `fields`, `limit`, `offset` and `cursor`. */
  params?: Partial<RestParams>
  /**
   * How many rows it asks for at a time on a place that pages by offset, when nobody says;  default 100.
   * - Given, a place that pages by its next link is asked for that many too, on its first page
   *   (`it gives up to 2000 at a time`).
   */
  pageSize?: number
  /** How the server spells a field's name it hasn't sent yet, for a write or a query:  `snake` for `hair_color`.  Left out:  ours. */
  namesLike?: NameStyle
  /**
   * How it searches, for text a field holds (`ListQuery.search`):  `{ param: "search", fields: ["names", "titles"] }`.
   * - It's handed one field's text at a time, as `?search=sky`:  however the server matches, the program checks what comes back.
   * - Left out:  it doesn't, so a search reads every page, and the engine looks through them.
   */
  searches?: RestSearch
}

/**
 * Is `field` one of the `words` a server says it searches?  As written, or that plus `s` or `es`:  `names` is `name`.
 * - The compiler matches the same way (spell's `isSearchedField()`), so what it hands over is what this takes.
 * - A server naming no field searches all of each thing:  it takes `ANY_FIELD`, and only that.
 */
function isSearched({ fields }: RestSearch, field: string): boolean {
  if (!fields.length) return field === ANY_FIELD
  return fields.some((word) => word === field || word === `${field}s` || word === `${field}es`)
}

/** How a web server searches:  `- it searches names and titles with "search"`. */
export type RestSearch = {
  /** The query parameter that takes the text:  `search`. */
  param: string
  /**
   * The fields it looks in, by their words as a program wrote them:  `["names", "titles"]` (`isSearched()`).
   * - None:  it looks in all of each thing, `- it searches everything with "q"`, handed `ANY_FIELD` (epic `data` P34).
   */
  fields: readonly string[]
  /** Its own address under `url`, when a search isn't asked of a list's:  the Met Museum's `/v1.1/search`. */
  at?: string
}

/** How one collection maps onto the server. */
export type RestCollection = {
  /** Its address under `url`, a template (`Api.url()`):  `/meals{/id}`.  Left out:  `/<name>{/id}`. */
  path?: string
  /** Each field's name on the server, by ours:  `{ title: "name" }`.  One not named:  matched by its words (`FieldNames`). */
  fields?: Readonly<Record<string, string>>
  /** Where a list's rows are in its answer, a dotted path:  `data.items`.  Left out:  the answer is the list. */
  rowsAt?: string
  /** Where one row is in its answer, a dotted path.  Left out:  the answer is the row. */
  rowAt?: string
  /** Where a list's next cursor is in its answer, a dotted path.  Left out:  its `Link` header. */
  nextAt?: string
  /**
   * Fields holding a picture's id on another server, by ours, each with where its pictures are (epic `data` P29):
   * `{ coverI: "https://covers.openlibrary.org/b/id/{id}-M.jpg" }`.
   * - Each row read has its picture's address there instead:  `11481354` => `.../b/id/11481354-M.jpg`.
   * - Whatever the braces say, the value goes there.
   */
  pictures?: Readonly<Record<string, string>>
  /**
   * The fields it's asked for by, each a query parameter, by ours (epic `data` P33):  Open-Meteo's forecasts,
   * `{ askedBy: ["latitude", "longitude"] }`, `/v1/forecast?latitude=52.52&longitude=13.41`.
   * - A filter on those fields goes as the query, and is taken as done:  its answer is for that place,
   *   whatever latitude it says it's for (`52.5126`, the nearest it has).
   * - Its answer may be one thing, not a list:  that's its one row.
   */
  askedBy?: readonly string[]
}

/** Is `filtering` only fields it's asked for by:  `RestCollection.askedBy`? */
function isAskedBy(askedBy: readonly string[] | undefined, filtering: readonly string[]): boolean {
  return !!askedBy?.length && filtering.every((field) => askedBy.includes(field))
}

/** Is this one thing's row, not a list:  a plain object? */
function isOneRow(value: unknown): value is PlaceRow {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/** A name in braces, where a picture's id goes in its address. */
const PICTURE_ID = /\{[^{}]*\}/

/** SIDE EFFECT:  `row`, each of its `pictures` fields holding its picture's address, not its id:  `RestCollection.pictures`. */
function withPictures(row: PlaceRow, pictures: Readonly<Record<string, string>> | undefined): PlaceRow {
  for (const [field, address] of Object.entries(pictures ?? {})) {
    const id = row[field]
    if (typeof id === "string" || typeof id === "number") {
      row[field] = address.replace(PICTURE_ID, encodeURIComponent(`${id}`))
    }
  }
  return row
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
