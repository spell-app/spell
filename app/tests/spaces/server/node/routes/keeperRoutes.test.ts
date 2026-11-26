import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { ask, serveHandler, type Served } from "spell/server/test/serve"
import { keeperRoutesFor } from "spell/app/spaces/server/node/routes/keeperRoutes"

describe("keeperRoutes:  this machine's servers at a glance, for the editor's Help › Servers (epic `editor` T185)", () => {
  let folder: string
  let link: SRV.KeeperLink
  let route: Served
  let keeper: Served | undefined

  beforeEach(async () => {
    folder = mkdtempSync(join(tmpdir(), "keeper-glance-"))
    link = new SRV.KeeperLink(join(folder, "server-keeper.json"))
    route = await serveHandler(keeperRoutesFor(link).handle)
  })

  afterEach(async () => {
    await route.close()
    await keeper?.close()
    keeper = undefined
    rmSync(folder, { recursive: true, force: true })
  })

  /** `GET` the glance, its answer read. */
  async function glance(): Promise<unknown> {
    const answer = await ask(route.port, "GET", "/")
    expect(answer.status).toBe(200)
    expect(answer.headers["cache-control"]).toBe("no-store")
    return JSON.parse(answer.text)
  }

  it("no keeper on this machine:  nothing, so the editor shows no Servers item", async () => {
    expect(await glance()).toEqual({})
  })

  it("a running keeper:  its Servers page, how many servers it keeps and how many are down", async () => {
    keeper = await serveHandler((request, reply) => {
      if (request.path !== "/api/servers") return void reply.status(404).send("no")
      reply.json({
        lookSeconds: 10,
        servers: [
          { id: "keeper", state: "running" },
          { id: "spell/page server", state: "running" },
          { id: "spell/editor", state: "down" },
          { id: "spell/x/page server", state: "stopped" },
          { id: "spell/y/page server", state: "starting" }
        ]
      })
    })
    // a record naming another live process:  the test runner's parent stands in for the keeper
    link.write({ pid: process.ppid, base: keeper.base, token: "secret" })
    expect(await glance()).toEqual({ page: `${keeper.base}/servers/`, servers: 5, down: 1 })
  })

  it("a keeper that runs but answers with an error:  its page alone, so the item says it can't tell", async () => {
    keeper = await serveHandler((_request, reply) => void reply.status(500).send("broken"))
    link.write({ pid: process.ppid, base: keeper.base, token: "secret" })
    expect(await glance()).toEqual({ page: `${keeper.base}/servers/` })
  })

  it("a record whose keeper is gone:  nothing", async () => {
    link.write({ pid: 2 ** 22 + 12345, base: "http://127.0.0.1:1", token: "secret" })
    expect(await glance()).toEqual({})
  })
})
