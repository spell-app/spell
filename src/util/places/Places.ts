import type { StorageLike } from "spell/util/persist/persist.types"
import { Cell, cellsOf, untrackCells, type CellSource, type PropDeclaredAt } from "spell/util/reactive"

import {
  PendingChanges,
  type PlaceConflict,
  type PlaceLostText,
  type PlaceRowsChange,
  type PlaceThingDeleted,
  type PlaceWriteFailure
} from "./PendingChanges"
import { PlaceCache } from "./PlaceCache"
import { PlaceHeal } from "./PlaceHeal"
import { PlaceReads } from "./PlaceReads"
import { PlaceResult, type PlaceResultProps } from "./PlaceResult"
import { PlaceError, writeAnswerFor, type Place, type PlaceRow, type WhyNotWritable } from "./places.types"

/****************
 * ### `Places`
 * Every place a program knows, by name, the one cache of rows they share, the reads under way and the writes pending.
 * - Everything asks for a place by name each time, so swapping the place behind a name
 *   (a sample, while designing) leaves everything that names it alone.
 * - Instances, not one page-wide list:  each run of a program, and each test, gets its own.
 * - Asked about one property of one thing, it says where the value came from:  `originOf()`.
 * - Another place can go behind a name for now, whole, and come out again:  `useInstead()`, what a sample is.
 ****************/
export class Places {
  /** The ONE cache of rows, so a thing read from two lists is one row. */
  readonly cache = new PlaceCache()
  /** The reads people are waiting on or looking at, so readers of one list share one request. */
  readonly reads = new PlaceReads()
  /** Fetch the latest, replay what's pending:  how anything gets back in step with a place. */
  readonly heal = new PlaceHeal({ places: this })
  /** Each place, by its name. */
  private places = new Map<string, Place>()
  /** Each place's changes not yet confirmed, by its name. */
  private pending = new Map<string, PendingChanges>()
  /** Who shows rows, told as they change under them. */
  private rowListeners = new Set<(change: PlaceRowsChange) => void>()
  /** Who hears of a failed write. */
  private failureListeners = new Set<(failure: PlaceWriteFailure) => void>()
  /** Who hears that a merge kept your value over someone else's. */
  private conflictListeners = new Set<(conflict: PlaceConflict) => void>()
  /** Who hears that someone else's change replaced long text of yours. */
  private lostListeners = new Set<(lost: PlaceLostText) => void>()
  /** Who hears that someone else deleted what you were editing. */
  private deletedListeners = new Set<(deleted: PlaceThingDeleted) => void>()
  /** The conflicts raised with nobody listening yet:  a change left from the last visit, merged as this one opens. */
  private unheardConflicts: PlaceConflict[] = []
  /** The failures raised with nobody listening yet:  a write left from the last visit, refused as this one opens. */
  private unheardFailures: PlaceWriteFailure[] = []
  /** What's behind each name another place is in for:  its place, and its pending changes, set aside. */
  private readonly setAside = new Map<string, { place: Place; pending?: PendingChanges }>()
  /** Who hears that another place went behind a name, or left. */
  private readonly swapListeners = new Set<(placeName: string) => void>()
  /** Changes when another place goes behind a name, or leaves:  so a side bar's `originOf()` is asked again. */
  private readonly swaps = new Cell()
  /** The ids of each type's rows in the cache that came from each place, by its name. */
  private readonly rowsFromPlace = new Map<string, Map<string, Set<string>>>()
  /** Which type each collection of each place is read as. */
  private readonly typesRead = new Map<string, string>()
  /** Whoever makes things from these rows. */
  private readonly thingMakers = new Set<PlaceThingMaker>()

  constructor(private readonly props: PlacesProps = {}) {}

  /**
   * Name `place`.
   * - throws `TypeError` if that name is taken:  a typo would quietly replace a place
   */
  add(name: string, place: Place): this {
    if (this.places.has(name)) {
      throw new TypeError(`Places.add():  there's already a place named "${name}";  swap() replaces one`)
    }
    this.places.set(name, place)
    // what's left from the last visit goes out now:  on a device that keeps them
    if (this.props.keepPendingAs !== undefined) void this.pendingFor(name).open()
    return this
  }

  /**
   * Put `place` behind `name`, in place of the one there.
   * - Returns the one it replaced.
   * - What's already been read stays for whoever holds it:  a read gets the new place when it next loads.
   * - SIDE EFFECT:  no new read shares an answer from the old place.
   * - throws `PlaceError` if nothing goes by that name
   */
  swap(name: string, place: Place): Place {
    const replaced = this.placeForOrDie(name)
    this.places.set(name, place)
    this.reads.forgetPlace(name)
    return replaced
  }

  /**
   * Put `place` behind `name` for now, with its own rows and its own changes, until `backToDeclared()`:  what a sample is.
   * - Unlike `swap()`, which only changes where the next read goes, this changes everything showing:
   *   - changes pending for the place there wait, set aside, and go to it when it's back:  never to `place`
   *   - changes made now go to `place`, and are never kept on this device as pending
   *   - rows from the place there leave the cache
   *   - each reader reads again, and what it held doesn't stand if that fails
   *   - `onSwapped()` is told
   * - Resolves once every reader has its answer.  Writes made while it waits go to `place`.
   * - throws `PlaceError` if nothing goes by that name;  `TypeError` if another place is already in for it
   */
  async useInstead(name: string, place: Place): Promise<void> {
    const declared = this.placeForOrDie(name)
    if (this.setAside.has(name)) {
      throw new TypeError(`Places.useInstead():  another place is already in for "${name}";  backToDeclared() first`)
    }
    const pending = this.pending.get(name)
    pending?.setAside()
    this.pending.delete(name)
    this.setAside.set(name, { place: declared, ...(pending && { pending }) })
    this.places.set(name, place)
    await this.readAfresh(name)
  }

  /**
   * The place `useInstead()` set aside is behind `name` again, and what was waiting for it goes.
   * - What's pending for the one leaving is sent to it first, so it's there next time.
   * - Nothing was set aside:  nothing happens.
   * - Resolves once every reader has its answer.
   */
  async backToDeclared(name: string): Promise<void> {
    if (!this.setAside.has(name)) return
    const leaving = this.pending.get(name)
    await leaving?.queue.save()
    const held = this.setAside.get(name)
    if (!held) return
    leaving?.setAside()
    this.pending.delete(name)
    this.setAside.delete(name)
    this.places.set(name, held.place)
    if (held.pending) {
      this.pending.set(name, held.pending)
      held.pending.comeBack()
    }
    await this.readAfresh(name)
  }

  /** The place the program declared under `name`, whatever's behind it for now. */
  declaredPlaceFor(name: string): Place | undefined {
    return this.setAside.get(name)?.place ?? this.places.get(name)
  }

  /** Hear another place going behind a name, or leaving:  before anyone reads it.  Returns what stops it. */
  onSwapped(listener: (placeName: string) => void): () => void {
    this.swapListeners.add(listener)
    return () => this.swapListeners.delete(listener)
  }

  /** What showed from the place behind `name` no longer stands -- see `useInstead()`. */
  private async readAfresh(name: string): Promise<void> {
    const readers = this.reads.readersOf(name)
    this.reads.forgetPlace(name)
    for (const [type, ids] of this.rowsFromPlace.get(name) ?? []) {
      for (const id of ids) this.cache.forget(type, id)
    }
    this.rowsFromPlace.delete(name)
    for (const listener of this.swapListeners) listener(name)
    this.swaps.changed()
    await Promise.all(readers.map((reader) => reader.readAfterSwap()))
  }

  /** The ONE row for `type` and `id`, from the place named `placeName`:  `PlaceCache.keep()`, noting whose it is. */
  keepRow(placeName: string, type: string, id: string, fields: PlaceRow): PlaceRow {
    let ofPlace = this.rowsFromPlace.get(placeName)
    if (!ofPlace) this.rowsFromPlace.set(placeName, (ofPlace = new Map()))
    let ids = ofPlace.get(type)
    if (!ids) ofPlace.set(type, (ids = new Set()))
    ids.add(id)
    return this.cache.keep(type, id, fields)
  }

  /** The type `collection` of the place named `placeName` was last read as, if any was named. */
  typeReadFrom(placeName: string, collection: string): string | undefined {
    return this.typesRead.get(`${placeName}\n${collection}`)
  }

  /** The place named `name`, if there is one. */
  placeFor(name: string): Place | undefined {
    return this.places.get(name)
  }

  /**
   * The place named `name`.
   * - throws `PlaceError` if nothing goes by that name
   */
  placeForOrDie(name: string): Place {
    const place = this.places.get(name)
    if (!place) {
      throw new PlaceError(`Places:  no place is named "${name}";  add() one first`, {
        cause: { kind: "no such place" }
      })
    }
    return place
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * What's kept for this program on this device, under `what`:  a key for a `BrowserCopy`.
   * - `undefined` when the program keeps nothing (`keepPendingAs`).
   */
  keyOnDevice(store: string, what: string): string | undefined {
    const { keepPendingAs } = this.props
    return keepPendingAs === undefined ? undefined : `${store}:${keepPendingAs}/${what}`
  }

  /** Where it keeps things on this device:  `PlacesProps.storage`. */
  get storage(): PlacesProps["storage"] {
    return this.props.storage
  }

  /**
   * The changes pending for the place named `placeName`:  the ONE list for it.
   * - The first time, it also sends as the page goes away, on a device that keeps them.
   * - throws `PlaceError` if nothing goes by that name
   */
  pendingFor(placeName: string): PendingChanges {
    let pending = this.pending.get(placeName)
    if (pending) return pending
    this.placeForOrDie(placeName)
    const { storage, wait, retry } = this.props
    // what's written to a place in for another for now isn't kept:  it's that place's to keep
    const keepPendingAs = this.setAside.has(placeName) ? undefined : this.props.keepPendingAs
    pending = new PendingChanges({
      placeName,
      places: this,
      ...(keepPendingAs !== undefined && { keepAs: keepPendingAs }),
      ...(storage && { storage }),
      ...(wait !== undefined && { wait }),
      ...(retry !== undefined && { retry })
    })
    this.pending.set(placeName, pending)
    if (keepPendingAs !== undefined && typeof window !== "undefined") pending.queue.watch(window)
    return pending
  }

  /** The changes pending for `placeName`, if anything's asked for them:  a read looks here, and makes nothing. */
  pendingIfAny(placeName: string): PendingChanges | undefined {
    return this.pending.get(placeName)
  }

  /** Hear rows changing under what's showing:  a write, an answer, a heal.  Returns what stops it. */
  onRows(listener: (change: PlaceRowsChange) => void): () => void {
    this.rowListeners.add(listener)
    return () => this.rowListeners.delete(listener)
  }

  /** Tell who's listening that rows changed:  `PendingChanges` and `PlaceHeal` call it. */
  tellRows(change: PlaceRowsChange): void {
    for (const listener of this.rowListeners) listener(change)
  }

  /**
   * Hear each write a place refused:  the one event a notice is shown from, anywhere in the app.
   * - Hears at once any raised before anyone listened.
   * - Returns what stops it.
   */
  onWriteFailed(listener: (failure: PlaceWriteFailure) => void): () => void {
    this.failureListeners.add(listener)
    this.unheardFailures.splice(0).forEach(listener)
    return () => this.failureListeners.delete(listener)
  }

  /** Raise `failure`:  `PendingChanges` calls it. */
  tellWriteFailed(failure: PlaceWriteFailure): void {
    if (!this.failureListeners.size) this.unheardFailures.push(failure)
    for (const listener of this.failureListeners) listener(failure)
  }

  /**
   * Hear each time a merge kept your value over what someone else saved:  what a notice is shown from, with what was lost.
   * - Hears at once any raised before anyone listened.
   * - Returns what stops it.
   */
  onConflict(listener: (conflict: PlaceConflict) => void): () => void {
    this.conflictListeners.add(listener)
    this.unheardConflicts.splice(0).forEach(listener)
    return () => this.conflictListeners.delete(listener)
  }

  /** Raise `conflict`:  `PendingChanges` calls it. */
  tellConflict(conflict: PlaceConflict): void {
    if (!this.conflictListeners.size) this.unheardConflicts.push(conflict)
    for (const listener of this.conflictListeners) listener(conflict)
  }

  /** Hear each time someone else's change replaced long text of yours:  what a notice is shown from, with your text.  Returns what stops it. */
  onLost(listener: (lost: PlaceLostText) => void): () => void {
    this.lostListeners.add(listener)
    return () => this.lostListeners.delete(listener)
  }

  /** Raise `lost`:  `PlaceHeal` calls it. */
  tellLost(lost: PlaceLostText): void {
    for (const listener of this.lostListeners) listener(lost)
  }

  /** Hear each time someone else deleted what you were editing:  what a notice with Restore is shown from.  Returns what stops it. */
  onThingDeleted(listener: (deleted: PlaceThingDeleted) => void): () => void {
    this.deletedListeners.add(listener)
    return () => this.deletedListeners.delete(listener)
  }

  /** Raise `deleted`:  `PlaceHeal` calls it. */
  tellThingDeleted(deleted: PlaceThingDeleted): void {
    for (const listener of this.deletedListeners) listener(deleted)
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * A new reader's result, not yet started:  `load()` it, and `leave()` it when nothing shows it any more.
   * - Readers of one collection and query share one request.
   * - That read was released not long ago:  it starts with those rows, `"from an earlier visit"`;  `reload()` asks again.
   * - Follows nothing, so it's safe inside a memo.
   */
  read(props: PlaceResultProps): PlaceResult {
    if (props.type !== undefined) this.typesRead.set(`${props.placeName}\n${props.collection}`, props.type)
    return untrackCells(() => {
      const result = new PlaceResult(props, { places: this })
      const earlier = this.reads.releasedFor(props)
      if (earlier) result.showFromEarlierVisit(earlier.rows, earlier.answer)
      return result
    })
  }

  ////////////////
  // ## Where a value came from
  ////////////////

  /**
   * Whoever makes things from these rows:  what lets `originOf()` be asked about a thing.
   * - `PlaceThings` calls it:  this folder knows nothing of things.
   */
  addThingMaker(maker: PlaceThingMaker): void {
    this.thingMakers.add(maker)
  }

  /**
   * Where `property` of `thing` came from, for a side bar:  see `ValueOrigin`.
   * - `undefined`:  it's from no place, such as what the app holds itself.
   * - Re-asked by a memo when another place goes behind a name, or leaves;  it follows nothing else.
   * - `canWrite` is a hint:  the place can still refuse.
   * - `identity`:  who's asking, for a place where it depends on who owns the thing.
   * - NEVER throws:  a worked-out value that throws when it's read is logged, and has no origin to give.
   */
  originOf(thing: object, property: string, { identity }: { identity?: string } = {}): ValueOrigin | undefined {
    this.swaps.read()
    return untrackCells(() => {
      for (const maker of this.thingMakers) {
        const found = maker.describeValue(thing, property)
        if (!found) continue
        return "workedOutFrom" in found ? this.workedOutOrigin(found) : this.savedOrigin(found, identity)
      }
      return undefined
    })
  }

  /** What's known of a saved value. */
  private savedOrigin(found: SavedValue, identity: string | undefined): SavedOrigin {
    const { placeName, collection, type, id, field, isIdentity, declaredAt } = found
    const place = this.placeForOrDie(placeName)
    const { kind, isSample = false } = place.describe()
    const row = this.cache.rowFor(type, id) ?? place.rowKnown?.(collection, id)
    const { canWrite, whyNot } = isIdentity
      ? { canWrite: false, whyNot: "field" as const }
      : writeAnswerFor(place, {
          collection,
          kind: "update",
          field,
          ...(row && { row }),
          ...(identity !== undefined && { identity })
        })
    return {
      place: placeName,
      ...(kind !== undefined && { kind }),
      collection,
      id,
      canWrite,
      ...(whyNot && { whyNot }),
      isSample,
      ...(declaredAt && { declaredAt })
    }
  }

  /**
   * What's known of a worked-out value:  `undefined` when it read no place.
   * - Whose a cell is:  a thing's (its maker says), a reader's rows, or a row in the cache.
   */
  private workedOutOrigin({ workedOutFrom, readsFrom, declaredAt }: WorkedOutValue): WorkedOutOrigin | undefined {
    const names = new Set(readsFrom)
    for (const [name, ofPlace] of this.rowsFromPlace) {
      for (const [type, ids] of ofPlace) {
        for (const id of ids) {
          const row = this.cache.rowFor(type, id)
          if (row && isAmong(row, workedOutFrom)) names.add(name)
        }
      }
    }
    for (const name of this.places.keys()) {
      if (this.reads.readersOf(name).some((reader) => isAmong(reader, workedOutFrom))) names.add(name)
    }
    if (!names.size) return undefined
    return { workedOut: true, canWrite: false, readsFrom: [...names], ...(declaredAt && { declaredAt }) }
  }
}

/** Has anything read one of `target`'s cells? */
function isAmong(target: object, sources: ReadonlySet<CellSource>): boolean {
  return cellsOf(target).some((cell) => sources.has(cell))
}

/** What a saved value's place says about it:  one of the answers of `Places.originOf()`. */
export type SavedOrigin = {
  /** Worked out?  No:  it's saved. */
  workedOut?: false
  /** The name of the place it's kept in, as the program declares it, sample or not. */
  place: string
  /** What sort of place that is, in words:  `PlaceCapabilities.kind`. */
  kind?: string
  /** The collection it's in. */
  collection: string
  /** The thing's id in that collection. */
  id: string
  /** Can it be changed, as far as we know? */
  canWrite: boolean
  /** Why not. */
  whyNot?: WhyNotWritable
  /** Is a sample behind the name now, so the real place can't be touched? */
  isSample: boolean
  /** The line that declares this property.  Absent until the compiler writes it (epic `data`, Gathering Reads). */
  declaredAt?: PropDeclaredAt
}

/** What a value worked out from others says:  one of the answers of `Places.originOf()`. */
export type WorkedOutOrigin = {
  /** It has no one place. */
  workedOut: true
  /** Never:  change what it's worked out from. */
  canWrite: false
  /** The name of each place it read this time. */
  readsFrom: string[]
  /** The line that works it out.  Absent until the compiler writes it (epic `data`, Gathering Reads). */
  declaredAt?: PropDeclaredAt
}

/** Where a value came from:  see `Places.originOf()`. */
export type ValueOrigin = SavedOrigin | WorkedOutOrigin

/** What a thing's maker knows of a saved value. */
export type SavedValue = {
  /** The place's name. */
  placeName: string
  /** The collection. */
  collection: string
  /** The type it's cached under. */
  type: string
  /** The thing's id. */
  id: string
  /** The field. */
  field: string
  /** Is this field the thing's id, so it can't change? */
  isIdentity: boolean
  /** The line that declares it. */
  declaredAt?: PropDeclaredAt
}

/** What a thing's maker knows of a value worked out from others. */
export type WorkedOutValue = {
  /** Everything reading it read, this time. */
  workedOutFrom: ReadonlySet<CellSource>
  /** The name of the place of each thing among those. */
  readsFrom: readonly string[]
  /** The line that works it out. */
  declaredAt?: PropDeclaredAt
}

/** Whoever makes things from a place's rows, as `Places.originOf()` needs it:  `PlaceThings`. */
export type PlaceThingMaker = {
  /** What it knows of `property` of `thing`:  `undefined` if that's nothing of its. */
  describeValue(thing: object, property: string): SavedValue | WorkedOutValue | undefined
}

/** Constructor props of `Places`. */
export type PlacesProps = {
  /** What to keep pending changes and drafts under on this device, e.g. the project's id.  Left out:  they end with the page. */
  keepPendingAs?: string
  /** Finds where they're kept:  `BrowserCopyProps.storage`. */
  storage?: () => StorageLike | undefined
  /** How long after the last change one in no group is sent, ms. */
  wait?: number
  /** How long after no answer it tries again, ms. */
  retry?: number
}
