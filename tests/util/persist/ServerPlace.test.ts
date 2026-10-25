import { describe, expect, test, vi } from "vite-plus/test"

import { PrefStore, ServerPlace } from "spell/util/persist"

////////////////
// ## The protocol
////////////////

describe("ServerPlace", () => {
  test("loads with a GET of `<url>/load`, the store and key in its query", async () => {
    const server = new FakeServer({ "@owen/solitaire": { theme: "dark" } })
    const prefs = new PrefStore("@owen/solitaire", { place: server.place })
    expect(await prefs.load("theme")).toBe("dark")
    expect(server.asked).toEqual(["GET /api/prefs/load?store=%40owen%2Fsolitaire&key=theme"])
  })

  test("saves with a POST of `<url>/save`;  saving nothing forgets the key", async () => {
    const server = new FakeServer({})
    const prefs = new PrefStore("spellEditor", { place: server.place })
    await prefs.save("mode", "debug")
    expect(server.stores).toEqual({ spellEditor: { mode: "debug" } })
    await prefs.save("mode", undefined)
    expect(server.stores).toEqual({ spellEditor: {} })
    expect(server.bodies).toEqual([
      { store: "spellEditor", key: "mode", value: "debug" },
      { store: "spellEditor", key: "mode" }
    ])
  })

  test("lists keys with `<url>/keys`, and forgets a prefix with `<url>/forget`", async () => {
    const server = new FakeServer({ app: { "layout/left": 30, "layout/right": 70, theme: "dark" } })
    const prefs = new PrefStore("app", { place: server.place })
    expect((await prefs.loadKeysUnder("layout/")).sort()).toEqual(["layout/left", "layout/right"])
    await prefs.forgetUnder("layout/")
    expect(server.stores).toEqual({ app: { theme: "dark" } })
  })

  test("a declared default while the server keeps nothing", async () => {
    const prefs = new PrefStore("app", { place: new FakeServer({}).place }).declare("scheme", { oneOf: ["light"] })
    expect(await prefs.load("scheme")).toBe("light")
  })

  test("`update()` reads, then saves, one at a time in the page", async () => {
    const prefs = new PrefStore("app", { place: new FakeServer({}).place }).declare("visits", { type: "number" })
    const [first, second] = await Promise.all([
      prefs.update<number>("visits", (visits) => visits + 1),
      prefs.update<number>("visits", (visits) => visits + 1)
    ])
    expect([first, second]).toEqual([1, 2])
  })
})

////////////////
// ## When the server fails
////////////////

describe("ServerPlace, when the server fails", () => {
  test("NEVER throws:  offline, a read answers the default, logged", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const offline = new ServerPlace({ fetch: () => Promise.reject(new TypeError("Failed to fetch")) })
    const prefs = new PrefStore("app", { place: offline })
    expect(await prefs.load("theme", "light")).toBe("light")
    expect(await prefs.save("theme", "dark")).toBe("dark")
    expect(await prefs.loadKeysUnder()).toEqual([])
    expect(errors.mock.calls[0][0]).toMatch(/ServerPlace.load\(\):  \/api\/prefs refused `app` `theme`/)
    errors.mockRestore()
  })

  test("an error status is logged with the server's message", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const refusing = new ServerPlace({ fetch: async () => new Response("no such store", { status: 400 }) })
    expect(await new PrefStore("app", { place: refusing }).load("theme")).toBeUndefined()
    expect(String(errors.mock.calls[1][0])).toMatch(/400 .*no such store/)
    errors.mockRestore()
  })

  test("refuses a quick read, naming `load()`", () => {
    expect(() => new PrefStore("app", { place: new ServerPlace() }).get("theme")).toThrow(
      /the server, which must be waited on/
    )
  })
})

////////////////
// ## Helpers
////////////////

/** A stand-in for the page server's side of the protocol:  stores in memory, and what it was asked. */
class FakeServer {
  /** Each store's values. */
  stores: Record<string, Record<string, unknown>>
  /** Each request, `GET /api/prefs/load?...`. */
  asked: string[] = []
  /** Each POST's body. */
  bodies: unknown[] = []
  /** A place that asks this server. */
  place = new ServerPlace({ fetch: (input, init) => this.answer(urlOf(input), init) })

  constructor(stores: Record<string, Record<string, unknown>>) {
    this.stores = stores
  }

  /** The answer to a request for `url`. */
  private async answer(url: string, init?: RequestInit): Promise<Response> {
    this.asked.push(`${init?.method ?? "GET"} ${url}`)
    const { pathname, searchParams } = new URL(url, "http://localhost")
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    if (body) this.bodies.push(body)
    const storeName: string = body?.store ?? searchParams.get("store")
    const store = (this.stores[storeName] ??= {})
    switch (pathname) {
      case "/api/prefs/load":
        return Response.json({ value: store[searchParams.get("key")!] })
      case "/api/prefs/save":
        if ("value" in body) store[body.key] = body.value
        else delete store[body.key]
        return Response.json({ value: body.value })
      case "/api/prefs/keys":
        return Response.json({ keys: Object.keys(store).filter((key) => key.startsWith(searchParams.get("under")!)) })
      case "/api/prefs/forget":
        for (const key of Object.keys(store)) if (key.startsWith(body.under)) delete store[key]
        return Response.json({ keys: Object.keys(store) })
    }
    return new Response("not found", { status: 404 })
  }
}

/** The URL `fetch()` was handed, as text. */
function urlOf(input: RequestInfo | URL): string {
  return input instanceof Request ? input.url : input instanceof URL ? input.href : input
}
