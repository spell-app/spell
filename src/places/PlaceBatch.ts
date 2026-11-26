import {
  idOfRow,
  type ListAnswer,
  type ListAsk,
  type ListQuery,
  type Place,
  type PlaceContext,
  type PlaceRow,
  type SelectingContext
} from "./places.types"

/****************
 * ### `PlaceBatch`
 * Lists asked for in the same moment, from a place that can answer several in one request, go in one request.
 * - What makes a page's first load one trip, where the place's own way of asking allows it (epic `data` P12).
 * - A place with no `listMany()` is asked as ever, at once:  a web server has one address per collection, so it can't.
 * - One list asked alone goes through `list()`, as it always did.
 * - Under `PlaceQuery`, which `PlaceReads` runs:  readers of one list still share one ask, and this joins different lists.
 * - Each ask has its own signal:  one leaving ends its own wait, and the request stops only when they've all gone.
 * - And things asked for by id in the same moment, of one collection with the same fields, go in ONE `getMany()`
 *   (`getMany()`, epic `data` P57):  40 links followed are one request, where the place takes a list of ids
 *   (Spell's server, GraphQL, a web server that `gives many at once by "ids"`).
 * - One per `PlaceReads`.
 ****************/
export class PlaceBatch {
  /** What's waiting to go, by place. */
  private readonly waiting = new Map<Place, QueuedList[]>()
  /** Ids waiting to be asked for, by place, then by collection and fields. */
  private readonly waitingIds = new Map<Place, Map<string, QueuedIds[]>>()

  /**
   * The rows of `collection` with `ids`, asked of `place` with every other id asked for in the same moment.
   * - Each asker gets only its own ids' rows;  one it doesn't hold is left out, as `getMany()` does.
   * - throws what the place threw, or `context.signal`'s reason
   */
  getMany(place: Place, collection: string, ids: readonly string[], context: SelectingContext): Promise<PlaceRow[]> {
    if (!place.getMany) throw new TypeError("PlaceBatch.getMany():  this place can't look things up by id;  list it")
    return new Promise((resolve, reject) => {
      const key = `${collection}\n${JSON.stringify(context.select ?? null)}`
      let byKey = this.waitingIds.get(place)
      if (!byKey) {
        byKey = new Map()
        this.waitingIds.set(place, byKey)
        // a macrotask, as for lists:  every read started now has arrived by then
        setTimeout(() => void this.sendIds(place), 0)
      }
      const asks = byKey.get(key) ?? []
      asks.push({ collection, ids, context, resolve, reject })
      byKey.set(key, asks)
    })
  }

  /** Ask for the ids waiting for `place`, one `getMany()` for each collection and fields:  NEVER throws. */
  private async sendIds(place: Place): Promise<void> {
    const byKey = this.waitingIds.get(place) ?? new Map<string, QueuedIds[]>()
    this.waitingIds.delete(place)
    await Promise.all([...byKey.values()].map((asks) => this.sendIdsOf(place, asks)))
  }

  /** One `getMany()` for `queued`, asks of one collection and fields, each handed its own rows.  NEVER throws. */
  private async sendIdsOf(place: Place, queued: QueuedIds[]): Promise<void> {
    const asks = stillWaiting(queued)
    if (!asks.length) return
    const [first] = asks
    const { collection, context } = first!
    const ids = [...new Set(asks.flatMap((ask) => ask.ids))]
    const signal = signalWhileAnyWaits(asks)
    try {
      const rows = await place.getMany!(collection, ids, { ...(context.select && { select: context.select }), signal })
      const { idOf } = place.describe()
      const byId = new Map(rows.map((row) => [`${idOfRow(row, idOf)}`, row]))
      for (const { ids: own, resolve } of asks)
        resolve(
          own.flatMap((id): PlaceRow[] => {
            const row = byId.get(id)
            return row ? [row] : []
          })
        )
    } catch (error) {
      for (const { reject } of asks) reject(error)
    }
  }

  /** The answer to one list of `place`.  - throws what the place threw, or `context.signal`'s reason */
  list(place: Place, collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    if (!place.listMany) return place.list(collection, query, context)
    return new Promise((resolve, reject) => {
      const queued = this.waiting.get(place)
      const ask: QueuedList = { collection, query, context, resolve, reject }
      if (queued) {
        queued.push(ask)
        return
      }
      this.waiting.set(place, [ask])
      // a macrotask:  a read waits for promises on its way here, so every read started now has arrived by then
      setTimeout(() => void this.send(place), 0)
    })
  }

  /** Send what's waiting for `place`:  NEVER throws, each ask hears how it went. */
  private async send(place: Place): Promise<void> {
    const queued = this.waiting.get(place) ?? []
    this.waiting.delete(place)
    const asks = stillWaiting(queued)
    if (!asks.length) return
    const [only] = asks
    if (asks.length === 1) {
      place.list(only!.collection, only!.query, only!.context).then(only!.resolve, only!.reject)
      return
    }
    const signal = signalWhileAnyWaits(asks)
    try {
      const listed: ListAsk[] = asks.map(({ collection, query }) => ({ collection, query }))
      const answers = await place.listMany!(listed, { signal })
      asks.forEach(({ resolve }, index) => resolve(answers[index]!))
    } catch (error) {
      for (const { reject } of asks) reject(error)
    }
  }
}

/** One list waiting to go. */
type QueuedList = ListAsk & {
  /** What its reader's request carries. */
  context: PlaceContext
  /** Hands it its answer. */
  resolve: (answer: ListAnswer) => void
  /** Hands it what went wrong. */
  reject: (reason: unknown) => void
}

/** Ids of one collection waiting to go. */
type QueuedIds = {
  /** The collection. */
  collection: string
  /** Its asker's ids. */
  ids: readonly string[]
  /** What its asker's request carries:  its signal and the fields selected. */
  context: SelectingContext
  /** Hands it its rows. */
  resolve: (rows: PlaceRow[]) => void
  /** Hands it what went wrong. */
  reject: (reason: unknown) => void
}

/** What any ask carries:  its signal, and how it ends. */
type Waiting = { context: PlaceContext; reject: (reason: unknown) => void }

/** `queued`, less those whose reader left already:  each of those hears its signal's reason. */
function stillWaiting<Ask extends Waiting>(queued: readonly Ask[]): Ask[] {
  return queued.filter(({ context, reject }) => {
    if (!context.signal?.aborted) return true
    reject(context.signal.reason)
    return false
  })
}

/**
 * A signal for one request on behalf of `asks`:  each leaving ends its own wait, and the request stops only when they've
 * all gone.
 */
function signalWhileAnyWaits(asks: readonly Waiting[]): AbortSignal {
  const controller = new AbortController()
  const left = new Set(asks)
  for (const ask of asks) {
    ask.context.signal?.addEventListener(
      "abort",
      () => {
        ask.reject(ask.context.signal!.reason)
        left.delete(ask)
        if (!left.size) controller.abort()
      },
      { once: true }
    )
  }
  return controller.signal
}
