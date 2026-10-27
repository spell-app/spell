import { mkdtempSync, writeFileSync } from "node:fs"
import type { Server } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { ask } from "spell/server/test/serve"

/** The server under test, closed after each. */
let server: Server | undefined

afterEach(async () => {
  server?.closeAllConnections()
  await new Promise((done) => (server ? server.close(done) : done(undefined)))
  server = undefined
})

/** Serve `routes`;  its port. */
async function serving(routes: SRV.PathRoutes): Promise<number> {
  const served = await SRV.serveRoutes(routes)
  server = served.server
  return Number(new URL(served.url).port)
}

describe("SRV.serveRoutes()", () => {
  test("answers a path with text of its type, decoded;  404 for what no route answers", async () => {
    const port = await serving((path) => (path === "/a b" ? { text: "hi", type: "text/plain" } : undefined))
    const answer = await ask(port, "GET", "/a%20b")
    expect({ status: answer.status, text: answer.text, type: answer.headers["content-type"] }).toMatchObject({
      status: 200,
      text: "hi",
      type: expect.stringContaining("text/plain")
    })
    expect((await ask(port, "GET", "/missing")).status).toBe(404)
  })
})

describe("SRV.folderRoute()", () => {
  test("a folder's files under a prefix, never outside it", async () => {
    const folder = mkdtempSync(join(tmpdir(), "serve-routes-"))
    writeFileSync(join(folder, "x.js"), "export {}")
    const port = await serving(SRV.folderRoute("/element/", folder))
    expect((await ask(port, "GET", "/element/x.js")).text).toBe("export {}")
    expect((await ask(port, "GET", "/element/%2e%2e/secret")).status).toBe(404)
    expect((await ask(port, "GET", "/other/x.js")).status).toBe(404)
  })
})
