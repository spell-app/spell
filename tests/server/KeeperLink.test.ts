import { mkdtempSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { serveHandler } from "spell/server/test/serve"

describe("KeeperLink:  asking the server keeper (epic `epic-engine` P82)", () => {
  let folder: string
  let link: SRV.KeeperLink

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "keeper-link-"))
    link = new SRV.KeeperLink(join(folder, "server-keeper.json"))
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  it("no keeper, or this process's own record:  nothing asked, so the caller does it itself", async () => {
    expect(await link.ask("start", { checkout: "/main" })).toBeUndefined()
    link.write({ pid: process.pid, base: "http://127.0.0.1:1", token: "t" })
    expect(statSync(link.file).mode & 0o777).toBe(0o600)
    expect(link.running()).toBeUndefined()
    expect(await link.ask("start", { checkout: "/main" })).toBeUndefined()
    link.removeIfOurs()
    expect(link.read()).toBeUndefined()
  })

  it("a running keeper:  POSTs the action with its token, and gives back its answer or its words", async () => {
    const asked: unknown[] = []
    const server = await serveHandler(async (request, reply) => {
      asked.push({ path: request.path, token: request.get("x-server-token") })
      if (request.path.endsWith("/stop")) return void reply.status(409).json({ error: "it won't stop" })
      reply.json({ base: "http://127.0.0.1:4747", launched: true })
    })
    try {
      // a record naming another live process:  the test runner's parent stands in for the keeper
      link.write({ pid: process.ppid, base: server.base, token: "secret" })
      expect(await link.ask("start", { checkout: "/main" })).toEqual({ base: "http://127.0.0.1:4747", launched: true })
      await expect(link.ask("stop", { checkout: "/main" })).rejects.toThrow("it won't stop")
      expect(asked[0]).toMatchObject({ path: "/api/servers/start", token: "secret" })
    } finally {
      await server.close()
    }
  })
})
