import type { StorageLike } from "spell/util/persist/persist.types"
import { untrackCells } from "spell/util/reactive"

import { PendingChanges, type PlaceRowsChange, type PlaceWriteFailure } from "./PendingChanges"
import { PlaceCache } from "./PlaceCache"
import { PlaceHeal } from "./PlaceHeal"
import { PlaceReads } from "./PlaceReads"
import { PlaceResult, type PlaceResultProps } from "./PlaceResult"
import { PlaceError, type Place } from "./places.types"

/****************
 * ### `Places`
 * Every place a program knows, by name, the one cache of rows they share, the reads under way and the writes pending.
 * - Everything asks for a place by name each time, so swapping the place behind a name
 *   (a sample, while designing) leaves everything that names it alone.
 * - Instances, not one page-wide list:  each run of a program, and each test, gets its own.
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
  /** The failures raised with nobody listening yet:  a write left from the last visit, refused as this one opens. */
  private unheardFailures: PlaceWriteFailure[] = []

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
    const { keepPendingAs, storage, wait, retry } = this.props
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
    return untrackCells(() => {
      const result = new PlaceResult(props, { places: this })
      const earlier = this.reads.releasedFor(props)
      if (earlier) result.showFromEarlierVisit(earlier.rows, earlier.answer)
      return result
    })
  }
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
