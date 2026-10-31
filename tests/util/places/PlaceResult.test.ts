import { describe, expect, test } from "vite-plus/test"

import {
  MemoryPlace,
  Places,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceContext
} from "spell/util/places"

/** A place that answers only when the test says so, so a read can be caught while it's waiting. */
class HeldPlace implements Place {
  /** Each `list()` so far, oldest first. */
  asks: {
    query: ListQuery
    signal: AbortSignal | undefined
    answer: (answer: Partial<ListAnswer>) => void
    fail: (error: Error) => void
  }[] = []

  constructor(private readonly capabilities: Partial<PlaceCapabilities> = {}) {}

  /** A place that names its ids, and nothing else matters here. */
  describe(): PlaceCapabilities {
    return {
      idOf: "id",
      filter: "none",
      sort: "none",
      select: "none",
      page: "none",
      write: "none",
      atomic: false,
      live: "none",
      abort: "soft",
      ...this.capabilities
    }
  }

  /** Waits for the test.  Never looks at `signal`, as a place with a soft abort doesn't. */
  list(_collection: string, query: ListQuery, { signal }: PlaceContext): Promise<ListAnswer> {
    return new Promise((resolve, reject) => {
      this.asks.push({
        query,
        signal,
        answer: (answer) => resolve({ rows: [], handled: {}, ...answer }),
        fail: reject
      })
    })
  }
}

/** A result reading `place`, cached as `Recipe`. */
function readOf(place: Place, query?: ListQuery) {
  const places = new Places().add("cookbook", place)
  return places.read({
    placeName: "cookbook",
    collection: "recipes",
    type: "Recipe",
    ...(query && { query })
  })
}

describe("PlaceResult.status", () => {
  test("still waiting, then complete", async () => {
    const place = new HeldPlace()
    const result = readOf(place)
    expect(result.status).toBe("still waiting")
    const loading = result.load()
    expect(result.status).toBe("still waiting")
    expect(result.isLoading).toBe(true)
    place.asks[0]!.answer({ rows: [{ id: "r-1" }] })
    await loading
    expect(result.status).toBe("complete")
    expect(result.contents).toEqual([{ id: "r-1" }])
    expect(result.isLoaded).toBe(true)
  })

  test("from an earlier visit, right through a fresh read, until the place answers", async () => {
    const place = new HeldPlace()
    const result = readOf(place)
    result.showFromEarlierVisit([{ id: "r-1", title: "Soup" }])
    expect(result.status).toBe("from an earlier visit")
    expect(result.isLoaded).toBe(true)

    const reloading = result.reload()
    expect(result.status).toBe("from an earlier visit")
    expect(result.isLoading).toBe(true)
    expect(result.contents).toMatchObject([{ title: "Soup" }])

    place.asks[0]!.answer({ rows: [{ id: "r-1", title: "Stew" }] })
    await reloading
    expect(result.status).toBe("complete")
    expect(result.contents).toMatchObject([{ title: "Stew" }])
  })

  test("still waiting on a refresh of what's already complete", async () => {
    const place = new HeldPlace()
    const result = readOf(place)
    const loading = result.load()
    place.asks[0]!.answer({})
    await loading
    const reloading = result.reload()
    expect(result.status).toBe("still waiting")
    place.asks[1]!.answer({})
    await reloading
    expect(result.status).toBe("complete")
  })

  test("a failed read says none of them, and `loadError` says why", async () => {
    const place = new HeldPlace()
    const result = readOf(place)
    const loading = result.load()
    const error = new Error("the place is down")
    place.asks[0]!.fail(error)
    await expect(loading).rejects.toBe(error)
    expect(result.status).toBeUndefined()
    expect(result.loadError).toBe(error)
    expect(result.isLoaded).toBe(false)
  })

  test("a retry after a failure waits, then clears the failure", async () => {
    const place = new HeldPlace()
    const result = readOf(place)
    const loading = result.load()
    place.asks[0]!.fail(new Error("the place is down"))
    await expect(loading).rejects.toThrow()
    const retrying = result.load()
    expect(result.status).toBe("still waiting")
    place.asks[1]!.answer({})
    await retrying
    expect(result.status).toBe("complete")
    expect(result.loadError).toBeUndefined()
  })

  test("unload() goes back to nothing known", async () => {
    const result = readOf(new MemoryPlace({ collections: { recipes: [{ id: "r-1" }] } }))
    await result.load()
    result.unload()
    expect(result.status).toBe("still waiting")
    expect(result.handled).toBeUndefined()
    expect(result.contents).toBeUndefined()
  })
})

describe("PlaceResult.load()", () => {
  test("hands the place its query and says what the place answered", async () => {
    const place = new HeldPlace()
    const query = { filter: { kind: "hot" } }
    const result = readOf(place, query)
    const loading = result.load()
    expect(place.asks[0]!.query).toBe(query)
    place.asks[0]!.answer({ nextPage: "2", version: "7", handled: { filter: true } })
    await loading
    expect({ nextPage: result.nextPage, version: result.version, handled: result.handled }).toEqual({
      nextPage: "2",
      version: "7",
      handled: { filter: true }
    })
  })

  test("a NEWER query aborts the older read, and the newest wins even when the old one answers last", async () => {
    const place = new HeldPlace()
    const result = readOf(place)
    const older = result.load({ filter: { title: "so" } })
    const newer = result.load({ filter: { title: "sou" } })
    expect(place.asks[0]!.signal!.aborted).toBe(true)
    expect(place.asks[1]!.signal!.aborted).toBe(false)

    place.asks[1]!.answer({ rows: [{ id: "new" }], version: "2" })
    await newer
    place.asks[0]!.answer({ rows: [{ id: "old" }], version: "1" })
    await older
    expect(result.contents).toEqual([{ id: "new" }])
    expect(result.version).toBe("2")
  })

  test("the signal is NOT aborted once a read has finished", async () => {
    const place = new HeldPlace()
    const result = readOf(place)
    const loading = result.load()
    place.asks[0]!.answer({})
    await loading
    expect(place.asks[0]!.signal!.aborted).toBe(false)
  })

  test("a stale answer puts NOTHING in the cache", async () => {
    const place = new HeldPlace()
    const places = new Places().add("cookbook", place)
    const result = places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
    const loading = result.load()
    result.stopInflightLoadOrSave()
    place.asks[0]!.answer({ rows: [{ id: "r-1" }] })
    await loading
    expect(places.cache.rowFor("Recipe", "r-1")).toBeUndefined()
  })

  test("a place with no ids shares no identity:  its rows stay inside the result", async () => {
    const places = new Places().add("sheet", new HeldPlace({ idOf: undefined }))
    const place = places.placeForOrDie("sheet") as HeldPlace
    const result = places.read({ placeName: "sheet", collection: "rows", type: "Row" })
    const loading = result.load()
    place.asks[0]!.answer({ rows: [{ id: "r-1" }] })
    await loading
    expect(result.contents).toEqual([{ id: "r-1" }])
    expect(places.cache.rowFor("Row", "r-1")).toBeUndefined()
  })

  test("a place name nobody has fails the read, rather than throwing at the caller", async () => {
    const result = new Places().read({ placeName: "nope", collection: "recipes" })
    await expect(result.load()).rejects.toThrow(/no place is named/)
    expect(result.loadError?.name).toBe("PlaceError")
  })
})

describe("PlaceResult.save()", () => {
  test("a result NEVER saves", async () => {
    const result = readOf(new MemoryPlace())
    await expect(result.save({})).rejects.toThrow(/can't be saved/)
  })
})
