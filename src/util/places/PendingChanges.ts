import type { StorageLike } from "spell/util/persist/persist.types"

import { rowsInOrder, rowsMatching } from "./PlaceQuery"
import { SaveQueue } from "./SaveQueue"
import type { Places } from "./Places"
import {
  PlaceError,
  idOfRow,
  type ApplyAnswer,
  type ListQuery,
  type Place,
  type PlaceChange,
  type PlaceRow
} from "./places.types"

/** How long after the last change a change that's in no group is sent, ms:  a form's typing goes out as one. */
const PENDING_WAIT_MS = 500

/** The kinds of `PlaceError` that are an answer:  the outcome is known, so sending it again won't help. */
const KNOWN_OUTCOMES = new Set<PlaceError["kind"]>(["refused", "not found", "out of date"])

/** The store the browser's copy of pending changes is kept in. */
const PENDING_STORE = "spell-pending-changes"

/**
 * One change made and not yet confirmed:  a `PlaceChange`, plus what it takes to put it back or replay it.
 * - JSON all the way down, as it's kept in the browser.
 */
export type PendingChange = Omit<PlaceChange, "changeId"> & {
  /** Names this change:  it resends with this until its outcome is known. */
  changeId: string
  /** The type its row is cached under, when it has one. */
  type?: string
  /** An update's one field. */
  field?: string
  /** Has it been sent, answered or not?  Then it may have been made, so it can't be replaced or dropped. */
  hasLeft?: boolean
  /** What an update's field held before it:  what a dropped change is put back to. */
  was?: unknown
  /** The group it's in:  an action's changes.  None:  a change on its own. */
  group?: number
}

/** A place's rows that changed under what's showing:  what `Places.onRows()` hears. */
export type PlaceRowsChange = {
  /** The place's name. */
  placeName: string
  /** The collection they're in. */
  collection: string
  /** The type they're cached under. */
  type?: string
  /** The field holding a row's id. */
  idField: string
  /** Each row:  only the fields it names changed, with what's still pending on top. */
  rows: PlaceRow[]
  /** The ids the place no longer holds. */
  removed?: string[]
  /** A place that makes its own ids named a new thing:  the id we knew it by, and the one it has now. */
  renamed?: { from: string; to: string }[]
}

/** A write a place said no to:  the one event every failed write raises (`Places.onWriteFailed()`). */
export type PlaceWriteFailure = {
  /** The place's name. */
  placeName: string
  /** The changes it refused. */
  changes: readonly PendingChange[]
  /** What it said. */
  error: PlaceError
  /** Try these changes again, as new ones. */
  retry(): void
}

/** An action's changes, shown at once and held until it ends:  `PendingChanges.startGroup()`. */
export type PendingGroup = {
  /** The action ended:  its changes go out together. */
  end(): void
  /** The action was cancelled:  its changes are dropped, and replayed from the place.  Nothing had left. */
  cancel(): void
}

/****************
 * ### `PendingChanges`
 * Every change made to one place and not yet confirmed, in the order made, each with its own id (epic `data` P3).
 * - A change is one field of one thing, shown at once and kept on this device, so it outlives the tab.
 * - Sending is `SaveQueue`'s:  in order, one at a time, again every 3s until it goes through, and as the page goes away.
 * - Each write has one of three ends:
 *   - it's confirmed:  it's gone, and what the place answered is told to whoever shows it
 *   - no answer (`fetch` failed, the answer was lost):  the outcome is unknown, so it resends with the SAME id
 *   - the place says no (`KNOWN_OUTCOMES`):  it's dropped, put back to what it `was`, healed, and a failure raised
 * - What's pending sits on top of what's read (`replayOn()`), so a read never takes back your own write.
 * - Undo needs no second path:  it's just another write, heard here.
 *   - A field written back to what it `was`, before that change has left, drops the change.
 *   - Once it has left, even with no answer, it's a new change, reversing it:  it may have been made.
 * - A second write to a field, with the first not sent, replaces it:  a form's typing is one change.
 * - An unfinished group (an action) is NEVER sent or kept:  it's in this page's memory until `end()`,
 *   so closing the tab or `cancel()` really drops it.  Everything after it waits, to keep the order.
 * - One per place name, from `Places.pendingFor()`.  Knows nothing of Things or Spell's words.
 ****************/
export class PendingChanges {
  /** The place's name:  it's asked for by name each time, so a swapped place takes what's pending. */
  readonly placeName: string
  /** Saves in order, retries, says where it stands:  its `state` and `text` are this one's too. */
  readonly queue: SaveQueue

  /** Every change not yet confirmed, oldest first. */
  private pending: PendingChange[] = []
  /** The `changeId`s on their way, waiting for an answer. */
  private readonly onTheirWay = new Set<string>()
  /** The groups still open. */
  private readonly openGroups = new Set<number>()
  /** Did the place say no to anything, in the send under way? */
  private wasRefused = false
  /** The last group number given. */
  private lastGroup = 0
  /** The list of places, and the cache:  STATIC for its life. */
  private readonly places: Places

  constructor({ placeName, places, keepAs, storage, wait = PENDING_WAIT_MS, retry }: PendingChangesProps) {
    this.placeName = placeName
    this.places = places
    this.queue = new SaveQueue({
      save: (options) => this.send(options),
      wait,
      ...(retry !== undefined && { retry }),
      ...(keepAs !== undefined && { key: `${PENDING_STORE}:${keepAs}/${placeName}` }),
      ...(storage && { storage })
    })
    this.pending = this.queue.kept<PendingChange[]>() ?? []
    this.lastGroup = Math.max(0, ...this.pending.map(({ group }) => group ?? 0))
  }

  /** Every change not yet confirmed, oldest first. */
  get changes(): readonly PendingChange[] {
    return this.pending
  }

  /** Is anything not yet confirmed? */
  get hasPending(): boolean {
    return this.pending.length > 0
  }

  /**
   * SIDE EFFECT:  send what was left from the last visit:  first what the place holds now, with it replayed on top.
   * - Nothing kept:  nothing happens.
   * - NEVER throws:  a heal that fails is logged, and it's sent anyway.
   */
  async open(): Promise<void> {
    if (!this.pending.length) return
    await this.places.heal.healPending(this.placeName)
    this.queue.changed({ now: true })
  }

  /** Once everything sendable now has gone, or failed:  whether nothing is left unsaved.  NEVER rejects. */
  get settled(): Promise<boolean> {
    return this.queue.settled
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * `field` of the thing `id` is now `value`, and was `was`:  shown at once, sent soon.
   * - `group`:  the action it's part of (`startGroup()`), returned by `groupNumber()`.
   * - See the class for what happens to a field already pending.
   */
  setField(change: FieldWrite): void {
    const { collection, type, id, field, value, was, group } = change
    this.showAtOnce({ collection, ...(type !== undefined && { type }) }, [{ [this.idField]: id, [field]: value }])

    const unsentInsert = this.pending.find(
      (other) => other.kind === "insert" && other.id === id && this.isUnsent(other)
    )
    if (unsentInsert?.collection === collection) {
      unsentInsert.fields = { ...unsentInsert.fields, [field]: value }
      return this.changedList(group)
    }

    const earlier = [...this.pending]
      .reverse()
      .find(
        (other) =>
          other.kind === "update" &&
          other.collection === collection &&
          other.id === id &&
          other.field === field &&
          this.isUnsent(other)
      )
    if (earlier && isSameValue(earlier.was, value)) {
      this.remove([earlier])
      return this.changedList(group)
    }
    const replaces = earlier && earlier.group === group
    if (replaces) this.remove([earlier])
    const first = replaces ? earlier.was : was
    this.pending.push({
      changeId: newChangeId(),
      kind: "update",
      collection,
      ...(type !== undefined && { type }),
      id,
      field,
      fields: { [field]: value },
      ...(first !== undefined && { was: first }),
      ...(group !== undefined && { group })
    })
    this.changedList(group)
  }

  /**
   * A new thing:  `fields`, under `id`.  Shown at once.
   * - A place that `makesIds` gets it with no id:  its answer names it, and `Places.onRows()` tells (`renamed`).
   */
  insert({ collection, type, id, fields, group }: ThingWrite & { fields: PlaceRow }): void {
    const row = { [this.idField]: id, ...fields }
    this.showAtOnce({ collection, ...(type !== undefined && { type }) }, [row])
    this.pending.push({
      changeId: newChangeId(),
      kind: "insert",
      collection,
      ...(type !== undefined && { type }),
      id,
      fields: row,
      ...(group !== undefined && { group })
    })
    this.changedList(group)
  }

  /**
   * The thing `id` is gone.
   * - Whatever's unsent of it goes too;  if that was its insert, nothing need be sent at all.
   */
  delete({ collection, type, id, group }: ThingWrite): void {
    const unsent = this.pending.filter(
      (other) => other.collection === collection && other.id === id && this.isUnsent(other)
    )
    this.remove(unsent)
    if (unsent.some(({ kind }) => kind === "insert")) return this.changedList(group)
    this.pending.push({
      changeId: newChangeId(),
      kind: "delete",
      collection,
      ...(type !== undefined && { type }),
      id,
      ...(group !== undefined && { group })
    })
    this.changedList(group)
  }

  /**
   * Hold what's written with this group's number until `end()`:  see `PendingGroup`.
   * - `number`:  what to hand `setField()`, `insert()` and `delete()`.
   * - `end()` or `cancel()` a second time does nothing.
   */
  startGroup(): PendingGroup & { number: number } {
    const number = ++this.lastGroup
    this.openGroups.add(number)
    return {
      number,
      end: () => {
        if (!this.openGroups.delete(number)) return
        this.keepCopy()
        if (this.pending.some(({ group }) => group === number)) this.queue.changed({ now: true })
      },
      cancel: () => {
        if (!this.openGroups.delete(number)) return
        const dropped = this.pending.filter(({ group }) => group === number)
        this.remove(dropped)
        this.settleList()
        this.putBack(dropped)
        void this.places.heal.healChanges(this.placeName, dropped)
      }
    }
  }

  ////////////////
  // ## Reading through them
  ////////////////

  /**
   * `rows`, as `collection` reads with what's pending on top:  new rows added, deleted ones gone, each field as written.
   * - Rows it changes are copies:  a read's answer is shared.
   * - `query`:  what asked for them, so a row a change moves in or out of its filter does.
   * - Nothing pending there:  `rows` itself.
   */
  replayOn(collection: string, rows: PlaceRow[], query: Pick<ListQuery, "filter" | "sort"> = {}): PlaceRow[] {
    const here = this.pending.filter((change) => change.collection === collection)
    if (!here.length) return rows
    const { idField } = this
    const replayed = new Map(rows.map((row, index) => [idOfRow(row, idField) ?? `row ${index}`, row]))
    for (const { kind, id, fields } of here) {
      if (id === undefined) continue
      if (kind === "delete") replayed.delete(id)
      else replayed.set(id, { ...replayed.get(id), ...fields })
    }
    const all = [...replayed.values()]
    const matching = query.filter ? rowsMatching(all, query.filter) : all
    return query.sort ? rowsInOrder(matching, query.sort) : matching
  }

  ////////////////
  // ## Sending
  ////////////////

  /** Everything that can go, batch by batch.  - throws when an answer didn't come:  the queue tries again. */
  private async send({ keepalive }: { keepalive: boolean }): Promise<void> {
    for (let batch = this.nextBatch(); batch.length; batch = this.nextBatch()) {
      await this.sendBatch(batch, keepalive)
    }
    // "saved" would be untrue of what it just took back
    if (this.wasRefused && !this.pending.length) this.queue.done()
    this.wasRefused = false
  }

  /** The oldest changes that go together:  one group, or the changes in none, up to what one request holds. */
  private nextBatch(): PendingChange[] {
    const [first] = this.pending
    if (!first || this.isOpen(first)) return []
    const size = this.places.placeFor(this.placeName)?.describe().rateLimit?.changesPerRequest ?? Infinity
    const batch: PendingChange[] = []
    for (const change of this.pending) {
      if (change.group !== first.group || batch.length >= size) break
      batch.push(change)
    }
    return batch
  }

  /**
   * Send `batch`, and deal with how it ended -- see the class.
   * - throws what the place threw, when the outcome is unknown
   */
  private async sendBatch(batch: PendingChange[], keepalive: boolean): Promise<void> {
    const place = this.places.placeForOrDie(this.placeName)
    for (const change of batch) {
      change.hasLeft = true
      this.onTheirWay.add(change.changeId)
    }
    this.keepCopy()
    try {
      if (!place.apply) throw refusal(`Places:  "${this.placeName}" takes no changes`)
      const toSend = batch.map((change) => this.placeChangeFor(change, place))
      this.confirmed(batch, await place.apply(toSend, keepalive ? { keepalive } : {}))
    } catch (error) {
      if (!isKnownOutcome(error)) throw error
      await this.answeredNo(batch, error, place)
    } finally {
      batch.forEach(({ changeId }) => this.onTheirWay.delete(changeId))
    }
  }

  /** `change` as a place takes it. */
  private placeChangeFor(change: PendingChange, place: Place): PlaceChange {
    const { type: _type, field: _field, hasLeft: _hasLeft, was: _was, group: _group, ...placeChange } = change
    if (change.kind !== "insert" || !place.describe().makesIds) return placeChange
    const { id: _id, fields, ...rest } = placeChange
    const { [this.idField]: _idField, ...others } = fields ?? {}
    return { ...rest, fields: others }
  }

  /**
   * The place said no to `batch`.
   * - All of it, if it was one group on a place that does all or nothing.
   * - Else we can't tell which:  each is sent on its own, with the same id, so what was already made stays made once.
   */
  private async answeredNo(batch: PendingChange[], error: PlaceError, place: Place): Promise<void> {
    const isWholeGroup = place.describe().atomic && batch[0]!.group !== undefined
    if (batch.length > 1 && !isWholeGroup) {
      for (const change of batch) await this.sendBatch([change], false)
      return
    }
    const [only] = batch
    // already gone is what a delete wanted
    if (batch.length === 1 && only!.kind === "delete" && error.kind === "not found") return this.confirmed(batch, {})
    this.refused(batch, error)
  }

  /** The place took `batch`:  they're gone, and whoever shows them hears what it answered. */
  private confirmed(batch: PendingChange[], { rows = [] }: Partial<ApplyAnswer>): void {
    this.remove(batch)
    this.keepCopy()
    const written = batch.filter(({ kind }) => kind !== "delete")
    const isByChange = rows.length === written.length
    const renamed = isByChange ? this.renameMade(written, rows) : []
    const { idField } = this
    for (const change of written) {
      const newId = renamed.find(({ from }) => from === change.id)?.to ?? change.id
      const row = isByChange
        ? rows[written.indexOf(change)]
        : rows.find((candidate) => idOfRow(candidate, idField) === newId)
      if (!row) continue
      const { collection, type } = change
      const replayed = this.replayOn(collection, [row])
      this.showAtOnce({ collection, ...(type !== undefined && { type }) }, replayed, { renamed })
    }
  }

  /** Each thing in `written` whose id the place chose:  what's still pending of it now goes by that id. */
  private renameMade(written: PendingChange[], rows: PlaceRow[]): { from: string; to: string }[] {
    const renamed: { from: string; to: string }[] = []
    written.forEach(({ id }, index) => {
      const to = idOfRow(rows[index]!, this.idField)
      if (id === undefined || to === undefined || to === id) return
      renamed.push({ from: id, to })
      for (const change of this.pending) {
        if (change.id === id) change.id = to
      }
    })
    if (renamed.length) this.keepCopy()
    return renamed
  }

  /** The place said no to `changes`:  put back, healed, and a failure raised -- see `PlaceWriteFailure`. */
  private refused(changes: PendingChange[], error: PlaceError): void {
    this.wasRefused = true
    this.remove(changes)
    this.keepCopy()
    this.putBack(changes)
    void this.places.heal.healChanges(this.placeName, changes)
    this.places.tellWriteFailed({
      placeName: this.placeName,
      changes,
      error,
      retry: () => this.again(changes)
    })
  }

  /** Make `changes` again, as new ones:  a person pressed Retry. */
  private again(changes: readonly PendingChange[]): void {
    for (const { kind, collection, type, id, field, fields, was } of changes) {
      const thing = { collection, ...(type !== undefined && { type }), id: id! }
      if (kind === "update") this.setField({ ...thing, field: field!, value: fields![field!], was })
      else if (kind === "insert") this.insert({ ...thing, fields: fields! })
      else this.delete(thing)
    }
  }

  ////////////////
  // ## The list
  ////////////////

  /** The list changed:  kept on the device, and, if nothing holds them back, sent soon. */
  private changedList(group: number | undefined): void {
    this.keepCopy()
    if (!this.pending.length) return this.settleList()
    if (group === undefined) this.queue.changed()
  }

  /** Nothing's left, and nothing's on its way:  nothing to say any more. */
  private settleList(): void {
    if (this.pending.length || this.onTheirWay.size) return
    if (this.queue.state.kind !== "saved") this.queue.done()
  }

  /** Show `rows`:  in the cache, and to whoever shows them (`Places.onRows()`). */
  private showAtOnce(
    { collection, type }: Pick<PendingChange, "collection" | "type">,
    rows: PlaceRow[],
    { renamed }: Pick<PlaceRowsChange, "renamed"> = {}
  ): void {
    const { idField, placeName } = this
    if (type !== undefined) {
      for (const row of rows) {
        const id = idOfRow(row, idField)
        if (id !== undefined) this.places.cache.keep(type, id, row)
      }
    }
    this.places.tellRows({
      placeName,
      collection,
      ...(type !== undefined && { type }),
      idField,
      rows,
      ...(renamed?.length && { renamed })
    })
  }

  /** Put each of `changes` back to what it `was`:  the earliest change to a field has the last word. */
  private putBack(changes: readonly PendingChange[]): void {
    for (const change of [...changes].reverse()) {
      const { kind, collection, type, id, field, was } = change
      if (kind !== "update" || id === undefined || field === undefined) continue
      const [row] = this.replayOn(collection, [{ [this.idField]: id, [field]: was }])
      if (row) this.showAtOnce({ collection, ...(type !== undefined && { type }) }, [row])
    }
  }

  /** Take `changes` off the list. */
  private remove(changes: readonly PendingChange[]): void {
    this.pending = this.pending.filter((change) => !changes.includes(change))
  }

  /** Keep what's closed on the device:  an open group's changes end with the page. */
  private keepCopy(): void {
    const closed = this.pending.filter((change) => !this.isOpen(change))
    if (closed.length) this.queue.keep(closed)
    else this.queue.drop()
  }

  /** Is `change` in a group still open? */
  private isOpen({ group }: PendingChange): boolean {
    return group !== undefined && this.openGroups.has(group)
  }

  /** Has `change` not left yet? */
  private isUnsent({ hasLeft }: PendingChange): boolean {
    return !hasLeft
  }

  /** The field holding a row's id:  `"id"` for a place that doesn't say. */
  private get idField(): string {
    return this.places.placeFor(this.placeName)?.describe().idOf ?? "id"
  }
}

/** Constructor props of a `PendingChanges`. */
export type PendingChangesProps = {
  /** The place's name. */
  placeName: string
  /** The list of places. */
  places: Places
  /** What to keep them under on this device.  None:  they end with the page. */
  keepAs?: string
  /** Finds where they're kept:  `BrowserCopyProps.storage`. */
  storage?: () => StorageLike | undefined
  /** How long after the last change it sends one in no group, ms. */
  wait?: number
  /** How long after no answer it tries again, ms. */
  retry?: number
}

/** Which thing a write is to. */
export type ThingWrite = {
  /** Its collection. */
  collection: string
  /** The type it's cached under. */
  type?: string
  /** Its id. */
  id: string
  /** The action it's part of:  `startGroup()`'s `number`. */
  group?: number
}

/** `PendingChanges.setField()`'s input. */
export type FieldWrite = ThingWrite & {
  /** The field. */
  field: string
  /** Its new value, as JSON. */
  value: unknown
  /** What it held, as JSON. */
  was?: unknown
}

/** Did the place answer, so we know how it ended? */
function isKnownOutcome(error: unknown): error is PlaceError {
  return error instanceof PlaceError && KNOWN_OUTCOMES.has(error.kind)
}

/** The error for a place that takes no change at all. */
function refusal(message: string): PlaceError {
  return new PlaceError(message, { cause: { kind: "refused", whyNot: "place" } })
}

/** Are these two JSON values the same? */
function isSameValue(one: unknown, other: unknown): boolean {
  return one === other || JSON.stringify(one) === JSON.stringify(other)
}

/** A new change's id, unique across browsers:  `crypto`'s, as `randomUUID()` needs a secure page. */
function newChangeId(): string {
  const [high, low] = crypto.getRandomValues(new Uint32Array(2))
  return `c-${high!.toString(36)}${low!.toString(36)}`
}
