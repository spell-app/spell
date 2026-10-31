import {
  PlaceError,
  idOfRow,
  writeAnswerFor,
  type ApplyAnswer,
  type ChangesAnswer,
  type FieldAbility,
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
      rows = rows.filter((row) => filter.every(([field, value]) => row[field] === value))
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
      rows.sort((one, other) => {
        for (const { field, descending } of sort) {
          const order = compareValues(one[field], other[field])
          if (order) return descending ? -order : order
        }
        return 0
      })
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
    return rows.map((row) => (select ? selected(row, select) : structuredClone(row)))
  }

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
   * - throws `PlaceError`:  refused, not found or out of date
   */
  async apply(changes: readonly PlaceChange[], { signal, identity }: PlaceContext = {}): Promise<ApplyAnswer> {
    signal?.throwIfAborted()
    if (this.capabilities.atomic) changes.forEach((change) => this.checkChange(change, identity))
    const rows: PlaceRow[] = []
    for (const change of changes) {
      this.checkChange(change, identity)
      const row = this.makeChange(change)
      if (row) rows.push(structuredClone(row))
    }
    return { rows, version: this.version }
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
  private checkChange(change: PlaceChange, identity: string | undefined): void {
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
      this.lastWriteOf(collection, id!) > Number(version)
    ) {
      throw new PlaceError(`MemoryPlace.apply():  "${id}" has changed since version ${version};  read it again`, {
        cause: { kind: "out of date" }
      })
    }
  }

  /** Make one checked `change`:  returns its row, unless it deleted one. */
  private makeChange({ kind, collection, id, fields }: PlaceChange): PlaceRow | undefined {
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

  /** The version of the last write to this thing:  0 if it hasn't changed since it was handed in. */
  private lastWriteOf(collection: string, id: string): number {
    return this.history.findLastIndex((event) => event.collection === collection && event.id === id) + 1
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

/** Can a place with `ability` do this for every one of `fields`? */
function canDoAll(ability: FieldAbility, fields: readonly string[]): boolean {
  if (ability === "every field") return true
  if (ability === "none") return false
  return fields.every((field) => ability.includes(field))
}

/** A copy of `row` with only the fields in `select`. */
function selected(row: PlaceRow, select: readonly string[]): PlaceRow {
  return structuredClone(Object.fromEntries(select.filter((field) => field in row).map((field) => [field, row[field]])))
}

/** Which of two field values comes first:  nothing comes after everything. */
function compareValues(one: unknown, other: unknown): number {
  if (one === other) return 0
  if (one === undefined) return 1
  if (other === undefined) return -1
  return (one as string) < (other as string) ? -1 : 1
}
