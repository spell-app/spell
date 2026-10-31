import { Loadable } from "spell/util/spell/Loadable"

import type { Places } from "./Places"
import { idOfRow, type ListAnswer, type ListHandled, type ListQuery, type Place, type PlaceRow } from "./places.types"

/** Everything a result can say about its rows. */
export const ResultStatuses = ["still waiting", "complete", "from an earlier visit"] as const
/**
 * What a result knows about its rows:
 * - `"still waiting"`:  the place hasn't answered
 * - `"complete"`:  these are the place's answer
 * - `"from an earlier visit"`:  these were kept from last time, and may be out of date
 */
export type ResultStatus = (typeof ResultStatuses)[number]

/****************
 * ### `PlaceResult`
 * One read of one place:  its rows, and what it knows about them.
 * - A `Loadable`, since one read is one resource:  `contents`, `load()`, `isLoaded`, `isLoading` and `loadError` are
 *   its, and aborting comes with them.
 * - Only `status` is new here.
 * - Asks for its place by name each time it loads, so it reads whichever place is behind the name by then.
 * - Each row of a place that names its ids is the cache's ONE row for it, when the read has a `type`.
 *   - With no id or no type, the rows stay inside this result.
 * - One `list()` per load:  no sharing between readers, and nothing done for what the place can't do.
 *   It says what the place did:  `handled`.
 * - NEVER saves:  changes go to the place, not through a result.
 ****************/
export class PlaceResult extends Loadable<PlaceRow[]> {
  /** The name of the place it reads. */
  readonly placeName: string
  /** The collection it reads. */
  readonly collection: string
  /** The type its rows are cached under. */
  readonly type: string | undefined
  /** What it asks for, unless `load()` is handed another query. */
  readonly query: ListQuery
  /** The list of places, and the cache:  STATIC for the result's life. */
  private readonly places: Places

  constructor({ placeName, collection, type, query = {} }: PlaceResultProps, { places }: PlaceResultContext) {
    super()
    this.placeName = placeName
    this.collection = collection
    this.type = type
    this.query = query
    this.places = places
  }

  /** The place behind its name right now. */
  get place(): Place {
    return this.places.placeForOrDie(this.placeName)
  }

  ////////////////
  // ## What it knows
  ////////////////

  /**
   * What it knows about its rows -- see `ResultStatus`.
   * - Rows from an earlier visit say so while a fresh read is under way:  it's still all we have.
   * - A read that failed:  none of these;  `loadError` says why.
   */
  get status(): ResultStatus | undefined {
    if (this.getState("isFromEarlierVisit")) return "from an earlier visit"
    if (this.isLoading) return "still waiting"
    if (this.loadError) return undefined
    return this.isLoaded ? "complete" : "still waiting"
  }

  /** What to ask for next, as `PageAsk.at`:  `undefined` on the last page, or before an answer. */
  get nextPage(): string | undefined {
    return this.answer?.nextPage
  }

  /** Where the place stood when it answered. */
  get version(): string | undefined {
    return this.answer?.version
  }

  /** Which parts of the query the place did itself:  `undefined` before an answer. */
  get handled(): ListHandled | undefined {
    return this.answer?.handled
  }

  /** The place's last answer, without its rows. */
  private get answer(): Omit<ListAnswer, "rows"> | undefined {
    return this.getState("answer")
  }

  ////////////////
  // ## Changing it
  ////////////////

  /**
   * Show `rows`, kept from an earlier visit, until the place answers.
   * - `reload()` then asks the place:  a plain `load()` is satisfied by what's here.
   */
  showFromEarlierVisit(rows: PlaceRow[]): this {
    this.contents = this.rowsKept(rows, this.place)
    this.setState("isFromEarlierVisit", true)
    return this
  }

  /** New rows, or none:  so what it said about the old ones no longer holds. */
  onContentsUpdated() {
    this.resetState("isFromEarlierVisit")
    if (!this.contents) this.resetState("answer")
  }

  /** Back to nothing read:  see `Loadable.unload()`. */
  unload() {
    this.resetState("isFromEarlierVisit", "answer")
    return super.unload()
  }

  ////////////////
  // ## Loading
  ////////////////

  /**
   * One `list()` of the place.
   * - `query`:  what `load()` was handed;  left out, `this.query`.
   * - An answer that came after `signal` aborted touches nothing:  a newer read may be under way.
   */
  async getLoader(query: ListQuery | undefined, signal: AbortSignal): Promise<PlaceRow[]> {
    const { place } = this
    const { rows, ...answer } = await place.list(this.collection, query ?? this.query, { signal })
    if (signal.aborted) return []
    this.setState("answer", answer)
    return this.rowsKept(rows, place)
  }

  /** NEVER saves.  - throws `TypeError`, always */
  getSaver(): Promise<never> {
    throw new TypeError(`PlaceResult.save():  a result can't be saved;  apply() changes on the place instead`)
  }

  /** `rows`, each the cache's ONE row for its id:  as they are when they share no identity. */
  private rowsKept(rows: PlaceRow[], place: Place): PlaceRow[] {
    const { type } = this
    const { idOf } = place.describe()
    if (type === undefined || idOf === undefined) return rows
    return rows.map((row) => {
      const id = idOfRow(row, idOf)
      return id === undefined ? row : this.places.cache.keep(type, id, row)
    })
  }
}

/** Constructor props of a `PlaceResult`. */
export type PlaceResultProps = {
  /** The name of the place to read. */
  placeName: string
  /** The collection to read. */
  collection: string
  /** The type to cache its rows under, e.g. `Recipe`.  Left out:  the rows stay inside this result. */
  type?: string
  /** What to ask for.  Left out:  everything. */
  query?: ListQuery
}

/** What a `PlaceResult` is given to work with. */
export type PlaceResultContext = {
  /** The list of places it finds its place in, and the cache. */
  places: Places
}
