import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { KIT_ROOT } from "spell/cli/findCheckout"
import { PluginPackage, type PublishedRepo } from "spell/cli/publish"

/**
 * `PluginPackage`, the `spell-epic` npm package (epic `epic-engine` P49, Q43):  what it ships from the REAL `epic/`
 * folder, and the root marketplace's source turned to npm at publish (Q42) on a made-up one.
 */
const EPIC = join(KIT_ROOT, "epic")
const ROOT = mkdtempSync(join(tmpdir(), "plugin-package-"))
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

/** The epic folder as `spell publish` finds it. */
function epicRepo(): PublishedRepo {
  const manifest = JSON.parse(readFileSync(join(EPIC, "package.json"), "utf8"))
  return { name: "spell-epic", root: EPIC, manifest, settings: manifest.spellPublish }
}

describe("namedFiles() / parts()", () => {
  const named = PluginPackage.namedFiles(EPIC)
  const parts = new PluginPackage(epicRepo(), join(ROOT, "stage"), "0.0.0", {}, {}).parts()

  test("every file the skills, hooks, monitors and agents name is there, and ships", () => {
    expect(named).toEqual(expect.arrayContaining(["hooks/handoff.mjs", "designer/craft.md", "src/AGENTS.md"]))
    for (const path of named) {
      expect(existsSync(join(EPIC, path)), path).toBe(true)
      expect(
        parts.some((part) => path === part || path.startsWith(`${part}/`) || part === path.replace(/\/$/, "")),
        path
      ).toBe(true)
    }
  })

  test("none of them is code in src/:  a skill names the plugin's code by its GitHub address", () => {
    expect(named.filter((path) => path.startsWith("src/") && /\.(tsx?|mts|jsx?|mjs)$/.test(path))).toEqual([])
  })
})

describe("the Codex manifest (epic `epic-friend` P12)", () => {
  test("ships, its skills and hooks paths there;  staged at the package's version, as Claude Code's is", async () => {
    expect(new PluginPackage(epicRepo(), join(ROOT, "stage"), "0.0.0", {}, {}).parts()).toContain(".codex-plugin")
    expect(PluginPackage.codexManifestProblems(EPIC)).toEqual([])
    const stage = join(ROOT, "stage-codex")
    await new PluginPackage(epicRepo(), stage, "9.9.9", {}, {}).stage()
    for (const folder of [".claude-plugin", ".codex-plugin"])
      expect(JSON.parse(readFileSync(join(stage, folder, "plugin.json"), "utf8"))).toMatchObject({
        name: "epic",
        version: "9.9.9"
      })
    expect(PluginPackage.codexManifestProblems(stage)).toEqual([])
  })

  test("a missing manifest, or one whose skills folder isn't there, is a problem", () => {
    const root = join(ROOT, "no-codex")
    expect(PluginPackage.codexManifestProblems(root)).toEqual([".codex-plugin/plugin.json missing"])
    mkdirSync(join(root, ".codex-plugin"), { recursive: true })
    writeFileSync(join(root, ".codex-plugin", "plugin.json"), '{ "name": "epic", "skills": "./skills/" }')
    expect(PluginPackage.codexManifestProblems(root)).toEqual([
      "its skills (./skills/) isn't there",
      "its hooks (undefined) isn't there"
    ])
  })
})

describe("sourceToNpm()", () => {
  test("the root marketplace's epic entry:  ./epic turned to the npm package;  again, nothing", () => {
    mkdirSync(join(ROOT, "kit", ".claude-plugin"), { recursive: true })
    const file = join(ROOT, "kit", ".claude-plugin", "marketplace.json")
    writeFileSync(file, readFileSync(join(KIT_ROOT, ".claude-plugin", "marketplace.json")))
    expect(JSON.parse(readFileSync(file, "utf8")).plugins[0].source).toBe("./epic")
    expect(PluginPackage.sourceToNpm(join(ROOT, "kit"))).toBe(true)
    const marketplace = JSON.parse(readFileSync(file, "utf8"))
    expect(marketplace.name).toBe("spell")
    expect(marketplace.plugins[0]).toMatchObject({ name: "epic", source: { source: "npm", package: "spell-epic" } })
    expect(PluginPackage.sourceToNpm(join(ROOT, "kit"))).toBe(false)
    expect(PluginPackage.sourceToNpm(join(ROOT, "none"))).toBe(false)
  })
})
