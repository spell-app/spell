import { describe, expect, test, vi } from "vite-plus/test"

import { PlaceCache } from "spell/util/places"
import { flushCells, observe } from "spell/util/reactive"

describe("PlaceCache.keep()", () => {
  test("hands out ONE row per type and id, so a change appears in both", () => {
    const cache = new PlaceCache()
    const shownHere = cache.keep("Recipe", "r-12", { id: "r-12", title: "Soup" })
    const shownThere = cache.keep("Recipe", "r-12", { title: "Stew" })
    expect(shownThere).toBe(shownHere)
    expect(shownHere.title).toBe("Stew")
  })

  test("the same id of ANOTHER type is another row", () => {
    const cache = new PlaceCache()
    expect(cache.keep("Recipe", "1", {})).not.toBe(cache.keep("Person", "1", {}))
  })

  test("fields it isn't handed stay:  a read that selected only some takes nothing away", () => {
    const cache = new PlaceCache()
    cache.keep("Recipe", "r-12", { id: "r-12", title: "Soup" })
    expect({ ...cache.keep("Recipe", "r-12", { rating: 5 }) }).toEqual({ id: "r-12", title: "Soup", rating: 5 })
  })

  test("what read a field re-runs when it changes", () => {
    const row = new PlaceCache().keep("Recipe", "r-12", { title: "Soup" })
    const reader = vi.fn(() => row.title)
    const stop = observe(reader)
    new PlaceCache().keep("Recipe", "r-12", { title: "another cache's" })
    expect(reader).toHaveBeenCalledTimes(1)
    row.title = "Stew"
    flushCells()
    expect(reader).toHaveBeenCalledTimes(2)
    expect(reader).toHaveLastReturnedWith("Stew")
    stop()
  })

  test("an id a saved reference couldn't hold is fine here:  a place's ids are its own", () => {
    const cache = new PlaceCache()
    const row = cache.keep("Person", "owen@example.com", {})
    expect(cache.rowFor("Person", "owen@example.com")).toBe(row)
  })
})

describe("PlaceCache.rowFor()", () => {
  test("answers only what's held", () => {
    const cache = new PlaceCache()
    expect(cache.rowFor("Recipe", "r-12")).toBeUndefined()
    const row = cache.keep("Recipe", "r-12", {})
    expect(cache.rowFor("Recipe", "r-12")).toBe(row)
  })
})

describe("PlaceCache.forget()", () => {
  test("the next keep() makes a new row, and the old one hears nothing", () => {
    const cache = new PlaceCache()
    const old = cache.keep("Recipe", "r-12", { title: "Soup" })
    cache.forget("Recipe", "r-12")
    expect(cache.rowFor("Recipe", "r-12")).toBeUndefined()
    expect(cache.keep("Recipe", "r-12", { title: "Stew" })).not.toBe(old)
    expect(old.title).toBe("Soup")
  })
})
