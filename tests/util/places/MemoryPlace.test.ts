import { describe, expect, test, vi } from "vite-plus/test"

import { MemoryPlace, type PlaceRow } from "spell/util/places"

/** A few recipes, out of order by title. */
const RECIPES: PlaceRow[] = [
  { id: "r-1", title: "Soup", kind: "hot" },
  { id: "r-2", title: "Salad", kind: "cold" },
  { id: "r-3", title: "Stew", kind: "hot" }
]

/** A memory place holding `RECIPES`, its `capabilities` over the default. */
function recipes(capabilities = {}): MemoryPlace {
  return new MemoryPlace({ collections: { recipes: RECIPES }, capabilities })
}

/** An update of `r-1`'s title. */
function retitle(title: string, version?: string) {
  return {
    kind: "update",
    collection: "recipes",
    id: "r-1",
    fields: { title },
    ...(version !== undefined && { version })
  } as const
}

describe("MemoryPlace.list()", () => {
  test("filters, sorts and selects, and says it did", async () => {
    const answer = await recipes().list(
      "recipes",
      { filter: { kind: "hot" }, sort: [{ field: "title", descending: true }], select: ["title"] },
      {}
    )
    expect(answer).toEqual({
      rows: [{ title: "Stew" }, { title: "Soup" }],
      version: "0",
      handled: { filter: true, sort: true, select: true }
    })
  })

  test("does NOTHING its capabilities don't claim, and leaves it out of `handled`", async () => {
    const place = recipes({ filter: "none", sort: ["kind"], select: "none" })
    const answer = await place.list(
      "recipes",
      { filter: { kind: "hot" }, sort: [{ field: "title" }], select: ["title"] },
      {}
    )
    expect(answer.handled).toEqual({})
    expect(answer.rows).toEqual(RECIPES)
  })

  test("a capability given per field covers only those fields", async () => {
    const place = recipes({ filter: ["kind"] })
    expect((await place.list("recipes", { filter: { kind: "hot" } }, {})).handled).toEqual({ filter: true })
    expect((await place.list("recipes", { filter: { title: "Soup" } }, {})).handled).toEqual({})
  })

  test("pages through a list, its last page naming no next one", async () => {
    const place = recipes()
    const first = await place.list("recipes", { page: { size: 2 } }, {})
    expect(first.rows.map((row) => row.id)).toEqual(["r-1", "r-2"])
    const last = await place.list("recipes", { page: { size: 2, at: first.nextPage! } }, {})
    expect(last.rows.map((row) => row.id)).toEqual(["r-3"])
    expect(last.nextPage).toBeUndefined()
  })

  test("a place with no paging answers with everything", async () => {
    const answer = await recipes({ page: "none" }).list("recipes", { page: { size: 1 } }, {})
    expect(answer.rows).toHaveLength(3)
    expect(answer.nextPage).toBeUndefined()
  })

  test("hands out copies:  changing one changes nothing it holds", async () => {
    const place = recipes()
    ;(await place.list("recipes", {}, {})).rows[0]!.title = "changed"
    expect((await place.list("recipes", {}, {})).rows[0]!.title).toBe("Soup")
  })

  test("a collection it doesn't hold is empty", async () => {
    expect((await recipes().list("nothing", {}, {})).rows).toEqual([])
  })

  test("THROWS when already aborted", async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(recipes().list("recipes", {}, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError"
    })
  })
})

describe("MemoryPlace.getMany()", () => {
  test("answers the ids it holds, and selects", async () => {
    const rows = await recipes().getMany("recipes", ["r-3", "nope"], { select: ["title"] })
    expect(rows).toEqual([{ title: "Stew" }])
  })
})

describe("MemoryPlace.apply()", () => {
  test("inserts, updates and deletes", async () => {
    const place = recipes()
    const { rows, version } = await place.apply(
      [
        { kind: "insert", collection: "recipes", id: "r-4", fields: { title: "Cake" } },
        retitle("Broth"),
        { kind: "delete", collection: "recipes", id: "r-2" }
      ],
      {}
    )
    expect(rows).toEqual([
      { id: "r-4", title: "Cake" },
      { id: "r-1", title: "Broth", kind: "hot" }
    ])
    expect(version).toBe("3")
    expect((await place.list("recipes", { select: ["id"] }, {})).rows.map((row) => row.id)).toEqual([
      "r-1",
      "r-3",
      "r-4"
    ])
  })

  test("REFUSES every write when it says it takes none", async () => {
    await expect(recipes({ write: "none" }).apply([retitle("Broth")], {})).rejects.toMatchObject({
      name: "PlaceError",
      cause: { kind: "refused", whyNot: "place" }
    })
  })

  test("REFUSES a kind of write it doesn't list", async () => {
    await expect(recipes({ write: ["insert"] }).apply([retitle("Broth")], {})).rejects.toMatchObject({
      cause: { kind: "refused", whyNot: "place" }
    })
  })

  test("all or nothing:  a change that can't be made means NONE are made", async () => {
    const place = recipes()
    await expect(
      place.apply([retitle("Broth"), { kind: "update", collection: "recipes", id: "nope", fields: {} }], {})
    ).rejects.toMatchObject({ cause: { kind: "not found" } })
    expect((await place.getMany("recipes", ["r-1"], {}))[0]!.title).toBe("Soup")
  })

  test("a change from before the thing's last write is OUT OF DATE;  one from after isn't", async () => {
    const place = recipes()
    const { version } = await place.list("recipes", {}, {})
    await place.apply([retitle("Broth", version)], {})
    await expect(place.apply([retitle("Stock", version)], {})).rejects.toMatchObject({
      cause: { kind: "out of date" }
    })
    await place.apply([retitle("Stock", "1")], {})
    expect((await place.getMany("recipes", ["r-1"], {}))[0]!.title).toBe("Stock")
  })

  test("with no version check, an old version goes through", async () => {
    const place = recipes({ versionCheck: false })
    await place.apply([retitle("Broth")], {})
    await expect(place.apply([retitle("Stock", "0")], {})).resolves.toMatchObject({ rows: [{ title: "Stock" }] })
  })

  test("an insert with no id, where the place makes none, is a caller's mistake", async () => {
    await expect(recipes().apply([{ kind: "insert", collection: "recipes", fields: {} }], {})).rejects.toThrow(
      TypeError
    )
  })
})

describe("MemoryPlace.call()", () => {
  test("runs a named operation;  a name it doesn't have is NOT FOUND", async () => {
    const place = new MemoryPlace({ operations: { double: (input) => (input as number) * 2 } })
    expect(await place.call("double", 21, {})).toBe(42)
    await expect(place.call("triple", 21, {})).rejects.toMatchObject({ cause: { kind: "not found" } })
  })
})

describe("MemoryPlace.watch()", () => {
  test("tells of each change to its collection, or its one thing, until stopped", async () => {
    const place = recipes()
    const everything = vi.fn()
    const oneThing = vi.fn()
    const stop = place.watch({ collection: "recipes" }, everything)
    place.watch({ collection: "recipes", id: "r-3" }, oneThing)

    await place.apply([retitle("Broth")], {})
    expect(everything).toHaveBeenCalledTimes(1)
    expect(everything).toHaveBeenLastCalledWith({
      collection: "recipes",
      id: "r-1",
      row: { id: "r-1", title: "Broth", kind: "hot" }
    })
    expect(oneThing).not.toHaveBeenCalled()

    stop()
    await place.apply([{ kind: "delete", collection: "recipes", id: "r-3" }], {})
    expect(everything).toHaveBeenCalledTimes(1)
    expect(oneThing).toHaveBeenCalledWith({ collection: "recipes", id: "r-3" })
  })
})

describe("MemoryPlace.changesSince()", () => {
  test("says what changed since a version:  each thing once, as it's now, and what went", async () => {
    const place = recipes()
    const { version } = await place.list("recipes", {}, {})
    await place.apply([retitle("Broth"), retitle("Stock"), { kind: "delete", collection: "recipes", id: "r-2" }], {})
    const changes = await place.changesSince("recipes", version!, {})
    expect(changes).toEqual({
      rows: [{ id: "r-1", title: "Stock", kind: "hot" }],
      removed: ["r-2"],
      token: "3"
    })
    expect(await place.changesSince("recipes", changes.token, {})).toEqual({ rows: [], removed: [], token: "3" })
  })
})
