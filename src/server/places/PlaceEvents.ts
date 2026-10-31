import type { ChangesAnswer, PlaceEvent, WatchTarget } from "spell/util/places/places.types"

/****************
 * ### `PlaceEvents`
 * What a place on a disk has heard:  who's watching, and each change so far, for `watch()` and `changesSince()`.
 * - In memory:  a token from before this run (one past its end) means "everything's changed", so it asks for a full list.
 * - `onFirstWatcher()` / what it returns:  the storage's own watch, held only while someone's watching.
 ****************/
export class PlaceEvents {
  /** Each change, oldest first:  one's place in this list is the version it made, counting from 1. */
  private readonly history: PlaceEvent[] = []
  /** Who's watching. */
  private readonly watchers = new Set<{ target: WatchTarget; onEvent: (event: PlaceEvent) => void }>()
  /** Starts hearing the disk, and returns what stops it. */
  private readonly onFirstWatcher: () => () => void
  /** Stops hearing the disk. */
  private stopHearing: (() => void) | undefined

  constructor({ onFirstWatcher }: PlaceEventsProps) {
    this.onFirstWatcher = onFirstWatcher
  }

  /** Where it stands now:  how many changes it's heard. */
  get version(): string {
    return String(this.history.length)
  }

  /** Note a change, and tell whoever's watching. */
  tell(event: PlaceEvent): void {
    this.history.push(event)
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

  /** What's changed in `collection` since `token`:  each thing once, as it's now kept.  `undefined`:  a token from another run. */
  changesSince(collection: string, token: string): ChangesAnswer | undefined {
    const from = Number(token)
    if (!(from <= this.history.length)) return undefined
    const latest = new Map<string, PlaceEvent>()
    for (const event of this.history.slice(from)) {
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
