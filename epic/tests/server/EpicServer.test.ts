/**
 * Tests of the machine's epic server (`EpicServer`):  two scratch repos, this checkout as the engine, a temp home.
 * - started on a free port with no route modules and no pid file, and stopped after
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "$/server"
import { componentSets, pageServerSettings, type ComponentSetSetting } from "$/server/page"
import { ask } from "$/server/test/serve"

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

/**
 * Give the scratch repo at `checkout` component sets:  its settings naming them (`SETS`), and each set's home page and
 * its site bundle's `site.js`, saying which folder it is;  Epic UI's folder too, which the engine's stands in for.
 */
function withComponentSets(checkout: string): void {
  const name = checkout.split("/").at(-1)
  put(checkout, "package.json", JSON.stringify({ pageServer: { componentSets: SETS } }))
  for (const set of Object.values(SETS)) {
    put(checkout, `${set.dir}/index.html`, `${name} ${set.name} home`)
    put(checkout, `${set.assets}/site.js`, `// ${name} ${set.assets}`)
  }
}

describe("EpicServer", () => {
  const top = mkdtempSync(join(tmpdir(), "epic-server-"))
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
    // the bundle is the engine's spell-app checkout's build, not committed:  checked where it has been built;  its
    // folder from that checkout's settings
    const assets = componentSets(pageServerSettings(join(ENGINE, ".spell-app"))).find(
      (set) => set.prefix === "/components/epics"
    )!.assets
    const bundle = join(ENGINE, ".spell-app", assets, "site.js")
    if (existsSync(bundle)) expect(server.fileFor("/components/epics/_assets/site.js")).toBe(bundle)
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
    const home = mkdtempSync(join(tmpdir(), "epic-server-empty-"))
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
