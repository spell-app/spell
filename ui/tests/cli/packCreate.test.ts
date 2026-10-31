import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { DataFile } from "spell/server/DataFile"
import { kitFolders } from "spell/server/kitFolders"
import { readPack } from "spell/ui/cli/packBuild"
import { addElement, createPack, nextSteps } from "spell/ui/cli/packCreate"

/**
 * A throwaway kit per test:  a kit's root files and its folders' manifests (`fixtures/kit/`), a `.yarnrc.yml`, and a
 *   small commands page,
 *   which stands for the epic folder (`SPELL_SHARED_DIR`).
 * - `build: false` throughout:  `packBuild.test.ts` builds.
 */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "pack-create-")))
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** A kit's root files and its folders' manifests, frozen (`fixtures/kit/README.md`). */
const FIXTURE = join(import.meta.dirname, "fixtures", "kit")

/** The commands page, cut down:  a check row naming spell-brand's scripts, and the pack rows. */
const COMMANDS = {
  families: [
    {
      id: "checks",
      rows: [
        { op: "Type-check a repo", yarn: { mark: "same", names: ["root ts", "spell-brand ts", "spell-ui ts"] } },
        {
          op: "Build a pack",
          id: "pack-build",
          cli: { mark: "same", names: ["spell pack build"] },
          yarn: { names: [] }
        },
        {
          op: "Check a pack",
          id: "pack-check",
          cli: { mark: "same", names: ["spell pack check"] },
          yarn: { names: [] }
        }
      ]
    }
  ]
}

/** The commands page's data in the epic folder:  a data file (epic `epic-workflow` P21). */
const COMMANDS_JSON = "guides/dev/commands/commands.json5"

/** Its old name, which the throwaway content starts with:  read, then written as the `.json5`. */
const OLD_COMMANDS_JSON = "guides/dev/commands/commands.json"

let root = ""
let count = 0
beforeEach(() => {
  root = join(TEMP, `kit-${++count}`)
  mkdirSync(root, { recursive: true })
  cpSync(FIXTURE, root, { recursive: true })
  writeFileSync(join(root, ".yarnrc.yml"), "nodeLinker: node-modules\n\nyarnPath: .yarn/releases/yarn.cjs\n")
  mkdirSync(dirname(join(root, COMMANDS_JSON)), { recursive: true })
  writeFileSync(join(root, OLD_COMMANDS_JSON), `${JSON.stringify(COMMANDS, null, 2)}\n`)
  vi.stubEnv("SPELL_SHARED_DIR", root)
})
afterEach(() => vi.unstubAllEnvs())

/** `file`'s text in the throwaway kit. */
function read(file: string): string {
  return readFileSync(join(root, file), "utf8")
}

describe("createPack()", () => {
  test("writes a pack repo from the templates, laid out as spell-brand is, every token filled in", async () => {
    const report = await createPack(root, "cards", { prefix: "epic-", build: false })
    expect(report.created.sort()).toEqual(
      [
        ".epic/generators.json5",
        ".gitattributes",
        ".gitignore",
        ".yarnrc.yml",
        "AGENTS.md",
        "CLAUDE.md",
        "README.md",
        "package.json",
        "src/components/index.ts",
        "src/index.ts",
        "tsconfig.json",
        "vite.config.ts",
        "vitest.config.ts",
        // its tests, in its own tests/ folder at the same paths
        "tests/pack.test.ts",
        "tests/tsconfig.json"
      ]
        .map((file) => `spell-cards/${file}`)
        .sort()
    )
    const pack = JSON.parse(read("spell-cards/package.json"))
    expect(pack).toMatchObject({
      // a repo's one package is named after it (epic `repo-split` P11, Q36);  the pack keeps its own name
      name: "spell-cards",
      // ALL its code in ONE src/, its families in src/components/ (epic `repo-split` P14)
      spellPack: { name: "cards", prefix: "epic-", components: "src/components" },
      exports: {
        ".": { "spell-cards-source": "./src/index.ts", default: "./src/index.ts" },
        "./components": { "spell-cards-source": "./src/components/index.ts" },
        "./*": { default: "./src/*" }
      },
      scripts: { "pack:build": "spell-pack build", "pack:check": "spell-pack check" },
      dependencies: { spell: "workspace:*" },
      // its elements are written on Spell UI
      devDependencies: { "spell-ui": "workspace:*" }
    })
    expect(pack.devDependencies["solid-js"]).toBe(JSON.parse(read("package.json")).resolutions["solid-js"])
    // imported by its package name, through `exports`:  no alias table
    expect(read("spell-cards/tsconfig.json")).toContain('"customConditions": ["spell-cards-source"]')
    expect(read("spell-cards/tsconfig.json")).not.toContain('"paths"')
    expect(read("spell-cards/vitest.config.ts")).toContain("export function cardsProjects(")
    expect(read("spell-cards/vitest.config.ts")).toContain('resolve(import.meta.dirname, "./tests")')
    expect(read("spell-cards/AGENTS.md")).toContain("`spell pack build cards`")
    expect(read("spell-cards/.gitattributes")).toMatch(
      /\nsrc\/components\/__pack\/\*\* +linguist-generated merge=binary -diff\n$/
    )
    expect(JSON.parse(read("spell-cards/.epic/generators.json5").replace(/^\s*\/\/.*$/gm, "")).generators).toEqual([
      { name: "cards pack", outputs: ["src/components/__pack/**"], cwd: ".", run: ["yarn", "pack:build"] }
    ])
    // the kit's own settings, but its yarn release:  that stays the kit's
    expect(read("spell-cards/.yarnrc.yml")).toContain("nodeLinker: node-modules")
    expect(read("spell-cards/.yarnrc.yml")).not.toMatch(/^yarnPath:/m)
    for (const file of report.created) expect(read(file)).not.toMatch(/__(pack|packCamel|prefix|solid)__/)
  })

  test("lands in the kit beside its folders, and joins its `workspaces` last:  one of `kitFolders()`", async () => {
    const folders = kitFolders(root)
    expect(folders).toEqual(["parser", "ui", "epic", "app"].map((folder) => join(root, folder)))
    const before = read("repos.json5")
    const report = await createPack(root, "my-pack", { prefix: "mp-", build: false })
    expect(report.updated).toEqual([
      "package.json (workspaces:  spell-my-pack)",
      `${COMMANDS_JSON} (spell-my-pack's yarn scripts)`
    ])
    expect(JSON.parse(read("package.json")).workspaces).toEqual(["parser", "ui", "epic", "app", "spell-my-pack"])
    // the kit's tools find it as they find its folders:  the install takes it in, `spell pack` finds it by name
    expect(kitFolders(root)).toEqual([...folders, join(root, "spell-my-pack")])
    expect(readPack(root, "my-pack").folder).toBe(join(root, "spell-my-pack"))
    // and the kit's own pack, in `epic/`, still by its name
    expect(readPack(root, "epics").folder).toBe(join(root, "epic"))
    // `repos.json5` lists the repos BESIDE the kit:  never this one
    expect(read("repos.json5")).toBe(before)
    const rows = JSON.parse(read(COMMANDS_JSON)).families[0].rows
    expect(rows.map((row: { yarn: { names: string[] } }) => row.yarn.names)).toEqual([
      ["root ts", "spell-brand ts", "spell-my-pack ts", "spell-ui ts"],
      ["spell-my-pack pack:build"],
      ["spell-my-pack pack:check"]
    ])
    expect(existsSync(join(root, OLD_COMMANDS_JSON))).toBe(false)
  })

  test("the commands page's data:  a comment added by hand stays, its keys quoted (JSON5's JSON part)", async () => {
    rmSync(join(root, OLD_COMMANDS_JSON))
    writeFileSync(join(root, COMMANDS_JSON), `// Owen:  the rows\n${JSON.stringify(COMMANDS, null, 2)}\n`)
    await createPack(root, "my-pack", { prefix: "mp-", build: false })
    const text = read(COMMANDS_JSON)
    expect(text).toContain("// Owen:  the rows")
    expect(text).toContain('"families": [')
    expect(DataFile.parse<typeof COMMANDS>(text).families[0]!.rows[1]!.yarn.names).toEqual(["spell-my-pack pack:build"])
  })

  test("is IDEMPOTENT:  a second run creates nothing and changes nothing", async () => {
    await createPack(root, "cards", { prefix: "epic-", build: false })
    const before = read(COMMANDS_JSON)
    const again = await createPack(root, "cards", { build: false })
    expect(again.created).toEqual([])
    expect(again.updated).toEqual([])
    expect(again.skipped).toContain("spell-cards/package.json")
    expect(again.skipped).toContain("package.json (workspaces:  spell-cards)")
    expect(JSON.parse(read("package.json")).workspaces.filter((each: string) => each === "spell-cards")).toHaveLength(1)
    expect(read(COMMANDS_JSON)).toBe(before)
  })

  test("on a folder with files already:  adds what's missing, keeps the rest, lists what it skipped", async () => {
    const dir = join(root, "spell-cards")
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "README.md"), "mine\n")
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "spell-cards", scripts: { ts: "mine" } }))
    const report = await createPack(root, "cards", { prefix: "epic-", build: false })
    expect(report.skipped).toContain("spell-cards/README.md")
    expect(read("spell-cards/README.md")).toBe("mine\n")
    expect(report.updated[0]).toMatch(/^spell-cards\/package\.json \(version, .*scripts\.pack:build.*spellPack\)$/)
    const pack = JSON.parse(read("spell-cards/package.json"))
    expect(pack.scripts.ts).toBe("mine")
    expect(pack.scripts["pack:check"]).toBe("spell-pack check")
    expect(pack.spellPack).toEqual({ name: "cards", prefix: "epic-", components: "src/components" })
  })

  test("refuses a bad name, a repo of the kit's own, a bad prefix, or another prefix than the pack's", async () => {
    await expect(createPack(root, "Cards", { build: false })).rejects.toThrow(/isn't a pack name/)
    // each of the kit's folders, by its folder, its manifest's name (`spell-ui`) or its pack's (`epics`)
    for (const folder of ["parser", "ui", "epic", "app"]) {
      await expect(createPack(root, folder, { build: false })).rejects.toThrow(
        `one of the kit's own folders, ${folder}/`
      )
    }
    await expect(createPack(root, "epics", { build: false })).rejects.toThrow("one of the kit's own folders, epic/")
    await expect(createPack(root, "cards", { prefix: "ui-", build: false })).rejects.toThrow(/isn't a tag prefix/)
    await expect(createPack(root, "cards", { prefix: "epic", build: false })).rejects.toThrow(/isn't a tag prefix/)
    await createPack(root, "cards", { prefix: "epic-", build: false })
    await expect(createPack(root, "cards", { prefix: "e-", build: false })).rejects.toThrow(/prefix 'epic-'/)
  })

  test("defaults the prefix to `<name>-`;  says what's left to do", async () => {
    await createPack(root, "cards", { build: false })
    expect(readPack(root, "cards").prefix).toBe("cards-")
    expect(nextSteps("cards").join("\n")).toMatch(/git -C spell-cards init[\s\S]*yarn install/)
    expect(nextSteps("cards").join("\n")).not.toContain("repos.json5")
  })
})

describe("addElement()", () => {
  test("writes one family like brand's, and exports it from the components barrel and `package.json`", async () => {
    await createPack(root, "cards", { prefix: "epic-", build: false })
    const report = await addElement(root, "cards", "epic-page-header", { build: false })
    const family = "spell-cards/src/components/epic-page-header"
    // its test in the pack repo's tests/ folder, at the same path
    const test = `spell-cards/tests/components/epic-page-header/EpicPageHeader.test.tsx`
    expect(report.created.sort()).toEqual(
      [
        ...["EpicPageHeader.css", "EpicPageHeader.en.ts", "EpicPageHeader.tsx", "index.ts"].map(
          (file) => `${family}/${file}`
        ),
        test
      ].sort()
    )
    expect(report.updated).toEqual([
      "spell-cards/src/components/index.ts (exports epic-page-header)",
      "spell-cards/package.json (exports ./components/epic-page-header)"
    ])
    // its key BEFORE `./*`:  tsx, from another repo, finds no folder's `index` through the wildcard
    const exports = Object.keys(JSON.parse(read("spell-cards/package.json")).exports)
    expect(exports.indexOf("./components/epic-page-header")).toBe(exports.indexOf("./*") - 1)
    expect(JSON.parse(read("spell-cards/package.json")).exports["./components/epic-page-header"]).toEqual({
      "spell-cards-source": "./src/components/epic-page-header/index.ts",
      types: "./dist-types/src/components/epic-page-header/index.d.ts",
      default: "./src/components/epic-page-header/index.ts"
    })
    expect(read(`${family}/EpicPageHeader.tsx`)).toContain(
      "export class EpicPageHeader extends E.UIComponent<typeof epicPageHeaderVocabulary>"
    )
    expect(read(`${family}/EpicPageHeader.tsx`)).toContain(
      '@E.protoMerged static elementSetup = {\n    styleSheets: { "epic-page-header": pageHeaderCSS }\n  }'
    )
    expect(read(`${family}/EpicPageHeader.en.ts`)).toMatch(
      /export const epicPageHeaderVocabulary = \{\n {2}tag: "epic-page-header",[\s\S]*noun: "page-header",/
    )
    expect(read(`${family}/EpicPageHeader.css`)).toContain("--_epic-page-header-gap: var(--epic-page-header-gap")
    // by its package name, as every repo's tests import
    expect(read(test)).toContain(`import "spell-cards/components/epic-page-header"`)
    const barrel = read("spell-cards/src/components/index.ts")
    expect(barrel).not.toContain("export {}")
    expect(barrel.endsWith(`*/\nexport * from "./epic-page-header"\n`)).toBe(true)
  })

  test("is idempotent, and adds a second family after the first", async () => {
    await createPack(root, "cards", { prefix: "epic-", build: false })
    await addElement(root, "cards", "epic-page", { build: false })
    const again = await addElement(root, "cards", "epic-page", { build: false })
    expect(again.created).toEqual([])
    expect(again.updated).toEqual([])
    await addElement(root, "cards", "epic-card", { build: false })
    expect(read("spell-cards/src/components/index.ts")).toMatch(
      /export \* from "\.\/epic-page"\nexport \* from "\.\/epic-card"\n$/
    )
  })

  test("refuses a tag without the pack's prefix, and a name that's no pack", async () => {
    await createPack(root, "cards", { prefix: "epic-", build: false })
    await expect(addElement(root, "cards", "ui-page", { build: false })).rejects.toThrow(/starting 'epic-'/)
    await expect(addElement(root, "cards", "epic-", { build: false })).rejects.toThrow(/isn't a tag/)
    await expect(addElement(root, "nope", "nope-x", { build: false })).rejects.toThrow(/isn't a component pack/)
    expect(existsSync(join(root, "spell-cards", "src", "components", "ui-page"))).toBe(false)
  })
})
