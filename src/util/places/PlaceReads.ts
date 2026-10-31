import { LoadOnce } from "spell/util/LoadOnce"

import type { PlaceResult } from "./PlaceResult"
import { PlaceQuery, type PlaceQueryProps } from "./PlaceQuery"
import type { ListAnswer, ListQuery, PlaceRow } from "./places.types"

/****************
 * ### `PlaceReads`
 * The reads under way, or on screen:  readers of one collection and query share ONE request.
 * - A reader is a `PlaceResult`, which reads from its first `load()` until it `leave()`s.
 * - Each read has its own abort controller:
 *   - a reader leaving ends only its own wait
 *   - the LAST reader leaving aborts the request, if it's still under way
 * - A read that finished and has no readers left is RELEASED:  its rows are kept, about ten reads' worth,
 *   so coming back shows them at once, `"from an earlier visit"`.
 * - The answer per read is `LoadOnce`'s:  in flight or done, every reader the same promise;  a failure is forgotten.
 * - `newestWins` (`PlaceResultProps`):  a newer read by that name aborts the older.
 * - Knows nothing of how a query is done (`PlaceQuery`), or of the cache:  each reader keeps its own rows.
 * - One per `Places`.
 ****************/
export class PlaceReads {
  /** Each read's answer, by what it asks. */
  private readonly answers = new LoadOnce<string, ListAnswer>({ failures: "forgotten" })
  /** Each read with readers, by what it asks. */
  private readonly reads = new Map<string, SharedRead>()
  /** The read each reader is in. */
  private readonly readOfReader = new Map<PlaceResult, SharedRead>()
  /** What's kept of each released read, by what it asks:  the oldest first. */
  private readonly released = new Map<string, ReleasedRead>()
  /** The newest reader by each `newestWins` name. */
  private readonly newest = new Map<string, PlaceResult>()

  /**
   * `reader`'s share of the read `ask` names:  it leaves any read it was in, and joins this one, or starts it.
   * - `answer`:  ends early, with an `AbortError`, when `ask.signal` aborts;  that's the reader leaving.
   * - `wasAlreadyAnswered`:  it joined a read that had finished, so its rows may be old.
   * - `ask.isFresh`:  a read that had finished asks the place again;  one under way is fresh enough.
   */
  answerFor(reader: PlaceResult, ask: PlaceReadAsk): { answer: Promise<ListAnswer>; wasAlreadyAnswered: boolean } {
    this.supersedeOlderThan(reader)
    this.leaveRead(reader)

    const { isFresh, signal, ...query } = ask
    const asked = textOfAsk(query)
    this.released.delete(asked)
    let read = this.reads.get(asked)
    if (!read) this.reads.set(asked, (read = { asked, placeName: ask.placeName, readers: new Set() }))
    read.readers.add(reader)
    this.readOfReader.set(reader, read)
    signal.addEventListener("abort", () => this.leaveRead(reader), { once: true })

    const isUnderWay = !!read.controller
    const wasAlreadyAnswered = !isUnderWay && !isFresh && this.answers.has(asked)
    const started = read
    const answer = this.answers.get(asked, () => this.start(started, query), { fresh: isFresh && !isUnderWay })
    return { answer: LoadOnce.abortable(answer, signal), wasAlreadyAnswered }
  }

  /** `reader` made these rows of its read's answer:  what's kept once that read is released. */
  noteRows(reader: PlaceResult, rows: PlaceRow[]): void {
    const read = this.readOfReader.get(reader)
    if (read) read.rows = rows
  }

  /** `reader` is finished with everything:  see `PlaceResult.leave()`.  Safe to call twice. */
  release(reader: PlaceResult): void {
    this.leaveRead(reader)
    const { newestWins } = reader
    if (newestWins !== undefined && this.newest.get(newestWins) === reader) this.newest.delete(newestWins)
  }

  /** What's kept of the released read of this collection and query, if any:  now the last to be dropped. */
  releasedFor({ placeName, collection, query = {} }: ReadNamed): ReleasedRead | undefined {
    const asked = textOfAsk({ placeName, collection, query })
    const kept = this.released.get(asked)
    if (!kept) return undefined
    this.released.delete(asked)
    this.released.set(asked, kept)
    return kept
  }

  /**
   * The place behind `placeName` changed, so no new reader may share an answer from the old one.
   * - Readers already in those reads keep what they have, and what's under way reaches them.
   */
  forgetPlace(placeName: string): void {
    for (const read of [...this.reads.values()]) {
      if (read.placeName !== placeName) continue
      this.reads.delete(read.asked)
      this.answers.forget(read.asked)
    }
    for (const [asked, kept] of [...this.released]) {
      if (kept.placeName === placeName) this.released.delete(asked)
    }
  }

  /** Everyone reading from `placeName` now:  including one whose last read failed, as it's still waiting for rows. */
  readersOf(placeName: string): PlaceResult[] {
    return [...this.readOfReader].filter(([, read]) => read.placeName === placeName).map(([reader]) => reader)
  }

  ////////////////
  // ## Readers coming and going
  ////////////////

  /** Start `read`'s request:  a controller of its own, cleared when it settles, so it never aborts a finished one. */
  private start(read: SharedRead, query: PlaceQueryProps): Promise<ListAnswer> {
    const placeQuery = new PlaceQuery(query)
    const controller = new AbortController()
    read.controller = controller
    const answer = placeQuery.answer(controller.signal)
    const onSettled = () => {
      if (read.controller === controller) read.controller = undefined
    }
    answer.then(
      ({ rows: _rows, ...rest }) => {
        onSettled()
        read.answer = rest
      },
      // A failure isn't kept:  the next reader starts again, as `LoadOnce` has forgotten it too
      () => {
        onSettled()
        if (this.reads.get(read.asked) === read) this.reads.delete(read.asked)
      }
    )
    return answer
  }

  /** `reader` leaves its read, if it's in one:  the last to go ends it -- see the class. */
  private leaveRead(reader: PlaceResult): void {
    const read = this.readOfReader.get(reader)
    if (!read) return
    this.readOfReader.delete(reader)
    read.readers.delete(reader)
    if (read.readers.size) return
    read.controller?.abort()
    const wasUnderWay = !!read.controller
    read.controller = undefined
    // the place behind its name was swapped since, or it failed:  it's already gone
    if (this.reads.get(read.asked) !== read) return
    this.reads.delete(read.asked)
    this.answers.forget(read.asked)
    if (!wasUnderWay) this.keepReleased(read)
  }

  /** Keep what `read` found, dropping the oldest past `RELEASED_KEPT`. */
  private keepReleased({ asked, placeName, rows, answer }: SharedRead): void {
    if (!rows || !answer) return
    this.released.set(asked, { placeName, rows, answer })
    for (const oldest of this.released.keys()) {
      if (this.released.size <= RELEASED_KEPT) break
      this.released.delete(oldest)
    }
  }

  /** `reader` is the newest by its `newestWins` name:  an older one stops waiting, and keeps the rows it has. */
  private supersedeOlderThan(reader: PlaceResult): void {
    const { newestWins } = reader
    if (newestWins === undefined) return
    const older = this.newest.get(newestWins)
    this.newest.set(newestWins, reader)
    if (older && older !== reader) older.stopInflightLoadOrSave()
  }
}

/** One read shared by its readers. */
type SharedRead = {
  /** What it asks, as text:  `textOfAsk()`. */
  asked: string
  /** The name of the place it reads. */
  placeName: string
  /** Who's reading it. */
  readers: Set<PlaceResult>
  /** What aborts its request:  only while that's under way. */
  controller?: AbortController | undefined
  /** What the place last said, less its rows. */
  answer?: Omit<ListAnswer, "rows">
  /** The rows a reader last made of that answer. */
  rows?: PlaceRow[]
}

/** What's kept of a read nobody's reading any more. */
export type ReleasedRead = {
  /** The name of the place it read. */
  placeName: string
  /** Its rows. */
  rows: PlaceRow[]
  /** What the place said with them. */
  answer: Omit<ListAnswer, "rows">
}

/** What a reader asks of `PlaceReads.answerFor()`. */
export type PlaceReadAsk = PlaceQueryProps & {
  /** Ask the place again, rather than join an answer that's already here. */
  isFresh: boolean
  /** Aborted when this reader stops waiting. */
  signal: AbortSignal
}

/** Which read:  its place by name, its collection and its query. */
type ReadNamed = {
  /** The name of the place. */
  placeName: string
  /** The collection. */
  collection: string
  /** What's wanted.  Left out:  everything. */
  query?: ListQuery
}

/** About how many released reads to keep. */
const RELEASED_KEPT = 10

/**
 * What a read asks, as text, for telling reads apart.
 * - The same whatever order an object's fields were written in:  `{ a, b }` and `{ b, a }` are one filter.
 * - A list keeps its order:  a sort by `a` then `b` isn't a sort by `b` then `a`.
 */
function textOfAsk({ placeName, collection, query }: Required<ReadNamed>): string {
  return JSON.stringify([placeName, collection, query], (_key, value: unknown) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return value
    const fields = Object.entries(value as Record<string, unknown>)
    return Object.fromEntries(fields.sort(([one], [other]) => (one < other ? -1 : 1)))
  })
}
