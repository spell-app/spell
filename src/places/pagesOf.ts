import {
  PlaceError,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCeiling,
  type PlaceContext,
  type PlaceRow
} from "./places.types"

/** How much the engine loads in the browser for a place that doesn't say otherwise (`PlaceCapabilities.ceiling`). */
export const DEFAULT_CEILING: PlaceCeiling = { rows: 50_000, bytes: 50 * 1024 * 1024 }

/** One page of a list, as `pagesOf()` hands it on:  anything that says where the next one is. */
export type Page = {
  /** What to ask for next, as `PageAsk.at`.  Left out:  this is the last page. */
  nextPage?: string | undefined
}

/** Reads one page of a list:  `at` is the last page's `nextPage`, `undefined` for the first.  - throws what the read threw */
export type PageReader<P extends Page> = (at: string | undefined, signal: AbortSignal) => Promise<P>

/** What `pagesOf()` is told besides how to read a page. */
export type PagesOfOptions<P extends Page> = {
  /** Start after a page already read:  its `nextPage`.  Left out:  from the first page. */
  after?: string
  /** Stops it from outside, as `return()` does from the reader. */
  signal?: AbortSignal
  /** Counts what's read, and throws once it's over:  `ReadCeiling`. */
  ceiling?: ReadCeiling
  /** The rows of a page, for the ceiling.  Left out:  its `rows`, if it has them. */
  rowsOf?: (page: P) => readonly unknown[]
}

/**
 * A list's pages, one each time the reader asks for the next:  a plain async generator, `for await (const page of pagesOf(read))`.
 * - PULLED:  a page is read only when the reader asks for it, so a reader that stops after one reads one.
 * - Its `return()` (the reader stopping, a `break`) aborts the page in flight, as `signal` does:
 *   the next it would have read is never asked.
 * - Every page counts against `ceiling`, when it has one:  a plain read of every page too (epic `data` I11).
 * - NOT reactive, and knows nothing of things:  the program's read (`SavedRead`, in the parser's core) reads it,
 *   and so does `PlaceQuery`, walking a place's own pages.
 * - throws what `read` threw;  `PlaceError` over the ceiling
 */
export function pagesOf<P extends Page>(read: PageReader<P>, options: PagesOfOptions<P> = {}): AsyncGenerator<P, void> {
  const controller = new AbortController()
  const { signal } = options
  const stop = () => controller.abort(signal?.reason ?? new DOMException("Nobody reads these pages now", "AbortError"))
  if (signal?.aborted) stop()
  else signal?.addEventListener("abort", stop, { once: true })
  const pages = walk(read, options, controller.signal)
  // a return() waits its turn behind a next() still reading:  abort that read first, so it's at once
  const returning = pages.return.bind(pages)
  pages.return = (value) => {
    stop()
    signal?.removeEventListener("abort", stop)
    return returning(value)
  }
  return pages
}

/** `pagesOf()`'s walk:  page after page, until one has no `nextPage`. */
async function* walk<P extends Page>(
  read: PageReader<P>,
  { after, ceiling, rowsOf = rowsOfPage }: PagesOfOptions<P>,
  signal: AbortSignal
): AsyncGenerator<P, void> {
  let at = after
  for (;;) {
    signal.throwIfAborted()
    const page = await read(at, signal)
    signal.throwIfAborted()
    ceiling?.count(rowsOf(page))
    yield page
    if (page.nextPage === undefined) return
    at = page.nextPage
  }
}

/** A page's `rows`, if it has them. */
function rowsOfPage(page: Page): readonly unknown[] {
  const { rows } = page as { rows?: unknown }
  return Array.isArray(rows) ? rows : []
}

/**
 * `place`'s own pages of `collection`, as it answers `list()`:  `query`'s page, then each after it.
 * - `context.signal` stops it, as the reader leaving does.
 */
export function pagesOfList(
  place: Place,
  collection: string,
  query: ListQuery,
  context: PlaceContext,
  options: Omit<PagesOfOptions<ListAnswer>, "signal"> = {}
): AsyncGenerator<ListAnswer, void> {
  const { page } = query
  const read: PageReader<ListAnswer> = (at, signal) =>
    place.list(collection, at === undefined ? query : { ...query, page: { ...page, at } }, { ...context, signal })
  return pagesOf(read, {
    ...options,
    ...(page?.at !== undefined && options.after === undefined && { after: page.at }),
    ...(context.signal && { signal: context.signal })
  })
}

/****************
 * ### `ReadCeiling`
 * How much ONE read may load into the browser:  its rows and their bytes, counted page by page.
 * - The limit is the place's `PlaceCapabilities.ceiling`, over `DEFAULT_CEILING`.
 * - Past it, a `PlaceError` naming the place, `"over the ceiling"`.
 * - One per read:  `PlaceQuery`'s walk of a place's pages, and the program's read of every page.
 ****************/
export class ReadCeiling {
  /** What's been read so far. */
  private readonly seen: PlaceCeiling = { rows: 0, bytes: 0 }
  /** What it stops at. */
  private readonly limit: PlaceCeiling

  constructor(
    private readonly about: { placeName: string; collection: string; place: Place },
    /**
     * What's being done, for the error:  `"its place can't do"`, a filter or a sort the engine does here;
     * `"every page"`, a plain read of the whole list.
     */
    private readonly doing: "its place can't do" | "every page" = "its place can't do"
  ) {
    this.limit = { ...DEFAULT_CEILING, ...about.place.describe().ceiling }
  }

  /** Add `rows` to what's been read.  - throws `PlaceError` once that's over the ceiling */
  count(rows: readonly unknown[]): void {
    const { seen, limit } = this
    seen.rows += rows.length
    for (const row of rows) seen.bytes += JSON.stringify(row as PlaceRow).length
    if (seen.rows <= limit.rows && seen.bytes <= limit.bytes) return
    const over = seen.rows > limit.rows ? `${limit.rows} rows` : `${limit.bytes} bytes`
    const { placeName, collection } = this.about
    const what =
      this.doing === "every page"
        ? `"${placeName}":  reading every page of "${collection}" stops at ${over}`
        : `"${placeName}" can't do this read of "${collection}" itself, and doing it here stops at ${over}`
    throw new PlaceError(`PlaceQuery:  ${what};  ask for less, or raise its \`ceiling\``, {
      cause: { kind: "over the ceiling" }
    })
  }
}
