/**
 * Tests of a repo's APP on the epic server (`RepoApp`, epic `epic-engine` I49):  the top bar's App tab, `/editor/`.
 * - three scratch repos:  one whose app is a tiny node http server its own start command runs (as spell-app's page
 *   server starts the editor and records it), one whose start fails, one with no app;  a temp home
 * - an epic server on a free port, no route modules, no pid file;  the scratch app killed after
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { ask } from "@spell-app/server/test/serve"

import { EpicServer } from "$/epics/server/EpicServer"
import { RepoList } from "$/epics/server/RepoList"
import type { AppStatus } from "$/epics/server/server.types"

/** Write `text` at `path` under `root`, making folders. */
function put(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), text)
}

/**
 * The scratch app:  an http server on a free port that answers "scratch app", then records `{ url, pid }` in
 * `.app.json` (as spaces' `EditorServer` records the editor);  `EPIC_CHECKOUT` in its env answers too, which the
 * epic server must not pass on.
 */
const APP = `import { createServer } from "node:http"
import { writeFileSync } from "node:fs"
const server = createServer((_request, reply) => reply.end("scratch app " + (process.env.EPIC_CHECKOUT ?? "-")))
server.listen(0, "127.0.0.1", () => {
  setTimeout(() => {
    const url = "http://127.0.0.1:" + server.address().port + "/"
    writeFileSync(".app.json", JSON.stringify({ url, pid: process.pid }))
    console.log("listening at", url)
  }, 300)
})
`

/** A scratch repo `name`, its config naming its content folder and `app` (none:  no app). */
function repo(top: string, name: string, app?: Record<string, string>): string {
  const checkout = join(top, name)
  put(checkout, ".epic/config.json5", JSON.stringify({ contentFolder: "docs", ...(app && { app }) }))
  put(checkout, "docs/pages/index.html", `<html><body>${name} home</body></html>`)
  put(checkout, "app.mjs", APP)
  return checkout
}

/** `/api/app/<name>`'s answer, polled until `done` holds on it or `ms` pass. */
async function statusUntil(port: number, name: string, done: (status: AppStatus) => boolean, ms = 15_000) {
  const until = Date.now() + ms
  for (;;) {
    const status = JSON.parse((await ask(port, "GET", `/api/app/${name}`)).text) as AppStatus
    if (done(status) || Date.now() > until) return status
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

describe("RepoApp", () => {
  const top = mkdtempSync(join(tmpdir(), "epic-app-"))
  const home = join(top, "home")
  let server: EpicServer
  let port: number
  let one: string
  const checkoutBefore = process.env.EPIC_CHECKOUT

  beforeAll(async () => {
    const list = new RepoList({ home })
    one = repo(top, "one", { urlFile: ".app.json", start: "node app.mjs" })
    list.add(one)
    list.add(repo(top, "broken", { url: "http://127.0.0.1:1/", start: "exit 3" }))
    list.add(repo(top, "plain"))
    process.env.EPIC_CHECKOUT = "/the/epic/server/s"
    server = new EpicServer({ home, token: "t0ken" })
    await server.start({ port: 0, routes: false, pidFile: false, bundles: false })
    port = server.info.port
  })

  afterAll(async () => {
    await server.stop()
    if (checkoutBefore === undefined) delete process.env.EPIC_CHECKOUT
    else process.env.EPIC_CHECKOUT = checkoutBefore
    const record = join(one, ".app.json")
    if (existsSync(record)) {
      try {
        process.kill((JSON.parse(readFileSync(record, "utf8")) as { pid: number }).pid)
      } catch {
        // gone already
      }
    }
    rmSync(top, { recursive: true, force: true })
  })

  test("not up:  /editor/ starts it once, and its page polls;  up:  a redirect, at / and at /r/<repo>/", async () => {
    expect(JSON.parse((await ask(port, "GET", "/api/app/one")).text)).toMatchObject({
      repo: "one",
      declared: true,
      up: false,
      starting: false
    })
    const first = await ask(port, "GET", "/editor/")
    expect(first.status).toBe(200)
    expect(first.text).toContain("Starting one's app")
    expect(first.text).toContain("/api/app/one")
    // a second click while it starts:  the same page, no second start
    expect((await ask(port, "GET", "/r/one/editor")).text).toContain("Starting one's app")
    const up = await statusUntil(port, "one", (status) => status.up)
    expect(up).toMatchObject({ up: true, starting: false })
    expect(up.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/)
    const log = readFileSync(join(home, "app-one.log"), "utf8")
    expect(log.match(/node app\.mjs/g)).toHaveLength(1)
    expect(log).toContain("listening at")
    for (const path of ["/editor/", "/editor", "/r/one/editor/"]) {
      const answer = await ask(port, "GET", path)
      expect(answer.status).toBe(302)
      expect(answer.headers.location).toBe(up.url)
    }
    // started from its own checkout, with none of the epic server's settings
    expect(await (await fetch(up.url!)).text()).toBe("scratch app -")
  })

  test("a start that fails:  the status says why, for the page to show", async () => {
    expect((await ask(port, "GET", "/r/broken/editor/")).text).toContain("Starting broken's app")
    const status = await statusUntil(port, "broken", (each) => !!each.failed)
    expect(status).toMatchObject({ up: false, starting: false, failed: '"exit 3" exited with code 3' })
  })

  test("no app declared:  a page saying so, and how to declare one, never a 404", async () => {
    const answer = await ask(port, "GET", "/r/plain/editor/")
    expect(answer.status).toBe(200)
    expect(answer.text).toContain("plain has no app")
    expect(answer.text).toContain('"app"')
    expect(JSON.parse((await ask(port, "GET", "/api/app/plain")).text)).toMatchObject({ declared: false, up: false })
    expect((await ask(port, "GET", "/api/app/nope")).status).toBe(404)
  })
})
