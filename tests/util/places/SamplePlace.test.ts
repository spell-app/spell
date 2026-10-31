import { describe, expect, test, vi } from "vite-plus/test"

import { MemoryStorage } from "spell/util/persist/MemoryStorage"
import {
  MemoryPlace,
  PlaceError,
  Places,
  writeAnswerFor,
  type ListAnswer,
  type Place,
  type PlaceChange,
  type PlaceRow,
  type PlacesProps
} from "spell/util/places"
import { SamplePlace, useRealPlace, useSample } from "spell/util/places/SamplePlace"

/** The real recipes. */
const REAL_ROWS: PlaceRow[] = [
  { id: "r-1", title: "Soup", serves: 2 },
  { id: "r-2", title: "Stew", serves: 4 }
]

/** A real place that says who wrote to it. */
function realPlace(rows = REAL_ROWS) {
  const place = new MemoryPlace({ capabilities: { kind: "web service" }, collections: { recipes: rows } })
  const apply = vi.spyOn(place, "apply")
  return { place, apply }
}

/** A real place reading what's asked of `list`, and taking no writes at all. */
function placeThatOnlyLists(list: Place["list"], idOf: string | undefined = "id"): Place {
  return {
    describe: () => ({
      ...(idOf !== undefined && { idOf }),
      filter: "none",
      sort: "none",
      select: "none",
      page: "none",
      write: "none",
      atomic: false,
      live: "none",
      abort: "soft"
    }),
    list
  }
}

/** The cookbook, one reader of its recipes loaded. */
async function cookbook(place: Place = realPlace().place, props: PlacesProps = {}) {
  const places = new Places({ wait: 0, ...props }).add("cookbook", place)
  const result = places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
  await result.load().catch(() => undefined)
  return { places, result, pending: () => places.pendingFor("cookbook") }
}

/** A row's title, as plain data. */
const titles = (rows: PlaceRow[] | undefined) => rows?.map(({ title }) => title)

/** Change `r-1`'s title, by way of the changes pending. */
function rename(places: Places, value: string, was = "Soup") {
  places
    .pendingFor("cookbook")
    .setField({ collection: "recipes", type: "Recipe", id: "r-1", field: "title", value, was })
}

describe("SamplePlace, its first records", () => {
  test("copies a few from the real place when it can be reached", async () => {
    const real = realPlace([...Array(9).keys()].map((index) => ({ id: `r-${index}`, title: `Dish ${index}` })))
    const sample = new SamplePlace({ real: real.place })
    const { rows } = await sample.list("recipes", {})
    expect(rows).toHaveLength(5)
    expect(rows[0]).toEqual({ id: "r-0", title: "Dish 0" })
    expect(sample.sourceOf("recipes")).toBe("the real place")
  })

  test("the real place can't be reached:  made from the type", async () => {
    const list = () => Promise.reject(new Error("no server"))
    const sample = new SamplePlace({
      real: placeThatOnlyLists(list),
      rowsFromType: () => [{ title: "Sample title 1" }]
    })
    expect((await sample.list("recipes", {})).rows).toEqual([{ id: "recipes-1", title: "Sample title 1" }])
    expect(sample.sourceOf("recipes")).toBe("the type")
  })

  test("a slow real place isn't waited for", async () => {
    const list = () => new Promise<ListAnswer>(() => {})
    const sample = new SamplePlace({ real: placeThatOnlyLists(list), realPlaceWait: 5, rowsFromType: () => [{}] })
    expect((await sample.list("recipes", {})).rows).toHaveLength(1)
  })

  test("nothing to go on:  it starts empty, and takes what's added", async () => {
    const sample = new SamplePlace({ real: placeThatOnlyLists(() => Promise.reject(new Error("no"))) })
    expect((await sample.list("recipes", {})).rows).toEqual([])
    expect(sample.sourceOf("recipes")).toBe("nothing")
    await sample.apply([{ kind: "insert", collection: "recipes", id: "n-1", fields: { title: "New" } }])
    expect((await sample.list("recipes", {})).rows).toEqual([{ id: "n-1", title: "New" }])
  })

  test("a real place with no ids:  each record gets one, so it can be changed", async () => {
    const answer = { rows: [{ title: "Soup" }], handled: {} }
    const sample = new SamplePlace({ real: placeThatOnlyLists(() => Promise.resolve(answer), undefined) })
    const [row] = (await sample.list("recipes", {})).rows
    expect(row).toEqual({ id: "recipes-1", title: "Soup" })
    await sample.apply([{ kind: "update", collection: "recipes", id: "recipes-1", fields: { title: "Stew" } }])
    expect((await sample.list("recipes", {})).rows[0]!.title).toBe("Stew")
  })
})

describe("SamplePlace, as a place", () => {
  test("always writable, whatever the real place allows, and it says it's a sample and what the real one is", () => {
    const real = placeThatOnlyLists(() => Promise.reject(new Error("no")))
    const sample = new SamplePlace({ real })
    expect(writeAnswerFor(real, { collection: "recipes" })).toEqual({ canWrite: false, whyNot: "place" })
    expect(writeAnswerFor(sample, { collection: "recipes", kind: "update" })).toEqual({ canWrite: true })
    expect(sample.describe().isSample).toBe(true)
    expect(new SamplePlace({ real: realPlace().place }).describe().kind).toBe("web service")
  })

  test("a change made before it's been read isn't lost to its first records", async () => {
    const sample = new SamplePlace({ real: realPlace().place })
    const change: PlaceChange = { kind: "update", collection: "recipes", id: "r-1", fields: { title: "Mine" } }
    await sample.apply([change])
    expect(titles((await sample.list("recipes", {})).rows)).toEqual(["Mine", "Stew"])
  })
})

describe("useSample()", () => {
  test("NEVER touches the real place:  writes stay in the sample, and the real rows don't change", async () => {
    const { place, apply } = realPlace()
    const { places } = await cookbook(place)
    await useSample(places, "cookbook")
    rename(places, "Sample soup")
    await vi.waitFor(() => expect(places.pendingFor("cookbook").hasPending).toBe(false))
    await useRealPlace(places, "cookbook")
    expect(apply).not.toHaveBeenCalled()
    expect((await place.list("recipes", {})).rows[0]).toMatchObject({ title: "Soup" })
  })

  test("the line declaring it doesn't change:  the same name reads the sample, and shows its rows, and back again", async () => {
    const { places, result } = await cookbook()
    const first = result.contents![0]
    const sample = await useSample(places, "cookbook")
    expect(places.placeFor("cookbook")).toBe(sample)
    expect(result.status).toBe("complete")

    rename(places, "Sample soup")
    expect(titles(result.contents)).toEqual(["Sample soup", "Stew"])
    await vi.waitFor(() => expect(places.pendingFor("cookbook").hasPending).toBe(false))

    await useRealPlace(places, "cookbook")
    expect(titles(result.contents)).toEqual(["Soup", "Stew"])
    expect(places.placeFor("cookbook")).not.toBe(sample)
    expect(result.contents![0]).not.toBe(first)
    expect(places.cache.rowFor("Recipe", "r-1")).toBe(result.contents![0])

    expect(await useSample(places, "cookbook")).toBe(sample)
    expect(titles(result.contents)).toEqual(["Sample soup", "Stew"])
  })

  test("a field only the sample had doesn't stay on the real place's row", async () => {
    const { places, result } = await cookbook()
    await useSample(places, "cookbook")
    places.pendingFor("cookbook").setField({
      collection: "recipes",
      type: "Recipe",
      id: "r-1",
      field: "notes",
      value: "Only here"
    })
    await vi.waitFor(() => expect(places.pendingFor("cookbook").hasPending).toBe(false))
    await useRealPlace(places, "cookbook")
    expect(result.contents![0]).not.toHaveProperty("notes")
  })

  test("what's waiting for the real place waits, and goes to it, never to the sample", async () => {
    const { place, apply } = realPlace()
    const { places } = await cookbook(place, { wait: 10_000 })
    rename(places, "Real change")
    const sample = await useSample(places, "cookbook")
    const sampleApply = vi.spyOn(sample, "apply")
    await vi.waitFor(() => expect(places.placeFor("cookbook")).toBe(sample))
    expect(apply).not.toHaveBeenCalled()
    expect(sampleApply).not.toHaveBeenCalled()

    await useRealPlace(places, "cookbook")
    await vi.waitFor(() => expect(apply).toHaveBeenCalledTimes(1))
    expect(sampleApply).not.toHaveBeenCalled()
    expect((await place.list("recipes", {})).rows[0]).toMatchObject({ title: "Real change" })
  })

  test("a change on its way as the sample goes in lands on the real place, and shows nothing", async () => {
    let answer: () => void = () => {}
    const place = new MemoryPlace({ collections: { recipes: REAL_ROWS } })
    const reallyApply = place.apply.bind(place)
    vi.spyOn(place, "apply").mockImplementation(async (changes, context) => {
      await new Promise<void>((resolve) => (answer = resolve))
      return reallyApply(changes, context)
    })
    const { places, result } = await cookbook(place)
    rename(places, "On its way")
    await vi.waitFor(() => expect(place.apply).toHaveBeenCalled(), { interval: 1 })
    await useSample(places, "cookbook")
    expect(titles(result.contents)).toEqual(["Soup", "Stew"])
    answer()
    await vi.waitFor(async () => expect((await place.list("recipes", {})).rows[0]!.title).toBe("On its way"))
    expect(result.contents![0]!.title).toBe("Soup")
  })

  test("the sample's unsent changes reach it before it leaves", async () => {
    const { places } = await cookbook(realPlace().place, { wait: 10_000 })
    const sample = await useSample(places, "cookbook")
    rename(places, "Unsent")
    await useRealPlace(places, "cookbook")
    expect((await sample.list("recipes", {})).rows[0]!.title).toBe("Unsent")
  })

  test("back to a real place that can't be reached:  no rows left from the sample, and it says why", async () => {
    let isUp = true
    const real = placeThatOnlyLists(async () => {
      if (!isUp) throw new PlaceError("gone", { cause: { kind: "not found" } })
      return { rows: REAL_ROWS, handled: {} }
    })
    const { places, result } = await cookbook(real)
    await useSample(places, "cookbook")
    isUp = false
    await useRealPlace(places, "cookbook")
    expect(result.contents).toBeUndefined()
    expect(result.loadError?.message).toBe("gone")
  })

  test("a real place that pushes:  what it says while the sample's in doesn't show, and what's missed shows on the way back", async () => {
    const { place } = realPlace()
    const { places, result } = await cookbook(place)
    const told = vi.fn()
    places.heal.follow({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
    await useSample(places, "cookbook")
    places.onRows(told)
    await place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Theirs" } }])
    expect(told).not.toHaveBeenCalled()
    expect(result.contents![0]!.title).toBe("Soup")
    await useRealPlace(places, "cookbook")
    expect(result.contents![0]!.title).toBe("Theirs")
  })

  test("a reader whose read failed gets the sample's rows:  the real place being down is the point", async () => {
    const real = placeThatOnlyLists(() => Promise.reject(new PlaceError("down", { cause: { kind: "not found" } })))
    const { places, result } = await cookbook(real)
    expect(result.contents).toBeUndefined()
    await useSample(places, "cookbook", { rowsFromType: () => [{ title: "Sample title 1" }] })
    expect(titles(result.contents)).toEqual(["Sample title 1"])
    expect(result.loadError).toBeUndefined()
  })

  test("rows are made from the type the collection was read as", async () => {
    const real = placeThatOnlyLists(() => Promise.reject(new Error("down")))
    const { places } = await cookbook(real)
    const rowsFromType = vi.fn(() => [])
    await useSample(places, "cookbook", { rowsFromType })
    expect(rowsFromType).toHaveBeenCalledWith("Recipe")
  })

  test("asked twice:  the same sample, and nothing happens;  not using one:  going back does nothing", async () => {
    const { places, result } = await cookbook()
    await useRealPlace(places, "cookbook")
    expect(titles(result.contents)).toEqual(["Soup", "Stew"])
    const sample = await useSample(places, "cookbook")
    expect(await useSample(places, "cookbook")).toBe(sample)
  })

  test("REFUSES a name nobody has", async () => {
    await expect(useSample(new Places(), "nope")).rejects.toThrow(/no place is named/)
  })
})

describe("useSample(), on this device", () => {
  test("its records come back next visit, kept apart from real pending changes", async () => {
    const storage = new MemoryStorage()
    const props = { keepPendingAs: "project", storage: () => storage }
    const first = await cookbook(realPlace().place, props)
    await useSample(first.places, "cookbook")
    rename(first.places, "Kept")
    await vi.waitFor(() => expect(first.places.pendingFor("cookbook").hasPending).toBe(false))
    expect(storage.length).toBeGreaterThan(0)
    const keys = [...Array(storage.length).keys()].map((index) => storage.key(index))
    expect(keys.some((key) => key?.includes("spell-samples"))).toBe(true)

    const second = await cookbook(realPlace().place, props)
    const sample = await useSample(second.places, "cookbook")
    expect(titles(second.result.contents)).toEqual(["Kept", "Stew"])
    expect(sample.sourceOf("recipes")).toBe("kept")
  })

  test("a sample's unsent change isn't kept as a real one:  it can't be sent to the real place next visit", async () => {
    const storage = new MemoryStorage()
    const props = { keepPendingAs: "project", storage: () => storage, wait: 10_000 }
    const { places } = await cookbook(realPlace().place, props)
    await useSample(places, "cookbook")
    rename(places, "Unsent in the sample")
    places.pendingFor("cookbook").queue.stop()

    const { place, apply } = realPlace()
    await cookbook(place, props)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(apply).not.toHaveBeenCalled()
  })
})
