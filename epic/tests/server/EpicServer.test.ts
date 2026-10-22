/**
 * Tests of the machine's epic server (`EpicServer`):  two scratch repos, this checkout as the engine, a temp home.
 * - started on a free port with no route modules and no pid file, and stopped after
 * - its port (`claimPort()`):  FAKE servers, processes of their own on free ports (`fakeServer()`)
 */
import { spawn, type ChildProcess } from "node:child_process"
import { once } from "node:events"
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell-kit/server"
import { componentSets, type ComponentSetSetting } from "spell-kit/server/page"
import type { SiteTab } from "spell-kit/server/site/site.types"
import { ask } from "spell-kit/server/test/serve"

import { EpicServer, ROUTE_MODULES, SOURCES, localHighlight } from "$/epics/server/EpicServer"
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

/**
 * The component sets a scratch repo's settings name, as spell-app's do (its root `package.json`'s `"pageServer"`
 * `"componentSets"`):  ONE site bundle for every set since epic `epic-engine`.
 */
const SETS: Record<string, ComponentSetSetting> = {
  ui: { name: "Spell UI", dir: "packages/ui/docs", assets: "packages/ui/site/_assets" },
  epics: { name: "Epic UI", dir: "spell-epic/src/docs", assets: "packages/ui/site/_assets" },
  app: { name: "App UI", dir: "packages/app/docs", assets: "packages/ui/site/_assets" },
  brand: { name: "Brand", dir: "packages/brand/docs", assets: "packages/ui/site/_assets" }
}

/** The folders a scratch repo's settings serve at their own addresses (`"engineRoutes"`), as spell-app's do. */
const ENGINE_ROUTES = { "/element/": "app/dist-element" }

/** The site header's tabs a scratch repo's settings name (`"siteTabs"`), as spell-app's do. */
const SITE_TABS: SiteTab[] = [
  { name: "Guides", path: "guides/index.html", areas: ["guides"] },
  { name: "Spell/UI", path: "/components/ui/", serverOnly: true, sets: ["ui"] }
]

/**
 * Give the scratch repo at `checkout` component sets and the header's tabs (`SITE_TABS`):  its settings naming them (`SETS`), and each set's home page and
 * its site bundle's `site.js`, saying which folder it is;  Epic UI's folder too, which the engine's stands in for.
 */
function withComponentSets(checkout: string): void {
  const name = checkout.split("/").at(-1)
  put(
    checkout,
    "package.json",
    JSON.stringify({ pageServer: { componentSets: SETS, siteTabs: SITE_TABS, engineRoutes: ENGINE_ROUTES } })
  )
  put(checkout, "app/dist-element/spell.pack.js", `// ${name} pack`)
  for (const set of Object.values(SETS)) {
    put(checkout, `${set.dir}/index.html`, `${name} ${set.name} home`)
    put(checkout, `${set.assets}/site.js`, `// ${name} ${set.assets}`)
  }
}

describe("EpicServer", () => {
  const top = realpathSync(mkdtempSync(join(tmpdir(), "epic-server-")))
  const home = join(top, "home")
  let server: EpicServer
  let port: number

  beforeAll(async () => {
    const list = new RepoList({ home })
    const one = repo(top, "one")
    withComponentSets(one)
    list.add(one)
    list.add(repo(top, "two"))
    put(join(top, "two"), "packages/ui/docs/index.html", "two's own")
    server = new EpicServer({ home, engine: ENGINE, token: "t0ken" })
    await server.start({ port: 0, routes: false, pidFile: false, bundles: false })
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

  // epic-engine I25:  a page's data from the checkout serving it (the spell syntax guide's), and its links to code
  test("each repo's checkout under its content:  the content first, no dot files", async () => {
    put(join(top, "one"), "packages/spell/spellSyntax.json", '{ "one": true }')
    put(join(top, "two"), "packages/spell/spellSyntax.json", '{ "two": true }')
    put(join(top, "one"), "pages/index.html", "the checkout's own")
    expect(JSON.parse((await ask(port, "GET", "/packages/spell/spellSyntax.json")).text)).toEqual({ one: true })
    expect(JSON.parse((await ask(port, "GET", "/r/two/packages/spell/spellSyntax.json")).text)).toEqual({ two: true })
    expect((await ask(port, "GET", "/pages/index.html")).text).toContain("one home")
    expect((await ask(port, "GET", "/.epic/config.json5")).status).toBe(403)
    expect((await ask(port, "GET", "/r/two/.epic/config.json5")).status).toBe(403)
  })

  test("the engine's assets and pack at /_epic/;  at their old checkout paths too, for pages not migrated", async () => {
    const css = await ask(port, "GET", "/_epic/assets/spell-doc.css")
    expect([css.status, css.headers["content-type"]]).toEqual([200, "text/css; charset=utf-8"])
    expect((await ask(port, "GET", "/_epic/pack/epics.pack.js")).status).toBe(200)
    const old = await ask(port, "GET", "/packages/epics/tools/_assets/spell-doc.css")
    expect([old.status, old.text.length]).toEqual([200, css.text.length])
    expect((await ask(port, "GET", "/r/two/packages/epics/components/__pack/epics.pack.js")).status).toBe(200)
  })

  // epic-eject T11:  the templates are the engine's, at /templates/ for every repo (its pages link `../templates/`)
  test("the engine's templates at /templates/, and at each repo's /r/<repo>/templates/", async () => {
    for (const path of ["/templates/index.html", "/templates/durable.html", "/r/two/templates/durable.html"]) {
      const page = await ask(port, "GET", path)
      expect(page.status, path).toBe(200)
      expect(page.text, path).toContain("<title>")
    }
    expect((await ask(port, "GET", "/templates/missing.html")).status).toBe(404)
  })

  // epic-eject I21:  Epic UI answered 404 here, while spell-app's page server served it
  test("Epic UI at /components/epics/, as spell-app's page server serves it:  the engine's src/docs/, its site bundle at _assets/", async () => {
    for (const path of [
      "/components/epics/",
      "/components/epics/epic-item.html",
      "/components/epics/__parts/layout.html"
    ]) {
      const page = await ask(port, "GET", path)
      expect(page.status, path).toBe(200)
    }
    expect((await ask(port, "GET", "/components/epics/")).text).toContain("<title>The Epic Elements</title>")
    expect((await ask(port, "GET", "/components/epics")).headers.location).toBe("/components/epics/")
    expect(server.fileFor("/components/epics/epic-item.html")).toBe(join(ENGINE, "src/docs/epic-item.html"))
    // the bundle:  the one the DEFAULT repo's settings give Epic UI, from its checkout (`SETS`)
    expect(server.fileFor("/components/epics/_assets/site.js")).toBe(join(top, "one", SETS.epics!.assets!, "site.js"))
    expect((await ask(port, "GET", "/components/epics/_assets/site.js")).text).toBe(`// one ${SETS.epics!.assets}`)
    expect((await ask(port, "GET", "/components/epics/missing.html")).status).toBe(404)
  })

  // epic-engine I48:  the top bar's Spell/UI and App/UI tabs answered "Not found" here, while spell-app's page server
  // served them
  test("every other component set the repo's checkout names, at /components/<set>/ and /r/<repo>/components/<set>/, its site bundle at _assets/", async () => {
    const sets = componentSets({ componentSets: SETS }).filter((set) => set.prefix !== "/components/epics")
    expect(sets.map((set) => set.prefix)).toEqual(["/components/ui", "/components/app", "/components/brand"])
    for (const set of sets)
      for (const base of ["", "/r/one"]) {
        const home = await ask(port, "GET", `${base}${set.prefix}/`)
        expect([home.status, home.text.endsWith(`one ${set.name} home`)], `${base}${set.prefix}/`).toEqual([200, true])
        const site = await ask(port, "GET", `${base}${set.prefix}/_assets/site.js`)
        expect([site.status, site.text], `${base}${set.prefix}/_assets/site.js`).toEqual([200, `// one ${set.assets}`])
      }
    expect(server.fileFor("/components/ui/index.html")).toBe(join(top, "one", "packages/ui/docs/index.html"))
    // its SPELL_SERVER.file is its address, as live reload reports its folder's changes
    const config = (path: string) => async () =>
      JSON.parse(/window\.SPELL_SERVER = (\{.*?\})<\/script>/.exec((await ask(port, "GET", path)).text)![1]!)
    expect((await config("/components/app/index.html")()).file).toBe("/components/app/index.html")
    expect((await config("/r/one/components/ui/")()).file).toBe("/r/one/components/ui/index.html")
    expect((await config("/components/epics/epic-item.html")()).file).toBe("/components/epics/epic-item.html")
    expect((await ask(port, "GET", "/components/ui")).headers.location).toBe("/components/ui/")
    expect((await ask(port, "GET", "/components/app/missing.html")).status).toBe(404)
    // Epic UI stays the engine's, not the repo's own folder of it
    expect((await ask(port, "GET", "/components/epics/")).text).toContain("<title>The Epic Elements</title>")
    expect((await ask(port, "GET", "/r/one/components/epics/")).status).toBe(404)
    // a repo whose settings name no component sets:  nothing, though it has Spell UI's folder
    expect((await ask(port, "GET", "/r/two/components/ui/")).status).toBe(404)
  })

  // epic-engine I58:  App UI's pages load the app's /element/spell.pack.js, which only spell-app's own page server served
  test("the folders a repo's settings serve at their own addresses (engineRoutes), at /<route> for the default repo and /r/<repo>/<route>", async () => {
    for (const base of ["", "/r/one"]) {
      const pack = await ask(port, "GET", `${base}/element/spell.pack.js`)
      expect([pack.status, pack.text], `${base}/element/spell.pack.js`).toEqual([200, "// one pack"])
    }
    // a repo whose settings name none:  nothing
    expect((await ask(port, "GET", "/r/two/element/spell.pack.js")).status).toBe(404)
    // the engine's own routes stay the engine's
    expect((await ask(port, "GET", "/_epic/pack/epics.pack.js")).status).toBe(200)
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
      token: "t0ken",
      // the site header's tabs:  the default repo's settings' (epic `repo-split` I4)
      siteTabs: SITE_TABS
    })
    const other = config((await ask(port, "GET", "/r/two/epics/seo/seo.plan.html")).text)
    expect(other).toMatchObject({ file: "/r/two/epics/seo/seo.plan.html", repo: "two", base: "/r/two/" })
    expect(other.edit).toBeUndefined()
    // every page alike:  the header's links keep no repo's prefix
    expect(other.siteTabs).toEqual(SITE_TABS)
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

  test("its route modules are spell-epic's own files", () => {
    for (const path of ROUTE_MODULES) expect(existsSync(join(ENGINE, path)), path).toBe(true)
  })

  // epic `epic-eject` I11:  only the route modules' folders counted, so a change elsewhere in `src/` kept the old server
  test("`ensure()` restarts it after a change anywhere in spell-epic's code:  all of `src/`, beyond the route modules", async () => {
    const { statSync } = await import("node:fs")
    expect(SOURCES).toContain(join(ENGINE, "src"))
    // a file no route module's folder holds, which they import
    const config = statSync(join(ENGINE, "src", "config", "EpicConfig.ts")).mtimeMs
    expect(SRV.newestChange(SOURCES)).toBeGreaterThanOrEqual(config)
  })
})

describe("EpicServer, no repo registered", () => {
  test("serves the engine alone;  route modules get its home folder", async () => {
    const home = realpathSync(mkdtempSync(join(tmpdir(), "epic-server-empty-")))
    const server = new EpicServer({ home, engine: ENGINE })
    try {
      await server.start({ port: 0, routes: false, pidFile: false, bundles: false })
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

/**
 * A FAKE epic server, its own process:  answers `/api/server` with `info`, its own pid and port filled in, on `port`
 * (default a free one);  `SIGTERM` ends it and frees its port, as a real one's stop does.
 * - never the real server, never 4848
 */
async function fakeServer(info: Record<string, unknown>, port = 0): Promise<{ pid: number; port: number }> {
  const script =
    `const info = JSON.parse(process.argv[1]);  const server = require("node:http").createServer((_, reply) => ` +
    `reply.setHeader("Content-Type", "application/json").end(JSON.stringify({ ...info, pid: process.pid, ` +
    `port: server.address().port })));  server.listen(${port}, "127.0.0.1", () => console.log(server.address().port))`
  const child = spawn(process.execPath, ["-e", script, JSON.stringify(info)], { stdio: ["ignore", "pipe", "inherit"] })
  fakes.push(child)
  const [line] = (await once(child.stdout!, "data")) as [Buffer]
  return { pid: child.pid!, port: Number(String(line).trim()) }
}

/** Every fake started, ended after the tests. */
const fakes: ChildProcess[] = []

/** Whether process `pid` is still running. */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// epic `epic-engine` I69:  two `ensure()`s at once started two;  the pid file named the one on a random port, and every
// restart after replaced only it, on yet another port, while the first kept 4848
describe("EpicServer.claimPort():  ONE server, on ONE port", () => {
  let home: string
  let pidFile: SRV.PidFile
  beforeEach(() => {
    home = realpathSync(mkdtempSync(join(tmpdir(), "epic-server-port-")))
    pidFile = new SRV.PidFile(home, "server.json")
  })
  afterEach(() => rmSync(home, { recursive: true, force: true }))
  afterAll(() => {
    for (const fake of fakes) fake.kill()
  })

  /** This home's epic server's answer, started now. */
  const ours = () => ({ root: home, started: new Date().toISOString(), epicServer: true, repos: [] })

  /** Name the fake `server` in the pid file, as its own start would have. */
  const name = (server: { pid: number; port: number }) => pidFile.write({ ...ours(), ...server } as never)

  test("an epic server of this home on the port, the pid file naming another:  adopted, the other stopped", async () => {
    const onPort = await fakeServer(ours())
    const named = await fakeServer(ours())
    name(named)
    await EpicServer.claimPort(pidFile, onPort.port)
    expect(pidFile.read()).toMatchObject({ pid: onPort.pid, port: onPort.port, root: home })
    expect(alive(named.pid)).toBe(false)
    expect(alive(onPort.pid)).toBe(true)
    // and again:  it's the one named now, kept
    await EpicServer.claimPort(pidFile, onPort.port)
    expect(pidFile.read()?.pid).toBe(onPort.pid)
    expect(alive(onPort.pid)).toBe(true)
  })

  test("the pid file's server on ANOTHER port, the port free:  stopped, so a fresh one starts on the port", async () => {
    const named = await fakeServer(ours())
    name(named)
    await EpicServer.claimPort(pidFile, await SRV.freePort())
    expect(alive(named.pid)).toBe(false)
  })

  test("the pid file's server on the port, older than the repo list:  stopped, its port free again", async () => {
    const named = await fakeServer({ ...ours(), started: new Date(Date.now() - 60_000).toISOString() })
    name(named)
    writeFileSync(new RepoList({ home }).file, "[]\n")
    await EpicServer.claimPort(pidFile, named.port)
    expect(alive(named.pid)).toBe(false)
    expect(await SRV.isFree(named.port)).toBe(true)
  })

  test("the port taken by ANOTHER home's epic server:  refused, saying whose, and left alone", async () => {
    const theirs = await fakeServer({ ...ours(), root: "/elsewhere" })
    await expect(EpicServer.claimPort(pidFile, theirs.port)).rejects.toThrow(
      `port ${theirs.port} is taken, by the epic server of /elsewhere (pid ${theirs.pid})`
    )
    expect(alive(theirs.pid)).toBe(true)
  })

  test("the port taken by something that isn't an epic server:  refused", async () => {
    const other = await fakeServer({ root: home })
    await expect(EpicServer.claimPort(pidFile, other.port)).rejects.toThrow(/is taken, by another program/)
    expect(alive(other.pid)).toBe(true)
  })

  test("`start()` on a taken port:  with a pid file, refused, writing none;  without one, another port", async () => {
    const taken = await fakeServer({ root: "/elsewhere" })
    const machine = new EpicServer({ home, engine: ENGINE, repos: [] })
    await expect(machine.start({ port: taken.port, routes: false, bundles: false })).rejects.toThrow(
      `epic server:  port ${taken.port} is taken`
    )
    expect(existsSync(pidFile.file)).toBe(false)
    const demo = new EpicServer({ home, engine: ENGINE, repos: [] })
    try {
      await demo.start({ port: taken.port, routes: false, pidFile: false, bundles: false })
      expect(demo.info.port).not.toBe(taken.port)
    } finally {
      await demo.stop()
    }
  })
})
