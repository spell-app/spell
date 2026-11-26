import { randomBytes } from "node:crypto"

import type { ChangesAnswer, PlaceEvent, WatchTarget } from "spell/places/places.types"

/** How many changes it keeps:  a token from before them is read whole again (epic `data` I146, as a room keeps its last 1,000). */
export const CHANGES_KEPT = 1000

/****************
 * ### `PlaceEvents`
 * What a place on a disk has heard:  who's watching, and each change so far, for `watch()` and `changesSince()`.
 * - In memory:  a token names this run and a count, `<run>:<count>` (epic `data` I144), as a room's do.
 *   - A token from another run, or from before the changes it still keeps, is none it knows:  `changesSince()`
 *     answers `undefined`, and its place answers the whole list, `startsOver` (I145).
 *   - Why the run:  a plain count starts again with each run, so an old one passed once the new run got that far,
 *     and the changes before it were never told.
 * - It keeps the last `CHANGES_KEPT`, so a place that's written all day holds no more (I146).
 * - `onFirstWatcher()` / what it returns:  the storage's own watch, held only while someone's watching.
 ****************/
export class PlaceEvents {
  /** Names this run:  the counts start again when it restarts, so a token from before is known for one. */
  readonly run = randomBytes(6).toString("hex")
  /** The last changes, oldest first:  one's place in this list, plus `dropped`, is the count it made, from 1. */
  private readonly history: PlaceEvent[] = []
  /** How many changes, the oldest, are no longer kept. */
  private dropped = 0
  /** Who's watching. */
  private readonly watchers = new Set<{ target: WatchTarget; onEvent: (event: PlaceEvent) => void }>()
  /** Starts hearing the disk, and returns what stops it. */
  private readonly onFirstWatcher: () => () => void
  /** Stops hearing the disk. */
  private stopHearing: (() => void) | undefined

  constructor({ onFirstWatcher }: PlaceEventsProps) {
    this.onFirstWatcher = onFirstWatcher
  }

  /** Where it stands now:  this run, and how many changes it's heard. */
  get version(): string {
    return `${this.run}:${this.count}`
  }

  /** How many changes it's heard this run. */
  private get count(): number {
    return this.dropped + this.history.length
  }

  /** Note a change, and tell whoever's watching. */
  tell(event: PlaceEvent): void {
    this.history.push(event)
    if (this.history.length > CHANGES_KEPT) {
      this.history.shift()
      this.dropped++
    }
    for (const { target, onEvent } of this.watchers) {
      const isWatched = target.collection === event.collection && (target.id === undefined || target.id === event.id)
      if (isWatched) onEvent(event)
    }
  }

  /** Tell `onEvent` of each change to `target`.  Returns what stops it. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    const watcher = { target, onEvent }
    this.watchers.add(watcher)
    this.stopHearing ??= this.onFirstWatcher()
    return () => {
      this.watchers.delete(watcher)
      if (this.watchers.size) return
      this.stopHearing?.()
      this.stopHearing = undefined
    }
  }

  /**
   * What's changed in `collection` since `token`:  each thing once, as it's now kept.
   * - `undefined`:  a token it doesn't know -- from another run, from before what it keeps, or not one of its own.
   */
  changesSince(collection: string, token: string): ChangesAnswer | undefined {
    const [run, counted] = token.split(":")
    const from = Number(counted)
    if (run !== this.run || !Number.isInteger(from) || from < this.dropped || from > this.count) return undefined
    const latest = new Map<string, PlaceEvent>()
    for (const event of this.history.slice(from - this.dropped)) {
      if (event.collection === collection) latest.set(event.id, event)
    }
    const events = [...latest.values()]
    return {
      rows: events.flatMap((event) => (event.row ? [event.row] : [])),
      removed: events.filter((event) => !event.row).map((event) => event.id),
      token: this.version
    }
  }
}

/** Constructor props of `PlaceEvents`. */
export type PlaceEventsProps = {
  /** Start hearing the disk:  returns what stops it. */
  onFirstWatcher: () => () => void
}
