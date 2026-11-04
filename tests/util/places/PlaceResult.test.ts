import { describe, expect, test } from "vite-plus/test"

import { MemoryPlace, Places, type ListQuery, type Place } from "spell/util/places"

import { HeldPlace } from "./fakePlaces"

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

describe("PlaceResult, when a refresh fails (I2)", () => {
  /** A result showing Soup, its next read about to fail. */
  async function showingSoup() {
    const place = new HeldPlace()
    const result = readOf(place)
    const loading = result.load()
    place.asks[0]!.answer({ rows: [{ id: "r-1", title: "Soup" }] })
    await loading
    const failing = result.reload()
    place.asks[1]!.fail(new Error("the place is down"))
    await expect(failing).rejects.toThrow("the place is down")
    return { place, result }
  }

  test("keeps its rows, and says it couldn't update", async () => {
    const { result } = await showingSoup()
    expect(result.contents).toMatchObject([{ title: "Soup" }])
    expect(result.status).toBe("couldn't update")
    expect(result.loadError?.message).toBe("the place is down")
    expect(result.isLoaded).toBe(true)
  })

  test("the next load() tries again, and a success clears the failure", async () => {
    const { place, result } = await showingSoup()
    const retrying = result.load()
    expect(place.asks).toHaveLength(3)
    expect(result.status).toBe("still waiting")
    place.asks[2]!.answer({ rows: [{ id: "r-1", title: "Stew" }] })
    await retrying
    expect(result.contents).toMatchObject([{ title: "Stew" }])
    expect(result.status).toBe("complete")
    expect(result.loadError).toBeUndefined()
  })

  test("rows from an earlier visit stay too", async () => {
    const place = new HeldPlace()
    const result = readOf(place)
    result.showFromEarlierVisit([{ id: "r-1", title: "Soup" }])
    const failing = result.reload()
    place.asks[0]!.fail(new Error("offline"))
    await expect(failing).rejects.toThrow("offline")
    expect(result.contents).toMatchObject([{ title: "Soup" }])
    expect(result.status).toBe("couldn't update")
  })
})

describe("PlaceResult.load()", () => {
  test("hands the place its query and says what the place answered", async () => {
    const place = new HeldPlace({ filter: "every field" })
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
