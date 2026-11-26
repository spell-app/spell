import type { ListAnswer, ListQuery, Place, PlaceContext } from "spell/places/places.types"

/** How many rows a page holds, when the page asks no size:  the first rows of a big sheet in one round trip. */
export const SERVER_PAGE_SIZE = 100

/** How long a read is held for its next page, after it was last asked:  5 minutes. */
const HELD_FOR_MS = 5 * 60 * 1000

/** Between a page token's read and its position:  `<read>:<position>`. */
const TOKEN_SEPARATOR = ":"

/****************
 * ### `ServerPages`
 * A list read whole once, and answered a page at a time, for a place that can't page by itself:  a sheet, a folder
 * (epic `data` P57).
 * - So the first rows of a 10,000-row sheet cross in one round trip, and the rest come as a page asks for them.
 * - The read is held for its later pages, so a row added between two pages doesn't make one show twice or go missing.
 *   - A first page is always read afresh:  asking again (a check) sees what changed.
 *   - Sharing one read among people asking at the same moment is epic `data`'s Hearing Of Changes.
 * - A page's token names that read and where it got to, `<read>:<position>`.
 *   Its read gone (5 minutes unused, or the server restarted):  the list is read again, and answered from that position.
 * - A place that pages itself, or a query that names its own page in the place's terms, is asked as it is:
 *   `answerFor()` hands back `undefined`, and `PlaceServer` asks the place.
 * - Node only, no HTTP:  `PlaceServer` holds one.
 ****************/
export class ServerPages {
  /** Each read held, by its id. */
  private readonly reads = new Map<string, HeldRead>()
  /** The last read's number, for the next id. */
  private lastRead = 0

  /** Rows in a page, when it asks no size. */
  constructor(private readonly pageSize = SERVER_PAGE_SIZE) {}

  /**
   * One page of `collection`, from the read `query` names, else a new read:  for a place that can't page (see the class).
   * - `undefined`:  the place pages itself;  ask it.
   * - throws what the place threw
   */
  async answerFor(
    { place, placeName, collection, query, context }: PagedAsk,
    now = Date.now()
  ): Promise<ListAnswer | undefined> {
    if (place.describe().page !== "none") return undefined
    this.forgetOld(now)
    const { page = {}, ...whole } = query
    const size = page.size ?? this.pageSize
    // who's asking is part of what was read:  another person's next page is never someone else's rows
    const key = JSON.stringify([placeName, collection, whole, context.identity ?? null])
    const { readId, start } = this.tokenParts(page.at)
    const kept = readId === undefined ? undefined : this.reads.get(readId)
    const held = kept?.key === key ? kept : await this.readWhole({ place, collection, query: whole, context, key }, now)
    held.usedAt = now
    const { answer, id } = held
    const end = start + size
    const rows = answer.rows.slice(start, end)
    // the last page, or the only one:  nothing more will be asked of it
    if (end >= answer.rows.length) this.reads.delete(id)
    return {
      ...answer,
      rows,
      ...(end < answer.rows.length ? { nextPage: `${id}${TOKEN_SEPARATOR}${end}` } : { nextPage: undefined }),
      ...(answer.total === undefined && { total: answer.rows.length })
    }
  }

  /** Read the whole list, and hold it.  - throws what the place threw */
  private async readWhole(
    { place, collection, query, context, key }: Omit<PagedAsk, "placeName"> & { key: string },
    now: number
  ): Promise<HeldRead> {
    const answer = await place.list(collection, query, context)
    // a place saying "none" that answered a page all the same:  that page is the list as far as it goes
    const { nextPage: _nextPage, ...whole } = answer
    const id = `r${++this.lastRead}`
    const held: HeldRead = { id, key, answer: whole, usedAt: now }
    this.reads.set(id, held)
    return held
  }

  /** The read and the position a page's token names:  none, the first page.  A token not of its making:  position 0. */
  private tokenParts(at: string | undefined): { readId?: string; start: number } {
    if (at === undefined) return { start: 0 }
    const split = at.lastIndexOf(TOKEN_SEPARATOR)
    const start = Number(split < 0 ? at : at.slice(split + 1))
    const readId = split < 0 ? undefined : at.slice(0, split)
    return { ...(readId !== undefined && { readId }), start: Number.isInteger(start) && start > 0 ? start : 0 }
  }

  /** Let go of every read nobody's asked for in 5 minutes. */
  private forgetOld(now: number): void {
    for (const [id, held] of this.reads) {
      if (now - held.usedAt >= HELD_FOR_MS) this.reads.delete(id)
    }
  }
}

/** One page asked of `ServerPages.answerFor()`. */
export type PagedAsk = {
  /** The place. */
  place: Place
  /** Its name. */
  placeName: string
  /** The collection. */
  collection: string
  /** What's asked, its page included. */
  query: ListQuery
  /** The request's signal, and who's asking. */
  context: PlaceContext
}

/** A whole read, held for its pages. */
type HeldRead = {
  /** Its id, in each page's token. */
  id: string
  /** What it read, and for whom:  a token is good only for the same list, query and person. */
  key: string
  /** The whole answer. */
  answer: ListAnswer
  /** When a page of it was last asked. */
  usedAt: number
}
