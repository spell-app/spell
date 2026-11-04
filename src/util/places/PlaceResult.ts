import { untrackCells } from "spell/util/reactive"
import { Loadable } from "spell/util/spell/Loadable"

import type { Places } from "./Places"
import { idOfRow, type ListAnswer, type ListHandled, type ListQuery, type Place, type PlaceRow } from "./places.types"

/** Everything a result can say about its rows. */
export const ResultStatuses = ["still waiting", "complete", "from an earlier visit", "couldn't update"] as const
/**
 * What a result knows about its rows:
 * - `"still waiting"`:  the place hasn't answered
 * - `"complete"`:  these are the place's answer
 * - `"from an earlier visit"`:  these were kept from last time, and may be out of date
 * - `"couldn't update"`:  these are from before a read that failed;  `loadError` says why
 */
export type ResultStatus = (typeof ResultStatuses)[number]

/****************
 * ### `PlaceResult`
 * One reader's read of one place:  its rows, and what it knows about them.
 * - A `Loadable`, since one read is one resource:  `contents`, `load()`, `isLoaded`, `isLoading` and `loadError` are
 *   its, and aborting comes with them.
 * - Only `status` is new here.
 * - Asks for its place by name each time it loads, so it reads whichever place is behind the name by then.
 * - Each row of a place that names its ids is the cache's ONE row for it, when the read has a `type`.
 *   - With no id or no type, the rows stay inside this result.
 * - Readers of one list share one request (`PlaceReads`), and what the place can't do is done for it (`PlaceQuery`).
 *   It says what the place did:  `handled`.
 * - `leave()` when nothing shows it any more:  the last reader leaving aborts the read.
 *   - Inside a Solid memo:  `onCleanup(() => result.leave())`, as Solid hands a memo no abort signal.
 * - A refresh that fails leaves the rows there, and says so:  `"couldn't update"`.
 * - NEVER saves:  changes go through `Places.pendingFor()`, not through a result.
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
  /** Which of the reads that only the newest counts it's one of:  see `PlaceResultProps`. */
  readonly newestWins: string | undefined
  /** The list of places, and the cache:  STATIC for the result's life. */
  private readonly places: Places

  constructor(
    { placeName, collection, type, query = {}, newestWins }: PlaceResultProps,
    { places }: PlaceResultContext
  ) {
    super()
    this.placeName = placeName
    this.collection = collection
    this.type = type
    this.query = query
    this.newestWins = newestWins
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
   * - A read that failed with no rows to show:  none of these;  `loadError` says why.
   */
  get status(): ResultStatus | undefined {
    const isFromEarlierVisit = this.getState("isFromEarlierVisit")
    if (this.isLoading) return isFromEarlierVisit ? "from an earlier visit" : "still waiting"
    if (this.loadError) return this.contents ? "couldn't update" : undefined
    if (isFromEarlierVisit) return "from an earlier visit"
    return this.isLoaded ? "complete" : "still waiting"
  }

  /** Rows on screen are worth more than none:  a failed refresh leaves them, beside its `loadError`. */
  protected get keepsContentsOnFailedLoad(): boolean {
    return true
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

  /** What the place, or the engine, wants known about these rows, in words:  see `ListAnswer.notes`. */
  get notes(): readonly string[] {
    return this.answer?.notes ?? []
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
   * - `answer`:  what the place said with those rows, if that was kept too.
   */
  showFromEarlierVisit(rows: PlaceRow[], answer?: Omit<ListAnswer, "rows">): this {
    this.contents = this.rowsKept(rows, this.place, "write them", this.query)
    this.setState("isFromEarlierVisit", true)
    if (answer) this.setState("answer", answer)
    return this
  }

  /** New rows, or none:  so what it said about the old ones no longer holds. */
  onContentsUpdated() {
    this.resetState("isFromEarlierVisit")
    if (!this.contents) this.resetState("answer")
  }

  /** Back to nothing read:  see `Loadable.unload()`. */
  unload() {
    this.places.reads.release(this)
    this.resetState("isFromEarlierVisit", "answer")
    return super.unload()
  }

  /**
   * Nothing shows this any more:  it stops reading.
   * - The last reader of a read leaving aborts it, if it's still under way;
   *   a read that finished is kept a while, for a quick return (`PlaceReads`).
   * - Its rows stay here, for whatever's still holding them.
   * - Safe to call twice.
   */
  leave(): this {
    this.stopInflightLoadOrSave()
    this.places.reads.release(this)
    return this
  }

  /**
   * The place behind its name changed for a whole other one:  it reads that, and what it had doesn't stand.
   * - What's here shows until the answer comes, so nothing flashes empty.
   * - A failed read leaves no rows:  the old place's would show as if the new one had said them.  `loadError` says why.
   * - NEVER throws.
   */
  async readAfterSwap(): Promise<void> {
    try {
      await this.reload()
    } catch (error) {
      if (this.contents !== undefined) {
        this.contents = undefined
        this.updateLoadState({ loadError: error as Error })
      }
    }
  }

  /** It's gone from the page:  it stops reading. */
  onRemove() {
    super.onRemove()
    this.places.reads.release(this)
  }

  ////////////////
  // ## Loading
  ////////////////

  /**
   * As `Loadable.load()`, following nothing:  a read made inside a memo mustn't re-run it as its own state changes.
   */
  load(query?: ListQuery) {
    return untrackCells(() => super.load(query))
  }

  /**
   * As `Loadable.reload()`, and it really asks the place:  it doesn't join an answer other readers already have.
   * - Other readers' rows change too, when the place has told them apart by id.
   */
  reload(query: ListQuery | undefined = this.loadState.loadParams) {
    this.wantsFreshAnswer = true
    try {
      return untrackCells(() => super.reload(query))
    } finally {
      this.wantsFreshAnswer = false
    }
  }
  /** Inside `reload()`:  so `getLoader()` knows, since `Loadable` calls it the same way either way. */
  private wantsFreshAnswer = false

  /**
   * This reader's share of the read:  one request, however many readers.
   * - `query`:  what `load()` was handed;  left out, `this.query`.
   * - `signal` aborting ends only this reader's wait;  an answer after that touches nothing.
   */
  async getLoader(query: ListQuery | undefined, signal: AbortSignal): Promise<PlaceRow[]> {
    const { place, placeName, collection } = this
    const { answer, wasAlreadyAnswered } = this.places.reads.answerFor(this, {
      placeName,
      place,
      collection,
      query: query ?? this.query,
      isFresh: this.wantsFreshAnswer,
      signal
    })
    const { rows, ...rest } = await answer
    if (signal.aborted) return []
    this.setState("answer", rest)
    const kept = this.rowsKept(rows, place, wasAlreadyAnswered ? "only new ones" : "write them", query ?? this.query)
    this.places.reads.noteRows(this, kept)
    return kept
  }

  /** NEVER saves.  - throws `TypeError`, always */
  getSaver(): Promise<never> {
    throw new TypeError(`PlaceResult.save():  a result can't be saved;  Places.pendingFor() takes changes instead`)
  }

  /**
   * `rows`, each the cache's ONE row for its id:  as they are when they share no identity.
   * - `"only new ones"`:  the answer may be old, as when joining a read that finished a while ago.
   *   A row we already hold keeps its fields:  another read may have brought fresher ones.
   * - What's pending sits on top of what's read (`PendingChanges.replayOn()`), so you read your own writes.
   */
  private rowsKept(
    answered: PlaceRow[],
    place: Place,
    writing: "write them" | "only new ones",
    query: ListQuery
  ): PlaceRow[] {
    const { type } = this
    const { cache } = this.places
    const { idOf } = place.describe()
    const rows = this.places.pendingIfAny(this.placeName)?.replayOn(this.collection, answered, query) ?? answered
    if (type === undefined || idOf === undefined) return [...rows]
    return rows.map((row) => {
      const id = idOfRow(row, idOf)
      if (id === undefined) return row
      return (
        (writing === "only new ones" && cache.rowFor(type, id)) || this.places.keepRow(this.placeName, type, id, row)
      )
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
  /**
   * A name for reads where only the newest counts, e.g. a search as you type:  `"recipe search"`.
   * - A newer read by that name aborts the one under way, and the older keeps the rows it had.
   * - Left out:  reads don't touch each other.
   */
  newestWins?: string
}

/** What a `PlaceResult` is given to work with. */
export type PlaceResultContext = {
  /** The list of places it finds its place in, and the cache. */
  places: Places
}
