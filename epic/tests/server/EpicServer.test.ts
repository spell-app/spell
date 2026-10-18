/**
 * Tests of the machine's epic server (`EpicServer`):  two scratch repos, this checkout as the engine, a temp home.
 * - started on a free port with no route modules and no pid file, and stopped after
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { ask } from "$/server/test/serve"

import { EpicServer, ROUTE_MODULES, localHighlight } from "$/epics/server/EpicServer"
import { RepoList } from "$/epics/server/RepoList"

/** This checkout:  the engine served. */
const ENGINE = resolve(import.meta.dirname, "../..")

/** Write `text` at `path` under `root`, making folders. */
function put(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), text)
}

/** A scratch repo:  its checkout, its config naming its content folder `docs`, a home page and an epic page. */
function repo(top: string, name: string): string {
  const checkout = join(top, name)
  put(checkout, ".epic/config.json5", '{ "contentFolder": "docs" }\n')
  put(checkout, "docs/pages/index.html", `<html><head></head><body>${name} home</body></html>`)
  put(
    checkout,
    "docs/epics/seo/seo.plan.html",
    `<html><head><script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>` +
      `</head><body>${name} seo</body></html>`
  )
  return checkout
}

describe("EpicServer", () => {
  const top = mkdtempSync(join(tmpdir(), "epic-server-"))
  const home = join(top, "home")
  let server: EpicServer
  let port: number

  beforeAll(async () => {
    const list = new RepoList({ home })
    list.add(repo(top, "one"))
    list.add(repo(top, "two"))
    server = new EpicServer({ home, engine: ENGINE, token: "t0ken" })
    await server.start({ port: 0, routes: false, pidFile: false })
    port = server.info.port
  })

  afterAll(async () => {
    await server.stop()
    rmSync(top, { recursive: true, force: true })
  })

  test("/api/server:  the engine, every repo (the first the default), its home folder as its root", async () => {
    const answer = await ask(port, "GET", "/api/server")
    const info = JSON.parse(answer.text)
    expect(info).toMatchObject({ root: home, engine: ENGINE, epicServer: true, port })
    expect(
      info.repos.map((repo: { name: string; prefix: string; isDefault: boolean }) => [repo.prefix, repo.isDefault])
    ).toEqual([
      ["/r/one/", true],
      ["/r/two/", false]
    ])
  })

  test("the default repo at / and at /r/<repo>/;  another only at its prefix;  each address leads to its home page", async () => {
    expect((await ask(port, "GET", "/epics/seo/seo.plan.html")).text).toContain("one seo")
    expect((await ask(port, "GET", "/r/one/epics/seo/seo.plan.html")).text).toContain("one seo")
    expect((await ask(port, "GET", "/r/two/epics/seo/seo.plan.html")).text).toContain("two seo")
    expect((await ask(port, "GET", "/r/three/epics/seo/seo.plan.html")).status).toBe(404)
    expect((await ask(port, "GET", "/")).headers.location).toBe("/pages/index.html")
    expect((await ask(port, "GET", "/r/two/")).headers.location).toBe("/r/two/pages/index.html")
    expect((await ask(port, "GET", "/r/two/../one/.epic/config.json5")).status).toBeGreaterThanOrEqual(400)
  })

  test("the engine's assets and pack at /_epic/;  at their old checkout paths too, for pages not migrated", async () => {
    const css = await ask(port, "GET", "/_epic/assets/spell-doc.css")
    expect([css.status, css.headers["content-type"]]).toEqual([200, "text/css; charset=utf-8"])
    expect((await ask(port, "GET", "/_epic/pack/epics.pack.js")).status).toBe(200)
    const old = await ask(port, "GET", "/packages/epics/tools/_assets/spell-doc.css")
    expect([old.status, old.text.length]).toEqual([200, css.text.length])
    expect((await ask(port, "GET", "/r/two/packages/epics/components/__pack/epics.pack.js")).status).toBe(200)
  })

  test("every page's SPELL_SERVER:  its path under the prefix it was asked by, its repo, base and checkout", async () => {
    const config = (html: string) => JSON.parse(/window\.SPELL_SERVER = (\{.*?\})<\/script>/.exec(html)![1]!)
    const atRoot = config((await ask(port, "GET", "/epics/seo/seo.plan.html")).text)
    expect(atRoot).toMatchObject({
      file: "/epics/seo/seo.plan.html",
      repo: "one",
      base: "/",
      root: join(top, "one"),
      engine: ENGINE,
      edit: "/api/pages",
      token: "t0ken"
    })
    const other = config((await ask(port, "GET", "/r/two/epics/seo/seo.plan.html")).text)
    expect(other).toMatchObject({ file: "/r/two/epics/seo/seo.plan.html", repo: "two", base: "/r/two/" })
    expect(other.edit).toBeUndefined()
  })

  test("highlight.js from the engine, not cdnjs:  pages load offline", async () => {
    const html = (await ask(port, "GET", "/epics/seo/seo.plan.html")).text
    expect(html).toContain('<script src="/_epic/assets/highlight.min.js"></script>')
    expect(localHighlight("x")).toBe("x")
  })

  test("route modules get the default repo's checkout;  `fileFor()` resolves a URL path as it's served", () => {
    expect(server.routeContext().root).toBe(join(top, "one"))
    expect(server.fileFor("/r/two/epics/seo/seo.plan.html")).toBe(
      join(top, "two", "docs", "epics", "seo", "seo.plan.html")
    )
    expect(server.fileFor("/_epic/pack/epics.pack.js")).toBe(join(ENGINE, "src/components/__pack/epics.pack.js"))
    expect(server.fileFor("/nope.html")).toBeUndefined()
  })

  test("its route modules are spell-epic's own files", async () => {
    const { existsSync } = await import("node:fs")
    for (const path of ROUTE_MODULES) expect(existsSync(join(ENGINE, path)), path).toBe(true)
  })
})

describe("EpicServer, no repo registered", () => {
  test("serves the engine alone;  route modules get its home folder", async () => {
    const home = mkdtempSync(join(tmpdir(), "epic-server-empty-"))
    const server = new EpicServer({ home, engine: ENGINE })
    try {
      await server.start({ port: 0, routes: false, pidFile: false })
      expect(server.defaultRepo).toBeUndefined()
      expect((await ask(server.info.port, "GET", "/_epic/assets/spell-doc.css")).status).toBe(200)
      expect((await ask(server.info.port, "GET", "/epics/x.html")).status).toBe(404)
      expect(server.routeContext().root).toBe(home)
    } finally {
      await server.stop()
      rmSync(home, { recursive: true, force: true })
    }
  })
})
