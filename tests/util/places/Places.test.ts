import { describe, expect, test } from "vite-plus/test"

import { MemoryPlace, Places } from "spell/util/places"

describe("Places", () => {
  test("finds a place by its name", () => {
    const place = new MemoryPlace()
    const places = new Places().add("family cookbook", place)
    expect(places.placeFor("family cookbook")).toBe(place)
    expect(places.placeForOrDie("family cookbook")).toBe(place)
  })

  test("a name nobody has:  `undefined`, or a thrown error if it must be there", () => {
    const places = new Places()
    expect(places.placeFor("nope")).toBeUndefined()
    expect(() => places.placeForOrDie("nope")).toThrow(/no place is named "nope"/)
  })

  test("add() REFUSES a name that's taken", () => {
    const places = new Places().add("family cookbook", new MemoryPlace())
    expect(() => places.add("family cookbook", new MemoryPlace())).toThrow(/swap\(\) replaces one/)
  })
})

describe("Places.swap()", () => {
  test("puts another place behind the name, and hands back the old one", () => {
    const real = new MemoryPlace()
    const sample = new MemoryPlace()
    const places = new Places().add("family cookbook", real)
    expect(places.swap("family cookbook", sample)).toBe(real)
    expect(places.placeForOrDie("family cookbook")).toBe(sample)
  })

  test("REFUSES a name nobody has", () => {
    expect(() => new Places().swap("nope", new MemoryPlace())).toThrow(/no place is named/)
  })

  test("a result holding the name reads the new place when it next loads", async () => {
    const places = new Places().add("cookbook", new MemoryPlace({ collections: { recipes: [{ id: "real" }] } }))
    const result = places.read({ placeName: "cookbook", collection: "recipes" })
    await result.load()
    expect(result.contents).toEqual([{ id: "real" }])

    places.swap("cookbook", new MemoryPlace({ collections: { recipes: [{ id: "sample" }] } }))
    expect(result.contents).toEqual([{ id: "real" }])
    await result.reload()
    expect(result.contents).toEqual([{ id: "sample" }])
  })
})

describe("Places.read()", () => {
  test("two reads of one thing get ONE row from the one cache", async () => {
    const places = new Places().add(
      "cookbook",
      new MemoryPlace({ collections: { recipes: [{ id: "r-12", title: "Soup", kind: "hot" }] } })
    )
    const list = places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
    const titles = places.read({
      placeName: "cookbook",
      collection: "recipes",
      type: "Recipe",
      query: { select: ["id", "title"] }
    })
    await Promise.all([list.load(), titles.load()])
    expect(titles.contents![0]).toBe(list.contents![0])
    expect(places.cache.rowFor("Recipe", "r-12")).toBe(list.contents![0])
    expect({ ...list.contents![0] }).toEqual({ id: "r-12", title: "Soup", kind: "hot" })
  })
})
