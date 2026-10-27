import { spawnSync } from "node:child_process"
import { appendFileSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import { buildPack, checkPack, packNames, readPack } from "spell-ui/cli/packBuild"
import { addElement, createPack } from "spell-ui/cli/packCreate"

/**
 * ONE throwaway kit, with a tiny pack repo in it:  `pack create` + `pack add` (unbuilt), on a kit's root files
 *   (`fixtures/kit/`).
 * - `node_modules` is a link to the install's:  the pack's `tsconfig.json` extends
 *   `spell/toolchain/tsconfig.base.json`, and its elements import Spell UI by its npm name (`spell-ui/core`)
 * - the tests run in order
 */
const ROOT = realpathSync(mkdtempSync(join(tmpdir(), "pack-build-")))
afterAll(() => {
  rmSync(ROOT, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

/** The pack's repo, and its card family's folder. */
const PACK = join(ROOT, "spell-demo")
const CARD = join(PACK, "src", "components", "demo-card")

/** The kit `spell` runs from:  its root, where its install's `node_modules` is. */
const KIT = dirname(fileURLToPath(import.meta.resolve("spell/package.json")))

/** The real `spell` command, the kit's. */
const SPELL = join(KIT, "bin", "spell.mjs")

/** A kit's root files, frozen (`fixtures/kit/README.md`):  what `pack create` reads. */
const FIXTURE = join(import.meta.dirname, "fixtures", "kit")

beforeAll(async () => {
  for (const file of ["package.json", "repos.json5"]) writeFileSync(join(ROOT, file), readFileSync(join(FIXTURE, file)))
  symlinkSync(join(KIT, "node_modules"), join(ROOT, "node_modules"))
  // the commands page:  none here, and never the real one
  vi.stubEnv("SPELL_SHARED_DIR", ROOT)
  await createPack(ROOT, "demo", { prefix: "demo-", build: false })
  await addElement(ROOT, "demo", "demo-card", { build: false })
})

/**
 * `spell pack build` / `check`:  the kit's pack tooling (`ComponentPack`, its own tests in
 * the kit's `tests/element-tools/`) on a pack found by name in a kit, its paths relative to the kit.
 */
describe("buildPack() / checkPack()", () => {
  test("an unbuilt pack is STALE:  every generated file missing", async () => {
    expect((await checkPack(ROOT, "demo")).stale).toEqual([
      "spell-demo/src/components/__pack/demo.catalog.ts:  missing",
      "spell-demo/src/components/__pack/demo.entry.ts:  missing",
      "spell-demo/src/components/__pack/demo.pack.js:  missing"
    ])
  })

  test("builds ONE classic script:  an IIFE taking Solid and Spell UI from `SpellUI.packModules`, registering itself", async () => {
    const report = await buildPack(ROOT, "demo")
    expect(report).toMatchObject({
      pack: "demo",
      tags: ["demo-card"],
      files: [
        "spell-demo/src/components/__pack/demo.catalog.ts",
        "spell-demo/src/components/__pack/demo.entry.ts",
        "spell-demo/src/components/__pack/demo.pack.js"
      ]
    })
    const script = readFileSync(join(PACK, "src", "components", "__pack", "demo.pack.js"), "utf8")
    expect(script.split("\n")[0]).toBe(
      `/* GENERATED -- do not edit:  \`spell pack build demo\`.  sources:  ${report.hash} */`
    )
    expect(script.split("\n")[1]).toMatch(/^\(function\(/)
    expect(script).toMatch(
      /\}\)\(globalThis\.SpellUI\.packModules\[`@solidjs\/web`\],globalThis\.SpellUI\.packModules\[`spell-ui\/core`\]\);\s*$/
    )
    expect(script).not.toMatch(/\bimport\s*[{(*]|\bexport\s*\{/)
    expect(script).toContain("registerPack({name:`demo`,prefix:`demo-`")
    expect(script).toContain(":host")
    const catalog = readFileSync(join(PACK, "src", "components", "__pack", "demo.catalog.ts"), "utf8")
    expect(catalog).toContain(`// sources:  ${report.hash}\n`)
    expect(catalog).toContain(`"demo-card": {"folder":"demo-card","skeleton":{"height":"2em"},"attributes":[]}`)
    expect(readFileSync(join(PACK, "src", "components", "__pack", "demo.entry.ts"), "utf8")).toContain(
      `import("../demo-card")`
    )
  }, 60_000)

  // After an edit, through the CLI:  a fresh process reads the vocabularies again (`import()` caches them here)

  test("CURRENT once built;  STALE after a vocabulary edit, and current again after a rebuild", async () => {
    expect(await checkPack(ROOT, "demo")).toMatchObject({ stale: [] })
    expect(spell("check")).toEqual({ status: 0, out: "demo:  current\n" })
    const vocabulary = join(CARD, "DemoCard.en.ts")
    writeFileSync(vocabulary, readFileSync(vocabulary, "utf8").replace(`skeleton: "2 tall"`, `skeleton: "5 tall"`))
    expect((await checkPack(ROOT, "demo")).stale).toEqual([
      "spell-demo/src/components/__pack/demo.catalog.ts:  built from older sources",
      "spell-demo/src/components/__pack/demo.pack.js:  built from older sources"
    ])
    expect(spell("check")).toEqual({
      status: CLI.EXIT.ERRORS,
      out:
        "demo:  STALE\n  spell-demo/src/components/__pack/demo.catalog.ts:  built from older sources\n" +
        "  spell-demo/src/components/__pack/demo.pack.js:  built from older sources\nfix:  spell pack build demo\n"
    })
    expect(spell("build", "demo").status).toBe(0)
    expect(readFileSync(join(PACK, "src", "components", "__pack", "demo.catalog.ts"), "utf8")).toContain(
      `"height":"5em"`
    )
    expect(spell("check", "demo").status).toBe(0)
  }, 60_000)

  test("a test file's edit never makes the pack stale:  tests aren't in it", () => {
    appendFileSync(join(CARD, "DemoCard.test.tsx"), "// more\n")
    expect(spell("check").status).toBe(0)
  })

  test("a hand edit of the catalog is caught, though its hash still matches", () => {
    const catalog = join(PACK, "src", "components", "__pack", "demo.catalog.ts")
    writeFileSync(catalog, readFileSync(catalog, "utf8").replace("5em", "6em"))
    expect(spell("check").out).toContain("demo.catalog.ts:  not what a build writes (edited by hand?)")
    expect(spell("build", "demo").status).toBe(0)
  }, 60_000)

  test("refuses an import of Spell UI the page can't share, and a tag without the prefix", () => {
    const element = join(CARD, "DemoCard.tsx")
    const source = readFileSync(element, "utf8")
    writeFileSync(element, `import "spell-ui/util"\n${source}`)
    expect(spell("build", "demo").out).toContain("imports 'spell-ui/util', which the page can't share")
    writeFileSync(element, source)
    const vocabulary = join(CARD, "DemoCard.en.ts")
    const words = readFileSync(vocabulary, "utf8")
    writeFileSync(vocabulary, words.replace(`tag: "demo-card"`, `tag: "x-card"`))
    expect(spell("build", "demo")).toMatchObject({ status: CLI.EXIT.ERRORS })
    expect(spell("build", "demo").out).toContain("every tag must start 'demo-', but these don't:  x-card")
    writeFileSync(vocabulary, words)
  }, 60_000)
})

// epic `epic-eject` J14:  spell-epic is one package, its pack in `src/`
describe("a pack repo checked out on its own", () => {
  test("found by the name its root `package.json` gives it:  Spell UI's pack, `components/` in its `dir`", () => {
    const repo = realpathSync(mkdtempSync(join(tmpdir(), "pack-root-")))
    const src = join(repo, "src")
    writeFileSync(
      join(repo, "package.json"),
      JSON.stringify({ spellPack: { name: "flat", prefix: "flat-", dir: "src" }, scripts: {} })
    )
    try {
      expect(readPack(repo, "flat")).toMatchObject({ name: "flat", prefix: "flat-", dir: src, src, folder: repo })
      expect(packNames(repo)).toEqual(["flat"])
      expect(() => readPack(repo, "other")).toThrow(/isn't a component pack;  make one with `spell pack create/)
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })
})

/** `spell pack <args>` run as a person would, in the throwaway pack's folder:  its exit code and output. */
function spell(...args: string[]) {
  const run = spawnSync(process.execPath, [SPELL, "pack", ...args], { cwd: PACK, encoding: "utf8" })
  return { status: run.status, out: run.stdout + run.stderr }
}
