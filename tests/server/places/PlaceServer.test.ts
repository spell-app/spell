import { createServer } from "node:http"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { SRV, type Handler } from "spell/server"
import { ChunkFiles, FolderPlace, PlaceKeys, PlaceServer } from "spell/server/places"
import { ask, serveHandler, type Served } from "spell/server/test/serve"
import { JsonChunks, MemoryPlace, Places, RemotePlace, RestPlace, type Place } from "spell/util/places"

import { newFolder, removeFolders } from "./places.helpers"

/** The token these servers want. */
const TOKEN = "this-runs-token"

/** Every server a test started. */
const closes: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(closes.splice(0).map((close) => close()))
  removeFolders()
})

/** Serve `handler`, closed when the test is done. */
async function served(handler: Handler): Promise<Served> {
  const server = await serveHandler(handler)
  closes.push(server.close)
  return server
}

/** Serve these places on a port of their own, behind a guard:  and a `RemotePlace` on the first one's name. */
async function placeServer(places: Record<string, Place>, keys?: PlaceKeys) {
  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  new PlaceServer({ places, ...(keys && { keys }) }).route(router, guard)
  const server = createServer(SRV.toListener(router.handle))
  const port = await SRV.listenPreferred(server)
  guard.allowPort(port)
  closes.push(
    () =>
      new Promise((done) => {
        server.closeAllConnections()
        server.close(() => done())
      })
  )
  const name = Object.keys(places)[0]!
  return { port, remote: new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/${name}`, token: TOKEN }) }
}

/** A POST with the right token, as a page would send. */
function posted(port: number, path: string, body: object, headers: Record<string, string> = {}) {
  return ask(port, "POST", path, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      host: `127.0.0.1:${port}`,
      "x-server-token": TOKEN,
      ...headers
    }
  })
}

describe("PlaceServer and RemotePlace", () => {
  /** A real folder, served. */
  async function folder() {
    const root = newFolder()
    const place = new FolderPlace({
      storage: new ChunkFiles({ root }),
      format: new JsonChunks({ summaries: { recipes: ["title"] } })
    })
    await place.apply(
      [
        { kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal", notes: "Temper last" } },
        { kind: "insert", collection: "recipes", id: "r-2", fields: { title: "Soup", notes: "Roast first" } }
      ],
      {}
    )
    return { root, place, file: join(root, "recipes", "r-1.json"), ...(await placeServer({ recipes: place })) }
  }

  test("a browser's place reads a folder through it, bodies only when asked", async () => {
    const { remote } = await folder()
    const { rows, handled } = await remote.list("recipes", {}, {})
    expect(rows[0]).toEqual({ id: "r-1", title: "Dal" })
    expect(handled).toEqual({})
    expect((await remote.list("recipes", { select: ["notes"] }, {})).rows[0]!.notes).toBe("Temper last")
    expect(await remote.getMany("recipes", ["r-2"], {})).toEqual([{ id: "r-2", title: "Soup", notes: "Roast first" }])
  })

  test("it writes through, and a file edited on the disk is what it next answers", async () => {
    const { remote, file } = await folder()
    await remote.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Mine" } }], {})
    expect(JSON.parse(readFileSync(file, "utf8")).title).toBe("Mine")

    writeFileSync(file, JSON.stringify({ title: "Edited in VS Code" }))
    expect((await remote.list("recipes", {}, {})).rows[0]!.title).toBe("Edited in VS Code")
  })

  test("what a place throws comes back as itself:  out of date, not found, refused", async () => {
    const { remote, file } = await folder()
    await remote.list("recipes", {}, {})
    const version = remote.versionOf("recipes", "r-1")!
    expect(version).toBeDefined()
    writeFileSync(file, JSON.stringify({ title: "Theirs, and it's longer" }))
    await expect(
      remote.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "x" }, version }], {})
    ).rejects.toMatchObject({ kind: "out of date" })
    await expect(
      remote.apply([{ kind: "update", collection: "recipes", id: "nope", fields: { title: "x" } }], {})
    ).rejects.toMatchObject({ kind: "not found" })

    const readOnly = new MemoryPlace({ capabilities: { write: "none" } })
    const { remote: refusing } = await placeServer({ box: readOnly })
    await expect(refusing.apply([{ kind: "insert", collection: "x", id: "1", fields: {} }], {})).rejects.toMatchObject({
      kind: "refused"
    })
  })

  test("the per-field merge works through it, on what a file changed on the disk", async () => {
    const { remote, file } = await folder()
    const places = new Places({ wait: 0, retry: 5 }).add("box", remote)
    await remote.list("recipes", {}, {})
    writeFileSync(file, JSON.stringify({ title: "Dal", notes: "Their notes, which are longer" }))
    const pending = places.pendingFor("box")
    pending.setField({ collection: "recipes", id: "r-1", field: "title", value: "Mine", was: "Dal" })
    await vi.waitFor(() => expect(pending.hasPending).toBe(false))
    expect(JSON.parse(readFileSync(file, "utf8"))).toMatchObject({
      title: "Mine",
      notes: "Their notes, which are longer"
    })
  })

  test("a change sent again with the same id is made once, and answered the same", async () => {
    const memory = new MemoryPlace({ collections: { n: [{ id: "a", count: 0 }] } })
    const apply = vi.spyOn(memory, "apply")
    const { remote } = await placeServer({ n: memory })
    const change = { kind: "update", collection: "n", id: "a", fields: { count: 1 }, changeId: "ch-1" } as const
    const first = await remote.apply([change], {})
    const again = await remote.apply([change], {})
    expect(apply).toHaveBeenCalledTimes(1)
    expect(again.rows).toEqual(first.rows)
    expect(first.rows[0]).toMatchObject({ count: 1 })
  })

  test("changesSince goes through;  a place with none says so", async () => {
    const { remote, file } = await folder()
    const { version } = await remote.list("recipes", {}, {})
    writeFileSync(file, JSON.stringify({ title: "Heard" }))
    expect((await remote.changesSince("recipes", version!, {})).rows[0]!.title).toBe("Heard")
  })

  test("a place's operations go through `call()`", async () => {
    const memory = new MemoryPlace({ operations: { twice: (input) => (input as number) * 2 } })
    const { remote } = await placeServer({ n: memory })
    expect(await remote.call("twice", 21, {})).toBe(42)
    await expect(remote.call("nope", 1, {})).rejects.toMatchObject({ kind: "not found" })
  })

  test("a place failing is no answer, so a change resends", async () => {
    const memory = new MemoryPlace()
    vi.spyOn(memory, "list").mockRejectedValueOnce(new Error("the database is down"))
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    const { remote } = await placeServer({ n: memory })
    const failure = await remote.list("n", {}, {}).catch((error: unknown) => error)
    expect((failure as { kind?: string }).kind).toBeUndefined()
    expect((failure as Error).message).toContain("500")
    logged.mockRestore()
  })

  test("a hung-up asker's read is aborted", async () => {
    const memory = new MemoryPlace()
    let signal: AbortSignal | undefined
    vi.spyOn(memory, "list").mockImplementation((_collection, _query, { signal: given } = {}) => {
      signal = given
      return new Promise((_done, fail) => given!.addEventListener("abort", () => fail(given!.reason as Error)))
    })
    const { remote } = await placeServer({ n: memory })
    const stop = new AbortController()
    const reading = remote.list("n", {}, { signal: stop.signal })
    await vi.waitFor(() => expect(signal).toBeDefined())
    stop.abort(new DOMException("no longer wanted", "AbortError"))
    await expect(reading).rejects.toBeDefined()
    await vi.waitFor(() => expect(signal!.aborted).toBe(true))
  })
})

describe("PlaceServer's guard", () => {
  test("no token, a wrong one, another site's origin or another host:  403, reads too", async () => {
    const { port } = await placeServer({ n: new MemoryPlace() })
    const path = "/api/places/n/list"
    const body = { collection: "c" }
    expect((await posted(port, path, body)).status).toBe(200)
    expect((await posted(port, path, body, { "x-server-token": "wrong" })).status).toBe(403)
    expect((await posted(port, path, body, { origin: "https://evil.example" })).status).toBe(403)
    expect((await posted(port, path, body, { host: "evil.example" })).status).toBe(403)
    const noToken = await ask(port, "POST", path, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", host: `127.0.0.1:${port}` }
    })
    expect(noToken.status).toBe(403)
    const describing = await ask(port, "GET", "/api/places/n", { headers: { host: `127.0.0.1:${port}` } })
    expect(describing.status).toBe(403)
  })

  test("a stale token is no answer, so a change isn't dropped", async () => {
    const { port } = await placeServer({ n: new MemoryPlace() })
    const stale = new RemotePlace({ url: `http://127.0.0.1:${port}/api/places/n`, token: "an-older-run" })
    const failure = await stale.list("c", {}, {}).catch((error: unknown) => error)
    expect((failure as { kind?: string }).kind).toBeUndefined()
  })

  test("a place not served is 404;  nor is anything on the object's prototype a place", async () => {
    const { port } = await placeServer({ n: new MemoryPlace() })
    expect((await posted(port, "/api/places/nope/list", { collection: "c" })).status).toBe(404)
    expect((await posted(port, "/api/places/constructor/list", { collection: "c" })).status).toBe(404)
  })

  test("a request that names no collection is 400", async () => {
    const { port } = await placeServer({ n: new MemoryPlace() })
    expect((await posted(port, "/api/places/n/list", {})).status).toBe(400)
  })
})

describe("keys", () => {
  const KEY = "sk-very-secret-value"

  /** A service wanting a key, which echoes it back every way a careless one might. */
  async function carelessService() {
    const heard: (string | undefined)[] = []
    const service = await served((request, reply) => {
      const authorization = request.get("authorization")
      heard.push(authorization)
      reply.set("X-Echo", `${authorization}`)
      if (request.path === "/refusing") {
        return void reply.status(422).json({ error: `refused for ${authorization}` })
      }
      if (authorization !== `Bearer ${KEY}`) return void reply.status(401).json({ error: "no key" })
      reply.json([{ id: "a", title: `made with ${authorization}` }])
    })
    return { heard, service }
  }

  test("the server side sends the key;  the browser's answer never holds it", async () => {
    const { heard, service } = await carelessService()
    const keys = new PlaceKeys({ names: ["COOKBOOK_KEY"], from: { COOKBOOK_KEY: KEY } })
    const place = new RestPlace({
      url: service.base,
      keyNamed: "COOKBOOK_KEY",
      keyFrom: keys.keyNamed,
      collections: { recipes: { path: "/recipes{/id}" } }
    })
    const { port } = await placeServer({ cookbook: place }, keys)

    const answer = await posted(port, "/api/places/cookbook/list", { collection: "recipes" })
    expect(heard).toEqual([`Bearer ${KEY}`])
    expect(answer.status).toBe(200)
    expect(JSON.stringify(answer)).not.toContain(KEY)
    expect(answer.text).toContain("[the key COOKBOOK_KEY]")
  })

  test("nor does an error, or what a place says it can do", async () => {
    const { service } = await carelessService()
    const keys = new PlaceKeys({ names: ["COOKBOOK_KEY"], from: { COOKBOOK_KEY: KEY } })
    const place = new RestPlace({
      url: service.base,
      keyNamed: "COOKBOOK_KEY",
      keyFrom: keys.keyNamed,
      collections: { recipes: { path: "/refusing" } }
    })
    vi.spyOn(place, "list").mockRejectedValueOnce(new Error(`it failed with ${KEY}`))
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    const { port } = await placeServer({ cookbook: place }, keys)

    const failed = await posted(port, "/api/places/cookbook/list", { collection: "recipes" })
    expect(failed.status).toBe(500)
    expect(failed.text).not.toContain(KEY)
    expect(JSON.stringify(logged.mock.calls)).not.toContain(KEY)
    logged.mockRestore()

    const refused = await posted(port, "/api/places/cookbook/list", { collection: "recipes" })
    expect(refused.status).toBe(422)
    expect(refused.text).not.toContain(KEY)

    const describing = await ask(port, "GET", "/api/places/cookbook", {
      headers: { host: `127.0.0.1:${port}`, "x-server-token": TOKEN }
    })
    expect(describing.status).toBe(200)
    expect(describing.text).not.toContain(KEY)
  })

  test("a place naming a key refuses with no server side holding it, saying so", async () => {
    const place = new RestPlace({ url: "http://127.0.0.1:1", keyNamed: "COOKBOOK_KEY" })
    await expect(place.list("recipes", {}, {})).rejects.toMatchObject({ kind: "refused" })
    const unset = new PlaceKeys({ names: ["COOKBOOK_KEY"], from: {} })
    const withNone = new RestPlace({ url: "http://127.0.0.1:1", keyNamed: "COOKBOOK_KEY", keyFrom: unset.keyNamed })
    await expect(withNone.list("recipes", {}, {})).rejects.toMatchObject({ kind: "refused" })
  })

  test("PlaceKeys prints only the names", () => {
    const keys = new PlaceKeys({ names: ["COOKBOOK_KEY"], from: { COOKBOOK_KEY: KEY } })
    expect(JSON.stringify(keys)).toBe(`["COOKBOOK_KEY"]`)
    expect(`${keys}`).not.toContain(KEY)
    expect(keys.keyNamed("COOKBOOK_KEY")).toBe(KEY)
    expect(keys.keyNamed("OTHER")).toBeUndefined()
  })
})
