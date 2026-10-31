import { describe, expect, test } from "vite-plus/test"

import {
  MemoryPlace,
  PlaceQuery,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceContext,
  type PlaceRow
} from "spell/util/places"

/** Five recipes, not in title order. */
const RECIPES: PlaceRow[] = [
  { id: "r-1", title: "Stew", kind: "hot" },
  { id: "r-2", title: "Salad", kind: "cold" },
  { id: "r-3", title: "Soup", kind: "hot" },
  { id: "r-4", title: "Gazpacho", kind: "cold" },
  { id: "r-5", title: "Curry", kind: "hot" }
]

/** What a place that can only hand over its rows can do. */
const NOTHING_BUT_ROWS: Partial<PlaceCapabilities> = { filter: "none", sort: "none", select: "none", page: "none" }

/**
 * A place that hands over its rows a page at a time, and does nothing else:  shaped like a chunked file or AT Protocol.
 * - Each `list()` is counted, and can see the signal, but never looks at it.
 */
class PagedPlace implements Place {
  /** Every `list()` so far. */
  asks: ListQuery[] = []
  /** Called after each `list()`:  so a test can abort between pages. */
  afterEach?: () => void

  constructor(
    private readonly rows: PlaceRow[],
    private readonly pageSize = 2,
    private readonly capabilities: Partial<PlaceCapabilities> = {}
  ) {}

  /** Cursor pages, and nothing else. */
  describe(): PlaceCapabilities {
    return {
      idOf: "id",
      filter: "none",
      sort: "none",
      select: "none",
      page: "cursor",
      write: "none",
      atomic: false,
      live: "none",
      abort: "soft",
      ...this.capabilities
    }
  }

  /** One page. */
  async list(_collection: string, query: ListQuery, _context: PlaceContext): Promise<ListAnswer> {
    this.asks.push(query)
    this.afterEach?.()
    const start = Number(query.page?.at ?? 0)
    const end = start + this.pageSize
    return {
      rows: this.rows.slice(start, end),
      ...(end < this.rows.length && { nextPage: String(end) }),
      version: `${this.asks.length}`,
      handled: {}
    }
  }
}

/** `query` of the recipes in `place`. */
function answerOf(place: Place, query: ListQuery, signal = new AbortController().signal) {
  return new PlaceQuery({ placeName: "cookbook", place, collection: "recipes", query }).answer(signal)
}

/** A memory place holding the recipes, doing only what `capabilities` say. */
function memoryPlace(capabilities: Partial<PlaceCapabilities> = NOTHING_BUT_ROWS) {
  return new MemoryPlace({ capabilities, collections: { recipes: RECIPES } })
}

/** The ids of `rows`. */
function idsOf({ rows }: ListAnswer) {
  return rows.map((row) => row.id)
}

describe("PlaceQuery.answer(), a place that does it all", () => {
  test("its answer as it is, with nothing loaded here", async () => {
    const answer = await answerOf(memoryPlace({}), {
      filter: { kind: "hot" },
      sort: [{ field: "title" }],
      select: ["title"],
      page: { size: 1 }
    })
    expect(answer.rows).toEqual([{ title: "Curry" }])
    expect(answer.nextPage).toBe("1")
    expect(answer.handled).toEqual({ filter: true, sort: true, select: true })
  })
})

describe("PlaceQuery.answer(), a place with no filter", () => {
  test("filters here, and says the place didn't", async () => {
    const answer = await answerOf(memoryPlace(), { filter: { kind: "cold" } })
    expect(idsOf(answer)).toEqual(["r-2", "r-4"])
    expect(answer.handled.filter).toBeUndefined()
  })

  test("loads every page to do it", async () => {
    const place = new PagedPlace(RECIPES)
    const answer = await answerOf(place, { filter: { kind: "hot" } })
    expect(idsOf(answer)).toEqual(["r-1", "r-3", "r-5"])
    expect(place.asks).toEqual([
      { filter: { kind: "hot" } },
      { filter: { kind: "hot" }, page: { at: "2" } },
      { filter: { kind: "hot" }, page: { at: "4" } }
    ])
    expect(answer.nextPage).toBeUndefined()
    expect(answer.version).toBe("1")
  })

  test("a page of the filtered list, whose nextPage walks on through it", async () => {
    const place = new PagedPlace(RECIPES)
    const first = await answerOf(place, { filter: { kind: "hot" }, page: { size: 2 } })
    expect(idsOf(first)).toEqual(["r-1", "r-3"])
    expect(first.nextPage).toBe("2")
    const second = await answerOf(place, { filter: { kind: "hot" }, page: { size: 2, at: first.nextPage! } })
    expect(idsOf(second)).toEqual(["r-5"])
    expect(second.nextPage).toBeUndefined()
  })

  test("stops loading pages once it has enough", async () => {
    const place = new PagedPlace(RECIPES)
    const answer = await answerOf(place, { filter: { kind: "hot" }, page: { size: 1 } })
    expect(idsOf(answer)).toEqual(["r-1"])
    expect(answer.nextPage).toBe("1")
    expect(place.asks).toHaveLength(2)
  })

  test("filtering by a field nobody selected:  the place is asked for whole rows", async () => {
    const answer = await answerOf(memoryPlace({ filter: "none", select: "every field" }), {
      filter: { kind: "cold" },
      select: ["title"]
    })
    expect(answer.rows).toEqual([
      { title: "Salad", id: "r-2" },
      { title: "Gazpacho", id: "r-4" }
    ])
  })

  test("a place that filters only some fields:  the rest is done here", async () => {
    const answer = await answerOf(memoryPlace({ filter: ["kind"], sort: "none", select: "none", page: "none" }), {
      filter: { title: "Soup" }
    })
    expect(idsOf(answer)).toEqual(["r-3"])
  })

  test("a page that isn't a place in the filtered list:  a clear error", async () => {
    await expect(answerOf(memoryPlace(), { filter: { kind: "hot" }, page: { at: "cursor-abc" } })).rejects.toThrow(
      /isn't a place in the list/
    )
  })
})

describe("PlaceQuery.answer(), what else a place can't do", () => {
  test("sorts here, across every page, the first field first", async () => {
    const answer = await answerOf(new PagedPlace(RECIPES), {
      sort: [{ field: "kind", descending: true }, { field: "title" }]
    })
    expect(idsOf(answer)).toEqual(["r-5", "r-3", "r-1", "r-4", "r-2"])
    expect(answer.handled.sort).toBeUndefined()
  })

  test("sorts before it slices", async () => {
    const answer = await answerOf(new PagedPlace(RECIPES), { sort: [{ field: "title" }], page: { size: 2 } })
    expect(idsOf(answer)).toEqual(["r-5", "r-4"])
    expect(answer.nextPage).toBe("2")
  })

  test("slices what a place with no pages hands over whole", async () => {
    const answer = await answerOf(memoryPlace(), { page: { size: 2, at: "1" } })
    expect(idsOf(answer)).toEqual(["r-2", "r-3"])
    expect(answer.nextPage).toBe("3")
  })

  test("hides the fields nobody asked for, keeping the id:  it's what makes it one row", async () => {
    const answer = await answerOf(memoryPlace(), { select: ["title"], filter: { kind: "cold" } })
    expect(answer.rows[0]).toEqual({ title: "Salad", id: "r-2" })
    const unfiltered = await answerOf(memoryPlace({ ...NOTHING_BUT_ROWS, page: "cursor" }), { select: ["title"] })
    expect(unfiltered.rows[0]).toEqual({ title: "Stew", id: "r-1" })
  })

  test("only a selection left:  the place's own paging stands", async () => {
    const answer = await answerOf(new PagedPlace(RECIPES), { select: ["title"], page: { size: 2 } })
    expect(answer.rows).toHaveLength(2)
    expect(answer.nextPage).toBe("2")
  })
})

describe("PlaceQuery.answer(), the ceiling", () => {
  test("over its rows:  an error naming the place", async () => {
    const place = new PagedPlace(RECIPES, 2, { ceiling: { rows: 3 } })
    const failure = answerOf(place, { filter: { kind: "hot" } })
    await expect(failure).rejects.toThrow(/"cookbook" can't do this read of "recipes" itself.*3 rows/)
    await expect(failure).rejects.toMatchObject({ name: "PlaceError", kind: "over the ceiling" })
    expect(place.asks).toHaveLength(2)
  })

  test("over its bytes:  the same", async () => {
    const place = new PagedPlace(RECIPES, 2, { ceiling: { bytes: 100 } })
    await expect(answerOf(place, { sort: [{ field: "title" }] })).rejects.toThrow(/"cookbook".*100 bytes/)
  })

  test("a place with no pages counts too", async () => {
    await expect(
      answerOf(memoryPlace({ ...NOTHING_BUT_ROWS, ceiling: { rows: 1 } }), { filter: { kind: "hot" } })
    ).rejects.toMatchObject({ kind: "over the ceiling" })
  })

  test("exactly at it is fine", async () => {
    const place = new PagedPlace(RECIPES, 2, { ceiling: { rows: RECIPES.length } })
    expect(await answerOf(place, { filter: { kind: "hot" } })).toMatchObject({ rows: { length: 3 } })
  })

  test("nothing's counted when the place did the work", async () => {
    const place = memoryPlace({ ceiling: { rows: 1 } })
    expect(idsOf(await answerOf(place, { filter: { kind: "hot" } }))).toEqual(["r-1", "r-3", "r-5"])
  })
})

describe("PlaceQuery.answer(), aborting", () => {
  test("stops between pages, for a place that ignores the signal", async () => {
    const controller = new AbortController()
    const place = new PagedPlace(RECIPES)
    place.afterEach = () => {
      if (place.asks.length === 2) controller.abort()
    }
    await expect(answerOf(place, { filter: { kind: "hot" } }, controller.signal)).rejects.toMatchObject({
      name: "AbortError"
    })
    expect(place.asks).toHaveLength(2)
  })
})

describe("PlaceQuery, a place's own cursors", () => {
  /** A place whose `nextPage` is no number, as a real cursor isn't.  What it can filter:  `capabilities`. */
  function cursors(capabilities: Partial<PlaceCapabilities>, handled: ListAnswer["handled"] = {}): Place {
    return {
      describe: () =>
        ({
          ...NOTHING_BUT_ROWS,
          page: "cursor",
          write: "none",
          atomic: false,
          live: "none",
          abort: "hard",
          idOf: "id",
          ...capabilities
        }) as PlaceCapabilities,
      async list(_collection, { page }) {
        const start = page?.at ? Number(page.at.slice(1)) : 0
        const end = start + 2
        return {
          rows: RECIPES.slice(start, end),
          ...(end < RECIPES.length && { nextPage: `p${end}` }),
          handled
        }
      }
    }
  }

  test("a place that does it all:  its cursor passes through, as it is", async () => {
    const place = cursors({ filter: "every field", sort: "every field" }, { filter: true, sort: true })
    const query = new PlaceQuery({ placeName: "p", place, collection: "c", query: { page: { at: "p2", size: 2 } } })
    expect((await query.answer(new AbortController().signal)).nextPage).toBe("p4")
  })

  test("a place that can't filter:  its cursors stay in here, and a reader's `nextPage` is a place in the filtered list", async () => {
    const asked = (at?: string) =>
      new PlaceQuery({
        placeName: "p",
        place: cursors({}),
        collection: "c",
        query: { filter: { kind: "hot" }, page: { size: 1, ...(at !== undefined && { at }) } }
      }).answer(new AbortController().signal)
    const first = await asked()
    expect(first).toMatchObject({ rows: [{ id: "r-1" }], nextPage: "1" })
    expect(await asked(first.nextPage)).toMatchObject({ rows: [{ id: "r-3" }], nextPage: "2" })
    expect(await asked("2")).toMatchObject({ rows: [{ id: "r-5" }] })
  })

  test("a place that says it can filter, and then doesn't:  it starts over from the first page, rather than count twice", async () => {
    const place = cursors({ filter: "every field" })
    const query = new PlaceQuery({
      placeName: "p",
      place,
      collection: "c",
      query: { filter: { kind: "hot" }, page: { at: "1", size: 1 } }
    })
    expect((await query.answer(new AbortController().signal)).rows).toMatchObject([{ id: "r-3" }])
  })

  test("a position that's no place in the list says so", async () => {
    const query = new PlaceQuery({
      placeName: "p",
      place: cursors({}),
      collection: "c",
      query: { filter: { kind: "hot" }, page: { at: "abc", size: 1 } }
    })
    await expect(query.answer(new AbortController().signal)).rejects.toThrow("isn't a place in the list")
  })
})
