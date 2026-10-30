import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import {
  componentSetAddressOf,
  componentSetFileOf,
  componentSets,
  kitOf,
  kitRootOf,
  pageServerRoot,
  pageServerSettings,
  settingsParts
} from "spell/server/page/settings"

/** Write `json` as `path` under `root`, making folders. */
function put(root: string, path: string, json: unknown): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), typeof json === "string" ? json : JSON.stringify(json))
}

/**
 * A kit (epic `repo-split` P16, P20):  its own part (the content repo's tabs), and its folders (its `workspaces`) each
 * declaring their own part, paths from their own folder.
 * - `ui` and `epic`:  there;  `app`:  listed, not there
 */
function kit(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "page-settings-")))
  put(root, "repos.json5", "{ repos: [] }")
  put(root, "package.json", {
    name: "kit",
    workspaces: ["ui", "epic", "app"],
    pageServer: { writable: ["epics"], siteTabs: [{ name: "Epics" }] }
  })
  put(root, "ui/package.json", {
    name: "ui",
    pageServer: {
      bundles: ["site/_assets"],
      componentSets: { ui: { name: "UI", dir: "docs", assets: "site/_assets" } }
    }
  })
  put(root, "epic/package.json", {
    name: "epic",
    pageServer: {
      routes: ["src/routes.ts"],
      watch: ["src/_assets"],
      componentSets: { epics: { name: "Epic UI", dir: "src/docs", assets: "src/_assets" } },
      engineRoutes: { "/_epic/assets/": "src/_assets" },
      localCopies: { "https://cdn/x.js": "/_epic/assets/x.js" },
      pageScripts: [{ src: "/x.js", file: "dist/x.js" }]
    }
  })
  return root
}

describe("pageServerSettings()", () => {
  const root = kit()
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  test("in a kit:  the kit's part, then each of its folders', in its `workspaces` order;  a missing one left out", () => {
    expect(settingsParts(root).map((part) => part.dir)).toEqual([root, join(root, "ui"), join(root, "epic")])
  })

  test("then each peer repos.json5 names (spell-brand), and each project the checkout's own file names", () => {
    const withPeers = kit()
    const peer = `${withPeers}-brand`
    const tester = `${withPeers}-tester`
    put(withPeers, "repos.json5", `{ repos: [{ name: "brand", path: "../${basename(peer)}", peer: true }] }`)
    put(peer, "package.json", { name: "brand", pageServer: { bundles: ["_assets/ui"] } })
    put(withPeers, "page-server.local.json5", `{ projects: ["../${basename(tester)}", "../gone"] }`)
    put(tester, "package.json", { name: "tester", pageServer: { watch: ["."] } })
    expect(settingsParts(withPeers).map((part) => part.dir)).toEqual([
      withPeers,
      join(withPeers, "ui"),
      join(withPeers, "epic"),
      peer,
      tester
    ])
    expect(pageServerSettings(withPeers)).toMatchObject({
      bundles: ["ui/site/_assets", `../${basename(peer)}/_assets/ui`],
      watch: ["epic/src/_assets", `../${basename(tester)}`]
    })
    for (const dir of [withPeers, peer, tester]) rmSync(dir, { recursive: true, force: true })
  })

  test("merges the parts, each repo's paths from its own folder, given from the kit's root", () => {
    expect(pageServerSettings(root)).toEqual({
      writable: ["epics"],
      siteTabs: [{ name: "Epics" }],
      bundles: ["ui/site/_assets"],
      componentSets: {
        ui: { name: "UI", dir: "ui/docs", assets: "ui/site/_assets" },
        epics: { name: "Epic UI", dir: "epic/src/docs", assets: "epic/src/_assets" }
      },
      routes: ["epic/src/routes.ts"],
      watch: ["epic/src/_assets"],
      engineRoutes: { "/_epic/assets/": "epic/src/_assets" },
      localCopies: { "https://cdn/x.js": "/_epic/assets/x.js" },
      pageScripts: [{ src: "/x.js", file: "epic/dist/x.js" }]
    })
    expect(componentSets(pageServerSettings(root)).map((set) => set.prefix)).toEqual([
      "/components/ui",
      "/components/epics"
    ])
  })

  test("read for a folder of the kit:  the same merge, its paths from there (another repo's beside it, `../`)", () => {
    const sets = pageServerSettings(join(root, "ui")).componentSets
    expect(sets?.ui).toEqual({ name: "UI", dir: "docs", assets: "site/_assets" })
    expect(sets?.epics?.dir).toBe("../epic/src/docs")
  })

  test("the content repo's part, from its own file in the content folder, after the kit's:  its tabs, writable folders", () => {
    const withContent = kit()
    put(withContent, ".epic/config.json5", "{ contentFolder: 'content' }")
    put(withContent, "content/page-server.json5", "// the content repo's\n{ writable: ['guides'], gone: ['/ui'] }")
    expect(settingsParts(withContent).map((part) => part.dir)).toEqual([
      withContent,
      join(withContent, "content"),
      join(withContent, "ui"),
      join(withContent, "epic")
    ])
    expect(pageServerSettings(withContent)).toMatchObject({ writable: ["epics", "guides"], gone: ["/ui"] })
    rmSync(withContent, { recursive: true, force: true })
  })

  test("outside a kit:  the folder's own part alone;  none:  {}", () => {
    const alone = realpathSync(mkdtempSync(join(tmpdir(), "page-settings-alone-")))
    put(alone, "package.json", { pageServer: { routes: ["r.ts"] } })
    expect(pageServerSettings(alone)).toEqual({ routes: ["r.ts"] })
    expect(pageServerSettings(join(alone, "nowhere"))).toEqual({})
    rmSync(alone, { recursive: true, force: true })
  })
})

describe("pageServerRoot()", () => {
  const root = kit()
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  test("the kit, from any folder of it:  its root, a child repo's folder, a folder deep in one", () => {
    mkdirSync(join(root, "ui", "docs", "deep"), { recursive: true })
    for (const from of [root, join(root, "ui"), join(root, "ui", "docs", "deep")]) {
      expect(pageServerRoot(from)).toBe(root)
      expect(kitOf(from)).toBe(root)
    }
  })

  test("kitRootOf():  the kit's root only;  a child repo's folder is an error naming the kit (epic `repo-split` P16)", () => {
    expect(kitRootOf(root)).toBe(root)
    expect(() => kitRootOf(join(root, "ui"))).toThrow(
      `isn't a kit's root;  the page server starts from the kit's root only:  start it from the kit, ${root}`
    )
  })

  test("outside a kit:  the git checkout, else the folder itself", () => {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), "page-settings-repo-")))
    mkdirSync(join(repo, ".git"))
    mkdirSync(join(repo, "src"))
    expect(pageServerRoot(join(repo, "src"))).toBe(repo)
    expect(kitOf(repo)).toBeUndefined()
    rmSync(repo, { recursive: true, force: true })
  })
})

// epic `epic-engine` I136:  a set's page linked by its folder's path loaded none of its `_assets/`
describe("componentSetAddressOf() / componentSetFileOf()", () => {
  const root = kit()
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  test("a set's page is its address, `/components/<set>/...`, encoded;  any other file `undefined`", () => {
    expect(componentSetAddressOf(root, join(root, "ui/docs/ui-button.html"))).toBe("/components/ui/ui-button.html")
    expect(componentSetAddressOf(root, join(root, "epic/src/docs/a b.html"))).toBe("/components/epics/a%20b.html")
    expect(componentSetAddressOf(root, join(root, "ui/site/x.html"))).toBeUndefined()
    expect(componentSetAddressOf(root, join(root, "ui/docs"))).toBeUndefined()
  })

  test("turned round:  an address is its set's file;  any other path `undefined`", () => {
    expect(componentSetFileOf(root, "/components/ui/ui-button.html")).toBe(join(root, "ui/docs/ui-button.html"))
    expect(componentSetFileOf(root, "/components/epics/a%20b.html")).toBe(join(root, "epic/src/docs/a b.html"))
    expect(componentSetFileOf(root, "/components/app/x.html")).toBeUndefined()
    expect(componentSetFileOf(root, "/epics/x.html")).toBeUndefined()
  })
})
