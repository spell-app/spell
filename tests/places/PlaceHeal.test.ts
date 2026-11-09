import { describe, expect, test, vi } from "vite-plus/test"

import { MemoryPlace, Places, type ListAnswer, type ListQuery, type Place } from "spell/places"

/** One recipe, and the rows told to whoever shows them. */
function cookbook(
  place: Place = new MemoryPlace({ collections: { recipes: [{ id: "r-1", title: "Soup", serves: 2 }] } })
) {
  const places = new Places({ wait: 10_000 }).add("cookbook", place)
  const told = vi.fn()
  places.onRows(told)
  return { place, places, told }
}

const ask = { placeName: "cookbook", collection: "recipes", type: "Recipe" }

describe("PlaceHeal", () => {
  test("fetches the latest and replays what's pending on top", async () => {
    const { place, places, told } = cookbook()
    await (place as MemoryPlace).apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { serves: 8 } }])
    const pending = places.pendingFor("cookbook")
    pending.setField({ collection: "recipes", type: "Recipe", id: "r-1", field: "title", value: "Broth", was: "Soup" })
    told.mockClear()

    expect(await places.heal.heal(ask)).toBe(true)
    expect(places.cache.rowFor("Recipe", "r-1")).toMatchObject({ title: "Broth", serves: 8 })
    expect(told.mock.calls[0]![0].rows[0]).toMatchObject({ title: "Broth", serves: 8 })
    pending.queue.done()
  })

  test("asked for ids, says which the place no longer holds, and forgets their rows", async () => {
    const { places, told } = cookbook()
    places.cache.keep("Recipe", "gone", { title: "Old" })
    await places.heal.heal({ ...ask, ids: ["r-1", "gone"] })
    expect(told.mock.calls[0]![0].removed).toEqual(["gone"])
    expect(places.cache.rowFor("Recipe", "gone")).toBeUndefined()
  })

  test("a place with no `getMany` is listed, for the same answer", async () => {
    const inner = new MemoryPlace({ collections: { recipes: [{ id: "r-1", title: "Soup" }] } })
    const { places, told } = cookbook({ describe: () => inner.describe(), list: (...ask) => inner.list(...ask) })
    await places.heal.heal({ ...ask, ids: ["r-1"] })
    expect(told.mock.calls[0]![0].rows).toEqual([{ id: "r-1", title: "Soup" }])
  })

  test("a heal with no ids reads every page of a paged place", async () => {
    const pages: Record<string, ListAnswer> = {
      first: { rows: [{ id: "r-1" }], nextPage: "two", handled: {} },
      two: { rows: [{ id: "r-2" }], nextPage: "three", handled: {} },
      three: { rows: [{ id: "r-3" }], handled: {} }
    }
    const { places, told } = cookbook({
      describe: () => new MemoryPlace().describe(),
      list: (_collection, query) => Promise.resolve(pages[query.page?.at ?? "first"]!)
    })
    await places.heal.heal(ask)
    expect(told.mock.calls[0]![0].rows.map((row: { id: string }) => row.id)).toEqual(["r-1", "r-2", "r-3"])
  })

  test("a heal of a few ids stops reading pages once it has them", async () => {
    const pages: Record<string, ListAnswer> = {
      first: { rows: [{ id: "r-1" }], nextPage: "two", handled: {} },
      two: { rows: [{ id: "r-2" }], handled: {} }
    }
    const list = vi.fn((_collection: string, query: ListQuery) => Promise.resolve(pages[query.page?.at ?? "first"]!))
    const { places } = cookbook({ describe: () => new MemoryPlace().describe(), list })
    await places.heal.heal({ ...ask, ids: ["r-1"] })
    expect(list).toHaveBeenCalledTimes(1)
  })

  test("can't reach the place:  what's showing stays, and it answers false", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    const { places, told } = cookbook({
      describe: () => new MemoryPlace().describe(),
      list: () => Promise.reject(new TypeError("Failed to fetch"))
    })
    expect(await places.heal.heal(ask)).toBe(false)
    expect(told).not.toHaveBeenCalled()
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})
