import { createServer } from "node:http"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { RecipeBox, restHandler, type RestServerProps } from "spell/server/test/recipeServers"
import {
  PlaceError,
  Places,
  RestPlace,
  type PlaceChange,
  type PlaceConflict,
  type PlaceRow,
  type PlaceWriteFailure,
  type RestPlaceProps
} from "spell/util/places"

/** Every server a test started, to close when it's done. */
const servers: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((close) => close()))
})

/** A real web service on a free port, its box, and a place for it. */
async function served(server: RestServerProps = {}, props: Partial<RestPlaceProps> = {}) {
  const box = new RecipeBox()
  const http = createServer(SRV.toListener(restHandler(box, server)))
  const port = await SRV.listenPreferred(http)
  servers.push(
    () =>
      new Promise((done) => {
        http.closeAllConnections()
        http.close(() => done())
      })
  )
  const place = new RestPlace({
    url: `http://127.0.0.1:${port}/`,
    collections: { recipes: { fields: { title: "name" } } },
    ...props
  })
  return { box, place }
}

/** The same, with the engine on top, as a program has it:  what's merged and refused is noted. */
async function engine(server: RestServerProps = {}, props: Partial<RestPlaceProps> = {}) {
  const { box, place } = await served(server, props)
  const places = new Places({ wait: 0, retry: 5 }).add("box", place)
  const conflicts: PlaceConflict[] = []
  const failures: PlaceWriteFailure[] = []
  places.onConflict((conflict) => conflicts.push(conflict))
  places.onWriteFailed((failure) => failures.push(failure))
  const pending = places.pendingFor("box")
  const allSent = () => vi.waitFor(() => expect(pending.hasPending).toBe(false))
  return { box, place, places, pending, conflicts, failures, allSent }
}

/** A write to one field of `r-1`. */
const write = (field: string, value: unknown, was: unknown, id = "r-1") => ({
  collection: "recipes",
  id,
  field,
  value,
  was
})

/** The first row of a place's `recipes`, by id. */
const reading = (place: RestPlace, id = "r-1") => place.getMany("recipes", [id], {})

////////////////
// ## Mapping
////////////////

describe("RestPlace.list()", () => {
  test("maps the collection and its field names, and says it did nothing it wasn't told it can", async () => {
    const { place } = await served()
    const { rows, handled } = await place.list("recipes", { filter: { cuisine: "Indian" } }, {})
    expect(rows[0]).toMatchObject({ id: "r-1", title: "Tomato soup" })
    expect(rows[0]).not.toHaveProperty("name")
    expect(rows).toHaveLength(5)
    expect(handled).toEqual({})
  })

  test("a path of its own, and rows inside an answer", async () => {
    const { place, box } = await served(
      { paging: "cursor" },
      {
        can: { page: "cursor" },
        collections: { dishes: { path: "/recipes{/id}", rowsAt: "data", nextAt: "meta.next" } }
      }
    )
    const { rows } = await place.list("dishes", {}, {})
    expect(rows.map(({ id }) => id)).toEqual(["r-1", "r-2"])
    expect(box.asks.at(-1)!.path).toBe("/recipes")
  })

  test("what it's told it can do, it asks the server for, by the server's names", async () => {
    const { place, box } = await served(
      {},
      { can: { filter: ["cuisine"], sort: "every field", select: "every field" } }
    )
    const { rows, handled } = await place.list(
      "recipes",
      { filter: { cuisine: "Italian" }, sort: [{ field: "title", descending: true }], select: ["title"] },
      {}
    )
    expect(rows).toEqual([
      { id: "r-1", title: "Tomato soup" },
      { id: "r-4", title: "Margherita" }
    ])
    expect(handled).toEqual({ filter: true, sort: true, select: true })
    expect(box.asks.at(-1)!.query).toEqual({ cuisine: "Italian", sort: "-name", fields: "name,id" })
  })

  test("an answer that isn't a list says where to look", async () => {
    const { place } = await served(
      { paging: "cursor" },
      { can: { page: "cursor" }, collections: { recipes: { nextAt: "meta.next" } } }
    )
    await expect(place.list("recipes", {}, {})).rejects.toThrow("say where it is with `rowsAt`")
  })

  test("a list that's not there is `not found`", async () => {
    const { place } = await served()
    await expect(place.list("nothing", {}, {})).rejects.toMatchObject({ kind: "not found" })
  })
})

////////////////
// ## Paging
////////////////

describe("RestPlace paging", () => {
  test("by offset:  a full page means there may be more", async () => {
    const { place, box } = await served({ paging: "offset" }, { can: { page: "offset" }, pageSize: 2 })
    const first = await place.list("recipes", {}, {})
    expect(first.nextPage).toBe("2")
    expect(box.asks.at(-1)!.query).toEqual({ limit: "2", offset: "0" })
    const last = await place.list("recipes", { page: { at: "4", size: 2 } }, {})
    expect(last.rows.map(({ id }) => id)).toEqual(["r-5"])
    expect(last.nextPage).toBeUndefined()
  })

  test("by cursor, in its answer", async () => {
    const { place, box } = await served(
      { paging: "cursor" },
      { can: { page: "cursor" }, collections: { recipes: { rowsAt: "data", nextAt: "meta.next" } } }
    )
    const first = await place.list("recipes", { page: { size: 3 } }, {})
    expect(first.nextPage).toBe("3")
    const second = await place.list("recipes", { page: { at: first.nextPage!, size: 3 } }, {})
    expect(box.asks.at(-1)!.query).toEqual({ cursor: "3", limit: "3" })
    expect(second.rows.map(({ id }) => id)).toEqual(["r-4", "r-5"])
    expect(second.nextPage).toBeUndefined()
  })

  test("by a `Link` header:  the next page is a whole address, used as it is", async () => {
    const { place, box } = await served({ paging: "link" }, { can: { page: "cursor" } })
    const first = await place.list("recipes", {}, {})
    expect(first.nextPage).toMatch(/^http:.*cursor=2/)
    const second = await place.list("recipes", { page: { at: first.nextPage! } }, {})
    expect(second.rows.map(({ id }) => id)).toEqual(["r-3", "r-4"])
    expect(box.asks.at(-1)!.query).toEqual({ cursor: "2", limit: "2" })
  })

  test("a cursor-paged API that can't filter:  the engine walks its cursors, and a reader's `nextPage` is its own", async () => {
    const { place } = await served(
      { paging: "cursor" },
      {
        can: { page: "cursor" },
        collections: { recipes: { rowsAt: "data", nextAt: "meta.next", fields: { title: "name" } } }
      }
    )
    const places = new Places().add("box", place)
    const read = (at?: string) =>
      places.read({
        placeName: "box",
        collection: "recipes",
        query: { filter: { cuisine: "Italian" }, page: { size: 1, ...(at !== undefined && { at }) } }
      })
    const first = read()
    await first.load()
    expect(first.contents!.map(({ id }) => id)).toEqual(["r-1"])
    expect(first.nextPage).toBe("1")
    const second = read(first.nextPage)
    await second.load()
    expect(second.contents!.map(({ id }) => id)).toEqual(["r-4"])
    expect(second.nextPage).toBeUndefined()
  })
})

////////////////
// ## Aborting
////////////////

describe("RestPlace aborting", () => {
  test("an abort really stops the request:  the server sees it cut off", async () => {
    const { place, box } = await served()
    let release = () => {}
    box.holdAnswers = new Promise((done) => (release = done))
    const controller = new AbortController()
    const answer = place.list("recipes", {}, { signal: controller.signal })
    await vi.waitFor(() => expect(box.asks).toHaveLength(1))
    controller.abort()
    await expect(answer).rejects.toThrow()
    await vi.waitFor(() => expect(box.cutOff).toBe(1))
    release()
  })

  test("the last reader leaving aborts it, through the engine", async () => {
    const { place, box } = await served()
    let release = () => {}
    box.holdAnswers = new Promise((done) => (release = done))
    const result = new Places().add("box", place).read({ placeName: "box", collection: "recipes" })
    const load = result.load()
    await vi.waitFor(() => expect(box.asks).toHaveLength(1))
    result.leave()
    await vi.waitFor(() => expect(box.cutOff).toBe(1))
    release()
    await load
  })
})

////////////////
// ## Writing, plain
////////////////

describe("RestPlace.apply()", () => {
  test("posts, patches and deletes by the server's names, with each change's id in a header", async () => {
    const { place, box } = await served()
    const { rows } = await place.apply(
      [
        { kind: "insert", collection: "recipes", id: "r-9", fields: { id: "r-9", title: "Stew" }, changeId: "c-1" },
        { kind: "update", collection: "recipes", id: "r-9", fields: { title: "Broth" }, changeId: "c-2" },
        { kind: "delete", collection: "recipes", id: "r-1", changeId: "c-3" }
      ],
      {}
    )
    expect(rows.map(({ title }) => title)).toEqual(["Stew", "Broth"])
    expect(box.recipes.get("r-9")!.name).toBe("Broth")
    expect(box.recipes.has("r-1")).toBe(false)
    const [insert, update, remove] = box.asks
    expect(insert).toMatchObject({ method: "POST", path: "/recipes", body: { id: "r-9", name: "Stew" } })
    expect(insert!.headers["idempotency-key"]).toBe("c-1")
    expect(update).toMatchObject({ method: "PATCH", path: "/recipes/r-9", body: { name: "Broth" } })
    expect(remove).toMatchObject({ method: "DELETE", path: "/recipes/r-1" })
  })

  test("a change sent again makes one thing, on a server that remembers ids", async () => {
    const { place, box } = await served()
    const change = {
      kind: "insert",
      collection: "recipes",
      id: "r-9",
      fields: { title: "Stew" },
      changeId: "c-1"
    } as const
    await place.apply([change], {})
    box.recipes.delete("r-9")
    await place.apply([change], {})
    expect(box.recipes.has("r-9")).toBe(false)
  })

  test("a plain service:  `PUT` sends the whole record as it stands, so the last save wins it", async () => {
    const { box, pending, allSent, conflicts } = await engine({}, { update: "PUT" })
    pending.setField(write("title", "Mine", "Tomato soup"))
    box.change("r-1", { notes: "Theirs" })
    await allSent()
    const put = box.asks.find(({ method }) => method === "PUT")!
    expect(put.body).toMatchObject({ id: "r-1", name: "Mine", notes: "Theirs", cuisine: "Italian" })
    expect(conflicts).toEqual([])
    expect(box.recipes.get("r-1")).toMatchObject({ name: "Mine", notes: "Theirs" })
  })

  test("a plain service says it can't check versions, and a change goes with none", async () => {
    const { place, box, pending, allSent } = await engine()
    expect(place.describe().versionCheck).toBeUndefined()
    pending.setField(write("title", "Mine", "Tomato soup"))
    await allSent()
    expect(box.asks.at(-1)!.headers["if-match"]).toBeUndefined()
  })

  test("what the server answers:  a 4xx is known, a 5xx or a 429 isn't, so that one resends", async () => {
    const { place } = await served()
    const change = (fields: PlaceRow): PlaceChange[] => [{ kind: "update", collection: "recipes", id: "r-1", fields }]
    await expect(place.apply(change({ refuse: true }), {})).rejects.toMatchObject({ kind: "refused" })
    await expect(
      place.apply([{ kind: "update", collection: "recipes", id: "none", fields: {} }], {})
    ).rejects.toMatchObject({ kind: "not found" })

    const fakes = [503, 429].map((status) => new Response("", { status, statusText: "busy" }))
    for (const answer of fakes) {
      const real = globalThis.fetch
      globalThis.fetch = (() => Promise.resolve(answer)) as typeof fetch
      try {
        await expect(place.apply(change({}), {})).rejects.not.toBeInstanceOf(PlaceError)
      } finally {
        globalThis.fetch = real
      }
    }
  })

  test("a request that has to outlive the page says so", async () => {
    const { place } = await served()
    const real = globalThis.fetch
    const fetched = vi.fn(real)
    globalThis.fetch = fetched as typeof fetch
    try {
      await place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: {} }], { keepalive: true })
      expect(fetched.mock.calls[0]![1]).toMatchObject({ keepalive: true })
    } finally {
      globalThis.fetch = real
    }
  })
})

////////////////
// ## Versions
////////////////

describe.each([
  ["a field in every row", { versions: "field" }, { versions: { field: "version" } }],
  ["an `ETag`", { versions: "etag" }, { versions: { header: "ETag" } }]
] as const)("RestPlace versions, as %s", (_name, server, props) => {
  test("a change made from the latest goes through, saying what it was made from", async () => {
    const { box, place, pending, allSent, conflicts, failures } = await engine(server, props)
    await reading(place)
    pending.setField(write("title", "Mine", "Tomato soup"))
    await allSent()
    expect(box.recipes.get("r-1")!.name).toBe("Mine")
    expect(box.asks.at(-1)!.headers["if-match"]).toEqual(expect.any(String))
    expect(conflicts).toEqual([])
    expect(failures).toEqual([])
  })

  test("they changed another field:  it merges, with no notice, and both stand", async () => {
    const { box, place, pending, allSent, conflicts, failures } = await engine(server, props)
    await reading(place)
    box.change("r-1", { notes: "Theirs" })
    pending.setField(write("title", "Mine", "Tomato soup"))
    await allSent()
    expect(box.recipes.get("r-1")).toMatchObject({ name: "Mine", notes: "Theirs" })
    expect(box.asks.filter(({ method }) => method === "PATCH")).toHaveLength(2)
    expect(conflicts).toEqual([])
    expect(failures).toEqual([])
  })

  test("they changed the same field:  mine wins, and a notice holds what they wrote", async () => {
    const { box, place, pending, allSent, conflicts, failures } = await engine(server, props)
    await reading(place)
    box.change("r-1", { name: "Theirs" })
    pending.setField(write("title", "Mine", "Tomato soup"))
    await allSent()
    expect(box.recipes.get("r-1")!.name).toBe("Mine")
    expect(conflicts).toMatchObject([{ id: "r-1", field: "title", was: "Tomato soup", mine: "Mine", theirs: "Theirs" }])
    expect(failures).toEqual([])
  })

  test("Use theirs puts it back, as a change", async () => {
    const { box, place, pending, allSent, conflicts } = await engine(server, props)
    await reading(place)
    box.change("r-1", { name: "Theirs" })
    pending.setField(write("title", "Mine", "Tomato soup"))
    await allSent()
    conflicts[0]!.useTheirs()
    await allSent()
    expect(box.recipes.get("r-1")!.name).toBe("Theirs")
  })

  test("they made the same change:  nobody disagrees", async () => {
    const { box, place, pending, allSent, conflicts } = await engine(server, props)
    await reading(place)
    box.change("r-1", { name: "Same" })
    pending.setField(write("title", "Same", "Tomato soup"))
    await allSent()
    expect(conflicts).toEqual([])
  })

  test("two fields of one thing, written together:  they follow each other's version, with no refusal", async () => {
    const { box, place, pending, allSent, failures } = await engine(server, props)
    await reading(place)
    pending.setField(write("title", "Mine", "Tomato soup"))
    pending.setField(write("notes", "Note", "Roast the tomatoes first."))
    await allSent()
    expect(box.recipes.get("r-1")).toMatchObject({ name: "Mine", notes: "Note" })
    expect(box.asks.filter(({ method }) => method === "PATCH")).toHaveLength(2)
    expect(failures).toEqual([])
  })

  test("a change made while the last is on its way follows it, with no second read", async () => {
    const { box, place, pending, allSent } = await engine(server, props)
    await reading(place)
    pending.setField(write("title", "One", "Tomato soup"))
    await pending.queue.save()
    pending.setField(write("title", "Two", "One"))
    await allSent()
    expect(box.recipes.get("r-1")!.name).toBe("Two")
    expect(box.asks.filter(({ method }) => method === "GET")).toHaveLength(1)
  })

  test("gone while I was editing:  refused, not merged", async () => {
    const { box, place, pending, allSent, failures } = await engine(server, props)
    await reading(place)
    box.recipes.delete("r-1")
    pending.setField(write("title", "Mine", "Tomato soup"))
    await allSent()
    expect(failures).toMatchObject([{ error: { kind: "not found" } }])
  })

  test("a delete wins over what someone's changed", async () => {
    const { box, place, pending, allSent, failures } = await engine(server, props)
    await reading(place)
    box.change("r-1", { name: "Theirs" })
    pending.delete({ collection: "recipes", id: "r-1" })
    await allSent()
    expect(box.recipes.has("r-1")).toBe(false)
    expect(failures).toEqual([])
  })

  test("a thing never read:  it reads it, and merges what it finds", async () => {
    const { box, pending, allSent, conflicts } = await engine(server, props)
    pending.setField(write("title", "Mine", "Tomato soup"))
    await allSent()
    expect(box.recipes.get("r-1")!.name).toBe("Mine")
    expect(conflicts).toEqual([])
  })
})

describe("RestPlace versions, what's kept", () => {
  test("a change kept on this device says the version it was made from", async () => {
    const { place, pending } = await engine({ versions: "field" }, { versions: { field: "version" } })
    await reading(place)
    pending.setField(write("title", "Mine", "Tomato soup"))
    expect(pending.changes[0]).toMatchObject({ version: place.versionOf("recipes", "r-1") })
    expect(place.versionOf("recipes", "r-1")).toEqual(expect.any(String))
  })

  test("selecting fields still brings the version", async () => {
    const { place, box } = await served(
      { versions: "field" },
      { versions: { field: "version" }, can: { select: "every field" } }
    )
    await place.list("recipes", { select: ["title"] }, {})
    expect(box.asks.at(-1)!.query).toEqual({ fields: "name,id,version" })
    expect(place.versionOf("recipes", "r-1")).toEqual(expect.any(String))
  })
})

////////////////
// ## Keys
////////////////

describe("RestPlace, a key", () => {
  test("a place that needs one refuses, by its name, and sends nothing", async () => {
    const { place, box } = await served({}, { keyNamed: "RECIPES_KEY" })
    const asked = place.list("recipes", {}, {})
    await expect(asked).rejects.toBeInstanceOf(PlaceError)
    await expect(asked).rejects.toMatchObject({ kind: "refused" })
    await expect(asked).rejects.toThrow('needs the key named "RECIPES_KEY"')
    expect(box.asks).toEqual([])
  })
})
