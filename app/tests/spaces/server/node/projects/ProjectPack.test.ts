import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync, appendFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { PACK_MODULES } from "spell/element-tools/packModules"
import { PackModules } from "spell/ui/components/ui-components/PackModules"
import { addElement, createPack } from "spell/ui/cli/packCreate"
import { ProjectPack, watchProjectPacks } from "spell/app/spaces/server/node/projects/ProjectPack"

/**
 * A Spell project's own elements, built into its component pack with its compiled output:
 * `ProjectPack` on a throwaway project, its families scaffolded by Spell UI's `pack add`, its project file saying
 * `"componentPack"` (and no `package.json` naming a pack).
 * - Builds with Vite, as `spell compile` does:  the tests run in order.
 * - A project outside every spaces folder builds beside its source (`buildFolderFor()`):  its `__pack/` is there.
 */
const ROOT = realpathSync(mkdtempSync(join(tmpdir(), "project-pack-")))
afterAll(() => {
  rmSync(ROOT, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

/** The project's folder, and its one family's. */
const PROJECT = join(ROOT, "spell-demo")
const CARD = join(PROJECT, "src", "components", "demo-card")

/** The kit, where its install's `node_modules` is. */
const KIT = dirname(fileURLToPath(import.meta.resolve("spell/package.json")))

/** A kit's root files, frozen:  what `pack create` reads (Spell UI's `packBuild.test.ts`'s). */
const FIXTURE = join(KIT, "ui", "tests", "cli", "fixtures", "kit")

beforeAll(async () => {
  for (const file of ["package.json", "repos.json5"]) writeFileSync(join(ROOT, file), readFileSync(join(FIXTURE, file)))
  symlinkSync(join(KIT, "node_modules"), join(ROOT, "node_modules"))
  vi.stubEnv("SPELL_SHARED_DIR", ROOT)
  await createPack(ROOT, "demo", { prefix: "demo-", build: false })
  await addElement(ROOT, "demo", "demo-card", { build: false })
  // a project, not a package:  its project file names its pack
  const manifest = JSON.parse(readFileSync(join(PROJECT, "package.json"), "utf8")) as Record<string, unknown>
  delete manifest.spellPack
  writeFileSync(join(PROJECT, "package.json"), JSON.stringify(manifest, null, 2))
  writeFileSync(
    join(PROJECT, "__project.json5"),
    `{\n  // its elements\n  "componentPack": { "name": "demo", "prefix": "demo-", "components": "src/components" },\n  "imports": []\n}\n`
  )
}, 60_000)

describe("ProjectPack", () => {
  test("a project file without a pack:  none, and nothing built", async () => {
    const plain = join(ROOT, "plain")
    rmSync(plain, { recursive: true, force: true })
    await import("node:fs").then(({ mkdirSync }) => mkdirSync(plain))
    writeFileSync(join(plain, "__project.json5"), `{ "imports": [] }\n`)
    expect(ProjectPack.of(plain)).toBeUndefined()
    expect(await ProjectPack.build(plain)).toEqual({ built: "none" })
  })

  test("its pack:  read from the project file, its code the whole project, generated into `__pack/` of its build folder", () => {
    const pack = ProjectPack.of(PROJECT)!
    expect(pack).toMatchObject({
      name: "demo",
      prefix: "demo-",
      folder: PROJECT,
      src: PROJECT,
      components: join(PROJECT, "src", "components"),
      generated: ProjectPack.generatedFolder(PROJECT)
    })
    expect(pack.packageName).toBeUndefined()
    expect(pack.needsBuild()).toBe(true)
  })

  test("builds once its sources changed, and only then:  `force` builds anyway", async () => {
    const built = await ProjectPack.build(PROJECT)
    expect(built).toMatchObject({ built: "built", pack: "demo", tags: 1 })
    expect(await ProjectPack.build(PROJECT)).toEqual({ built: "current", pack: "demo" })
    appendFileSync(join(CARD, "DemoCard.css"), "\n/* changed */\n")
    expect(ProjectPack.of(PROJECT)!.needsBuild()).toBe(true)
    expect(await ProjectPack.build(PROJECT, { forPage: true })).toMatchObject({ built: "built" })
    expect(await ProjectPack.build(PROJECT, { force: true })).toMatchObject({ built: "built" })
  }, 120_000)

  // Q17 B:  the dev server's way (the source entry) and the built way hold the same tags and the same shared modules
  test("its source entry, for a dev server, registers the same pack as its built entry:  same tags, same families", () => {
    const pack = ProjectPack.of(PROJECT)!
    const entry = readFileSync(pack.files.entry, "utf8")
    const devEntry = readFileSync(pack.files.devEntry, "utf8")
    const catalog = readFileSync(pack.files.catalog, "utf8")
    // a catalog's lines:  `  "demo-card": { ... }`;  the source entry's family loaders are `() => import(...)`
    const tags = (text: string) =>
      [...text.matchAll(/^ {2}"([a-z][\w-]*)": (?!\(\) => import)/gm)].map((match) => match[1])
    expect(tags(devEntry)).toEqual(tags(catalog))
    expect(tags(catalog)).toEqual(["demo-card"])
    for (const family of pack.families()) {
      expect(entry).toContain(JSON.stringify(family))
      expect(devEntry).toContain(JSON.stringify(join(pack.components, family, "index.ts")))
    }
    for (const text of [entry, devEntry]) {
      expect(text).toContain(`name: "demo"`)
      expect(text).toContain(`prefix: "demo-"`)
    }
  })

  test("its built families take every shared module from the page, the list a dev server resolves alike", () => {
    const pack = ProjectPack.of(PROJECT)!
    const family = readFileSync(join(pack.files.families, "demo-card.js"), "utf8")
    // nothing of the page's imported as a module:  read from `SpellUI.packModules`, by its key
    for (const specifier of PACK_MODULES) expect(family).not.toContain(`from"${specifier}"`)
    expect(family).toContain("globalThis.SpellUI.packModules[")
    // and every key a pack may import is one the page fills (`PackModules`, Spell UI's one list)
    for (const specifier of PACK_MODULES) expect(Object.keys(PackModules.HOLDERS)).toContain(specifier)
  })

  // Q17 A:  the page server's watch of the spaces
  test("watchProjectPacks():  a save to an element, once quiet, rebuilds its project's pack, then reports its script", async () => {
    const rebuild = vi.fn(async () => true)
    const report = vi.fn()
    const stop = watchProjectPacks({
      folders: [
        {
          dir: ROOT,
          projectFor: (inside) =>
            inside.startsWith("spell-demo/") ? { projectId: "@demo/spell-demo", folder: PROJECT } : undefined
        }
      ],
      rebuild,
      report,
      quiet: 50
    })
    try {
      // a file no element reads:  nothing
      writeFileSync(join(PROJECT, "notes.txt"), "not the pack's\n")
      await new Promise((done) => setTimeout(done, 400))
      expect(rebuild).not.toHaveBeenCalled()
      // an element's sheet, saved twice:  ONE rebuild once quiet, then its script reported
      appendFileSync(join(CARD, "DemoCard.css"), "\n/* saved */\n")
      appendFileSync(join(CARD, "DemoCard.css"), "\n/* saved again */\n")
      await vi.waitFor(() => expect(report).toHaveBeenCalledOnce(), { timeout: 5000 })
      expect(rebuild).toHaveBeenCalledExactlyOnceWith("@demo/spell-demo")
      const [projectId, pack] = report.mock.calls[0]! as [string, ReturnType<typeof ProjectPack.of>]
      expect(projectId).toBe("@demo/spell-demo")
      expect(pack!.files.script).toBe(join(ProjectPack.generatedFolder(PROJECT), "demo.pack.js"))
    } finally {
      stop()
    }
  })
})
