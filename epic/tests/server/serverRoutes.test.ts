import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import type { RouteContext } from "spell/server/page"
import { ask, serveHandler, type Served } from "spell/server/test/serve"
import serverRoutes from "spell/epic/server/serverRoutes"

describe("serverRoutes:  the Servers tab's calls, passed on to Spell's server keeper (epic `epic-engine` P85)", () => {
  let folder: string
  let keeper: Served
  let web: SRV.WebServer
  const asked: { method: string; path: string; token?: string; body?: unknown }[] = []
  const before = process.env.SPELL_KEEPER_FILE

  beforeAll(async () => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "server-routes-")))
    // Spell's keeper:  its answer has no ServerFacts of its own
    keeper = await serveHandler(async (request, reply) => {
      asked.push({ method: request.method, path: request.originalUrl, token: request.get("x-server-token") })
      if (request.path.endsWith("/dot")) return void reply.json({ dot: false })
      if (request.path.endsWith("/log")) return void reply.type("application/json").send('{"lines":["up"]}')
      if (request.method === "POST") return void reply.status(409).json({ error: "held" })
      reply.json({ keeper: "spell", servers: [{ id: "spell/page server", name: "page server", state: "running" }] })
    })
    // its record names another live process:  the test runner's parent stands in for it
    process.env.SPELL_KEEPER_FILE = join(folder, "server-keeper.json")
    writeFileSync(process.env.SPELL_KEEPER_FILE, JSON.stringify({ pid: process.ppid, base: keeper.base, token: "k" }))
    web = new SRV.WebServer({ root: folder })
    const info = { epicServer: true, repos: [] }
    await serverRoutes.setup({ router: web.router, web, info } as unknown as RouteContext)
    await web.listen()
  })

  afterAll(async () => {
    await web.close()
    await keeper.close()
    if (before === undefined) delete process.env.SPELL_KEEPER_FILE
    else process.env.SPELL_KEEPER_FILE = before
    rmSync(folder, { recursive: true, force: true })
  })

  it("GET /api/servers:  the keeper's answer, and the epic tooling's own facts beside it", async () => {
    const answer = await ask(web.port, "GET", "/api/servers")
    expect(answer.status).toBe(200)
    expect(JSON.parse(answer.text)).toEqual({
      keeper: "spell",
      servers: [expect.objectContaining({ name: "page server" })],
      mergedIntoMain: [],
      epicWorktrees: [],
      notOnGitHub: [],
      keeperPage: `${keeper.base}/servers/`
    })
    expect(asked.at(-1)).toMatchObject({ method: "GET", path: "/api/servers", token: "k" })
  })

  it("the dot and a server's log:  as the keeper answered", async () => {
    expect(JSON.parse((await ask(web.port, "GET", "/api/servers/dot")).text)).toEqual({ dot: false })
    const log = await ask(web.port, "GET", "/api/servers/log?id=spell%2Fpage%20server")
    expect(JSON.parse(log.text)).toEqual({ lines: ["up"] })
    expect(asked.at(-1)?.path).toBe("/api/servers/log?id=spell%2Fpage%20server")
  })

  it("a POST:  this server's write check first, then on to the keeper with its token, its answer as it came", async () => {
    expect((await ask(web.port, "POST", "/api/servers/restart", { body: "{}" })).status).toBe(403)
    const answer = await ask(web.port, "POST", "/api/servers/restart", {
      body: JSON.stringify({ checkout: "/main", server: "page server" }),
      headers: { "content-type": "application/json", "x-server-token": web.guard.token }
    })
    expect(answer.status).toBe(409)
    expect(asked.at(-1)).toMatchObject({ method: "POST", path: "/api/servers/restart", token: "k" })
  })

  it("no keeper running:  503 for a call, and the dot saying so", async () => {
    writeFileSync(process.env.SPELL_KEEPER_FILE!, "{}")
    expect((await ask(web.port, "GET", "/api/servers")).status).toBe(503)
    expect(JSON.parse((await ask(web.port, "GET", "/api/servers/dot")).text)).toMatchObject({ dot: true })
  })
})
