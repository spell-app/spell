import {
  PlaceError,
  canDoAll,
  type ListAnswer,
  type ListHandled,
  type ListQuery,
  type Place,
  type PlaceCeiling,
  type PlaceRow,
  type SortField
} from "./places.types"

/** How much the engine loads in the browser for a place that doesn't say otherwise (`PlaceCapabilities.ceiling`). */
export const DEFAULT_CEILING: PlaceCeiling = { rows: 50_000, bytes: 50 * 1024 * 1024 }

/****************
 * ### `PlaceQuery`
 * One query, answered in full:  what the place did, and what it didn't, done here, the same way for every place.
 * - The place is asked first, and its answer's `handled` says what's left.
 *   - Only `select` left:  the fields nobody asked for are hidden, and the place's own paging stands.
 *   - A filter or a sort left:  it loads the place's pages here, up to a ceiling, then filters, sorts and slices them.
 * - What it expects to do comes from `describe()`, so what it asks the place holds what it'll need:
 *   a place that can't filter is asked for whole rows, with no page of its own.
 *   - Then `nextPage` is a place in the filtered list, not the place's own cursor:  a reader only hands it back, and the
 *     place's own cursors stay in here, walking its pages (a cursor-paged API fits).
 * - The ceiling is `PlaceCapabilities.ceiling`, over `DEFAULT_CEILING`:  past it, a `PlaceError` naming the place.
 * - A row keeps its id field through `select`:  it's what makes it one row, in `PlaceCache`.
 * - Stops between pages when `signal` aborts, even for a place that ignores it.
 * - Knows nothing of readers or the cache:  `PlaceReads` runs one of these per request.
 ****************/
export class PlaceQuery {
  /** The name it's known by:  what the ceiling's error says. */
  private readonly placeName: string
  /** The place asked. */
  private readonly place: Place
  /** The collection asked for. */
  private readonly collection: string
  /** What's wanted. */
  private readonly query: ListQuery
  /** What the place is asked for:  `query`, less what can't be left to it. */
  private readonly ask: ListQuery

  constructor({ placeName, place, collection, query }: PlaceQueryProps) {
    this.placeName = placeName
    this.place = place
    this.collection = collection
    this.query = query
    this.ask = this.askFor(query)
  }

  /**
   * The answer to the query, with `handled` still saying what the place did itself.
   * - throws whatever the place threw;  `signal`'s reason once it aborts;
   *   `PlaceError` over the ceiling, or `TypeError` for a page that isn't a place in the filtered list
   */
  async answer(signal: AbortSignal): Promise<ListAnswer> {
    let first = await this.list(this.ask, signal)
    const { filter, sort, page } = this.query
    const { handled } = first
    const isFiltering = !!filter && !!Object.keys(filter).length && !handled.filter
    const isSorting = !!sort?.length && !handled.sort
    const isSlicing = !!page && (!this.ask.page || isFiltering || isSorting)
    if (!isFiltering && !isSorting && !isSlicing) {
      return { ...first, rows: this.withSelection(first.rows, handled) }
    }

    const start = page?.at === undefined ? 0 : Number(page.at)
    if (Number.isNaN(start)) {
      throw new TypeError(`PlaceQuery.answer():  page "${page!.at}" isn't a place in the list;  use its \`nextPage\``)
    }
    const end = page?.size === undefined ? undefined : start + page.size
    // it said it could, and didn't:  what it answered is only one page, so start over from the place's first
    if (this.ask.page) {
      const { page: _page, ...unpaged } = this.ask
      first = await this.list(unpaged, signal)
    }

    ////// Every page it needs, each filtered as it comes
    const seen = { rows: 0, bytes: 0 }
    const rows: PlaceRow[] = []
    for (let answer = first; ; answer = await this.list({ ...this.ask, page: { at: answer.nextPage! } }, signal)) {
      this.countAgainstCeiling(answer.rows, seen)
      for (const row of isFiltering ? rowsMatching(answer.rows, filter) : answer.rows) rows.push(row)
      // with no sort left, the first rows we've got are the first rows there are
      const hasEnough = !isSorting && end !== undefined && rows.length > end
      if (!answer.nextPage || hasEnough) break
    }

    ////// What's left of the query
    const ordered = isSorting ? rowsInOrder(rows, sort) : rows
    const sliced = isSlicing ? ordered.slice(start, end) : ordered
    return {
      rows: this.withSelection(sliced, handled),
      ...(isSlicing && end !== undefined && end < ordered.length && { nextPage: String(end) }),
      ...(first.version !== undefined && { version: first.version }),
      handled
    }
  }

  /** One `list()` of the place.  - throws once `signal` has aborted, even if the place answered */
  private async list(query: ListQuery, signal: AbortSignal): Promise<ListAnswer> {
    const answer = await this.place.list(this.collection, query, { signal })
    signal.throwIfAborted()
    return answer
  }

  /** What to ask the place for `query`:  see the class. */
  private askFor(query: ListQuery): ListQuery {
    const { filter = {}, sort = [], select, page } = query
    const { filter: canFilter, sort: canSort, page: pageKind } = this.place.describe()
    const fields = sort.map(({ field }) => field)
    const isLeftToUs = !canDoAll(canFilter, Object.keys(filter)) || !canDoAll(canSort, fields)
    if (isLeftToUs && (select || page)) {
      const { select: _select, page: _page, ...whole } = query
      return whole
    }
    if (page && pageKind === "none") {
      const { page: _page, ...unpaged } = query
      return unpaged
    }
    return query
  }

  /** `rows`, with only the fields asked for and their id:  as they are if the place did it, or nobody asked. */
  private withSelection(rows: PlaceRow[], handled: ListHandled): PlaceRow[] {
    const { select } = this.query
    if (!select || handled.select) return rows
    const { idOf } = this.place.describe()
    const fields = idOf === undefined ? select : [...select, idOf]
    return rows.map((row) => rowWithFields(row, fields))
  }

  /** Add `rows` to what's been `seen`.  - throws `PlaceError` once that's over the ceiling */
  private countAgainstCeiling(rows: PlaceRow[], seen: PlaceCeiling): void {
    const { rows: mostRows, bytes: mostBytes } = { ...DEFAULT_CEILING, ...this.place.describe().ceiling }
    seen.rows += rows.length
    for (const row of rows) seen.bytes += JSON.stringify(row).length
    if (seen.rows <= mostRows && seen.bytes <= mostBytes) return
    const limit = seen.rows > mostRows ? `${mostRows} rows` : `${mostBytes} bytes`
    throw new PlaceError(
      `PlaceQuery:  "${this.placeName}" can't do this read of "${this.collection}" itself, and doing it here stops at ${limit};  ask for less, or raise its \`ceiling\``,
      { cause: { kind: "over the ceiling" } }
    )
  }
}

/** Constructor props of a `PlaceQuery`. */
export type PlaceQueryProps = {
  /** The name the place is known by. */
  placeName: string
  /** The place. */
  place: Place
  /** The collection to read. */
  collection: string
  /** What's wanted. */
  query: ListQuery
}

////////////////
// ## Doing a query to rows
////////////////

/** The `rows` whose field holds this value, for every field in `filter`. */
export function rowsMatching(rows: PlaceRow[], filter: Record<string, unknown>): PlaceRow[] {
  const wanted = Object.entries(filter)
  return rows.filter((row) => wanted.every(([field, value]) => row[field] === value))
}

/** A copy of `rows`, in the order `sort` says:  the first field first. */
export function rowsInOrder(rows: PlaceRow[], sort: readonly SortField[]): PlaceRow[] {
  return [...rows].sort((one, other) => {
    for (const { field, descending } of sort) {
      const order = compareValues(one[field], other[field])
      if (order) return descending ? -order : order
    }
    return 0
  })
}

/** `row` with only these `fields`, the ones it has:  its values aren't copied. */
export function rowWithFields(row: PlaceRow, fields: readonly string[]): PlaceRow {
  return Object.fromEntries(fields.filter((field) => field in row).map((field) => [field, row[field]]))
}

/** Which of two field values comes first:  nothing comes after everything. */
function compareValues(one: unknown, other: unknown): number {
  if (one === other) return 0
  if (one === undefined) return 1
  if (other === undefined) return -1
  return (one as string) < (other as string) ? -1 : 1
}
