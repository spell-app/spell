import type { ListAnswer, ListAsk, ListQuery, Place, PlaceContext } from "./places.types"

/****************
 * ### `PlaceBatch`
 * Lists asked for in the same moment, from a place that can answer several in one request, go in one request.
 * - What makes a page's first load one trip, where the place's own way of asking allows it (epic `data` P12).
 * - A place with no `listMany()` is asked as ever, at once:  a web service has one address per collection, so it can't.
 * - One list asked alone goes through `list()`, as it always did.
 * - Under `PlaceQuery`, which `PlaceReads` runs:  readers of one list still share one ask, and this joins different lists.
 * - Each ask has its own signal:  one leaving ends its own wait, and the request stops only when they've all gone.
 * - One per `PlaceReads`.
 ****************/
export class PlaceBatch {
  /** What's waiting to go, by place. */
  private readonly waiting = new Map<Place, QueuedList[]>()

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
    const asks = queued.filter(({ context, reject }) => {
      if (!context.signal?.aborted) return true
      reject(context.signal.reason)
      return false
    })
    if (!asks.length) return
    const [only] = asks
    if (asks.length === 1) {
      place.list(only!.collection, only!.query, only!.context).then(only!.resolve, only!.reject)
      return
    }
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
    try {
      const listed: ListAsk[] = asks.map(({ collection, query }) => ({ collection, query }))
      const answers = await place.listMany!(listed, { signal: controller.signal })
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
