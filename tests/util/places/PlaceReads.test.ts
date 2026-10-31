import { describe, expect, test } from "vite-plus/test"

import { MemoryPlace, Places, type ListQuery, type Place, type PlaceResultProps } from "spell/util/places"

import { HeldPlace, SlowPlace } from "./fakePlaces"

/** A cookbook of two recipes, behind a wrapper the test lets through. */
function cookbook() {
  const place = new SlowPlace(
    new MemoryPlace({
      collections: {
        recipes: [
          { id: "r-1", title: "Soup" },
          { id: "r-2", title: "Stew" }
        ]
      }
    })
  )
  return { place, places: new Places().add("cookbook", place) }
}

/** What to read of the cookbook. */
function recipes(extra: Partial<PlaceResultProps> = {}): PlaceResultProps {
  return { placeName: "cookbook", collection: "recipes", type: "Recipe", ...extra }
}

/** Places holding `place`, as the cookbook. */
function placesWith(place: Place) {
  return new Places().add("cookbook", place)
}

describe("PlaceReads, sharing", () => {
  test("two readers of one list share ONE request, and each gets the rows", async () => {
    const { place, places } = cookbook()
    const one = places.read(recipes())
    const other = places.read(recipes())
    const loads = [one.load(), other.load()]
    await place.letThrough()
    await Promise.all(loads)
    expect(place.listed).toBe(1)
    expect(one.contents).toHaveLength(2)
    expect(other.contents![0]).toBe(one.contents![0])
    expect(one.status).toBe("complete")
    expect(other.status).toBe("complete")
  })

  test("a reader who comes after the answer shares it too", async () => {
    const { place, places } = cookbook()
    const first = places.read(recipes())
    const loading = first.load()
    await place.letThrough()
    await loading
    const later = places.read(recipes())
    await later.load()
    expect(place.listed).toBe(1)
    expect(later.contents).toEqual(first.contents)
  })

  test("the order an object's fields were written in makes no difference;  a sort's order does", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const read = (query: ListQuery) => void places.read(recipes({ query })).load()
    read({ filter: { a: 1, b: 2 } })
    read({ filter: { b: 2, a: 1 } })
    expect(place.asks).toHaveLength(1)
    read({ sort: [{ field: "a" }, { field: "b" }] })
    read({ sort: [{ field: "b" }, { field: "a" }] })
    expect(place.asks).toHaveLength(3)
  })

  test("another collection, or another query, is another read", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    void places.read(recipes()).load()
    void places.read(recipes({ collection: "menus" })).load()
    void places.read(recipes({ query: { filter: { title: "Soup" } } })).load()
    expect(place.asks).toHaveLength(3)
  })

  test("reload() asks the place again, and the other readers' rows change with it", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const one = places.read(recipes())
    const other = places.read(recipes())
    const loads = [one.load(), other.load()]
    place.asks[0]!.answer({ rows: [{ id: "r-1", title: "Soup" }] })
    await Promise.all(loads)

    const reloading = one.reload()
    expect(place.asks).toHaveLength(2)
    expect(other.reload()).toBeDefined()
    expect(place.asks).toHaveLength(2)
    place.asks[1]!.answer({ rows: [{ id: "r-1", title: "Stew" }] })
    await reloading
    expect(other.contents).toMatchObject([{ title: "Stew" }])
  })

  test("joining an answer that may be old never takes back fresher fields", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const first = places.read(recipes())
    const loading = first.load()
    place.asks[0]!.answer({ rows: [{ id: "r-1", title: "Soup" }] })
    await loading

    // another list brings the row up to date
    const fresher = places.read(recipes({ query: { select: ["id", "title"] } }))
    const freshening = fresher.load()
    place.asks[1]!.answer({ rows: [{ id: "r-1", title: "Stew" }] })
    await freshening

    const later = places.read(recipes())
    await later.load()
    expect(place.asks).toHaveLength(2)
    expect(later.contents).toMatchObject([{ title: "Stew" }])
  })

  test("a failure is shared, and the next reader tries again", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const one = places.read(recipes())
    const other = places.read(recipes())
    const loads = [one.load(), other.load()]
    place.asks[0]!.fail(new Error("the place is down"))
    await expect(loads[0]).rejects.toThrow("the place is down")
    await expect(loads[1]).rejects.toThrow("the place is down")

    const later = places.read(recipes())
    const loading = later.load()
    expect(place.asks).toHaveLength(2)
    place.asks[1]!.answer({ rows: [{ id: "r-1" }] })
    await loading
    expect(later.status).toBe("complete")
  })
})

describe("PlaceReads, leaving", () => {
  test("the LAST reader leaving aborts the request;  one of two leaving doesn't", () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const one = places.read(recipes())
    const other = places.read(recipes())
    void one.load()
    void other.load()
    one.leave()
    expect(place.asks[0]!.signal!.aborted).toBe(false)
    other.leave()
    expect(place.asks[0]!.signal!.aborted).toBe(true)
  })

  test("a reader leaving ends only ITS wait:  the other still gets the rows", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const one = places.read(recipes())
    const other = places.read(recipes())
    const leaving = one.load()
    const staying = other.load()
    one.leave()
    await leaving
    expect(one.isLoading).toBe(false)
    expect(one.contents).toBeUndefined()

    place.asks[0]!.answer({ rows: [{ id: "r-1" }] })
    await staying
    expect(other.contents).toEqual([{ id: "r-1" }])
    expect(one.contents).toBeUndefined()
  })

  test("leaving twice takes away nobody else's share", () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const one = places.read(recipes())
    const other = places.read(recipes())
    void one.load()
    void other.load()
    one.leave().leave()
    expect(place.asks[0]!.signal!.aborted).toBe(false)
  })

  test("a read aborted by leaving puts nothing in the cache, even from a place that answers anyway", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const result = places.read(recipes())
    const loading = result.load()
    result.leave()
    place.asks[0]!.answer({ rows: [{ id: "r-1" }] })
    await loading
    await Promise.resolve()
    expect(places.cache.rowFor("Recipe", "r-1")).toBeUndefined()
    expect(result.contents).toBeUndefined()
  })

  test("after an abort, a new reader starts a new request", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const gone = places.read(recipes())
    void gone.load()
    gone.leave()
    const next = places.read(recipes())
    void next.load()
    expect(place.asks).toHaveLength(2)
    expect(place.asks[1]!.signal!.aborted).toBe(false)
  })

  test("leaving a read that finished aborts nothing", async () => {
    const place = new HeldPlace()
    const result = placesWith(place).read(recipes())
    const loading = result.load()
    place.asks[0]!.answer({})
    await loading
    result.leave()
    expect(place.asks[0]!.signal!.aborted).toBe(false)
  })
})

describe("PlaceReads, coming back", () => {
  /** A read of `query` that's finished, then left. */
  async function readAndLeave(places: Places, place: HeldPlace, query: ListQuery) {
    const result = places.read(recipes({ query }))
    const loading = result.load()
    place.asks.at(-1)!.answer({ rows: [{ id: `${JSON.stringify(query)}` }], version: "7" })
    await loading
    result.leave()
  }

  test("a released read comes back at once, saying it's from an earlier visit, and reload() asks again", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const first = places.read(recipes())
    const loading = first.load()
    place.asks[0]!.answer({ rows: [{ id: "r-1", title: "Soup" }], version: "7" })
    await loading
    first.leave()

    const back = places.read(recipes())
    expect(back.status).toBe("from an earlier visit")
    expect(back.contents).toMatchObject([{ title: "Soup" }])
    expect(back.version).toBe("7")
    await back.load()
    expect(place.asks).toHaveLength(1)

    const reloading = back.reload()
    expect(place.asks).toHaveLength(2)
    place.asks[1]!.answer({ rows: [{ id: "r-1", title: "Stew" }] })
    await reloading
    expect(back.status).toBe("complete")
    expect(back.contents).toMatchObject([{ title: "Stew" }])
  })

  test("about ten are kept:  the eleventh pushes out the oldest", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    for (let index = 0; index < 11; index++) await readAndLeave(places, place, { filter: { index } })
    expect(places.read(recipes({ query: { filter: { index: 0 } } })).status).toBe("still waiting")
    expect(places.read(recipes({ query: { filter: { index: 1 } } })).status).toBe("from an earlier visit")
  })

  test("coming back to one keeps it longer", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    for (let index = 0; index < 10; index++) await readAndLeave(places, place, { filter: { index } })
    places.read(recipes({ query: { filter: { index: 0 } } }))
    await readAndLeave(places, place, { filter: { index: 10 } })
    expect(places.read(recipes({ query: { filter: { index: 0 } } })).status).toBe("from an earlier visit")
    expect(places.read(recipes({ query: { filter: { index: 1 } } })).status).toBe("still waiting")
  })

  test("swap() drops what was kept from the old place, and nobody new shares its answers", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    await readAndLeave(places, place, {})
    const holding = places.read(recipes({ collection: "menus" }))
    const loading = holding.load()
    place.asks.at(-1)!.answer({ rows: [{ id: "m-1" }] })
    await loading

    places.swap("cookbook", new MemoryPlace({ collections: { menus: [{ id: "sample" }] } }))
    expect(places.read(recipes()).status).toBe("still waiting")
    const fresh = places.read(recipes({ collection: "menus" }))
    await fresh.load()
    expect(fresh.contents).toEqual([{ id: "sample" }])
    expect(holding.contents).toEqual([{ id: "m-1" }])
    holding.leave()
    expect(fresh.contents).toEqual([{ id: "sample" }])
  })
})

describe("PlaceResult.newestWins", () => {
  /** A read by the name, of what's typed so far. */
  function search(places: Places, title: string) {
    return places.read(recipes({ newestWins: "search", query: { filter: { title } } }))
  }

  test("a newer read by that name aborts the older, which keeps the rows it had", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const older = search(places, "so")
    const olderLoad = older.load()
    const newer = search(places, "sou")
    const newerLoad = newer.load()
    expect(place.asks[0]!.signal!.aborted).toBe(true)
    expect(place.asks[1]!.signal!.aborted).toBe(false)

    place.asks[1]!.answer({ rows: [{ id: "new" }] })
    await newerLoad
    place.asks[0]!.answer({ rows: [{ id: "old" }] })
    await olderLoad
    expect(newer.contents).toEqual([{ id: "new" }])
    expect(older.contents).toBeUndefined()
    expect(older.isLoading).toBe(false)
  })

  test("the older isn't touched once it has finished", async () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    const older = search(places, "so")
    const olderLoad = older.load()
    place.asks[0]!.answer({ rows: [{ id: "old" }] })
    await olderLoad
    void search(places, "sou").load()
    expect(older.contents).toEqual([{ id: "old" }])
    expect(older.status).toBe("complete")
  })

  test("reads by another name, or none, don't touch each other", () => {
    const place = new HeldPlace()
    const places = placesWith(place)
    void search(places, "so").load()
    void places.read(recipes({ newestWins: "other", query: { filter: { title: "a" } } })).load()
    void places.read(recipes({ query: { filter: { title: "b" } } })).load()
    expect(place.asks.map((ask) => ask.signal!.aborted)).toEqual([false, false, false])
  })

  test("one result handed a newer query:  the same, through `load()`", async () => {
    const place = new HeldPlace()
    const result = placesWith(place).read(recipes())
    void result.load({ filter: { title: "so" } })
    void result.load({ filter: { title: "sou" } })
    expect(place.asks[0]!.signal!.aborted).toBe(true)
    expect(place.asks[1]!.signal!.aborted).toBe(false)
  })
})
