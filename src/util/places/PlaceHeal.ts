import type { PendingChange, PendingChanges } from "./PendingChanges"
import type { Places } from "./Places"
import { idOfRow, isLongText, type Place, type PlaceEvent, type PlaceRow, type ReplacedValue } from "./places.types"

/****************
 * ### `PlaceHeal`
 * The ONE way anything gets back in step with a place:  fetch the latest, replay what's pending (epic `data` P3).
 * - It runs on opening (`PendingChanges.open()`), on a refusal or a cancel, and on demand (`heal()`).
 * - A place that says what changed (`watch()`), a live room above all, is followed (`follow()`):  what it hears goes the same way,
 *   the place's row with what's pending on top, so what a room heals shows without any more to it.
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
      const answered = await this.latestRows(place, collection, ids)
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

  /**
   * From now on, what `place` says changed in `collection` shows, with what's pending on top:  someone else's change, or a heal.
   * - Someone else's delete wins.  If I was editing that thing, a notice says so, with Restore (`Places.onThingDeleted()`).
   * - Long text of mine replaced raises a notice holding it (`Places.onLost()`);  a change I made offline replacing newer
   *   work raises a conflict holding theirs (`Places.onConflict()`).
   * - The connection coming back sends what's waiting at once.
   * - A place that doesn't watch:  nothing to follow.
   * - Returns what stops it.
   * - throws `PlaceError` if nothing goes by that name
   */
  follow(ask: Omit<HealAsk, "ids">): () => void {
    const { placeName, collection } = ask
    const place = this.places.placeForOrDie(placeName)
    const pending = this.places.pendingFor(placeName)
    const stops = [
      place.watch?.({ collection }, (event) => this.heardEvent(ask, place, pending, event)),
      place.onBack?.(() => {
        if (pending.hasPending) pending.queue.changed({ now: true })
      })
    ]
    return () => stops.forEach((stop) => stop?.())
  }

  /** `place` says this changed:  show it, on top of what's pending, and say what needs saying. */
  private heardEvent(ask: Omit<HealAsk, "ids">, place: Place, pending: PendingChanges, event: PlaceEvent): void {
    const { placeName, collection, type } = ask
    const { idOf } = place.describe()
    if (idOf === undefined) return
    const { id, row, was, lost = [], overwrote = [] } = event
    if (!row) return this.thingWentAway(ask, idOf, pending, id, was)
    const rows = pending.replayOn(collection, [row])
    this.keep(type, rows, idOf)
    this.places.tellRows({ placeName, collection, ...(type !== undefined && { type }), idField: idOf, rows })
    const thing = { placeName, collection, ...(type !== undefined && { type }), id }
    for (const { field, mine, theirs } of lost.filter(({ mine }: ReplacedValue) => isLongText(mine))) {
      this.places.tellLost({
        ...thing,
        field,
        mine,
        theirs,
        useMine: () =>
          pending.setField({ collection, ...(type !== undefined && { type }), id, field, value: mine, was: theirs })
      })
    }
    for (const { field, mine, theirs } of overwrote) {
      this.places.tellConflict({
        ...thing,
        field,
        was: undefined,
        mine,
        theirs,
        useTheirs: () =>
          pending.setField({ collection, ...(type !== undefined && { type }), id, field, value: theirs, was: mine })
      })
    }
  }

  /** The thing `id` is gone, by someone else's hand:  it goes from here, with whatever I had of it;  if I was editing it, I'm told. */
  private thingWentAway(
    { placeName, collection, type }: Omit<HealAsk, "ids">,
    idField: string,
    pending: PendingChanges,
    id: string,
    was: PlaceRow | undefined
  ): void {
    const wasEditing =
      pending.wasEditing(collection, id) ||
      pending.changes.some((change) => change.id === id && change.collection === collection && change.kind !== "delete")
    const [row] = pending.replayOn(collection, [was ?? { [idField]: id }])
    pending.dropThing(collection, id)
    if (type !== undefined) this.places.cache.forget(type, id)
    this.places.tellRows({
      placeName,
      collection,
      ...(type !== undefined && { type }),
      idField,
      rows: [],
      removed: [id]
    })
    if (!wasEditing || !row) return
    this.places.tellThingDeleted({
      placeName,
      collection,
      ...(type !== undefined && { type }),
      id,
      row,
      restore: () => pending.insert({ collection, ...(type !== undefined && { type }), id, fields: row })
    })
  }

  /**
   * What `place` holds now of `collection`:  every row, or only those of `ids`.
   * - throws what the place threw
   */
  async latestRows(place: Place, collection: string, ids?: readonly string[]): Promise<PlaceRow[]> {
    if (ids && place.getMany) return place.getMany(collection, ids, {})
    const { idOf } = place.describe()
    const { rows } = await place.list(collection, {}, {})
    return rows.filter((row) => !ids || ids.includes(idOfRow(row, idOf) ?? ""))
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
