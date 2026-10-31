import type { StorageLike } from "spell/util/persist/persist.types"

import { listEditsTo, POSITIONS_KEY, withListEdits } from "./positions"
import { rowsInOrder, rowsMatching } from "./PlaceQuery"
import { SaveQueue } from "./SaveQueue"
import type { Places } from "./Places"
import {
  PlaceError,
  idOfRow,
  type ApplyAnswer,
  type ListEdit,
  type ListQuery,
  type Place,
  type PlaceChange,
  type PlaceRow
} from "./places.types"

/** How long after the last change a change that's in no group is sent, ms:  a form's typing goes out as one. */
const PENDING_WAIT_MS = 500

/** How many times a change refused as out of date is merged and sent again, before it counts as refused. */
const MOST_MERGES = 3

/** The kinds of `PlaceError` that are an answer:  the outcome is known, so sending it again won't help. */
const KNOWN_OUTCOMES = new Set<PlaceError["kind"]>(["refused", "not found", "out of date"])

/** How long after I last changed something I still count as editing it, ms:  someone deleting it then gets me a notice. */
const EDITING_MS = 30_000

/** How many things it remembers changing. */
const TOUCHED_MOST = 200

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

/**
 * Someone else saved this field while my change was on its way, and my value was kept:  what's lost is `theirs`.
 * - `Places.onConflict()` hears it, for a notice.  Nothing's undone:  it's for a person to look at.
 */
export type PlaceConflict = {
  /** The place's name. */
  placeName: string
  /** The collection. */
  collection: string
  /** The type it's cached under. */
  type?: string
  /** The thing's id. */
  id: string
  /** The field. */
  field: string
  /** What the field held when I changed it. */
  was: unknown
  /** What I changed it to:  what it holds now. */
  mine: unknown
  /** What someone else changed it to:  the losing text, kept here. */
  theirs: unknown
  /** Put theirs back, as a new change. */
  useTheirs(): void
}

/**
 * Someone else's change replaced long text of mine, without having seen it:  last wins, and here's my text (J1).
 * - `Places.onLost()` hears it, for a notice.  It's repeated as they go on typing:  the latest for a thing and field stands.
 */
export type PlaceLostText = {
  /** The place's name. */
  placeName: string
  /** The collection. */
  collection: string
  /** The type it's cached under. */
  type?: string
  /** The thing's id. */
  id: string
  /** The field. */
  field: string
  /** What I wrote:  the losing text. */
  mine: unknown
  /** What it holds now. */
  theirs: unknown
  /** Put mine back, as a new change. */
  useMine(): void
}

/**
 * Someone deleted a thing I was editing:  the delete won, and here's the thing, with my changes in it.
 * - `Places.onThingDeleted()` hears it, for a notice.
 */
export type PlaceThingDeleted = {
  /** The place's name. */
  placeName: string
  /** The collection. */
  collection: string
  /** The type it's cached under. */
  type?: string
  /** The thing's id. */
  id: string
  /** The thing as I last had it. */
  row: PlaceRow
  /** Make it again, with the same id. */
  restore(): void
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
 *   - the place says it's out of date:  it's merged field by field, and sent again (`mergedAndSent()`)
 * - What's pending sits on top of what's read (`replayOn()`), so a read never takes back your own write.
 * - Undo needs no second path:  it's just another write, heard here.
 *   - A field written back to what it `was`, before that change has left, drops the change.
 *   - Once it has left, even with no answer, it's a new change, reversing it:  it may have been made.
 * - A second write to a field, with the first not sent, replaces it:  a form's typing is one change.
 * - On a place that takes `edits`, an addition goes as an addition (`addToField()`), and a list changes one item at a time
 *   (`changeList()`), so two at once both count.  On any other it's the whole value, and the last save wins.
 * - An unfinished group (an action) is NEVER sent or kept:  it's in this page's memory until `end()`,
 *   so closing the tab or `cancel()` really drops it.  Everything after it waits, to keep the order.
 * - Set aside (`setAside()`):  it holds on to the place it had, sends nothing, and shows nothing, until `comeBack()`.
 *   So a sample standing in never gets what was meant for the real place, or the other way round.
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
  /** When each thing was last changed here:  oldest first. */
  private readonly touched = new Map<string, number>()
  /** The list of places, and the cache:  STATIC for its life. */
  private readonly places: Places
  /** The place it had when it was set aside:  `setAside()`. */
  private placeAside: Place | undefined

  constructor({ placeName, places, keepAs, storage, wait = PENDING_WAIT_MS, retry }: PendingChangesProps) {
    this.placeName = placeName
    this.places = places
    this.queue = new SaveQueue({
      save: (options) => this.send(options),
      onChange: () => this.stateListeners.forEach((listener) => listener()),
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

  /** Hear where saving stands changing (`queue.state`, `queue.text`), for what shows it.  Returns what stops it. */
  onStateChange(listener: () => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }
  /** Who hears where saving stands. */
  private readonly stateListeners = new Set<() => void>()

  /** Is anything not yet confirmed? */
  get hasPending(): boolean {
    return this.pending.length > 0
  }

  /**
   * Another place went behind its name, for now (`Places.useInstead()`):  nothing's sent, or shown, until `comeBack()`.
   * - What's on its way lands where it was going, and shows nothing.
   * - What's kept on the device stays kept.
   * - MUST be called while its own place is still behind the name.
   */
  setAside(): void {
    this.placeAside = this.placeNow
    this.queue.stop()
  }

  /** Its own place is behind its name again:  what's waiting goes now. */
  comeBack(): void {
    this.placeAside = undefined
    if (this.pending.length) this.queue.changed({ now: true })
  }

  /** The place its changes are for. */
  private get placeNow(): Place | undefined {
    return this.placeAside ?? this.places.placeFor(this.placeName)
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
    this.noteTouched(collection, id)
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
    const version = replaces ? earlier.version : this.versionOf(collection, id)
    this.pending.push({
      changeId: newChangeId(),
      kind: "update",
      collection,
      ...(type !== undefined && { type }),
      id,
      field,
      fields: { [field]: value },
      ...(version !== undefined && { version }),
      ...(first !== undefined && { was: first }),
      ...(group !== undefined && { group })
    })
    this.changedList(group)
  }

  /**
   * Add `by` to the number in `field` of the thing `id`, which was `was`:  shown at once, sent soon.
   * - A place that takes `edits` is told it's an addition, so two people adding both count.
   * - Any other gets the whole new value, as `setField()`.
   */
  addToField({
    collection,
    type,
    id,
    field,
    by,
    was,
    group
  }: ThingWrite & { field: string; by: number; was?: number }): void {
    const value = (was ?? 0) + by
    if (!this.placeTakesEdits)
      return this.setField({
        collection,
        ...(type !== undefined && { type }),
        id,
        field,
        value,
        was,
        ...(group !== undefined && { group })
      })
    this.noteTouched(collection, id)
    this.showAtOnce({ collection, ...(type !== undefined && { type }) }, [{ [this.idField]: id, [field]: value }])
    const earlier = this.pending.find(
      (other) =>
        other.id === id &&
        other.collection === collection &&
        other.adds?.[field] !== undefined &&
        this.isUnsent(other) &&
        other.group === group
    )
    if (earlier) {
      earlier.adds![field]! += by
      return this.changedList(group)
    }
    this.pushUpdate({ collection, type, id, field, was, group }, { adds: { [field]: by } })
  }

  /**
   * The list in `field` of the thing `id` now holds `items`, and held `was`:  shown at once, sent soon.
   * - A place that takes `edits` is told only which items changed, so two people adding both stay, and a move can't double
   *   or lose one (T17).
   * - Any other gets the whole list, as `setField()`, and the last save wins:  it's all such a place can take.
   */
  changeList({
    collection,
    type,
    id,
    field,
    items,
    was,
    group
  }: ThingWrite & { field: string; items: unknown[]; was?: unknown }): void {
    const isUnsentInsert = this.pending.some(
      (other) => other.kind === "insert" && other.id === id && this.isUnsent(other)
    )
    if (!this.placeTakesEdits || isUnsentInsert) {
      return this.setField({
        collection,
        ...(type !== undefined && { type }),
        id,
        field,
        value: items,
        was,
        ...(group !== undefined && { group })
      })
    }
    this.noteTouched(collection, id)
    const place = this.placeNow
    const [known] = this.replayOn(collection, [
      place?.rowKnown?.(collection, id) ?? { [this.idField]: id, [field]: was }
    ])
    const edits = listEditsTo(known, field, items)
    if (!edits.length) return
    const after = withListEdits(known!, field, edits)
    const row = { [this.idField]: id, [field]: items, [POSITIONS_KEY]: after[POSITIONS_KEY] }
    this.showAtOnce({ collection, ...(type !== undefined && { type }) }, [row])
    this.pushUpdate({ collection, type, id, field, was, group }, { list: { [field]: edits } })
  }

  /** A new update of `field`, saying what `extra` says, in place of a value. */
  private pushUpdate(
    { collection, type, id, field, was, group }: ThingWrite & { field: string; was?: unknown },
    extra: Pick<PendingChange, "adds" | "list">
  ): void {
    const version = this.versionOf(collection, id)
    this.pending.push({
      changeId: newChangeId(),
      kind: "update",
      collection,
      ...(type !== undefined && { type }),
      id,
      field,
      ...extra,
      ...(version !== undefined && { version }),
      ...(was !== undefined && { was }),
      ...(group !== undefined && { group })
    })
    this.changedList(group)
  }

  /** Does this place take what happened, not only the value after it? */
  private get placeTakesEdits(): boolean {
    return !!this.placeNow?.describe().edits
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
    this.touched.delete(`${collection}\n${id}`)
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
   * Someone else deleted the thing `id`, and that won:  everything of it here is dropped, sent or not.
   * - One already on its way comes back refused, and that's nothing to tell:  it's already been dealt with.
   * - Returns what it dropped.
   */
  dropThing(collection: string, id: string): PendingChange[] {
    const dropped = this.pending.filter((other) => other.collection === collection && other.id === id)
    this.remove(dropped)
    this.keepCopy()
    this.settleList()
    return dropped
  }

  /** Was the thing `id` changed here just now, confirmed or not?  Then whoever's here counts as editing it. */
  wasEditing(collection: string, id: string): boolean {
    const at = this.touched.get(`${collection}\n${id}`)
    return at !== undefined && Date.now() - at < EDITING_MS
  }

  /** Note that this thing was changed here now. */
  private noteTouched(collection: string, id: string): void {
    const key = `${collection}\n${id}`
    this.touched.delete(key)
    this.touched.set(key, Date.now())
    for (const oldest of this.touched.keys()) {
      if (this.touched.size <= TOUCHED_MOST) break
      this.touched.delete(oldest)
    }
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
        if (!this.placeAside) void this.places.heal.healChanges(this.placeName, dropped)
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
    for (const { kind, id, fields, adds, list } of here) {
      if (id === undefined) continue
      if (kind === "delete") {
        replayed.delete(id)
        continue
      }
      // a change to a thing these rows don't hold says nothing about them:  a row of only its fields would be no row at all
      if (kind === "update" && !replayed.has(id)) continue
      let row: PlaceRow = { ...replayed.get(id), ...fields }
      for (const [field, by] of Object.entries(adds ?? {})) row[field] = (Number(row[field]) || 0) + by
      for (const [field, edits] of Object.entries(list ?? {})) row = withListEdits(row, field, edits)
      replayed.set(id, row)
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
    for (let batch = this.nextBatch(); batch.length && !this.placeAside; batch = this.nextBatch()) {
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
    const size = this.placeNow?.describe().rateLimit?.changesPerRequest ?? Infinity
    const batch: PendingChange[] = []
    for (const change of this.pending) {
      if (change.group !== first.group || batch.length >= size) break
      batch.push(change)
    }
    return batch
  }

  /**
   * Send `batch`, and deal with how it ended -- see the class.
   * - Answers whether the place took it.
   * - `merges`:  how many times it's been merged already.
   * - throws what the place threw, when the outcome is unknown
   */
  private async sendBatch(batch: PendingChange[], keepalive: boolean, merges = 0): Promise<boolean> {
    const place = this.placeNow ?? this.places.placeForOrDie(this.placeName)
    for (const change of batch) {
      change.hasLeft = true
      this.onTheirWay.add(change.changeId)
    }
    this.keepCopy()
    try {
      if (!place.apply) throw refusal(`Places:  "${this.placeName}" takes no changes`)
      const toSend = batch.map((change) => this.placeChangeFor(change, place))
      this.confirmed(batch, await place.apply(toSend, keepalive ? { keepalive } : {}))
      return true
    } catch (error) {
      if (!isKnownOutcome(error)) throw error
      return await this.answeredNo(batch, error, place, keepalive, merges)
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
   * - Out of date, on a place that checks versions:  merged, and sent again.
   * - Answers whether the place took it in the end.
   */
  private async answeredNo(
    batch: PendingChange[],
    error: PlaceError,
    place: Place,
    keepalive: boolean,
    merges: number
  ): Promise<boolean> {
    const isWholeGroup = place.describe().atomic && batch[0]!.group !== undefined
    if (batch.length > 1 && !isWholeGroup) {
      let isAllTaken = true
      for (const change of batch) isAllTaken = (await this.sendBatch([change], false)) && isAllTaken
      return isAllTaken
    }
    const [only] = batch
    // already gone is what a delete wanted
    if (batch.length === 1 && only!.kind === "delete" && error.kind === "not found") {
      this.confirmed(batch, {})
      return true
    }
    const canMerge = error.kind === "out of date" && place.describe().versionCheck && merges < MOST_MERGES
    if (canMerge && (await this.mergedAndSent(batch, place, keepalive, merges))) return true
    if (this.pending.includes(only!)) this.refused(batch, error)
    return false
  }

  /**
   * `batch` was refused as out of date:  a three-way merge per field, with the latest row, then sent again (epic `data`, J1).
   * - Each change names one field, and what it `was`, so that's all it takes:
   *   - theirs is what it `was`, or what I wrote:  nobody disagrees
   *   - else theirs and mine both changed it:  mine wins, and a conflict is raised once the place has taken it
   * - Fields only they changed aren't in the change, so they stay theirs.  So nothing's lost but the one value, which the
   *   conflict holds.
   * - NOT `ContentMerge`, which merges lines of text:  a place's unit is a field.
   * - Answers whether the place took it;  `false` for a thing that's gone, and for one still out of date after
   *   `MOST_MERGES`, which end as a refusal.
   * - throws what the place threw reading the latest:  the outcome's still unknown, so the queue tries again
   */
  private async mergedAndSent(
    batch: PendingChange[],
    place: Place,
    keepalive: boolean,
    merges: number
  ): Promise<boolean> {
    const { placeName } = this
    const updates = batch.filter(({ kind, id }) => kind === "update" && id !== undefined)
    const conflicts: PlaceConflict[] = []
    for (const change of updates) {
      const { collection, type, id, field, was } = change
      const [theirRow] = await this.places.heal.latestRows(place, collection, [id!])
      if (!theirRow) return false
      change.version = place.versionOf?.(collection, id!)
      if (change.version === undefined) delete change.version
      const theirs = theirRow[field!]
      const mine = change.fields?.[field!]
      if (!isSameValue(theirs, was) && !isSameValue(theirs, mine)) {
        const thing = { collection, ...(type !== undefined && { type }), id: id! }
        conflicts.push({
          placeName,
          ...thing,
          field: field!,
          was,
          mine,
          theirs,
          useTheirs: () => this.setField({ ...thing, field: field!, value: theirs, was: mine })
        })
      }
      // what they changed shows now:  only my own fields are still mine
      this.showAtOnce({ collection, ...(type !== undefined && { type }) }, this.replayOn(collection, [theirRow]))
    }
    const isTaken = await this.sendBatch(batch, keepalive, merges + 1)
    if (isTaken) conflicts.forEach((conflict) => this.places.tellConflict(conflict))
    return isTaken
  }

  /** The place took `batch`:  they're gone, and whoever shows them hears what it answered. */
  private confirmed(batch: PendingChange[], { rows = [] }: Partial<ApplyAnswer>): void {
    this.remove(batch)
    this.followVersions(batch)
    this.keepCopy()
    const written = batch.filter(({ kind }) => kind !== "delete")
    const isByChange = rows.length === written.length
    const renamed = isByChange ? this.renameMade(written, rows) : []
    const { idField } = this
    const place = this.placeNow
    for (const change of written) {
      const newId = renamed.find(({ from }) => from === change.id)?.to ?? change.id
      const { collection, type } = change
      // a place that knows the row right now knows better than an answer:  someone may have changed it, or deleted it, since
      const row = place?.rowKnown
        ? place.rowKnown(collection, newId!)
        : isByChange
          ? rows[written.indexOf(change)]
          : rows.find((candidate) => idOfRow(candidate, idField) === newId)
      if (!row) continue
      const replayed = this.replayOn(collection, [row])
      this.showAtOnce({ collection, ...(type !== undefined && { type }) }, replayed, { renamed })
    }
  }

  /**
   * What's still pending of a thing `batch` just changed was made from the version before:  my own write isn't news.
   * - So it moves to the version that write made, rather than be refused, read and merged, one keystroke at a time.
   */
  private followVersions(batch: readonly PendingChange[]): void {
    const place = this.placeNow
    // what a change has seen, on a place that doesn't refuse, is only for saying who it overwrote:  it stays as it was
    if (!place?.versionOf || !place.describe().versionCheck) return
    for (const { collection, id, version } of batch) {
      if (id === undefined) continue
      const now = place.versionOf(collection, id)
      if (now === undefined) continue
      for (const change of this.pending) {
        if (
          change.kind === "update" &&
          change.collection === collection &&
          change.id === id &&
          change.version === version
        ) {
          change.version = now
        }
      }
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
    if (!this.placeAside) void this.places.heal.healChanges(this.placeName, changes)
    this.places.tellWriteFailed({
      placeName: this.placeName,
      changes,
      error,
      retry: () => this.again(changes)
    })
  }

  /** Make `changes` again, as new ones:  a person pressed Retry. */
  private again(changes: readonly PendingChange[]): void {
    for (const { kind, collection, type, id, field, fields, was, adds, list } of changes) {
      const thing = { collection, ...(type !== undefined && { type }), id: id! }
      if (adds?.[field!] !== undefined)
        this.addToField({ ...thing, field: field!, by: adds[field!]!, ...(typeof was === "number" && { was }) })
      else if (list?.[field!]) this.again(this.replayedList(thing, field!, list[field!]!, was))
      else if (kind === "update") this.setField({ ...thing, field: field!, value: fields![field!], was })
      else if (kind === "insert") this.insert({ ...thing, fields: fields! })
      else this.delete(thing)
    }
  }

  /** A list change as a whole list again, for `again()`:  it was refused, so what's here is what it was. */
  private replayedList(
    thing: { collection: string; type?: string; id: string },
    field: string,
    edits: readonly ListEdit[],
    was: unknown
  ): PendingChange[] {
    const place = this.placeNow
    const row = place?.rowKnown?.(thing.collection, thing.id) ?? { [this.idField]: thing.id, [field]: was }
    const value = withListEdits(row, field, edits)[field]
    return [{ changeId: "", kind: "update", ...thing, field, fields: { [field]: value }, was }]
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
    if (this.placeAside) return
    const { idField, placeName } = this
    if (type !== undefined) {
      for (const row of rows) {
        const id = idOfRow(row, idField)
        if (id !== undefined) this.places.keepRow(placeName, type, id, row)
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

  /** The version of this thing as its place last showed it:  what a change made now is made from. */
  private versionOf(collection: string, id: string): string | undefined {
    return this.placeNow?.versionOf?.(collection, id)
  }

  /** Has `change` not left yet? */
  private isUnsent({ hasLeft }: PendingChange): boolean {
    return !hasLeft
  }

  /** The field holding a row's id:  `"id"` for a place that doesn't say. */
  private get idField(): string {
    return this.placeNow?.describe().idOf ?? "id"
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
