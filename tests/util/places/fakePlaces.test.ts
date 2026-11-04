import { describe, expect, test } from "vite-plus/test"

import { PlaceError, Places, parseRef, refText, writeAnswerFor } from "spell/util/places"

import { FieldRulesPlace, HostsPlace, OwnedPlace } from "./fakePlaces"

/** Two people's records, on two hosts;  each id says whose it is, as AT Protocol's do. */
function twoHosts(): HostsPlace {
  return new HostsPlace({
    hosts: {
      north: new OwnedPlace({
        collections: { recipes: [{ id: "did:plc:owen/r-1", owner: "owen", title: "Soup" }] }
      }),
      south: new OwnedPlace({
        collections: { recipes: [{ id: "did:plc:matt/r-1", owner: "matt", title: "Stew" }] }
      })
    },
    hostOf: { owen: "north", matt: "south" }
  })
}

describe("writing allowed per field (Airtable's shape)", () => {
  test("a place says so per field, and the same place takes the others", () => {
    const place = new FieldRulesPlace()
    expect(writeAnswerFor(place, { collection: "orders", field: "total" })).toEqual({
      canWrite: false,
      whyNot: "field"
    })
    expect(writeAnswerFor(place, { collection: "orders", field: "name" })).toEqual({ canWrite: true })
  })

  test("writing a read-only field is REFUSED, naming the field as why;  what came before it stays, not being atomic", async () => {
    expect.assertions(2)
    const place = new FieldRulesPlace()
    try {
      await place.apply(
        [
          { kind: "insert", collection: "orders", fields: { name: "first" } },
          { kind: "insert", collection: "orders", fields: { total: 12 } }
        ],
        {}
      )
    } catch (error) {
      expect((error as PlaceError).cause).toEqual({ kind: "refused", whyNot: "field" })
    }
    expect((await place.list("orders", {}, {})).rows).toMatchObject([{ name: "first" }])
  })

  test("says the limits it lives under, and that it has no version check", () => {
    expect(new FieldRulesPlace().describe()).toMatchObject({
      rateLimit: { requests: 5, perSeconds: 1, changesPerRequest: 10 },
      versionCheck: false,
      atomic: false
    })
  })
})

describe("an id the place makes (Airtable's shape)", () => {
  test("an insert with no id comes back with the place's own, in the id field", async () => {
    const place = new FieldRulesPlace()
    expect(place.describe().makesIds).toBe(true)
    const { rows } = await place.apply([{ kind: "insert", collection: "orders", fields: { name: "first" } }], {})
    expect(rows).toEqual([{ id: "recm-1", name: "first" }])
  })

  test("it reaches the cache under the place's id", async () => {
    const places = new Places().add("orders", new FieldRulesPlace())
    await places.placeForOrDie("orders").apply!(
      [{ kind: "insert", collection: "orders", fields: { name: "first" } }],
      {}
    )
    const result = places.read({ placeName: "orders", collection: "orders", type: "Order" })
    await result.load()
    expect(places.cache.rowFor("Order", "recm-1")).toBe(result.contents![0])
  })
})

describe("writing allowed per owner (AT Protocol's shape)", () => {
  const ROW = { id: "r-1", owner: "owen" }

  test("says so with no thing in hand, and per thing with one", () => {
    const place = new OwnedPlace()
    expect(place.describe().whoWrites).toBe("only the owner")
    expect(writeAnswerFor(place, { collection: "recipes", row: ROW, identity: "owen" }).canWrite).toBe(true)
    expect(writeAnswerFor(place, { collection: "recipes", row: ROW, identity: "matt" })).toEqual({
      canWrite: false,
      whyNot: "owner"
    })
  })

  test("someone else's change is REFUSED, its row unchanged;  the owner's goes through", async () => {
    const place = new OwnedPlace({ collections: { recipes: [{ ...ROW, title: "Soup" }] } })
    const change = { kind: "update", collection: "recipes", id: "r-1", fields: { title: "Stew" } } as const
    await expect(place.apply([change], { identity: "matt" })).rejects.toMatchObject({
      cause: { kind: "refused", whyNot: "owner" }
    })
    expect((await place.list("recipes", {}, {})).rows[0]!.title).toBe("Soup")
    await place.apply([change], { identity: "owen" })
    expect((await place.list("recipes", {}, {})).rows[0]!.title).toBe("Stew")
  })

  test("does nothing with a query it can't handle, and says so", async () => {
    const place = new OwnedPlace({ collections: { recipes: [ROW, { id: "r-2", owner: "matt" }] } })
    const answer = await place.list("recipes", { filter: { owner: "owen" }, select: ["id"] }, {})
    expect(answer.handled).toEqual({})
    expect(answer.rows).toHaveLength(2)
  })
})

describe("one place across several hosts (AT Protocol's shape)", () => {
  test("a list goes through every host, one page at a time, and ends", async () => {
    const place = twoHosts()
    const first = await place.list("recipes", {}, {})
    expect(first).toMatchObject({ rows: [{ title: "Soup" }], nextPage: "south" })
    const second = await place.list("recipes", { page: { at: first.nextPage! } }, {})
    expect(second.rows).toMatchObject([{ title: "Stew" }])
    expect(second.nextPage).toBeUndefined()
  })

  test("the two hosts' rows are one cache's, each under its whole id", async () => {
    const places = new Places().add("everyone", twoHosts())
    const first = places.read({ placeName: "everyone", collection: "recipes", type: "Recipe" })
    await first.load()
    const second = places.read({
      placeName: "everyone",
      collection: "recipes",
      type: "Recipe",
      query: { page: { at: first.nextPage! } }
    })
    await second.load()
    expect(places.cache.rowFor("Recipe", "did:plc:owen/r-1")).toBe(first.contents![0])
    expect(places.cache.rowFor("Recipe", "did:plc:matt/r-1")).toBe(second.contents![0])
  })

  test("a whole id fits the saved format, there and back", () => {
    const ref = { type: "Recipe", id: "did:plc:owen/r-1" }
    expect(parseRef(refText(ref))).toEqual(ref)
  })

  test("a write reaches the asker's host, and one stream hears it", async () => {
    const place = twoHosts()
    const heard: string[] = []
    const stop = place.watch({ collection: "recipes" }, (event) => heard.push(event.id))
    await place.apply([{ kind: "insert", collection: "recipes", id: "did:plc:matt/r-2", fields: { owner: "matt" } }], {
      identity: "matt"
    })
    stop()
    expect(heard).toEqual(["did:plc:matt/r-2"])
  })
})
