import { createServer } from "node:http"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { graphHandler, RecipeBox } from "spell/server/test/recipeServers"
import { GraphPlace, PlaceError, Places, type GraphPlaceProps } from "spell/util/places"

/** Every server a test started, to close when it's done. */
const servers: (() => Promise<void>)[] = []

afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(servers.splice(0).map((close) => close()))
})

/** How our recipes map onto its schema. */
const RECIPES = {
  list: "recipes",
  one: "recipe",
  paging: "connection",
  filter: "RecipeFilter",
  fields: ["id", "title: name", "cuisine", "servings", "notes"],
  insert: { mutation: "addRecipe", input: "RecipeInput!" },
  update: { mutation: "changeRecipe", id: "ID!", input: "RecipePatch!" },
  delete: { mutation: "removeRecipe", id: "ID!" }
} as const

/** A real GraphQL service on a free port, its box, and a place for it. */
async function served(props: Partial<GraphPlaceProps> = {}) {
  const box = new RecipeBox()
  const http = createServer(SRV.toListener(graphHandler(box)))
  const port = await SRV.listenPreferred(http)
  servers.push(
    () =>
      new Promise((done) => {
        http.closeAllConnections()
        http.close(() => done())
      })
  )
  const place = new GraphPlace({
    url: `http://127.0.0.1:${port}/graphql`,
    collections: { recipes: RECIPES },
    can: { filter: ["cuisine"] },
    ...props
  })
  return { box, place }
}

/** A place whose every answer is `reply`, as fixed. */
function answering(reply: unknown, init?: ResponseInit) {
  const fetched = vi.fn(async () => new Response(JSON.stringify(reply), init))
  vi.stubGlobal("fetch", fetched)
  return new GraphPlace({ url: "http://nowhere/graphql", collections: { recipes: RECIPES } })
}

describe("GraphPlace.list()", () => {
  test("asks for only the fields wanted, and the id, under our names", async () => {
    const { place, box } = await served()
    const { rows, handled } = await place.list("recipes", { select: ["title"], page: { size: 2 } }, {})
    expect(rows).toEqual([
      { id: "r-1", title: "Tomato soup" },
      { id: "r-2", title: "Dal" }
    ])
    expect(handled).toEqual({ select: true })
    const { query, variables } = box.asks[0]!.body as { query: string; variables: object }
    expect(query).toBe(
      "query List($first: Int) { recipes(first: $first) { edges { node { id title: name } } pageInfo { hasNextPage endCursor } } }"
    )
    expect(variables).toEqual({ first: 2 })
  })

  test("nothing selected:  every field in its mapping", async () => {
    const { place } = await served()
    const { rows } = await place.list("recipes", { page: { size: 1 } }, {})
    expect(Object.keys(rows[0]!)).toEqual(["id", "title", "cuisine", "servings", "notes"])
  })

  test("a field it wasn't told of throws, so no name from a query reaches a query's text", async () => {
    const { place, box } = await served()
    await expect(place.list("recipes", { select: ["id } evil { id"] }, {})).rejects.toThrow(
      'has no field "id } evil { id";  add it to its `fields`'
    )
    expect(box.asks).toEqual([])
  })

  test("a filter it says it can do goes in a variable, by the server's names", async () => {
    const { place, box } = await served()
    const { rows, handled } = await place.list("recipes", { filter: { cuisine: "Indian" } }, {})
    expect(rows.map(({ id }) => id)).toEqual(["r-2", "r-5"])
    expect(handled).toEqual({ filter: true })
    expect((box.asks[0]!.body as { variables: object }).variables).toMatchObject({ filter: { cuisine: "Indian" } })
  })

  test("a filter it can't do is left to the engine, which says so by what it's handed", async () => {
    const { place } = await served()
    const result = new Places()
      .add("box", place)
      .read({ placeName: "box", collection: "recipes", query: { filter: { servings: 2 } } })
    await result.load()
    expect(result.contents!.map(({ id }) => id)).toEqual(["r-4"])
    expect(result.handled).toEqual({})
    result.leave()
  })

  test("pages by its connection's cursor", async () => {
    const { place } = await served()
    const first = await place.list("recipes", { page: { size: 3 } }, {})
    expect(first.nextPage).toBe("3")
    const second = await place.list("recipes", { page: { size: 3, at: first.nextPage! } }, {})
    expect(second.rows.map(({ id }) => id)).toEqual(["r-4", "r-5"])
    expect(second.nextPage).toBeUndefined()
  })

  test("a page by offset, from fixed replies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: { recipes: [{ id: "a" }, { id: "b" }] } })))
    )
    const place = new GraphPlace({
      url: "http://nowhere/graphql",
      collections: { recipes: { list: "recipes", paging: "offset", fields: ["id"] } }
    })
    expect(place.describe().page).toBe("offset")
    expect((await place.list("recipes", { page: { size: 2, at: "4" } }, {})).nextPage).toBe("6")
  })

  test("an answer that isn't a list says how to map it", async () => {
    const { paging: _paging, ...unpaged } = RECIPES
    const { place } = await served({ collections: { recipes: unpaged } })
    await expect(place.list("recipes", {}, {})).rejects.toThrow("say how it pages with `paging`")
  })

  test("an abort really stops the request", async () => {
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
})

describe("GraphPlace.getMany()", () => {
  test("one query, one aliased field per id;  one it doesn't hold is left out", async () => {
    const { place, box } = await served()
    const rows = await place.getMany("recipes", ["r-2", "gone", "r-1"], { select: ["title"] })
    expect(rows).toEqual([
      { id: "r-2", title: "Dal" },
      { id: "r-1", title: "Tomato soup" }
    ])
    expect(box.asks).toHaveLength(1)
  })

  test("with no root field for one, it lists and looks", async () => {
    const { place } = await served({ collections: { recipes: { ...RECIPES, one: undefined as never } } })
    const rows = await place.getMany("recipes", ["r-2"], {})
    expect(rows.map(({ id }) => id)).toEqual(["r-2"])
  })
})

describe("GraphPlace.apply()", () => {
  test("each kind of write is the mutation its mapping names, by the server's names, with its change's id", async () => {
    const { place, box } = await served()
    const { rows } = await place.apply(
      [
        { kind: "insert", collection: "recipes", fields: { id: "r-9", title: "Stew" }, changeId: "c-1" },
        { kind: "update", collection: "recipes", id: "r-9", fields: { title: "Broth" }, changeId: "c-2" },
        { kind: "delete", collection: "recipes", id: "r-1", changeId: "c-3" }
      ],
      {}
    )
    expect(rows.map(({ title }) => title)).toEqual(["Stew", "Broth"])
    expect(box.recipes.get("r-9")!.name).toBe("Broth")
    expect(box.recipes.has("r-1")).toBe(false)
    expect(box.asks[0]!.headers["idempotency-key"]).toBe("c-1")
    expect(box.asks[1]!.body).toMatchObject({ variables: { id: "r-9", input: { name: "Broth" } } })
  })

  test("what it writes is what it says it can", async () => {
    const { list, fields, update } = RECIPES
    const { place } = await served({ collections: { recipes: { list, fields, update } } })
    expect(place.describe().write).toEqual(["update"])
    await expect(place.apply([{ kind: "delete", collection: "recipes", id: "r-1" }], {})).rejects.toMatchObject({
      kind: "refused"
    })
  })

  test("through the engine:  a write shows at once, and the place gets it", async () => {
    const { place, box } = await served()
    const places = new Places({ wait: 0, retry: 5 }).add("box", place)
    const pending = places.pendingFor("box")
    pending.setField({ collection: "recipes", id: "r-1", field: "title", value: "Mine", was: "Tomato soup" })
    await vi.waitFor(() => expect(pending.hasPending).toBe(false))
    expect(box.recipes.get("r-1")!.name).toBe("Mine")
  })
})

describe("GraphPlace, what it's answered", () => {
  test("`errors` are an answer, by their code:  so nothing resends", async () => {
    const { place } = await served()
    await expect(
      place.apply([{ kind: "update", collection: "recipes", id: "none", fields: {} }], {})
    ).rejects.toMatchObject({ kind: "not found" })
    await expect(
      place.apply([{ kind: "insert", collection: "recipes", fields: { refuse: true } }], {})
    ).rejects.toMatchObject({ kind: "refused" })
  })

  test("a code that says someone got there first is out of date", async () => {
    const place = answering({ errors: [{ message: "moved on", extensions: { code: "CONFLICT" } }] })
    await expect(place.list("recipes", {}, {})).rejects.toMatchObject({ kind: "out of date" })
  })

  test("a 5xx is no answer, so a change resends;  a 4xx is one", async () => {
    await expect(answering({}, { status: 503 }).list("recipes", {}, {})).rejects.not.toBeInstanceOf(PlaceError)
    await expect(answering({}, { status: 400 }).list("recipes", {}, {})).rejects.toMatchObject({ kind: "refused" })
  })

  test("a place that needs a key refuses, by its name", async () => {
    const { place, box } = await served({ keyNamed: "RECIPES_KEY" })
    await expect(place.list("recipes", {}, {})).rejects.toThrow('needs the key named "RECIPES_KEY"')
    expect(box.asks).toEqual([])
  })
})

describe("GraphPlace.call()", () => {
  test("runs what's named in its mapping, its input as variables", async () => {
    const { place } = await served({
      operations: { oneRecipe: "query One($id: ID!) { recipe(id: $id) { name } }" }
    })
    expect(await place.call("oneRecipe", { id: "r-2" }, {})).toEqual({ recipe: { name: "Dal" } })
  })

  test("one it wasn't told of is `not found`", async () => {
    const { place } = await served()
    await expect(place.call("nothing", {}, {})).rejects.toMatchObject({ kind: "not found" })
  })
})

describe("GraphPlace.listMany()", () => {
  test("several lists in ONE query, each its own answer", async () => {
    const { box, place } = await served()
    const asks = box.asks?.length ?? 0
    const [all, some] = await place.listMany(
      [
        { collection: "recipes", query: { select: ["title"] } },
        { collection: "recipes", query: { filter: { cuisine: "Thai" } } }
      ],
      {}
    )
    expect((box.asks?.length ?? 0) - asks).toBeLessThanOrEqual(1)
    expect(all!.rows.length).toBeGreaterThan(some!.rows.length)
    expect(Object.keys(all!.rows[0]!).sort()).toEqual(["id", "title"])
    expect(some!.handled.filter).toBe(true)
  })

  test("addCollection():  another collection, made known later;  one it has stays as it is", () => {
    const place = answering({ data: {} })
    place.addCollection("tags", { list: "tags", fields: ["id"] })
    expect(() => place.addCollection("recipes", { list: "other", fields: ["id"] })).not.toThrow()
  })
})
