import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

/** The kit:  its tests are in its `tests/`. */
const KIT = join(import.meta.dirname, "../..")

/** Write `text` at `path` under `root`, making folders. */
function put(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), text)
}

/**
 * An install as the top repo `spell` holds one (epic `repo-split` P8):  `yarn.lock` and `node_modules/` at `top`,
 * each package a folder of its own, linked in as `node_modules/<name>`.
 */
function install(top: string, packages: Record<string, string>): void {
  put(top, "yarn.lock", "# lock\n")
  for (const [name, folder] of Object.entries(packages)) {
    put(top, `${folder}/package.json`, JSON.stringify({ name }))
    mkdirSync(dirname(join(top, "node_modules", name)), { recursive: true })
    symlinkSync(join(top, folder), join(top, "node_modules", name))
  }
}

/** A bundle whose build is a `node -e` script:  it writes `out/entry.js`, or fails when `src/FAIL` exists. */
const SPEC: SRV.BundleSpec = {
  name: "demo",
  title: "a demo bundle",
  package: "@demo/pkg",
  cwd: ".",
  run: [
    process.execPath,
    "-e",
    `const fs = require("fs");  if (fs.existsSync("src/FAIL")) process.exit(3);  fs.mkdirSync("out", { recursive: true });  fs.writeFileSync("out/entry.js", "built")`
  ],
  output: "out",
  entry: "entry.js",
  sources: ["@demo/pkg/src", "@demo/pkg/config.ts", "@demo/pkg/missing.ts", "yarn.lock"]
}

describe("Bundle", () => {
  // the package `@demo/pkg` in its own folder, `pkg/`, beside the checkout, `app/`
  const root = mkdtempSync(join(tmpdir(), "assembler-bundle-"))
  install(root, { "@demo/pkg": "pkg" })
  mkdirSync(join(root, "app"))
  put(root, "pkg/src/a.ts", "a")
  put(root, "pkg/src/deep/b.tsx", "b")
  put(root, "pkg/src/a.test.ts", "test")
  put(root, "pkg/src/deep/b.browser.test.tsx", "test")
  put(root, "pkg/src/__snapshots__/a.test.ts.snap", "snap")
  put(root, "pkg/src/.hidden", "dot")
  put(root, "pkg/src/icons/icon-packs/pack/x.svg", "<svg/>")
  put(root, "pkg/config.ts", "config")
  const bundle = new SRV.Bundle(join(root, "app"), SPEC)

  afterAll(() => rmSync(root, { recursive: true, force: true }))

  test("its sources:  every file under them, sorted;  NEVER tests, snapshots, dot files or the icon packs", () => {
    // a package's by its name, the install's root's by their path:  the same wherever the repos are
    expect(bundle.sourceFiles()).toEqual([
      "@demo/pkg/config.ts",
      "@demo/pkg/src/a.ts",
      "@demo/pkg/src/deep/b.tsx",
      "yarn.lock"
    ])
    expect(bundle.outputDir).toBe(join(realpathSync(root), "pkg/out"))
  })

  test("stale until built, current after;  stale again when a source changes, or its entry goes", () => {
    expect(bundle.check()).toEqual({
      name: "demo",
      output: "../pkg/out",
      sources: bundle.sourcesHash(),
      stale: "never built"
    })
    const built = bundle.build({ stdio: "ignore" })
    expect(built).toMatchObject({ name: "demo", sources: bundle.sourcesHash() })
    expect(bundle.record()).toMatchObject({ sources: built.sources })
    expect(bundle.isStale).toBe(false)

    put(root, "pkg/src/a.test.ts", "a test changed")
    expect(bundle.isStale).toBe(false)
    put(root, "pkg/src/a.ts", "a changed")
    expect(bundle.check().stale).toBe("built from older sources")
    bundle.build({ stdio: "ignore" })
    expect(bundle.isStale).toBe(false)

    put(root, "pkg/missing.ts", "now there")
    expect(bundle.check().stale).toBe("built from older sources")
    bundle.build({ stdio: "ignore" })
    const later = new Date(Date.now() + 60_000)
    utimesSync(join(root, "pkg/out/entry.js"), later, later)
    expect(bundle.check().stale).toBe("entry.js changed since")
    rmSync(join(root, "pkg/out/entry.js"))
    expect(bundle.check().stale).toBe("no entry.js")
  })

  test("a failed build throws, naming the command, and records nothing", () => {
    rmSync(join(root, "pkg/out"), { recursive: true, force: true })
    put(root, "pkg/src/FAIL", "")
    expect(() => bundle.build({ stdio: "ignore" })).toThrow(
      /^Bundle\.build\(\):  `.+` \(in \.\.\/pkg\) failed:  exit 3$/
    )
    expect(existsSync(bundle.recordFile)).toBe(false)
    expect(bundle.check().stale).toBe("never built")
  })
})

/** An install holding Spell UI's, spell-epic's and the brand's packages, each its own repo beside the checkout, `app/`. */
function top(): string {
  const dir = mkdtempSync(join(tmpdir(), "assembler-bundles-"))
  install(dir, { "spell-ui": "ui", "spell-epic": "epic", "spell-brand": "spell-brand" })
  mkdirSync(join(dir, "spell-app"))
  return dir
}

/** Every bundle's folder, as spell-app's root `package.json` would name them, the committed ones first. */
const BUNDLES = [
  "../ui/src/components/ui-root",
  "../ui/site/_assets",
  "../spell-brand/_assets/ui",
  "../epic/src/components/__pack",
  "../epic/src/tools/_assets"
]

// epic `epic-engine` P54 (Owen, Q61:  "Only in a worktree")
describe("a committed bundle", () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "assembler-committed-")))
  install(dir, { "@demo/gen": "gen" })
  put(dir, "gen/src/a.ts", "a")
  const main = fakeMainCheckout(join(dir))
  const worktree = fakeWorktree(main, join(dir, "w"))
  /** its check passes while `gen/OK` exists */
  const SPEC_COMMITTED: SRV.BundleSpec = {
    ...SPEC,
    package: "@demo/gen",
    sources: ["@demo/gen/src"],
    committed: true,
    check: [process.execPath, "-e", `process.exit(require("fs").existsSync("OK") ? 0 : 1)`]
  }
  const inWorktree = new SRV.Bundle(worktree, SPEC_COMMITTED)
  const inMain = new SRV.Bundle(main, SPEC_COMMITTED)

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  test("in a worktree:  stale with no record and a failing check;  built, its record in the install's cache", () => {
    expect(inWorktree.isWorktree).toBe(true)
    expect(inWorktree.buildsWhenStale).toBe(true)
    put(dir, "gen/out/entry.js", "old")
    expect(inWorktree.check().stale).toBe("never built here")
    inWorktree.build({ stdio: "ignore" })
    // never beside the file it writes:  that's committed
    expect(inWorktree.recordFile).toBe(join(dir, "node_modules/.cache/spell-bundles/demo.json"))
    expect(existsSync(join(dir, "gen/out", SRV.BUNDLE_RECORD))).toBe(false)
    expect(inWorktree.isStale).toBe(false)
    // a merge rewriting it says nothing;  its sources changing does
    const later = new Date(Date.now() + 60_000)
    utimesSync(join(dir, "gen/out/entry.js"), later, later)
    expect(inWorktree.isStale).toBe(false)
    put(dir, "gen/src/a.ts", "a changed")
    expect(inWorktree.check().stale).toBe("built from older sources")
    rmSync(inWorktree.recordFile)
  })

  test("in a worktree, no record:  a passing check is recorded as current", () => {
    put(dir, "gen/OK", "")
    expect(inWorktree.check().stale).toBeUndefined()
    expect(inWorktree.record()?.sources).toBe(inWorktree.sourcesHash())
    rmSync(join(dir, "gen/OK"))
    rmSync(inWorktree.recordFile)
  })

  test("in the main checkout:  never built by --stale;  its check says, with what to run", () => {
    expect(inMain.isWorktree).toBe(false)
    expect(inMain.buildsWhenStale).toBe(false)
    expect(inMain.check()).toMatchObject({ stale: "its check failed", fix: expect.stringMatching(/^run .+ in gen\/$/) })
    put(dir, "gen/OK", "")
    expect(inMain.check().stale).toBeUndefined()
    // no record:  the main checkout goes by its check alone
    expect(existsSync(inMain.recordFile)).toBe(false)
    rmSync(join(dir, "gen/out/entry.js"))
    expect(inMain.check()).toMatchObject({ stale: "no entry.js", fix: expect.stringContaining("run ") })
  })
})

describe("Bundle sources", () => {
  // the ONE package `spell` at the root, spell-epic its `epic/`:  the epics pack and the docs bundle write beside
  // each other's sources
  const root = realpathSync(mkdtempSync(join(tmpdir(), "assembler-generated-")))
  install(root, { spell: ".", "spell-epic": "epic" })
  put(root, "epic/src/tool/Tool.ts", "tool")
  put(root, "epic/src/components/__pack/epics.pack.js", "pack")
  put(root, "epic/src/docs/__data/components.json5", "{}")
  put(root, "epic/src/tools/_assets/spell-ui.js", "bundle")
  put(root, "epic/src/tools/_assets/emoji/cldr/a.js", "emoji")
  put(root, "epic/src/tools/_assets/spell-doc-runtime.js", "runtime")
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  /** a bundle of `SRV.BUNDLES`, by name */
  const bundleOf = (name: string) =>
    new SRV.Bundle(
      root,
      SRV.BUNDLES.find((spec) => spec.name === name)!
    )

  test("never what any committed one generates, nor its own entry:  so no build makes another stale", () => {
    const epicFiles = (name: string) =>
      bundleOf(name)
        .sourceFiles()
        .filter((file) => file.startsWith("spell/epic/"))
    expect(epicFiles("epics-pack")).toEqual([
      "spell/epic/src/tool/Tool.ts",
      "spell/epic/src/tools/_assets/spell-doc-runtime.js"
    ])
    expect(epicFiles("epic-docs")).toEqual(epicFiles("epics-pack"))
  })
})

describe("a build script's steps", () => {
  // the ONE package `spell` at the root, Spell UI's packs in its `ui/`, and a bundle's output folder, `site/out/`
  const root = mkdtempSync(join(tmpdir(), "assembler-bundle-steps-"))
  install(root, { spell: "." })
  put(root, "ui/src/icons/icon-packs/lucide/x.svg", "<svg/>")
  const out = join(root, "site/out")
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  test("clearOutput() empties the folder but the icon packs' link;  linkIconPacks() links them, relative", () => {
    put(root, "site/out/old-chunk.js", "old")
    put(root, "site/out/.bundle.json", "{}")
    SRV.Bundle.linkIconPacks(out)
    SRV.Bundle.linkIconPacks(out)
    SRV.Bundle.clearOutput(out)
    expect(readdirSync(out)).toEqual(["icon-packs"])
    expect(readlinkSync(join(out, "icon-packs"))).toBe("../../ui/src/icons/icon-packs")
    expect(existsSync(join(out, "icon-packs/lucide/x.svg"))).toBe(true)
  })

  test("linkIconPacks() points a link from another layout again", () => {
    rmSync(join(out, "icon-packs"))
    symlinkSync("../../../ui/src/icons/icon-packs", join(out, "icon-packs"))
    SRV.Bundle.linkIconPacks(out)
    expect(readlinkSync(join(out, "icon-packs"))).toBe("../../ui/src/icons/icon-packs")
  })

  test("sizeReport():  the eager files (the entries and what they import statically), the totals, the lazy chunks", () => {
    put(root, "site/out/site.js", 'import "./shared.js";const lazy = () => import("./lazy.js")')
    put(root, "site/out/shared.js", "export const a = 1")
    put(root, "site/out/lazy.js", "export const b = 2")
    put(root, "site/out/site.css", "a{}")
    put(root, "site/out/font.woff2", "font")
    const lines = SRV.Bundle.sizeReport({ name: "site", folder: out, seconds: 1.23, entries: ["site.css", "site.js"] })
    expect(lines[0]).toMatch(/^site bundle \(1\.2s\):  .*site\/out\/$/)
    expect(lines.slice(1, -2).map((line) => line.trim().split(/\s+/)[0])).toEqual(["site.js", "shared.js", "site.css"])
    expect(lines.at(-2)).toMatch(/all 5 files/)
    expect(lines.at(-1)).toMatch(/^  biggest lazy:  (lazy\.js|font\.woff2) .*, (lazy\.js|font\.woff2) /)
    const only = SRV.Bundle.sizeReport({ name: "b", folder: out, seconds: 0, entries: ["site.js"], only: /\.js$/ })
    expect(only.at(-2)).toMatch(/all 3 files/)
  })
})

describe("Bundle.all()", () => {
  const dir = top()
  const repo = join(dir, "spell-app")
  put(repo, "package.json", JSON.stringify({ pageServer: { bundles: BUNDLES } }))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  test("every bundle, or the ones named, in that order;  an unknown name says which there are", () => {
    expect(SRV.Bundle.all(repo).map((bundle) => bundle.name)).toEqual([
      "ui-root",
      "ui-site",
      "brand",
      "epics-pack",
      "epic-docs"
    ])
    expect(SRV.Bundle.all(repo, ["brand", "ui-site"]).map((bundle) => bundle.outputDir)).toEqual([
      join(realpathSync(dir), "spell-brand/_assets/ui"),
      join(realpathSync(dir), "ui/site/_assets")
    ])
    expect(SRV.Bundle.all(repo).map((bundle) => bundle.output)).toEqual(BUNDLES)
    expect(() => SRV.Bundle.all(repo, ["nope"])).toThrow(
      "Bundle.all():  no bundle 'nope';  bundles:  ui-root, ui-site, brand, epics-pack, epic-docs"
    )
  })
})

describe("Bundle.specs()", () => {
  const dir = top()

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  /** A checkout under `dir` whose `package.json` is `json` (none:  no file) */
  function checkout(name: string, json?: unknown): string {
    if (json !== undefined) put(dir, `${name}/package.json`, JSON.stringify(json))
    return join(dir, name)
  }

  test("the folders the root's package.json names, in its order, each with the bundle that builds into it", () => {
    const only = checkout("only", { pageServer: { bundles: ["../spell-brand/_assets/ui"] } })
    expect(SRV.Bundle.specs(only).map((spec) => spec.name)).toEqual(["brand"])
  })

  test("none without a list, as the page server;  a folder no bundle builds into throws", () => {
    expect(SRV.Bundle.specs(checkout("none"))).toEqual([])
    expect(SRV.Bundle.specs(checkout("bare", { name: "x" }))).toEqual([])
    const odd = checkout("odd", { pageServer: { bundles: ["../spell-nope/_assets"] } })
    expect(() => SRV.Bundle.specs(odd)).toThrow("Bundle.specs():  no bundle builds into '../spell-nope/_assets'")
  })

  test("a checkout naming every bundle's folder gets every bundle, each once", () => {
    const every = checkout("every", { pageServer: { bundles: BUNDLES } })
    const outputs = SRV.Bundle.specs(every).map((spec) => spec.name)
    expect([...outputs].sort()).toEqual(SRV.BUNDLES.map((spec) => spec.name).sort())
    expect(new Set(outputs).size).toBe(outputs.length)
  })
})

// the ONE list, as the kit's settings merge it:  Spell UI's part names its site's bundle, spell-brand's its pages'
// (spell-app's own test until epic `repo-split` P16);  only where spell-brand is beside the kit (the kit's CI has none)
describe.skipIf(!SRV.Bundle.packageDirFor("spell-brand", KIT))("the kit's bundles", () => {
  test("the installed repos' settings name every bundle, each once", () => {
    const outputs = SRV.Bundle.specs(KIT).map((spec) => spec.name)
    expect([...outputs].sort()).toEqual(SRV.BUNDLES.map((spec) => spec.name).sort())
    expect(new Set(outputs).size).toBe(outputs.length)
  })
})
