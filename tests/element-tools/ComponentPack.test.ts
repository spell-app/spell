import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { ComponentPack } from "spell-kit/element-tools/ComponentPack"
import { ComponentPackError } from "spell-kit/element-tools/tools.types"

/**
 * The kit's pack tooling (Spell UI's from epic `repo-split` P5, the kit's from P10):  what a pack is, and what its build
 * is made from.
 * - Each test writes a tiny pack of its own into a throwaway folder;  nothing here builds (no Vite):
 *   the CLI's `packBuild.test.ts` builds a scaffolded pack through `spell pack build`, and the brand's and
 *   spell-epic's own `pack.test.ts` check theirs.
 */
const ROOT = realpathSync(mkdtempSync(join(tmpdir(), "component-pack-")))
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

describe("ComponentPack.read()", () => {
  test("a package's pack:  named for its folder, `components/` in it, its code in `src/`", () => {
    const folder = writePack("cards", { "package.json": { spellPack: { prefix: "cards-" } } })
    expect(ComponentPack.read(folder)).toMatchObject({
      name: "cards",
      prefix: "cards-",
      folder,
      dir: folder,
      src: join(folder, "src")
    })
    expect(ComponentPack.prefixOf(folder)).toBe("cards-")
  })

  // epic `epic-eject` J14:  spell-epic is one package, its pack in `src/`, its code that folder itself
  test("a repo that IS a pack:  its own name, and `components/` and its code in its `dir`", () => {
    const folder = writePack("repo", {
      "package.json": { name: "flat-repo", spellPack: { name: "flat", prefix: "flat-", dir: "src" }, scripts: {} },
      "src/components/index.ts": `export * from "./flat-card"\n`,
      "src/components/flat-card/index.ts": `import { WORDS } from "flat-repo/shared"\n`,
      "src/shared/index.ts": `export const WORDS = 1\n`,
      "src/unused.ts": `export const NODE_ONLY = 1\n`
    })
    const src = join(folder, "src")
    const pack = ComponentPack.read(folder)
    expect(pack).toMatchObject({ name: "flat", prefix: "flat-", folder, dir: src, src })
    expect(relativeSources(pack, src)).toEqual([
      "components/flat-card/index.ts",
      "components/index.ts",
      "shared/index.ts"
    ])
  })

  // epic `repo-split` P14:  the brand's code is all in ONE `src/`, its elements in `src/components/`, its docs outside
  test("a pack in ONE `src/`:  `components` names its families' folder, and its package's own names are its files", () => {
    const folder = writePack("one-src", {
      "package.json": { name: "one-src", spellPack: { name: "one", prefix: "one-", components: "src/components" } },
      "src/components/index.ts": `export * from "./one-card"\n`,
      "src/components/one-card/index.ts": `import { WORDS } from "one-src"\nimport "one-src/components/one-dot"\n`,
      "src/components/one-dot/index.ts": `export const DOT = 1\n`,
      "src/index.ts": `export * from "./words"\n`,
      "src/words.ts": `export const WORDS = 1\n`,
      "src/tool.ts": `export const NODE_ONLY = 1\n`
    })
    const pack = ComponentPack.read(folder)
    expect(pack).toMatchObject({
      name: "one",
      dir: folder,
      src: join(folder, "src"),
      components: join(folder, "src/components"),
      packageName: "one-src"
    })
    expect(pack.files.script).toBe(join(folder, "src/components/__pack/one.pack.js"))
    expect(pack.families()).toEqual(["one-card", "one-dot"])
    expect(relativeSources(pack, folder)).toEqual([
      "src/components/index.ts",
      "src/components/one-card/index.ts",
      "src/components/one-dot/index.ts",
      "src/index.ts",
      "src/words.ts"
    ])
  })

  test("a folder without a `spellPack` isn't one:  `read()` throws, `prefixOf()` says `undefined`", () => {
    const folder = writePack("plain", { "package.json": { name: "plain" } })
    expect(() => ComponentPack.read(folder)).toThrow(ComponentPackError)
    expect(() => ComponentPack.read(folder)).toThrow(/has no "spellPack": \{ "prefix" \}, so it isn't a component pack/)
    expect(ComponentPack.prefixOf(folder)).toBeUndefined()
    expect(ComponentPack.prefixOf(join(ROOT, "nowhere"))).toBeUndefined()
  })
})

// The hash follows the elements' imports:  `src/` may hold node-only code (a tool, its tests) the script never bundles

describe("ComponentPack.hash() / sources()", () => {
  test("a file under `src/` the elements don't import never changes the hash", () => {
    const folder = writePack("quiet", card("quiet"))
    const pack = ComponentPack.read(folder)
    const hash = pack.hash()
    write(folder, "src/tool/Tool.ts", `export const TOOL = 1\n`)
    expect(pack.hash()).toBe(hash)
    write(folder, "src/tool/Tool.ts", `export const TOOL = 2\n`)
    expect(pack.hash()).toBe(hash)
  })

  test("a file under `src/` the elements DO import, directly or through another, or as `?inline` CSS, does", () => {
    const folder = writePack("loud", {
      ...card("loud"),
      "package.json": { name: "loud", spellPack: { prefix: "loud-" } },
      "components/loud-card/LoudCard.tsx":
        `import { WORDS } from "loud/shared"\nimport look from "loud/shared/look.css?inline"\n` +
        `export const CARD = [WORDS, look]\n`,
      "src/shared/index.ts": `export * from "./words"\n`,
      "src/shared/words.ts": `export const WORDS = 1\n`,
      "src/shared/look.css": `:host { color: red }\n`
    })
    const pack = ComponentPack.read(folder)
    const hashes = [pack.hash()]
    write(folder, "src/shared/index.ts", `export * from "./words"\nexport const MORE = 1\n`)
    hashes.push(pack.hash())
    write(folder, "src/shared/words.ts", `export const WORDS = 2\n`)
    hashes.push(pack.hash())
    write(folder, "src/shared/look.css", `:host { color: blue }\n`)
    hashes.push(pack.hash())
    expect(new Set(hashes).size).toBe(4)
    expect(relativeSources(pack, folder)).toEqual([
      "components/index.ts",
      "components/loud-card/LoudCard.en.ts",
      "components/loud-card/LoudCard.tsx",
      "components/loud-card/index.ts",
      "src/shared/index.ts",
      "src/shared/look.css",
      "src/shared/words.ts"
    ])
  })

  test("tests and the pack's own generated folder are never sources", () => {
    const folder = writePack("tidy", {
      ...card("tidy"),
      "components/tidy-card/TidyCard.test.tsx": "// a test\n",
      "components/__pack/tidy.catalog.ts": "// generated\n"
    })
    const pack = ComponentPack.read(folder)
    expect(relativeSources(pack, folder)).toEqual([
      "components/index.ts",
      "components/tidy-card/TidyCard.en.ts",
      "components/tidy-card/TidyCard.tsx",
      "components/tidy-card/index.ts"
    ])
    expect(pack.families()).toEqual(["tidy-card"])
  })
})

describe("ComponentPack.check() / build()", () => {
  test("an unbuilt pack is STALE:  every generated file missing, by its absolute path", async () => {
    const folder = writePack("fresh", card("fresh"))
    const pack = ComponentPack.read(folder)
    const { files } = pack
    expect(await pack.check()).toEqual({
      pack: "fresh",
      hash: pack.hash(),
      stale: [
        { file: files.catalog, reason: "missing" },
        { file: files.entry, reason: "missing" },
        { file: files.script, reason: "missing" }
      ]
    })
    expect(files.script).toBe(join(folder, "components", "__pack", "fresh.pack.js"))
  })

  test("refuses a tag without the pack's prefix, before it builds anything", async () => {
    const folder = writePack("strict", card("strict", "x-card"))
    await expect(ComponentPack.read(folder).build()).rejects.toThrow(
      "pack 'strict':  every tag must start 'strict-', but these don't:  x-card"
    )
  })
})

describe("ComponentPack.main()", () => {
  test("`build` / `check` only, and one folder:  else the usage line, exit 2", async () => {
    const err = vi.spyOn(process.stderr, "write").mockReturnValue(true)
    try {
      expect(await ComponentPack.main([])).toBe(2)
      expect(await ComponentPack.main(["make"])).toBe(2)
      expect(await ComponentPack.main(["check", "a", "b"])).toBe(2)
      expect(String(err.mock.calls[0]?.[0])).toMatch(/^usage:  spell-pack build \| check \[<folder>\]/)
    } finally {
      err.mockRestore()
    }
  })

  test("a folder that isn't a pack:  its message, exit 1;  a stale pack:  each file and the fix, exit 1", async () => {
    const out = vi.spyOn(process.stdout, "write").mockReturnValue(true)
    const err = vi.spyOn(process.stderr, "write").mockReturnValue(true)
    try {
      expect(await ComponentPack.main(["check", writePack("none", { "package.json": {} })])).toBe(1)
      expect(String(err.mock.calls[0]?.[0])).toContain("so it isn't a component pack")
      const folder = writePack("late", card("late"))
      expect(await ComponentPack.main(["check", folder])).toBe(1)
      const printed = out.mock.calls.map(([text]) => String(text)).join("")
      expect(printed).toContain("late:  STALE\n")
      expect(printed).toContain("late.pack.js:  missing")
      expect(printed).toMatch(/fix:  spell-pack build \S+late\n/)
    } finally {
      out.mockRestore()
      err.mockRestore()
    }
  })
})

////////////////
// ## Helpers
////////////////

/** A pack folder's files, by path:  text, or an object written as JSON. */
type PackFiles = Record<string, string | object>

/** Write a pack folder `name` under `ROOT` with `files`;  returns its absolute path. */
function writePack(name: string, files: PackFiles): string {
  const folder = join(ROOT, name)
  for (const [path, text] of Object.entries(files)) {
    write(folder, path, typeof text === "string" ? text : JSON.stringify(text))
  }
  return folder
}

/** Write `text` into `path` of `folder`, making its folders. */
function write(folder: string, path: string, text: string) {
  const file = join(folder, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
}

/** Pack `pack`'s sources, relative to `folder`. */
function relativeSources(pack: ComponentPack, folder: string): string[] {
  return pack.sources().map((file) => file.slice(folder.length + 1))
}

/**
 * A pack `name` with one card family, `<name>-card` (or `tag`):  its `package.json`, the components barrel, and the
 * family's barrel, vocabulary and component.
 */
function card(name: string, tag = `${name}-card`): PackFiles {
  const Class = `${name[0]!.toUpperCase()}${name.slice(1)}Card`
  return {
    "package.json": { spellPack: { prefix: `${name}-` } },
    "components/index.ts": `export * from "./${name}-card"\n`,
    [`components/${name}-card/index.ts`]: `export * from "./${Class}"\n`,
    [`components/${name}-card/${Class}.en.ts`]: `export const vocabulary = { tag: "${tag}", attributes: [] }\n`,
    [`components/${name}-card/${Class}.tsx`]: `import { vocabulary } from "./${Class}.en"\nexport const CARD = vocabulary\n`
  }
}
