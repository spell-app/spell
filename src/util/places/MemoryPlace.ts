import { rowWithFields, rowsInOrder, rowsMatching } from "./PlaceQuery"
import {
  PlaceError,
  canDoAll,
  idOfRow,
  writeAnswerFor,
  type ApplyAnswer,
  type ChangesAnswer,
  type ListAnswer,
  type ListHandled,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceEvent,
  type PlaceRow,
  type SelectingContext,
  type WatchTarget,
  type WriteAnswer,
  type WriteQuestion
} from "./places.types"

/** What a `MemoryPlace` can do, unless it's told otherwise:  everything but `makesIds`. */
const MEMORY_CAPABILITIES: PlaceCapabilities = {
  idOf: "id",
  filter: "every field",
  sort: "every field",
  select: "every field",
  page: "cursor",
  write: ["insert", "update", "delete"],
  atomic: true,
  versionCheck: true,
  live: "push",
  abort: "hard"
}

/****************
 * ### `MemoryPlace`
 * A place that keeps its rows in memory:  what every test of the engine runs against.
 * - Does what its `capabilities` say, and nothing else:
 *   told it can't filter, it answers unfiltered and says so, as a real place would.
 * - Hands out copies, so nothing reaches its rows but `apply()`.
 * - Subclass it for a place with odd rules:  `canWrite()` says what's allowed, and `apply()` holds to it.
 ****************/
export class MemoryPlace implements Place {
  /** What it says it can do. */
  private readonly capabilities: PlaceCapabilities
  /** The rows of each collection, in the order they were added. */
  private readonly collections = new Map<string, PlaceRow[]>()
  /** Named operations for `call()`. */
  private readonly operations: Record<string, (input: unknown) => unknown>
  /** Who's watching. */
  private readonly watchers = new Set<{ target: WatchTarget; onEvent: (event: PlaceEvent) => void }>()
  /** Each write so far, oldest first:  each one's place in this list is the version it made, counting from 1. */
  private readonly history: PlaceEvent[] = []
  /** What each change with a `changeId` made, so one sent again is made only once. */
  private readonly changesMade = new Map<string, PlaceRow | undefined>()

  constructor({ capabilities, collections = {}, operations = {} }: MemoryPlaceProps = {}) {
    this.capabilities = { ...MEMORY_CAPABILITIES, ...capabilities }
    this.operations = operations
    for (const [collection, rows] of Object.entries(collections)) {
      this.collections.set(collection, structuredClone(rows))
    }
  }

  /** What it can do. */
  describe(): PlaceCapabilities {
    return this.capabilities
  }

  ////////////////
  // ## Reading
  ////////////////

  /** The rows `query` asks for, doing only what its capabilities say. */
  async list(collection: string, query: ListQuery, { signal }: PlaceContext = {}): Promise<ListAnswer> {
    signal?.throwIfAborted()
    const { filter: filterAbility, sort: sortAbility, select: selectAbility, page } = this.capabilities
    const handled: ListHandled = {}
    let rows = [...this.rowsOf(collection)]

    const filter = Object.entries(query.filter ?? {})
    if (
      filter.length &&
      canDoAll(
        filterAbility,
        filter.map(([field]) => field)
      )
    ) {
      rows = rowsMatching(rows, query.filter!)
      handled.filter = true
    }

    const sort = query.sort ?? []
    if (
      sort.length &&
      canDoAll(
        sortAbility,
        sort.map(({ field }) => field)
      )
    ) {
      rows = rowsInOrder(rows, sort)
      handled.sort = true
    }

    let nextPage: string | undefined
    if (page !== "none" && query.page) {
      const start = Number(query.page.at ?? 0)
      const end = start + (query.page.size ?? rows.length)
      if (end < rows.length) nextPage = String(end)
      rows = rows.slice(start, end)
    }

    const { select } = query
    const selecting = !!select && canDoAll(selectAbility, select)
    if (selecting) handled.select = true
    for (const row of rows) this.noteShown(collection, row)
    return {
      rows: rows.map((row) => (selecting ? selected(row, select) : structuredClone(row))),
      ...(nextPage !== undefined && { nextPage }),
      version: this.version,
      handled
    }
  }

  /** The rows of `collection` with these ids. */
  async getMany(
    collection: string,
    ids: readonly string[],
    { select, signal }: SelectingContext = {}
  ): Promise<PlaceRow[]> {
    signal?.throwIfAborted()
    const rows = this.rowsOf(collection).filter((row) => ids.includes(this.idOf(row) ?? ""))
    for (const row of rows) this.noteShown(collection, row)
    return rows.map((row) => (select ? selected(row, select) : structuredClone(row)))
  }

  /** The version of this thing as it last showed it:  where it stood then. */
  versionOf(collection: string, id: string): string | undefined {
    return this.shown.get(`${collection}\n${id}`)
  }

  /** Note that `row` has been shown, as of now. */
  private noteShown(collection: string, row: PlaceRow): void {
    const id = this.idOf(row)
    if (id !== undefined) this.shown.set(`${collection}\n${id}`, this.version)
  }

  /** Where it stood when each thing was last shown, by collection and id. */
  private readonly shown = new Map<string, string>()

  /** Run the operation named `name`, on `input`.  - throws `PlaceError` if it has none by that name */
  async call(name: string, input: unknown, { signal }: SelectingContext = {}): Promise<unknown> {
    signal?.throwIfAborted()
    const operation = this.operations[name]
    if (!operation) {
      throw new PlaceError(`MemoryPlace.call():  no operation is named "${name}";  pass it in \`operations\``, {
        cause: { kind: "not found" }
      })
    }
    return operation(input)
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes.
   * - `atomic`:  each is checked before any is made, so a refused one means nothing changed.
   * - Not `atomic`:  each is checked as it's reached, so the ones before a refused one stay made.
   * - A `changeId` it has seen:  already made, so it only answers with that row.
   * - throws `PlaceError`:  refused, not found or out of date
   */
  async apply(changes: readonly PlaceChange[], { signal, identity }: PlaceContext = {}): Promise<ApplyAnswer> {
    signal?.throwIfAborted()
    const isNew = ({ changeId }: PlaceChange) => changeId === undefined || !this.changesMade.has(changeId)
    // what this one apply writes is no reason to refuse the rest of it:  two fields of one thing are made from one version
    const writesBefore = this.history.length
    if (this.capabilities.atomic) {
      changes.filter(isNew).forEach((change) => this.checkChange(change, identity, writesBefore))
    }
    const rows: PlaceRow[] = []
    for (const change of changes) {
      if (isNew(change)) {
        this.checkChange(change, identity, writesBefore)
        const made = this.makeChange(change)
        if (change.changeId !== undefined) this.changesMade.set(change.changeId, made)
      }
      const row = change.changeId === undefined ? this.lastMade : this.changesMade.get(change.changeId)
      if (row) {
        this.noteShown(change.collection, row)
        rows.push(structuredClone(row))
      }
    }
    return { rows, version: this.version }
  }

  /**
   * Make these changes as someone else, on another device:  the version moves on, and nothing here has seen it.
   * - What a test does to make a write out of date.
   */
  async applyFromElsewhere(changes: readonly PlaceChange[]): Promise<void> {
    const shownBefore = [...this.shown]
    await this.apply(changes)
    this.shown.clear()
    for (const [thing, version] of shownBefore) this.shown.set(thing, version)
  }

  /** Allowed, by default:  a subclass with its own rules overrides this. */
  canWrite(_question: WriteQuestion): WriteAnswer {
    return { canWrite: true }
  }

  /**
   * The id for a row inserted with none:  `m-1`, `m-2` ...
   * - Only for a place that `makesIds`.  A subclass overrides it to make its own kind.
   */
  protected newId(): string {
    return `m-${++this.idsMade}`
  }
  /** How many ids `newId()` has made. */
  private idsMade = 0

  /**
   * Throw if `change` can't be made.
   * - throws `PlaceError`
   */
  private checkChange(change: PlaceChange, identity: string | undefined, writesBefore: number): void {
    const { kind, collection, id, fields, version } = change
    const row = id === undefined ? undefined : this.rowFor(collection, id)
    const question: WriteQuestion = { collection, kind, identity, ...(row && { row }) }
    const fieldNames = kind === "delete" ? [] : Object.keys(fields ?? {})
    for (const asked of [question, ...fieldNames.map((field) => ({ ...question, field }))]) {
      const { canWrite, whyNot } = writeAnswerFor(this, asked)
      if (canWrite) continue
      throw new PlaceError(`MemoryPlace.apply():  can't ${kind} in "${collection}" (${whyNot})`, {
        cause: { kind: "refused", ...(whyNot && { whyNot }) }
      })
    }
    if (kind === "insert") {
      if (id === undefined && !this.capabilities.makesIds) {
        throw new TypeError(`MemoryPlace.apply():  an insert into "${collection}" needs an id;  this place makes none`)
      }
      return
    }
    if (!row) {
      throw new PlaceError(`MemoryPlace.apply():  "${collection}" holds nothing with the id "${id}"`, {
        cause: { kind: "not found" }
      })
    }
    if (
      this.capabilities.versionCheck &&
      version !== undefined &&
      this.lastWriteOf(collection, id!, writesBefore) > Number(version)
    ) {
      throw new PlaceError(`MemoryPlace.apply():  "${id}" has changed since version ${version};  read it again`, {
        cause: { kind: "out of date" }
      })
    }
  }

  /** The row `makeChange()` last made, for a change with no `changeId`. */
  private lastMade: PlaceRow | undefined

  /** Make one checked `change`:  returns its row, unless it deleted one. */
  private makeChange(change: PlaceChange): PlaceRow | undefined {
    return (this.lastMade = this.rowChangedBy(change))
  }

  /** `makeChange()`'s work. */
  private rowChangedBy({ kind, collection, id, fields }: PlaceChange): PlaceRow | undefined {
    const rows = this.rowsOf(collection, "make it")
    const idField = this.capabilities.idOf
    if (kind === "delete") {
      const index = rows.findIndex((row) => this.idOf(row) === id)
      rows.splice(index, 1)
      this.wrote({ collection, id: id! })
      return undefined
    }
    if (kind === "insert") {
      const newId = id ?? this.newId()
      const row: PlaceRow = { ...structuredClone(fields), ...(idField !== undefined && { [idField]: newId }) }
      rows.push(row)
      this.wrote({ collection, id: newId, row: structuredClone(row) })
      return row
    }
    const row = this.rowFor(collection, id!)!
    Object.assign(row, structuredClone(fields))
    this.wrote({ collection, id: id!, row: structuredClone(row) })
    return row
  }

  ////////////////
  // ## Watching
  ////////////////

  /** Tell `onEvent` of each change to `target`, as it's made.  Returns what stops it. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    const watcher = { target, onEvent }
    this.watchers.add(watcher)
    return () => this.watchers.delete(watcher)
  }

  /** What changed in `collection` since `token`, a version:  each thing once, as it's now kept. */
  async changesSince(collection: string, token: string, { signal }: PlaceContext = {}): Promise<ChangesAnswer> {
    signal?.throwIfAborted()
    const latest = new Map<string, PlaceEvent>()
    for (const event of this.history.slice(Number(token))) {
      if (event.collection === collection) latest.set(event.id, event)
    }
    const events = [...latest.values()]
    return {
      rows: events.flatMap((event) => (event.row ? [structuredClone(event.row)] : [])),
      removed: events.filter((event) => !event.row).map((event) => event.id),
      token: this.version
    }
  }

  /** Where it stands now:  how many writes it has made. */
  private get version(): string {
    return String(this.history.length)
  }

  /** Note a write, and tell whoever's watching. */
  private wrote(event: PlaceEvent): void {
    this.history.push(event)
    for (const { target, onEvent } of this.watchers) {
      const isWatched = target.collection === event.collection && (target.id === undefined || target.id === event.id)
      if (isWatched) onEvent(structuredClone(event))
    }
  }

  /** The version of the last write to this thing, of the first `writes`:  0 if it hasn't changed since it was handed in. */
  private lastWriteOf(collection: string, id: string, writes: number): number {
    const earlier = this.history.slice(0, writes)
    return earlier.findLastIndex((event) => event.collection === collection && event.id === id) + 1
  }

  ////////////////
  // ## Its rows
  ////////////////

  /** The rows of `collection`, the real ones:  none if it's new, kept only if `"make it"`. */
  private rowsOf(collection: string, ifMissing?: "make it"): PlaceRow[] {
    let rows = this.collections.get(collection)
    if (!rows) {
      rows = []
      if (ifMissing) this.collections.set(collection, rows)
    }
    return rows
  }

  /** The real row of `collection` with this id. */
  private rowFor(collection: string, id: string): PlaceRow | undefined {
    return this.rowsOf(collection).find((row) => this.idOf(row) === id)
  }

  /** `row`'s id. */
  private idOf(row: PlaceRow): string | undefined {
    return idOfRow(row, this.capabilities.idOf)
  }
}

/** Constructor props of a `MemoryPlace`. */
export type MemoryPlaceProps = {
  /** What it says it can do, over the default of everything. */
  capabilities?: Partial<PlaceCapabilities>
  /** The rows it starts with, by collection:  copied. */
  collections?: Record<string, PlaceRow[]>
  /** Its named operations, for `call()`. */
  operations?: Record<string, (input: unknown) => unknown>
}

/** A copy of `row` with only the fields in `select`. */
function selected(row: PlaceRow, select: readonly string[]): PlaceRow {
  return structuredClone(rowWithFields(row, select))
}
