import { createServer } from "node:http"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { RecipeBox, restHandler, type RestServerProps } from "spell/server/test/recipeServers"
import {
  PlaceError,
  PlaceQuery,
  Places,
  RestPlace,
  TooSoonError,
  type PlaceChange,
  type PlaceConflict,
  type PlaceRow,
  type PlaceWriteFailure,
  type RestPlaceProps
} from "spell/places"

/** Every server a test started, to close when it's done. */
const servers: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((close) => close()))
})

/** A real web server on a free port, its box, and a place for it. */
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

/** Five rows, as any server holds them. */
const FIVE_ROWS = [1, 2, 3, 4, 5].map((id) => ({ id: `r-${id}` }))

/** A fake server, `answer` saying what each request gets;  every address it's asked. */
function fakeServer(answer: (query: URLSearchParams, url: URL) => unknown): string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const address = `${input instanceof Request ? input.url : input}`
    asked.push(address)
    const url = new URL(address)
    // a real answer says where it came from
    return Object.defineProperty(Response.json(answer(url.searchParams, url)), "url", { value: address })
  })
  return asked
}

/** Every row of `place`'s `recipes`, following its next pages. */
async function everyRow(place: RestPlace): Promise<string[]> {
  const ids: string[] = []
  let at: string | undefined
  for (let reads = 0; reads < 20; reads++) {
    const answer = await place.list("recipes", at === undefined ? {} : { page: { at } }, {})
    ids.push(...answer.rows.map(({ id }) => `${id as string}`))
    at = answer.nextPage
    if (at === undefined) return ids
  }
  throw new Error("everyRow():  it never stopped")
}

/** A place on the fake server. */
const shapedPlace = (props: Partial<RestPlaceProps>) => new RestPlace({ url: "https://shapes.test", ...props })

const ALL_IDS = ["r-1", "r-2", "r-3", "r-4", "r-5"]

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

  test("a search goes to the server as its parameter, by our field's name;  one it doesn't search is left to the engine", async () => {
    const { place, box } = await served({}, { searches: { param: "search", fields: ["titles"] } })
    expect(place.describe().search).toBe("every field")
    const searched = await place.list("recipes", { search: { title: "MARG" } }, {})
    expect(searched.rows.map(({ id }) => id)).toEqual(["r-4"])
    expect(searched.handled).toEqual({ search: true })
    expect(box.asks.at(-1)!.query).toEqual({ search: "MARG" })
    const notSearched = await place.list("recipes", { search: { notes: "oven" } }, {})
    expect(notSearched.handled).toEqual({})
    expect(notSearched.rows).toHaveLength(5)
  })

  test("with no search said, the engine looks through every row itself, capitals aside", async () => {
    const { places } = await engine()
    const result = places.read({ placeName: "box", collection: "recipes", query: { search: { title: "TACOS" } } })
    await result.load()
    expect(result.contents?.map(({ id }) => id)).toEqual(["r-3"])
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

describe("RestPlace, a collection searched at its own address", () => {
  /**
   * A server shaped like GitHub's search:  `/search/users?q=` answers `{ total_count, items }`, a page at a time,
   * the next named in its `Link` header;  `/users/<login>` answers one.
   */
  async function github() {
    const asked: string[] = []
    const http = createServer((request, response) => {
      const url = new URL(request.url!, "http://here")
      asked.push(`${url.pathname}${url.search}`)
      response.setHeader("content-type", "application/json")
      if (url.pathname !== "/search/users" || !url.searchParams.get("q")) {
        response.statusCode = 422
        return response.end("{}")
      }
      const page = Number(url.searchParams.get("page") ?? 1)
      if (page === 1) {
        const next = `http://${request.headers.host}/search/users?q=${url.searchParams.get("q")}&page=2`
        response.setHeader("link", `<${next}>; rel="next"`)
      }
      response.end(JSON.stringify({ total_count: 2, items: [{ login: page === 1 ? "ryansolid" : "ryansolida" }] }))
    })
    const port = await SRV.listenPreferred(http)
    servers.push(() => new Promise((done) => (http.closeAllConnections(), http.close(() => done()))))
    const place = new RestPlace({
      url: `http://127.0.0.1:${port}`,
      can: { page: "cursor", idOf: "login" },
      collections: { users: { path: "/users{/id}", searches: { param: "q", fields: [], at: "/search/users" } } }
    })
    return { place, asked }
  }

  test("asks there with its own parameter, and takes the one list in its answer as the rows", async () => {
    const { place, asked } = await github()
    expect(place.describe().search).toBe("every field")
    const first = await place.list("users", { search: { "*": "ryan" } }, {})
    expect(first.rows).toEqual([{ login: "ryansolid" }])
    expect(first.handled).toEqual({ search: true })
    expect(asked).toEqual(["/search/users?q=ryan"])
  })

  test("its next page, a whole address, was searched too:  so the engine doesn't search again", async () => {
    const { place, asked } = await github()
    const search = { "*": "ryan" }
    const first = await place.list("users", { search }, {})
    const second = await place.list("users", { search, page: { at: first.nextPage! } }, {})
    expect(second.rows).toEqual([{ login: "ryansolida" }])
    expect(second.handled).toEqual({ search: true })
    expect(asked.at(-1)).toBe("/search/users?q=ryan&page=2")
    // the engine took it as unsearched, and its page as a place in a list it filters:  "isn't a place in the list"
    const query = new PlaceQuery({
      placeName: "github",
      place,
      collection: "users",
      query: { search, page: { at: first.nextPage! } }
    })
    expect((await query.answer(new AbortController().signal)).rows).toEqual([{ login: "ryansolida" }])
  })
})

describe("RestPlace paging, the shapes servers come in (epic `data` I35)", () => {
  afterEach(() => void vi.unstubAllGlobals())

  test.each([
    ["take", "skip"],
    ["count", "start"],
    ["$top", "$skip"],
    ["rows", "start"]
  ])("a count and a position, called %s and %s", async (limit, offset) => {
    const asked = fakeServer((query) => {
      const from = Number(query.get(offset))
      return FIVE_ROWS.slice(from, from + Number(query.get(limit)))
    })
    const place = shapedPlace({ can: { page: "offset" }, params: { limit, offset }, pageSize: 2 })
    expect(await everyRow(place)).toEqual(ALL_IDS)
    expect(asked).toHaveLength(3)
  })

  test.each([
    ["per_page", "page", 1],
    ["pageSize", "pageNumber", 1],
    ["size", "page", 0]
  ])("page numbers, called %s and %s, from %i", async (limit, offset, first) => {
    const asked = fakeServer((query) => {
      const size = Number(query.get(limit))
      const from = (Number(query.get(offset)) - first) * size
      return FIVE_ROWS.slice(from, from + size)
    })
    const place = shapedPlace({
      can: { page: "offset" },
      params: { limit, offset },
      pageSize: 2,
      pageNumbers: { first }
    })
    expect(await everyRow(place)).toEqual(ALL_IDS)
    expect(asked.map((address) => new URL(address).searchParams.get(offset))).toEqual(
      [first, first + 1, first + 2].map(String)
    )
  })

  test("only a position, its page size its own:  on until a page comes back empty, by what it got", async () => {
    const asked = fakeServer((query) => FIVE_ROWS.slice(Number(query.get("start")), Number(query.get("start")) + 2))
    const place = shapedPlace({ can: { page: "offset" }, params: { offset: "start" }, sendsNoCount: true })
    expect(await everyRow(place)).toEqual(ALL_IDS)
    expect(asked.map((address) => new URL(address).search)).toEqual(["?start=0", "?start=2", "?start=4", "?start=5"])
  })

  test("only a position, its page size said:  a short page was the last", async () => {
    const asked = fakeServer((query) => FIVE_ROWS.slice(Number(query.get("start")), Number(query.get("start")) + 2))
    const place = shapedPlace({
      can: { page: "offset" },
      params: { offset: "start" },
      sendsNoCount: true,
      pageSize: 2
    })
    expect(await everyRow(place)).toEqual(ALL_IDS)
    expect(asked).toHaveLength(3)
  })

  test("only a page's number;  a read asking for fewer takes the first of them", async () => {
    const asked = fakeServer((query) => FIVE_ROWS.slice((Number(query.get("p")) - 1) * 2, Number(query.get("p")) * 2))
    const place = shapedPlace({
      can: { page: "offset" },
      params: { offset: "p" },
      sendsNoCount: true,
      pageNumbers: { first: 1 }
    })
    expect(await everyRow(place)).toEqual(ALL_IDS)
    expect(asked.map((address) => new URL(address).search)).toEqual(["?p=1", "?p=2", "?p=3", "?p=4"])
    const fewer = await place.list("recipes", { page: { size: 1 } }, {})
    expect(fewer.rows.map(({ id }) => id)).toEqual(["r-1"])
  })

  test("a token in its answer, sent back under another name", async () => {
    const asked = fakeServer((query) => {
      const from = Number(query.get("pageToken") ?? 0)
      const end = from + 2
      return { items: FIVE_ROWS.slice(from, end), ...(end < 5 && { nextPageToken: `${end}` }) }
    })
    const place = shapedPlace({
      can: { page: "cursor" },
      allCollections: { rowsAt: "items", nextAt: "nextPageToken" },
      params: { cursor: "pageToken" }
    })
    expect(await everyRow(place)).toEqual(ALL_IDS)
    expect(new URL(asked[1]!).search).toBe("?pageToken=2")
  })

  test("a cursor inside its answer, sent back as `cursor`:  empty means the last", async () => {
    fakeServer((query) => {
      const from = Number(query.get("cursor") ?? 0)
      const end = from + 2
      return { items: FIVE_ROWS.slice(from, end), meta: { next_cursor: end < 5 ? `${end}` : "" } }
    })
    const place = shapedPlace({
      can: { page: "cursor" },
      allCollections: { rowsAt: "items", nextAt: "meta.next_cursor" }
    })
    expect(await everyRow(place)).toEqual(ALL_IDS)
  })

  test.each([
    ["a whole address", (end: number) => `https://shapes.test/recipes?at=${end}`],
    ["a path", (end: number) => `/recipes?at=${end}`],
    ["only its query", (end: number) => `?at=${end}`]
  ])("a next page in its answer, as %s", async (_kind, written) => {
    const asked = fakeServer((query) => {
      const from = Number(query.get("at") ?? 0)
      const end = from + 2
      return { items: FIVE_ROWS.slice(from, end), next: end < 5 ? written(end) : null }
    })
    const place = shapedPlace({ can: { page: "cursor" }, allCollections: { rowsAt: "items", nextAt: "next" } })
    expect(await everyRow(place)).toEqual(ALL_IDS)
    expect(asked[1]).toBe("https://shapes.test/recipes?at=2")
  })

  /** A server that gives what comes after `starting_after`, two at a time unless told, saying if there's more. */
  const afterLastId = (rows: Array<Record<string, unknown>> = FIVE_ROWS, idField = "id") =>
    fakeServer((query) => {
      const after = query.get("starting_after")
      const from = after === null ? 0 : rows.findIndex((row) => `${row[idField] as string}` === after) + 1
      const end = from + Number(query.get("limit") ?? 2)
      return { data: rows.slice(from, end), has_more: end < rows.length, meta: { has_more: end < rows.length } }
    })

  /** A place that asks for what comes after the last row's id. */
  const byLastId = (props: Partial<RestPlaceProps> = {}) =>
    shapedPlace({
      can: { page: "cursor" },
      allCollections: { rowsAt: "data" },
      params: { cursor: "starting_after" },
      pagesByLastId: { moreAt: "has_more" },
      pageSize: 2,
      ...props
    })

  test("the last row's id, until its answer says there's no more:  no request past the end", async () => {
    const asked = afterLastId()
    expect(await everyRow(byLastId())).toEqual(ALL_IDS)
    expect(asked.map((address) => new URL(address).search)).toEqual([
      "?limit=2",
      "?limit=2&starting_after=r-2",
      "?limit=2&starting_after=r-4"
    ])
  })

  test("what says there's more can be inside its answer", async () => {
    const asked = afterLastId()
    expect(await everyRow(byLastId({ pagesByLastId: { moreAt: "meta.has_more" } }))).toEqual(ALL_IDS)
    expect(asked).toHaveLength(3)
  })

  test("a full last page isn't read past when its answer says there's no more", async () => {
    const asked = afterLastId(FIVE_ROWS.slice(0, 4))
    expect(await everyRow(byLastId())).toEqual(ALL_IDS.slice(0, 4))
    expect(asked).toHaveLength(2)
  })

  test("nothing said about more, its size known:  a short page was the last", async () => {
    const asked = afterLastId()
    expect(await everyRow(byLastId({ pagesByLastId: {} }))).toEqual(ALL_IDS)
    expect(asked).toHaveLength(3)
  })

  test("nothing said about more, its size not known:  on until a page comes back empty", async () => {
    const asked = afterLastId()
    const place = byLastId({ pagesByLastId: {}, pageSize: undefined, params: { cursor: "starting_after", limit: "n" } })
    expect(await everyRow(place)).toEqual(ALL_IDS)
    expect(asked.map((address) => new URL(address).searchParams.get("n"))).toEqual(["100", "100", "100", "100"])
  })

  test("told no count, it asks only what comes after", async () => {
    const asked = afterLastId()
    expect(await everyRow(byLastId({ sendsNoCount: true }))).toEqual(ALL_IDS)
    expect(new URL(asked[1]!).search).toBe("?starting_after=r-2")
  })

  test("an empty page was the last, even if it says there's more", async () => {
    fakeServer(() => ({ data: [], has_more: true }))
    expect(await everyRow(byLastId())).toEqual([])
  })

  test("the id goes by the server's name for it, an id that looks like an address staying an id", async () => {
    const rows = ["https://shapes.test/a", "https://shapes.test/b", "https://shapes.test/c"].map((key) => ({ key }))
    const asked = afterLastId(rows, "key")
    const place = byLastId({ can: { page: "cursor", idOf: "key" } })
    await everyRow(place)
    expect(new URL(asked[1]!).pathname).toBe("/recipes")
    expect(new URL(asked[1]!).searchParams.get("starting_after")).toBe("https://shapes.test/b")
  })

  test("a last row with no id throws, rather than quietly reading one page", async () => {
    fakeServer(() => ({ data: [{ name: "a" }, { name: "b" }], has_more: true }))
    await expect(byLastId().list("recipes", {}, {})).rejects.toThrow(/has no "id"/)
  })

  test("a cursor that starts with a slash is still a cursor", async () => {
    const asked = fakeServer((query) =>
      query.get("cursor")
        ? { items: FIVE_ROWS.slice(2), next: null }
        : { items: FIVE_ROWS.slice(0, 2), next: "/AbC+x/9==" }
    )
    const place = shapedPlace({ can: { page: "cursor" }, allCollections: { rowsAt: "items", nextAt: "next" } })
    expect(await everyRow(place)).toEqual(ALL_IDS)
    expect(new URL(asked[1]!).searchParams.get("cursor")).toBe("/AbC+x/9==")
  })
})

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

  test("each question goes under the name the server calls it (epic `data` I35)", async () => {
    const { place, box } = await served(
      {},
      {
        can: { page: "offset", sort: "every field", select: "every field" },
        params: { limit: "per", offset: "from", sort: "order", select: "only" },
        pageSize: 2
      }
    )
    await place.list("recipes", { sort: [{ field: "title" }], select: ["title"] }, {})
    expect(box.asks.at(-1)!.query).toEqual({ order: "name", only: "name,id", per: "2", from: "0" })
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

  test("what the server answers:  a 4xx is known, a 5xx, a 429 or a rate limit's 403 isn't, so that one resends", async () => {
    const { place } = await served()
    const change = (fields: PlaceRow): PlaceChange[] => [{ kind: "update", collection: "recipes", id: "r-1", fields }]
    await expect(place.apply(change({ refuse: true }), {})).rejects.toMatchObject({ kind: "refused" })
    await expect(
      place.apply([{ kind: "update", collection: "recipes", id: "none", fields: {} }], {})
    ).rejects.toMatchObject({ kind: "not found" })

    // a 403 whose rate limit has no requests left is GitHub's "too soon" (epic `data` I92):  no answer, not refused
    const outOfRequests = { "x-ratelimit-remaining": "0" }
    const fakes = [
      ...[503, 429].map((status) => new Response("", { status, statusText: "busy" })),
      new Response("", { status: 403, statusText: "rate limit exceeded", headers: outOfRequests })
    ]
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

describe("what's too much to keep (epic `data` T123)", () => {
  test("a list longer than the place keeps at once is cut there, and said", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ ids: Array.from({ length: 60_000 }, (_each, index) => index) }))
    const place = new RestPlace({
      url: "https://example.com",
      collections: { things: { rowsAt: "ids" } },
      can: { idOf: "id" }
    })
    const { rows, notes } = await place.list("things", {}, {})
    expect(rows).toHaveLength(50_000)
    expect(notes![0]).toMatch(/60000 rows, and only the first 50000/)
    vi.unstubAllGlobals()
  })
})

describe("where a key goes (epic `data` T73)", () => {
  const KEY = "s3cret key&more"
  const keyed = { keyNamed: "RECIPES_KEY", keyFrom: () => KEY }

  test("said nothing, as `Authorization: Bearer`", async () => {
    const { box, place } = await served({}, keyed)
    await place.list("recipes", {}, {})
    expect(box.asks[0]!.headers.authorization).toBe(`Bearer ${KEY}`)
    expect(box.asks[0]!.query).toEqual({})
  })

  test("in a header of its own, as it is, and no `Authorization` beside it", async () => {
    const { box, place } = await served({}, { ...keyed, keyGoes: { header: "X-Api-Key" } })
    await place.list("recipes", {}, {})
    expect(box.asks[0]!.headers["x-api-key"]).toBe(KEY)
    expect(box.asks[0]!.headers.authorization).toBeUndefined()
  })

  test("in the address, beside the rest of the query, on a read and on a write", async () => {
    const { box, place } = await served(
      {},
      { ...keyed, keyGoes: { inAddress: "api_key" }, can: { sort: "every field" } }
    )
    await place.list("recipes", { sort: [{ field: "title" }] }, {})
    expect(box.asks[0]!.query).toEqual({ api_key: KEY, sort: "name" })
    await place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Soup" } }], {})
    expect(box.asks[1]).toMatchObject({ method: "PATCH", path: "/recipes/r-1", query: { api_key: KEY } })
    expect(box.asks[1]!.headers.authorization).toBeUndefined()
  })

  test("a next page's address that already holds it asks it once", async () => {
    const seen: string[] = []
    const real = globalThis.fetch
    const next = "https://example.com/recipes?api_key=old&page=2"
    globalThis.fetch = ((url: string) => {
      seen.push(url)
      return Promise.resolve(Response.json([], { headers: seen.length === 1 ? { link: `<${next}>; rel="next"` } : {} }))
    }) as typeof fetch
    try {
      const place = new RestPlace({
        url: "https://example.com",
        ...keyed,
        keyGoes: { inAddress: "api_key" },
        can: { page: "cursor" }
      })
      await place.list("recipes", { page: { at: next } }, {})
      expect(new URL(seen[0]!).searchParams.getAll("api_key")).toEqual([KEY])
    } finally {
      globalThis.fetch = real
    }
  })

  test("a failure names the address with its key hidden, however it's written there", async () => {
    const real = globalThis.fetch
    const place = new RestPlace({ url: "https://example.com", ...keyed, keyGoes: { inAddress: "api_key" } })
    for (const status of [500, 400]) {
      globalThis.fetch = (() => Promise.resolve(new Response("", { status, statusText: "no" }))) as typeof fetch
      try {
        const failure = (await place.list("recipes", {}, {}).catch((error: unknown) => error)) as Error
        expect(failure.message).toContain("[its key]")
        expect(failure.message).not.toMatch(/s3cret/)
      } finally {
        globalThis.fetch = real
      }
    }
  })
})

describe("a rate limit, in a running program (epic `data` T110)", () => {
  /** A place whose server answers each of `answers` in turn, then an empty list, counting what's sent. */
  function answering(...answers: Response[]) {
    const sent = { count: 0 }
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        // a place from an earlier test, still resending, isn't asking this one
        if (!`${url}`.startsWith("https://example.com/")) return Promise.resolve(Response.json([]))
        sent.count++
        return Promise.resolve(answers.shift() ?? Response.json([]))
      })
    )
    return { sent, place: new RestPlace({ url: "https://example.com", collections: { recipes: {} } }) }
  }

  afterEach(() => void vi.unstubAllGlobals())

  test("told to wait a long while, nothing more is sent until then, and it says when", async () => {
    const reset = Math.round(Date.now() / 1000) + 600
    const limited = { "x-ratelimit-remaining": "0", "x-ratelimit-reset": `${reset}` }
    const { sent, place } = answering(new Response("", { status: 403, statusText: "limit", headers: limited }))
    await expect(place.list("recipes", {}, {})).rejects.not.toBeInstanceOf(PlaceError)
    const failure = (await place.list("recipes", {}, {}).catch((error: unknown) => error)) as TooSoonError
    expect(failure).toBeInstanceOf(TooSoonError)
    expect(failure.retryAt).toBe(reset * 1000)
    expect(failure.message).toMatch(/asked again at \d\d:\d\d/)
    expect(sent.count).toBe(1)
  })

  test("an answer saying it was the last request holds the next one back too", async () => {
    const reset = Math.round(Date.now() / 1000) + 600
    const last = { "x-ratelimit-remaining": "0", "x-ratelimit-reset": `${reset}` }
    const { sent, place } = answering(Response.json([], { headers: last }))
    await place.list("recipes", {}, {})
    await expect(place.list("recipes", {}, {})).rejects.toBeInstanceOf(TooSoonError)
    expect(sent.count).toBe(1)
  })

  test("told to wait a moment, the next read waits, then asks", async () => {
    const started = Date.now()
    const { sent, place } = answering(new Response("", { status: 429, headers: { "retry-after": "1" } }))
    await expect(place.list("recipes", {}, {})).rejects.not.toBeInstanceOf(TooSoonError)
    await expect(place.list("recipes", {}, {})).resolves.toMatchObject({ rows: [] })
    expect(Date.now() - started).toBeGreaterThanOrEqual(900)
    expect(sent.count).toBe(2)
  })

  test("past the time it said, it asks", async () => {
    const reset = Math.round(Date.now() / 1000) - 1
    const { sent, place } = answering(
      new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": `${reset}` } })
    )
    await expect(place.list("recipes", {}, {})).rejects.toBeDefined()
    await expect(place.list("recipes", {}, {})).resolves.toMatchObject({ rows: [] })
    expect(sent.count).toBe(2)
  })
})
