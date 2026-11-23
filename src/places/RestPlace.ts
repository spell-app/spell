import type { ApiMethod } from "spell/util/fetching"

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
  type SelectingContext,
  type WriteAnswer,
  type WriteKind,
  type WriteQuestion
} from "./places.types"
import { FieldNames, type NameStyle } from "./FieldNames"
import { DEFAULT_CEILING } from "./PlaceQuery"
import { jsonIn, valueAt, WebPlace, type WebPlaceProps } from "./WebPlace"
import { wrappedRows } from "./wrappedRows"

/** The word for every operation, in a list of enabled ones:  `enabled operations are all`. */
const ALL_OPERATIONS = "all"

/** Reading, as an operation (epic `data` P49, Q61):  `enabled operations are read` is read only. */
const READ_OPERATION = "read"

/** Each kind of write, as the operation a list of enabled ones names it. */
const OPERATION_OF_WRITE: Readonly<Record<WriteKind, string>> = { insert: "add", update: "change", delete: "delete" }

/** What a refusal says can be done, by operation:  "look at jobs", "add new ones". */
const CAN_DO: Readonly<Record<string, (things: string) => string>> = {
  read: (things) => `look at ${things}`,
  add: () => "add new ones",
  change: () => "change them",
  delete: () => "delete them"
}

/** What a refusal says can't be done, by operation:  "Jobs can't be deleted here." */
const PAST_OF: Readonly<Record<string, string>> = {
  read: "looked at",
  add: "added",
  change: "changed",
  delete: "deleted"
}

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

/**
 * A next page written as a path on the same server:  `/items?page=2`, `?page=2`.
 * - Needs its `?`, as a cursor starting with `/` is no address:  base64's can.
 */
const IS_PATH_WITH_QUERY = /^\/[^?]*\?|^\?/

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
 * - Paging:  the place's way, unless a collection says its own (`RestCollection.paging`, epic `data` P56).
 * - A named operation's braces:  from what's sent, else from where the thing was read (`call()`).
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
  /** How every collection pages, unless it says its own way:  `pagingOf()`. */
  private readonly paging: Paging
  /** Each thing's version, as last read or written, by collection and id. */
  private readonly seenVersions = new Map<string, string>()
  /** Where each thing read under another was read, by collection and id:  `/jobs/6f1c/steps`, for `call()`'s braces. */
  private readonly readUnder = new Map<string, string>()
  /** Each named operation's address. */
  private readonly operations: Readonly<Record<string, string | RestOperation>>
  /** Each collection's enabled operations, by its line (`limitOperations()`):  a collection not here takes every one. */
  private readonly enabled = new Map<string, ReadonlySet<string>>()
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
    pageNumbers,
    sendsNoCount = false,
    pagesByLastId,
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
    this.paging = {
      page: can?.page ?? REST_CAPABILITIES.page,
      limit: this.params.limit,
      offset: this.params.offset,
      cursor: this.params.cursor,
      size: pageSize ?? REST_PAGE_SIZE,
      asksForSize: pageSize !== undefined,
      firstPageNumber: pageNumbers?.first,
      sendsNoCount,
      pagesByLastId
    }
    this.capabilities = {
      ...REST_CAPABILITIES,
      ...can,
      ...(versions && { versionCheck: true }),
      // which fields it decides as it's asked:  a field it doesn't search it leaves the engine, which reads again
      ...((searches || Object.values(collections).some((each) => each.searches)) && { search: "every field" as const })
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
   * SIDE EFFECT:  `collection` takes only these operations (epic `data` P49):  a thing's `enabled operations are ...`,
   * or a collection's, the two together narrowing.
   * - `read`, `add`, `change`, `delete`, and a named operation's name (`complete`);  `all` is every one.
   * - None at all:  `all operations are disabled`, so not even reading.
   * - A collection never limited takes every operation.
   */
  limitOperations(collection: string, operations: readonly string[]): void {
    if (operations.includes(ALL_OPERATIONS)) return
    const was = this.enabled.get(collection)
    this.enabled.set(collection, new Set(was ? operations.filter((each) => was.has(each)) : operations))
  }

  /**
   * Would it take this write?  Not one its collection's enabled operations leave out (`limitOperations()`).
   * - `whyNot`:  `"place"`, as no one may.
   */
  canWrite({ collection, kind }: WriteQuestion): WriteAnswer {
    if (kind && !this.isEnabled(collection, OPERATION_OF_WRITE[kind])) return { canWrite: false, whyNot: "place" }
    return { canWrite: true }
  }

  /**
   * Send a named operation:  what the server answers.
   * - Its address's braces are filled from the thing sent (`Api.url()`):  `/jobs/{id}/complete` from its id, any
   *   other name from its field by that name, the server's (epic `data` P49, Q48).
   * - A brace nothing sent fills is filled from where the thing is (epic `data` P56):  its address, word by word, under
   *   the operation's.  So `/jobs/{job_id}/complete` takes the job's id, and a step read at `/jobs/6f1c/steps`
   *   fills `/jobs/{job_id}/steps/{step_id}/retry` with its job's and its own.
   * - Its own method, `POST` unless its description said another.
   * - A row of `collection` goes in the server's own names, as a write does.
   * - throws `TypeError` for an operation it wasn't told of;  `PlaceError` `"refused"` for one its collection's
   *   enabled operations leave out, and for an answer that means something
   */
  async call(name: string, input: unknown, context: SelectingContext, collection?: string): Promise<unknown> {
    const operation = this.operations[name]
    if (operation === undefined) {
      throw new TypeError(`RestPlace.call():  nobody says where "${name}" is;  name it in \`operations\``)
    }
    if (collection) this.refuseUnlessEnabled(collection, name)
    const { at, method = "POST" } = typeof operation === "string" ? { at: operation } : operation
    const data = collection && input ? this.onTheWire(collection, input as PlaceRow) : input
    const id = isOneRow(input) ? input.id : undefined
    const sent = isOneRow(data) ? { ...data, ...(id !== undefined && { id }) } : {}
    const where = collection && id !== undefined ? this.addressOfThing(collection, `${id as string}`) : undefined
    const urlData = { ...(where && bracesFrom(at, where)), ...sent }
    const url = IS_ADDRESS.test(at) ? at : `${this.url}${at}`
    const response = await this.answerTo({ url, urlData: urlData as never, method, data: data as never }, context)
    return jsonIn(response)
  }

  /**
   * Where the thing `id` of `collection` is, under the place's address:  `/jobs/6f1c/steps/3`, read under its job;
   * `/jobs/6f1c`, at its collection's own.
   */
  private addressOfThing(collection: string, id: string): string {
    const under = this.readUnder.get(versionKey(collection, id))
    const list = under ?? (this.mappingOf(collection).path ?? `/${collection}{/id}`).replace(/\{\/?id\}$/, "")
    return `${list.replace(/\/+$/, "")}/${encodeURIComponent(id)}`
  }

  /** Does `collection` take `operation`? */
  private isEnabled(collection: string, operation: string): boolean {
    return this.enabled.get(collection)?.has(operation) ?? true
  }

  /**
   * - throws `PlaceError` `"refused"` when `collection` doesn't take `operation`, saying what can be done instead,
   *   in short lines for people:  "Jobs can't be deleted here.\nHere you can look at jobs, add new ones and change them."
   */
  private refuseUnlessEnabled(collection: string, operation: string): void {
    if (this.isEnabled(collection, operation)) return
    const things = wordsOf(collection)
    const enabled = [...(this.enabled.get(collection) ?? [])]
    const can = enabled.map((each) => CAN_DO[each]?.(things) ?? `${wordsOf(each)} them`)
    const what = PAST_OF[operation]
    const refused = what
      ? `${capitalized(things)} can't be ${what} here.`
      : `"${capitalized(wordsOf(operation))}" isn't allowed for ${things} here.`
    const message = can.length
      ? `${refused}\nHere you can ${listed(can)}.\nTo do more, ask whoever looks after this data.`
      : `Nothing can be done with ${things} here:  even looking at them is turned off.`
    throw new PlaceError(message, { cause: { kind: "refused", whyNot: "place" } })
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * One page of `collection`, doing what `can` says, and saying what it did.
   * - throws `PlaceError` for an answer that means something;  `TypeError` for an answer that isn't a list
   */
  async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    this.refuseUnlessEnabled(collection, READ_OPERATION)
    const paging = this.pagingOf(collection)
    const { page, at, size } = this.pageOf(query, paging)
    const handled: ListHandled = {}
    // a next page's whole address carries the query its first page was asked with:  what that one did, this one did
    const asked = this.paramsFor(collection, query, handled)
    // a last row's id may look like an address, and still isn't where the next page is
    const nextAddress = page === "cursor" && !paging.pagesByLastId && at && IS_ADDRESS.test(at) ? at : undefined
    const data = nextAddress ? {} : asked
    if (page === "offset") {
      if (!paging.sendsNoCount) data[paging.limit] = size
      data[paging.offset] = Number(at ?? paging.firstPageNumber ?? 0)
    }
    if (page === "cursor") {
      // its next link says the rest, the size asked for included:  PokéAPI's `?offset=2000&limit=2000`
      if (paging.pagesByLastId) {
        if (!paging.sendsNoCount) data[paging.limit] = size
      } else if (query.page?.size !== undefined) data[paging.limit] = query.page.size
      else if (paging.asksForSize && !at) data[paging.limit] = paging.size
      if (at && !nextAddress) data[paging.cursor] = at
    }
    const url = nextAddress ?? (query.under ? this.addressUnder(query.under) : this.listAddress(collection, handled))
    const response = await this.answerTo({ url, urlData: {}, data }, context)
    const body = await jsonIn(response)
    const { rowsAt, nextAt, askedBy } = this.mappingOf(collection)
    const held = valueAt(body, rowsAt)
    // nothing at all where its rows would be is no rows:  the Met's `objectIDs: null`, when a search finds nothing;
    // asked for by a query, it may answer with one thing, not a list:  Open-Meteo's forecast for one place;
    // a search at its own address answers its own way:  GitHub's `{ total_count, items: [...] }`;
    // so does a list under a thing:  Open Library's `{ links, size, entries: [...] }` (epic `data` T114);
    // and a search beside lists, its rows not where theirs are:  FastAPI's `{ results, total_count }` (epic `data` I140);
    // or a plain list beside lists whose rows are wrapped:  FastAPI's steps under a job (epic `data` P56);
    // ONE thing under a thing is that list's one row:
    // a system's snapshot, its own lists inside it, found at its owner or said by the read (epic `from-console` I4)
    const rows =
      held === null
        ? []
        : (askedBy || (query.under && (query.oneThing || this.isFoundAtItsOwner(collection)))) && isOneRow(held)
          ? [held]
          : !Array.isArray(held) &&
              (query.under ||
                this.isSearchAddress(collection, url) ||
                (held === undefined && rowsAt !== undefined) ||
                // a list whose rows are wrapped, as no other's are:  `{ sources: [...], next_offset: 20 }`
                (rowsAt === undefined && held === body))
            ? ((Array.isArray(body) ? body : wrappedRows(body)?.rows) ?? (query.under && isOneRow(held) ? [held] : held))
            : held
    if (!Array.isArray(rows)) {
      throw new TypeError(
        `RestPlace.list():  "${collection}" didn't answer with a list${rowsAt ? ` at "${rowsAt}"` : ""};  say where it is with \`rowsAt\``
      )
    }
    // told no count, it gives what it gives:  a read asking for fewer takes the first of them;
    // and what's more than this place keeps at once (the Met Museum's every id) is cut, saying so (epic `data` T123)
    const { rows: mostRows } = { ...DEFAULT_CEILING, ...this.capabilities.ceiling }
    const wanted = paging.sendsNoCount && query.page?.size !== undefined ? rows.slice(0, query.page.size) : rows
    const kept = wanted.length > mostRows ? wanted.slice(0, mostRows) : wanted
    const sizeIsKnown = paging.asksForSize || query.page?.size !== undefined
    const nextPage = this.nextPageOf({
      paging,
      page,
      at,
      size,
      sizeIsKnown,
      count: kept.length,
      body,
      nextAt,
      response,
      collection,
      lastRow: kept.at(-1)
    })
    // what it was asked for, sent as the query, each row holds
    const askedValues = handled.filter ? askedValuesIn(askedBy, query.filter) : undefined
    const read = (kept as unknown[]).map((row) =>
      withAsked(this.noted(collection, this.rowOf(collection, row)), askedValues)
    )
    if (query.under) this.noteReadUnder(collection, query.under, read)
    return {
      rows: read,
      ...(nextPage !== undefined && { nextPage }),
      ...(kept.length < wanted.length && {
        notes: [
          `"${collection}" answered ${wanted.length} rows, and only the first ${mostRows} are kept:  ask for less, or raise its \`ceiling\``
        ]
      }),
      handled
    }
  }

  /** The rows of `collection` with these ids:  one request each.  An id it doesn't hold is left out. */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext): Promise<PlaceRow[]> {
    this.refuseUnlessEnabled(collection, READ_OPERATION)
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
    this.refuseUnlessEnabled(collection, OPERATION_OF_WRITE[kind])
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
    // what it's asked for by goes as the query:
    // the server's answer is the one for those values, whatever it says it holds
    if (filtering.length && (canDoAll(canFilter, filtering) || isAskedBy(askedBy, filtering))) {
      Object.assign(data, this.onTheWire(collection, filter))
      handled.filter = true
    }
    // one parameter, so one field's text:  two at once stay the engine's
    const searching = Object.values(search)
    const searches = this.searchesOf(collection)
    if (searches && searching.length === 1 && isSearched(searches, Object.keys(search)[0]!)) {
      data[searches.param] = searching[0]
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
    const at = handled.search ? this.searchesOf(collection)?.at : undefined
    return at === undefined ? this.pathOf(collection) : `${this.url}${at}`
  }

  /**
   * Is `url` a page of `collection`'s search, at its own address:  the first, or a later one its `Link` header named?
   * - By its path alone, on both sides:  the search's own address may ask something of its own, `/v1.1/search?hasImages=true`.
   */
  private isSearchAddress(collection: string, url: string): boolean {
    const at = this.searchesOf(collection)?.at
    return at !== undefined && url.split("?")[0] === `${this.url}${at}`.split("?")[0]
  }

  /** How `collection` searches:  its own search (`RestCollection.searches`), else the place's. */
  private searchesOf(collection: string): RestSearch | undefined {
    return this.collections[collection]?.searches ?? this.searches
  }

  /**
   * A list's row as a row:  a plain id is a row holding only its id (epic `data` P34),
   * as the Met Museum lists `"objectIDs": [436524, ...]`,
   * each read whole from its own address (`its lists give only each one's "objectID"`).
   */
  private rowOf(collection: string, row: unknown): PlaceRow {
    if (typeof row !== "string" && typeof row !== "number") return row as PlaceRow
    const idOf = this.capabilities.idOf ?? REST_CAPABILITIES.idOf!
    return { [this.wireName(collection, idOf)]: row }
  }

  /** How to page this query, `paging`'s way. */
  private pageOf({ page }: ListQuery, paging: Paging): { page: PageKind; at: string | undefined; size: number } {
    return { page: paging.page, at: page?.at, size: page?.size ?? paging.size }
  }

  /**
   * How `collection` pages:  its own way, when it says one (`RestCollection.paging`, epic `data` P56), else the place's.
   * - Its own kind of paging is whole:  the names it asks with are its own, or the usual `limit`, `offset` and `cursor`.
   * - Only how many it gives:  the place's way, that many at a time.
   */
  private pagingOf(collection: string): Paging {
    const own = this.mappingOf(collection).paging
    if (!own) return this.paging
    const size = own.pageSize === undefined ? {} : { size: own.pageSize, asksForSize: true }
    if (own.page === undefined)
      return { ...this.paging, ...size, ...(own.params?.limit && { limit: own.params.limit }) }
    return {
      page: own.page,
      limit: own.params?.limit ?? REST_PARAMS.limit,
      offset: own.params?.offset ?? REST_PARAMS.offset,
      cursor: own.params?.cursor ?? REST_PARAMS.cursor,
      size: this.paging.size,
      asksForSize: this.paging.asksForSize,
      ...size,
      firstPageNumber: own.pageNumbers?.first,
      sendsNoCount: own.sendsNoCount ?? false,
      pagesByLastId: own.pagesByLastId
    }
  }

  /** SIDE EFFECT:  each of `rows` remembers where it was read, `under`, for a named operation's braces (`call()`). */
  private noteReadUnder(collection: string, under: string, rows: readonly PlaceRow[]): void {
    const at = IS_ADDRESS.test(under) ? under.slice(this.url.length) : under
    for (const row of rows) {
      const id = idOfRow(row, this.capabilities.idOf)
      if (id !== undefined) this.readUnder.set(versionKey(collection, id), at.split("?")[0]!)
    }
  }

  /**
   * What to ask for next.
   * - By offset:  a full page means there may be more.
   *   - Counting pages:  the next number.
   *   - Told no count and not told its size:  only an empty page says that was the last, and it goes on by what it got.
   * - By the last row's id:  `nextByLastId()`.
   * - By cursor:  what the answer says at `nextAt`, else its `Link` header.
   * - throws `TypeError` for a page that goes on from a last row with no id
   */
  private nextPageOf(ask: NextPageAsk): string | undefined {
    const { paging, page, at, size, sizeIsKnown, count, body, nextAt, response } = ask
    if (paging.pagesByLastId) return this.nextByLastId(ask, paging.pagesByLastId.moreAt)
    if (page === "offset") {
      const isFull = paging.sendsNoCount ? (sizeIsKnown ? count >= size : count > 0) : count === size
      if (!isFull) return undefined
      if (paging.firstPageNumber !== undefined) return String(Number(at ?? paging.firstPageNumber) + 1)
      return String(Number(at ?? 0) + (paging.sendsNoCount ? count : size))
    }
    if (page !== "cursor") return undefined
    const named = valueAt(body, nextAt)
    if (nextAt !== undefined)
      return named === null || named === undefined || named === ""
        ? undefined
        : this.wholeAddressOf(`${named as string}`, response)
    const link = NEXT_LINK.exec(response.headers.get("Link") ?? "")?.[1]
    return link === undefined ? undefined : this.wholeAddressOf(link, response)
  }

  /**
   * The id of this page's last row, when there's more after it.
   * - An empty page was the last, whatever it says.
   * - What the answer says at `moreAt` decides;  nothing there, or nothing told to look at:
   *   with its size known, a short page was the last;  not known, only an empty one.
   * - throws `TypeError` for a last row with no id, which would silently end the read
   */
  private nextByLastId(
    { size, sizeIsKnown, count, body, collection, lastRow }: NextPageAsk,
    moreAt: string | undefined
  ): string | undefined {
    if (count === 0) return undefined
    const more = moreAt === undefined ? undefined : valueAt(body, moreAt)
    const hasMore = more === undefined || more === null ? !sizeIsKnown || count >= size : !!more
    if (!hasMore) return undefined
    const idField = this.wireName(collection, this.capabilities.idOf ?? REST_CAPABILITIES.idOf!)
    const id = isOneRow(lastRow) ? lastRow[idField] : lastRow
    if (id === undefined || id === null || id === "") {
      throw new TypeError(
        `RestPlace.list():  the last row of "${collection}" has no "${idField}", so its next page can't be asked for;  say which field is its id`
      )
    }
    return `${id as string | number}`
  }

  /** A next page written as a path on this server, as a whole address;  anything else as it is. */
  private wholeAddressOf(next: string, response: Response): string {
    const base = response.url || this.url
    return IS_PATH_WITH_QUERY.test(next) && URL.canParse(next, base) ? new URL(next, base).href : next
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

  /**
   * Is each of `collection`'s things found at an address holding its owner's id, with no list of its own:
   * `snapshots are found at "/instances/{id}/snapshot"`?
   * Then what's under a thing there is one of them.
   */
  private isFoundAtItsOwner(collection: string): boolean {
    return HOLDS_AN_ID.test(this.mappingOf(collection).path ?? "")
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
  /**
   * Each named operation's address under `url`, by its name, for `call()`:  `{ publish: "/recipes/publish" }`;
   * or its address and method, `{ complete: { at: "/jobs/{id}/complete", method: "PATCH" } }` (epic `data` P49).
   */
  operations?: Readonly<Record<string, string | RestOperation>>
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
  /**
   * On a place that pages by offset, it counts pages, not rows, from `first`:  `?page=3` (epic `data` I35).
   * - `params.offset` names the page's question.
   */
  pageNumbers?: { first: number }
  /**
   * It's never told how many to give, paging by offset or by the last row's id:  `?start=40` alone, its page size its own.
   * - Without `pageSize`, a read goes on until a page comes back empty, one request more.
   */
  sendsNoCount?: boolean
  /**
   * With `can: { page: "cursor" }`, its next page is asked for by the last row's id, sent as `params.cursor`:
   * Stripe's `?starting_after=cus_123` (epic `data` I35).
   * - `moreAt`:  a dotted path in the answer that says whether there's more, Stripe's `has_more`.
   * - Left out, or nothing there:  a short page was the last when its size is known, else an empty one.
   */
  pagesByLastId?: { moreAt?: string }
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

/** A named operation's address, its braces filled from the thing sent, and its method (epic `data` P49). */
export type RestOperation = {
  /** Its address under `url`:  `/jobs/{id}/complete`. */
  at: string
  /** Its method:  `POST` when left out. */
  method?: ApiMethod
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
   * The fields it's asked for by, each a query parameter, by ours (epic `data` P33):
   * Open-Meteo's forecasts, `{ askedBy: ["latitude", "longitude"] }`, `/v1/forecast?latitude=52.52&longitude=13.41`.
   * - A filter on those fields goes as the query, and is taken as done:  its answer is for that place,
   *   whatever latitude it says it's for (`52.5126`, the nearest it has).
   * - Its answer may be one thing, not a list:  that's its one row.
   * - Each row it answers holds the value it was asked for, where the server leaves that field out:
   *   layer stacks asked for by their system, `?system=alpha`, each have `system: "alpha"`,
   *   so a read's `where its system is "alpha"` holds here too.
   */
  askedBy?: readonly string[]
  /**
   * How this collection searches, when it isn't the place's way (`RestPlace.searches`):
   * GitHub's users at `/search/users`, its repositories at `/search/repositories`, each with `q`.
   * - `users are searched with "q" at "/search/users"`
   */
  searches?: RestSearch
  /**
   * How this collection pages, when it isn't the place's way (epic `data` P56):
   * a FastAPI list asked with `?take=&skip=` beside lists asked with `?limit=&offset=`.
   * - `jobs live at "/api/events"`, then one step in, `its next page is asked for with "take" and "skip"`.
   */
  paging?: RestPaging
}

/**
 * How one collection pages, its own way (`RestCollection.paging`):  the place's props of the same names, for it alone.
 * - `page`:  its kind of paging;  left out, the place's, and only its size is its own.
 */
export type RestPaging = Pick<RestPlaceProps, "pageSize" | "pageNumbers" | "sendsNoCount" | "pagesByLastId"> & {
  page?: "offset" | "cursor"
  /** What it calls how many, where from, and the cursor:  each left out, `limit`, `offset` and `cursor`. */
  params?: Partial<Pick<RestParams, "limit" | "offset" | "cursor">>
}

/** How a list is paged, worked out:  the place's (`RestPlace.paging`), or a collection's own (`pagingOf()`). */
type Paging = {
  /** Its kind. */
  page: PageKind
  /** What it calls how many. */
  limit: string
  /** What it calls where from. */
  offset: string
  /** What it calls a cursor. */
  cursor: string
  /** How many it asks for at a time. */
  size: number
  /** It was told how many to ask for, so a server that pages by its own next link is asked for that many too. */
  asksForSize: boolean
  /** It counts pages, not rows, from this number:  `RestPlaceProps.pageNumbers`. */
  firstPageNumber: number | undefined
  /** It's never told how many to give:  `RestPlaceProps.sendsNoCount`. */
  sendsNoCount: boolean
  /** Its next page is asked for by the last row's id:  `RestPlaceProps.pagesByLastId`. */
  pagesByLastId: { moreAt?: string } | undefined
}

/** A name as words:  `tenant_groups` => `tenant groups`, `renderConfig` => `render config`. */
function wordsOf(name: string): string {
  return name
    .replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
}

/** `text` with its first letter a capital. */
function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Several things as a person lists them:  `a, b and c`. */
function listed(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "")
}


/** The values of `filter` for the fields a list is asked for by (`RestCollection.askedBy`):  none, `undefined`. */
function askedValuesIn(
  askedBy: readonly string[] | undefined,
  filter: Record<string, unknown> | undefined
): PlaceRow | undefined {
  if (!askedBy?.length || !filter) return undefined
  const asked = Object.entries(filter).filter(([field]) => askedBy.includes(field))
  return asked.length ? Object.fromEntries(asked) : undefined
}

/**
 * `row`, holding each value it was asked for where the server left that field out.
 * - A value the server gave stands:  Open-Meteo's `52.5126`, the nearest it has to `52.52`.
 * - SIDE EFFECT:  changes `row`.
 */
function withAsked(row: PlaceRow, asked: PlaceRow | undefined): PlaceRow {
  if (asked) for (const [field, value] of Object.entries(asked)) if (row[field] === undefined) row[field] = value
  return row
}

/** Is `filtering` only fields it's asked for by:  `RestCollection.askedBy`? */
function isAskedBy(askedBy: readonly string[] | undefined, filtering: readonly string[]): boolean {
  return !!askedBy?.length && filtering.every((field) => askedBy.includes(field))
}

/**
 * The braces of `template` that `address` fills, word by word from its start:  `/jobs/{job_id}/complete` and
 * `/jobs/6f1c` give `{ job_id: "6f1c" }`.
 * - Stops at the first word that differs, or where `address` ends.
 */
function bracesFrom(template: string, address: string): Record<string, string> {
  const words = template.split("?")[0]!.split("/")
  const said = address.split("/")
  const filled: Record<string, string> = {}
  for (let at = 0; at < Math.min(words.length, said.length); at++) {
    const brace = /^\{([^{}/]+)\}$/.exec(words[at]!)?.[1]
    if (brace) filled[brace] = decodeURIComponent(said[at]!)
    else if (words[at] !== said[at]) break
  }
  return filled
}

/** Is this one thing's row, not a list:  a plain object? */
function isOneRow(value: unknown): value is PlaceRow {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/** A name in braces inside an address, not its own id's place at the end (`{/id}`):  `/instances/{id}/snapshot`. */
const HOLDS_AN_ID = /\{[^{}/]+\}/

/** A name in braces, where a picture's id goes in its address. */
const PICTURE_ID = /\{[^{}]*\}/

/**
 * SIDE EFFECT:  `row`, each of its `pictures` fields holding its picture's address, not its id.
 * - SEE:  `RestCollection.pictures`
 */
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
  /** How its list pages. */
  paging: Paging
  /** How it pages. */
  page: PageKind
  /** Where this page started. */
  at: string | undefined
  /** How many rows it asked for. */
  size: number
  /** Was it told that size, rather than taking the default? */
  sizeIsKnown: boolean
  /** The collection it's reading. */
  collection: string
  /** This page's last row, as the server sent it. */
  lastRow: unknown
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
