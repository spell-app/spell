import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ServerCompileStore } from "spell/app/app/ServerCompileStore"

describe("ServerCompileStore", () => {
  afterEach(() => vi.unstubAllGlobals())

  /** A page server's `/api/compiles`, in memory:  `version` its compiler's;  each request it's sent, in `asked`. */
  function fakeServer(version: string) {
    const entries = new Map<string, string>()
    const asked: string[] = []
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET"
      asked.push(`${method} ${url}`)
      const [, , , at = "", key = ""] = url.split("/")
      if (at === "version") return Response.json({ version })
      if (method === "PUT") {
        if (at !== version) return new Response("", { status: 409 })
        entries.set(key, init.body as string)
        return new Response(null, { status: 204 })
      }
      const text = at === version ? entries.get(key) : undefined
      return text === undefined ? new Response("", { status: 404 }) : new Response(text)
    })
    return { entries, asked }
  }

  test("keeps and reads entries under the compiler's version, asked once", async () => {
    const server = fakeServer("abcd0001")
    const store = new ServerCompileStore()
    expect(await store.get("beef0001")).toBeUndefined()
    await store.put("beef0001", "{}")
    expect(await store.get("beef0001")).toBe("{}")
    expect(server.asked).toEqual([
      "GET /api/compiles/version",
      "GET /api/compiles/abcd0001/beef0001",
      "PUT /api/compiles/abcd0001/beef0001",
      "GET /api/compiles/abcd0001/beef0001"
    ])
  })

  test("installs a compile cache for every project", async () => {
    const { SP } = await import("spell/parser/spell")
    const cache = ServerCompileStore.install()
    try {
      expect(SP.SpellProject.compileCache).toBe(cache)
    } finally {
      SP.SpellProject.compileCache = undefined
    }
  })
})
