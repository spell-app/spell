import type { PendingChange } from "./PendingChanges"
import type { Places } from "./Places"
import { idOfRow, type PlaceRow } from "./places.types"

/****************
 * ### `PlaceHeal`
 * The ONE way anything gets back in step with a place:  fetch the latest, replay what's pending (epic `data` P3).
 * - It runs on opening (`PendingChanges.open()`), on a refusal or a cancel, and on demand (`heal()`).
 * - It needs nothing else to have gone right, so a bug heals the same way as a lost message.
 * - A heal that can't reach the place changes nothing, and says so by answering false:  what's showing stays.
 * - Whoever shows rows hears through `Places.onRows()`.  Knows nothing of Things.
 * - One per `Places`.
 ****************/
export class PlaceHeal {
  /** The list of places, and the cache:  STATIC for its life. */
  private readonly places: Places

  constructor({ places }: PlaceHealProps) {
    this.places = places
  }

  /**
   * Get `collection` of `placeName` back in step:  every row, or only those of `ids`.
   * - An id the place no longer holds, with nothing pending to make it, is told as `removed`.
   * - Returns whether it reached the place.
   * - NEVER throws:  a failure is logged.
   */
  async heal({ placeName, collection, type, ids }: HealAsk): Promise<boolean> {
    try {
      const place = this.places.placeForOrDie(placeName)
      const { idOf } = place.describe()
      if (idOf === undefined) return false
      const answered =
        ids && place.getMany
          ? await place.getMany(collection, ids, {})
          : (await place.list(collection, {}, {})).rows.filter((row) => !ids || ids.includes(idOfRow(row, idOf) ?? ""))
      const pending = this.places.pendingFor(placeName)
      const rows = pending.replayOn(collection, answered)
      const held = new Set(rows.map((row) => idOfRow(row, idOf)))
      const removed = (ids ?? []).filter((id) => !held.has(id))
      this.keep(type, rows, idOf)
      for (const id of type === undefined ? [] : removed) this.places.cache.forget(type!, id)
      this.places.tellRows({
        placeName,
        collection,
        ...(type !== undefined && { type }),
        idField: idOf,
        rows,
        ...(removed.length && { removed })
      })
      return true
    } catch (error) {
      console.error(
        `PlaceHeal.heal():  can't reach "${placeName}" to read "${collection}";  what's showing stays`,
        error
      )
      return false
    }
  }

  /** Heal the things `changes` were to, collection by collection.  NEVER throws. */
  async healChanges(placeName: string, changes: readonly PendingChange[]): Promise<void> {
    const asks = new Map<string, HealAsk & { ids: string[] }>()
    for (const { collection, type, id } of changes) {
      if (id === undefined) continue
      const key = `${collection}\n${type ?? ""}`
      let ask = asks.get(key)
      if (!ask) asks.set(key, (ask = { placeName, collection, ...(type !== undefined && { type }), ids: [] }))
      if (!ask.ids.includes(id)) ask.ids.push(id)
    }
    await Promise.all([...asks.values()].map((ask) => this.heal(ask)))
  }

  /** Heal the things with changes pending, as a visit opens.  NEVER throws. */
  healPending(placeName: string): Promise<void> {
    return this.healChanges(placeName, this.places.pendingFor(placeName).changes)
  }

  /** Each of `rows` into the cache's one row. */
  private keep(type: string | undefined, rows: PlaceRow[], idOf: string): void {
    if (type === undefined) return
    for (const row of rows) {
      const id = idOfRow(row, idOf)
      if (id !== undefined) this.places.cache.keep(type, id, row)
    }
  }
}

/** Constructor props of a `PlaceHeal`. */
export type PlaceHealProps = {
  /** The list of places. */
  places: Places
}

/** What to get back in step. */
export type HealAsk = {
  /** The place's name. */
  placeName: string
  /** The collection. */
  collection: string
  /** The type its rows are cached under. */
  type?: string
  /** Only these things.  Left out:  every row. */
  ids?: readonly string[]
}
