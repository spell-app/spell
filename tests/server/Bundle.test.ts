import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell-kit/server"

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

/** An install holding Spell UI's and the brand's packages, each its own repo beside the checkout, `spell-app/`. */
function top(): string {
  const dir = mkdtempSync(join(tmpdir(), "assembler-bundles-"))
  install(dir, { "spell-ui": "spell-ui", "spell-brand": "spell-brand" })
  mkdirSync(join(dir, "spell-app"))
  return dir
}

/** The two bundles' folders, as spell-app's root `package.json` names them. */
const BUNDLES = ["../spell-ui/site/_assets", "../spell-brand/_assets/ui"]

describe("Bundle.all()", () => {
  const dir = top()
  const repo = join(dir, "spell-app")
  put(repo, "package.json", JSON.stringify({ pageServer: { bundles: BUNDLES } }))

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  test("every bundle, or the ones named, in that order;  an unknown name says which there are", () => {
    expect(SRV.Bundle.all(repo).map((bundle) => bundle.name)).toEqual(["ui-site", "brand"])
    expect(SRV.Bundle.all(repo, ["brand", "ui-site"]).map((bundle) => bundle.outputDir)).toEqual([
      join(realpathSync(dir), "spell-brand/_assets/ui"),
      join(realpathSync(dir), "spell-ui/site/_assets")
    ])
    expect(SRV.Bundle.all(repo).map((bundle) => bundle.output)).toEqual(BUNDLES)
    expect(() => SRV.Bundle.all(repo, ["nope"])).toThrow("Bundle.all():  no bundle 'nope';  bundles:  ui-site, brand")
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

// the ONE list, as the kit's settings merge it:  spell-ui's part names its site's bundle, spell-brand's its pages'
// (spell-app's own test until epic `repo-split` P16);  only where both repos are installed (the kit's CI has neither)
describe.skipIf(!["spell-ui", "spell-brand"].every((repo) => existsSync(join(KIT, repo, "package.json"))))(
  "the kit's bundles",
  () => {
    test("the installed repos' settings name every bundle, each once", () => {
      const outputs = SRV.Bundle.specs(KIT).map((spec) => spec.name)
      expect([...outputs].sort()).toEqual(SRV.BUNDLES.map((spec) => spec.name).sort())
      expect(new Set(outputs).size).toBe(outputs.length)
    })
  }
)
