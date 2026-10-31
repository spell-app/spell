import {
  MovedVersions,
  PlaceError,
  idOfRow,
  type AbortKind,
  type ApplyAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceRow,
  type SelectingContext
} from "./places.types"

/** How many times it tries again when another writer gets to the list first. */
const LIST_TRIES = 5

/****************
 * ### `ChunkedPlace`
 * A place kept in chunks:  a list of summaries, and a body per thing, fetched only when it's read (epic `data` P5).
 *
 * ```ts
 * const place = new ChunkedPlace({
 *   store: new WebChunks({ url: "https://example.com/data" }),
 *   format: new JsonChunks({ summaries: { recipes: ["title"] } })
 * })
 * await place.list("recipes", {}, {})                 // reads recipes.list.json alone:  ids and titles
 * await place.getMany("recipes", ["r-1"], {})         // and recipes/r-1.json
 * await place.list("recipes", { select: ["notes"] }, {})   // notes aren't in the list, so every body
 * ```
 *
 * - It holds no format of its own:  no HTML, no JSON.  What the files look like is its `ChunkFormat`;  where they are, its `ChunkStore`.
 * - A read asks for bodies only when it names a field the summaries don't hold:  `select`, a filter or a sort.
 * - On a store with no writing (static hosting), it says `write: "none"`.
 * - Writing, on one that can:  the body first, then the list, so a reader never finds a list naming a body not there.
 *   - An update is merged over the body it finds, one writer at a time in this process.
 *   - On a store with versions, an update made from an old version is refused, `"out of date"`, and the engine merges per field.
 *     A delete carries no version, so it wins.
 *   - Another process got to the list first:  it reads the list again and tries again.
 * - Addresses are plain and the format's:  this class never builds one.
 * - Knows nothing of files or HTTP:  browser-safe, and imports only `places.types`, so a page's pack can take it by file
 *   (`spell/util/places/ChunkedPlace`).
 ****************/
export class ChunkedPlace implements Place {
  /** Where the chunks are. */
  protected readonly store: ChunkStore
  /** What they look like. */
  protected readonly format: ChunkFormat
  /** The field holding a thing's id. */
  protected readonly idField: string
  /** Each thing's version as last shown, by collection and id. */
  private readonly seenVersions = new Map<string, string>()
  /** Takes writes one at a time. */
  protected readonly inTurn = oneAtATime()

  constructor({ store, format }: ChunkedPlaceProps) {
    this.store = store
    this.format = format
    this.idField = format.idOf ?? "id"
  }

  /** What it can do:  no querying of its own, and writing only if its store and format both can. */
  describe(): PlaceCapabilities {
    const { store, format } = this
    const canWrite = !!(store.write && store.remove && format.listText && format.bodyText)
    return {
      kind: "files",
      idOf: this.idField,
      filter: "none",
      sort: "none",
      select: "none",
      page: "none",
      write: canWrite ? ["insert", "update", "delete"] : "none",
      atomic: false,
      ...(canWrite && store.writeIfVersion && store.versionOf && { versionCheck: true }),
      live: "poll",
      abort: store.aborts ?? "soft"
    }
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * The summaries of `collection`, reading no body, unless `query` names a field they don't hold.
   * - An unknown collection has no things.
   * - throws what the store or the format throws
   */
  async list(collection: string, query: ListQuery, context: PlaceContext = {}): Promise<ListAnswer> {
    const { rows } = await this.listOf(collection, context)
    const asked = [
      ...Object.keys(query.filter ?? {}),
      ...(query.sort ?? []).map(({ field }) => field),
      ...(query.select ?? [])
    ]
    return {
      rows: this.needsBodies(collection, asked) ? await this.withBodies(collection, rows, context) : rows,
      handled: {}
    }
  }

  /**
   * The things of `collection` with these ids, whole:  the list, and each one's body.
   * - `select` holding only what the summaries hold:  no body is read.
   * - An id the list doesn't name is left out.
   */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext = {}): Promise<PlaceRow[]> {
    const { rows } = await this.listOf(collection, context)
    const wanted = rows.filter((row) => ids.includes(idOfRow(row, this.idField) ?? ""))
    if (context.select && !this.needsBodies(collection, context.select)) return wanted
    return this.withBodies(collection, wanted, context)
  }

  /**
   * The fields in one thing's body, as its format reads them:  `undefined` if it has none.
   * - Reads only that body, never the list:  what a fold opening asks for.
   * - throws what the store or the format throws
   */
  async bodyOf(collection: string, id: string, context: PlaceContext = {}): Promise<PlaceRow | undefined> {
    const address = this.format.bodyAddress(collection, id)
    const version = this.store.versionOf?.(address)
    const text = await this.store.read(address, context)
    if (text === undefined) return undefined
    if (version !== undefined) this.noteVersion(collection, id, version)
    return this.format.bodyIn(text, collection, id)
  }

  /** The version of this thing as it last showed it. */
  versionOf(collection: string, id: string): string | undefined {
    return this.seenVersions.get(`${collection}\n${id}`)
  }

  /** The list of `collection`, its versions noted.  A list that isn't there is empty. */
  protected async listOf(collection: string, context: PlaceContext = {}): Promise<ChunkList> {
    context.signal?.throwIfAborted()
    const text = await this.store.read(this.format.listAddress(collection), context)
    const list = text === undefined ? { rows: [] } : this.format.listIn(text, collection)
    for (const [id, version] of Object.entries(list.versions ?? {})) this.noteVersion(collection, id, version)
    return list
  }

  /** Does asking for these fields take a body? */
  private needsBodies(collection: string, fields: readonly string[]): boolean {
    const held = this.format.summaryFields(collection)
    return fields.some((field) => field !== this.idField && !held.includes(field))
  }

  /** `rows`, each with its body over it:  one with none stays a summary. */
  private withBodies(collection: string, rows: readonly PlaceRow[], context: PlaceContext): Promise<PlaceRow[]> {
    return Promise.all(
      rows.map(async (row) => {
        const id = idOfRow(row, this.idField)
        if (id === undefined || this.format.hasBody?.(row, collection) === false) return row
        return { ...row, ...(await this.bodyOf(collection, id, context)) }
      })
    )
  }

  /** Remember a thing's version. */
  protected noteVersion(collection: string, id: string, version: string | undefined): void {
    if (version === undefined) this.seenVersions.delete(`${collection}\n${id}`)
    else this.seenVersions.set(`${collection}\n${id}`, version)
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes, one at a time, in order:  every body, then each list changed, even if a change failed part way.
   * - What came before a failure stays made;  the engine sends each alone, with the same ids.
   * - throws `PlaceError`:  refused, not found or out of date;  anything else is what the store threw
   */
  apply(changes: readonly PlaceChange[], context: PlaceContext = {}): Promise<ApplyAnswer> {
    return this.inTurn(() => this.makeChanges(changes, context))
  }

  /** `apply()`'s work, in its turn. */
  private async makeChanges(changes: readonly PlaceChange[], context: PlaceContext): Promise<ApplyAnswer> {
    this.refuseIfItCantWrite()
    const rows: PlaceRow[] = []
    const edits = new Map<string, ChunkListEdit[]>()
    const moved = new MovedVersions()
    try {
      for (const change of changes) {
        context.signal?.throwIfAborted()
        const version = moved.versionFor(change)
        const made = await this.makeChange({ ...change, ...(version !== undefined && { version }) }, context)
        edits.set(change.collection, [...(edits.get(change.collection) ?? []), made.edit])
        if (made.row) rows.push(made.row)
        moved.note(change, version, change.id === undefined ? undefined : this.versionOf(change.collection, change.id))
      }
    } finally {
      for (const [collection, ofList] of edits) await this.editList(collection, ofList)
    }
    return { rows }
  }

  /** Change one body:  what its row is now, and what the list has to do. */
  private async makeChange(change: PlaceChange, context: PlaceContext): Promise<MadeChange> {
    const { kind, collection, id } = change
    if (id === undefined) {
      throw new TypeError(`ChunkedPlace.apply():  a change in "${collection}" needs an id;  this place makes none`)
    }
    if (kind === "delete") return this.deleted(collection, id, context)
    return kind === "insert" ? this.written(change, undefined, undefined) : this.updated(change, context)
  }

  /** Remove one body.  - throws `PlaceError` `"not found"` if neither it nor a line in the list is there */
  private async deleted(collection: string, id: string, context: PlaceContext): Promise<MadeChange> {
    const address = this.format.bodyAddress(collection, id)
    const hasBody = (await this.store.read(address, context)) !== undefined
    const { rows } = await this.listOf(collection, context)
    if (!hasBody && !rows.some((row) => idOfRow(row, this.idField) === id)) this.notFound(collection, id)
    await this.store.remove!(address)
    this.noteVersion(collection, id, undefined)
    return { edit: (list) => this.leaveOut(list, id) }
  }

  /**
   * Merge `change`'s fields over the thing as it is now.
   * - throws `PlaceError`:  `"not found"`, or `"out of date"` if it's moved on from `change.version`
   */
  private async updated(change: PlaceChange, context: PlaceContext): Promise<MadeChange> {
    const { collection, id, version } = change
    const address = this.format.bodyAddress(collection, id!)
    const now = this.store.versionOf?.(address)
    if (this.describe().versionCheck && version !== undefined && now !== version)
      this.outOfDate(collection, id!, version)
    const text = await this.store.read(address, context)
    const { rows } = await this.listOf(collection, context)
    const summary = rows.find((row) => idOfRow(row, this.idField) === id)
    if (text === undefined && !summary) this.notFound(collection, id!)
    const current = { ...summary, ...(text === undefined ? {} : this.format.bodyIn(text, collection, id!)) }
    return this.written(change, current, now)
  }

  /** Write the thing's body, over what `current` holds:  only if it's still at `version`, when it says. */
  private async written(
    { collection, id, fields }: PlaceChange,
    current: PlaceRow | undefined,
    version: string | undefined
  ): Promise<MadeChange> {
    const row: PlaceRow = { ...current, ...fields, [this.idField]: id }
    const address = this.format.bodyAddress(collection, id!)
    const made = await this.writeText(address, this.format.bodyText!(row, collection, id!), version)
    this.noteVersion(collection, id!, made)
    return { row, edit: (list) => this.putIn(list, id!, this.summaryOf(row, collection), made) }
  }

  /** Write `text`:  only if it's still at `version`, on a store that can tell.  Its new version. */
  private async writeText(address: string, text: string, version: string | undefined): Promise<string | undefined> {
    const { store } = this
    if (version !== undefined && store.writeIfVersion) return store.writeIfVersion(address, text, version)
    await store.write!(address, text)
    return store.versionOf?.(address)
  }

  /**
   * Make `edits` to the list of `collection`, and write it, as the last thing a write does.
   * - Another process wrote it first:  it reads the list again and tries again, `LIST_TRIES` times.
   */
  protected async editList(collection: string, edits: readonly ChunkListEdit[]): Promise<void> {
    const address = this.format.listAddress(collection)
    for (let tries = 1; ; tries++) {
      const version = this.store.versionOf?.(address)
      const list = await this.listOf(collection)
      for (const edit of edits) edit(list)
      try {
        await this.writeText(address, this.format.listText!(list, collection), version)
        return
      } catch (error) {
        if (tries >= LIST_TRIES || !(error instanceof PlaceError) || error.kind !== "out of date") throw error
      }
    }
  }

  /** `row`'s line in the list. */
  protected summaryOf(row: PlaceRow, collection: string): PlaceRow {
    const fields = [this.idField, ...this.format.summaryFields(collection)]
    return Object.fromEntries(fields.filter((field) => field in row).map((field) => [field, row[field]]))
  }

  /** Put this thing's line in `list`:  in its place, else last. */
  protected putIn(list: ChunkList, id: string, summary: PlaceRow, version: string | undefined): void {
    const at = list.rows.findIndex((row) => idOfRow(row, this.idField) === id)
    if (at < 0) list.rows.push(summary)
    else list.rows[at] = summary
    if (version !== undefined) list.versions = { ...list.versions, [id]: version }
  }

  /** Take this thing's line out of `list`. */
  protected leaveOut(list: ChunkList, id: string): void {
    list.rows = list.rows.filter((row) => idOfRow(row, this.idField) !== id)
    if (list.versions) delete list.versions[id]
  }

  /** - throws `PlaceError` `"refused"`, on a store or format that can't write */
  private refuseIfItCantWrite(): void {
    if (this.describe().write !== "none") return
    throw new PlaceError("ChunkedPlace.apply():  this place is read only:  its store or its format can't write", {
      cause: { kind: "refused", whyNot: "place" }
    })
  }

  /** - throws `PlaceError` `"not found"` */
  private notFound(collection: string, id: string): never {
    throw new PlaceError(`ChunkedPlace.apply():  "${collection}" holds nothing with the id "${id}"`, {
      cause: { kind: "not found" }
    })
  }

  /** - throws `PlaceError` `"out of date"` */
  private outOfDate(collection: string, id: string, version: string): never {
    throw new PlaceError(
      `ChunkedPlace.apply():  "${id}" in "${collection}" has changed since ${version};  read it again`,
      {
        cause: { kind: "out of date" }
      }
    )
  }
}

/** Constructor props of a `ChunkedPlace`. */
export type ChunkedPlaceProps = {
  /** Where the chunks are. */
  store: ChunkStore
  /** What they look like. */
  format: ChunkFormat
}

/** A list, as a format reads it. */
export type ChunkList = {
  /** One summary per thing:  plain fields, its id among them. */
  rows: PlaceRow[]
  /** Each thing's version, by id, if the list keeps them:  so a reader of the list alone can make a change that says one. */
  versions?: Record<string, string>
}

/**
 * What a place's chunks look like:  handed in, so `ChunkedPlace` holds no HTML and no JSON of its own.
 * - The JSON one:  `JsonChunks`.  Writing is optional:  a format with no `listText` and `bodyText` is read only.
 */
export type ChunkFormat = {
  /** The field holding a thing's id;  default `id`. */
  idOf?: string
  /** Where the list of `collection` is, in its store. */
  listAddress(collection: string): string
  /** Where this thing's body is, in its store. */
  bodyAddress(collection: string, id: string): string
  /** Which fields a summary in `collection` holds, besides its id:  a read naming any other takes a body. */
  summaryFields(collection: string): readonly string[]
  /** Read a list's text.  - throws for text it can't read */
  listIn(text: string, collection: string): ChunkList
  /** Read a body's text, as the fields it adds to the thing's summary.  - throws for text it can't read */
  bodyIn(text: string, collection: string, id: string): PlaceRow
  /** Does this summary's thing have a body at all?  Left out:  it looks, and one that isn't there is no body. */
  hasBody?(summary: PlaceRow, collection: string): boolean
  /** Write a list's text. */
  listText?(list: ChunkList, collection: string): string
  /** Write a body's text, for the whole thing. */
  bodyText?(row: PlaceRow, collection: string, id: string): string
}

/**
 * Where a place's chunks are, by address:  all it needs is `read()`.
 * - Shaped so a folder's storage is one as it stands (`FolderStorage`, in `spell/server/places`).
 * - No writing:  read only, as static hosting is.  No versions:  the last write wins.
 */
export type ChunkStore = {
  /** The text at `address`:  `undefined` if there's none.  `context.signal` stops it, where it can. */
  read(address: string, context?: PlaceContext): Promise<string | undefined>
  /** Write `address` whole, all at once. */
  write?(address: string, text: string): Promise<void>
  /** Remove `address`;  nothing if it isn't there. */
  remove?(address: string): Promise<void>
  /** The version at `address` now:  `undefined` if nothing's there. */
  versionOf?(address: string): string | undefined
  /** Write `address` whole, only if it's still at `version`:  its new version.  - throws `PlaceError` `"out of date"` */
  writeIfVersion?(address: string, text: string, version: string): Promise<string>
  /** What aborting one of its reads does;  default `"soft"`. */
  aborts?: AbortKind
}

/** One change a write makes to a list. */
export type ChunkListEdit = (list: ChunkList) => void

/** What making one change comes to. */
type MadeChange = {
  /** The thing as it's now kept:  left out if it's gone. */
  row?: PlaceRow
  /** What its list has to do. */
  edit: ChunkListEdit
}

/**
 * A function running each task handed to it after the one before has finished, failed or not.
 * - What one place uses to keep its writers apart, in this process.
 */
export function oneAtATime(): <T>(task: () => Promise<T>) => Promise<T> {
  let last: Promise<unknown> = Promise.resolve()
  return (task) => {
    const next = last.then(task, task)
    last = next.catch(() => {})
    return next
  }
}
