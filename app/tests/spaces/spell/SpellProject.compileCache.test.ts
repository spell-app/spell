import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { installDiskFetch, locationForDiskPath } from "spell/app/spaces/server/node/projects/disk-fetch"
import { fixtureFolder } from "spell/app/spaces/test"

/**
 * Compiles kept by what they were compiled from (`SP.CompileCache`, epic `language` P27):
 * Solitaire copied into a temp `@local/<folder>` group, as `SpellProject.imports.test.ts` does, compiled with a cache
 * kept in memory, then opened again as a reload would (`reopen()`).
 */
describe("SpellProject's compile cache", () => {
  const solitaire = fixtureFolder("@spell/examples/Solitaire")
  const workspace = mkdtempSync(resolve(tmpdir(), "spell-compile-cache-"))
  const FILES = ["Card.spellml", "Jokers.spellml", "Deck.spellml", "Pile.spellml", "Solitaire.spellml", "styles.css"]
  let entries: Map<string, string>
  let cache: SP.CompileCache

  /** Project `name` in the workspace:  Solitaire's files, then `json`'s imports ahead of them. */
  function makeProject(name: string, files = FILES, json: { imports?: unknown[] } = {}): SP.SpellProject {
    const dir = resolve(workspace, name)
    mkdirSync(dir)
    for (const file of files) copyFileSync(resolve(solitaire, file), resolve(dir, file))
    const imports = [...(json.imports ?? []), ...files.map((file) => ({ path: `/${file}`, active: true }))]
    writeFileSync(resolve(dir, SP.PROJECT_FILE), JSON.stringify({ imports }))
    const root = locationForDiskPath(resolve(dir, SP.PROJECT_FILE))!.projectRoot
    return new SP.SpellProject(`${root}/${name}`)
  }

  /** `project` as a reload finds it:  nothing parsed, nothing compiled. */
  function reopen(project: SP.SpellProject): void {
    project.resetCompiled()
    project.incremental = undefined
    project.compiledLanguages = undefined
    project.compiledFrom = undefined
  }

  /** What `project`'s compile wrote, to compare. */
  function output(project: SP.SpellProject) {
    const { compiled, declarations, words, targets } = project.cachedEntry()
    return { compiled, declarations, words, targets, map: project.sourceMapFileFor(project.targets[0]!).contents }
  }

  beforeAll(() => installDiskFetch())
  beforeEach(() => {
    entries = new Map()
    cache = SP.CompileCache.inMemory(entries)
    cache.logger.level = "OFF"
    SP.SpellProject.compileCache = cache
  })
  afterEach(() => {
    SP.SpellProject.compileCache = undefined
  })

  test("opened twice, Solitaire compiles once:  the second time it comes from the cache, the same", async () => {
    const project = makeProject("twice")
    await project.compile()
    expect(project.compiledFrom).toBe("compile")
    expect(cache.counts).toEqual({ compiled: 1, cached: 0 })
    expect(entries.size).toBe(1)
    const first = output(project)

    reopen(project)
    await project.compile()
    expect(project.compiledFrom).toBe("cache")
    expect(cache.counts).toEqual({ compiled: 1, cached: 1 })
    // nothing parsed:  a parse is still to come, for whatever needs one
    expect(project.spellFiles.every((file) => !file.match)).toBe(true)
    expect(output(project)).toEqual(first)
  })

  test("with the cache on and off, the output is the same", async () => {
    const project = makeProject("on-and-off")
    await project.compile()
    reopen(project)
    await project.compile()
    expect(project.compiledFrom).toBe("cache")
    const cached = output(project)

    SP.SpellProject.compileCache = undefined
    reopen(project)
    await project.compile()
    expect(project.compiledFrom).toBe("compile")
    expect(output(project)).toEqual(cached)
  })

  test("an edit to any of its files compiles the project again:  Card, or Solitaire", async () => {
    const project = makeProject("edits")
    await project.compile()
    for (const name of ["Card.spellml", "Solitaire.spellml"]) {
      const file = project.spellFiles.find((it) => it.file === name)!
      await project.updateText(file, `${file.contents}\n<!-- an edit -->\n`)
      reopen(project)
      await project.compile()
      expect(project.compiledFrom).toBe("compile")
    }
    expect(cache.counts).toEqual({ compiled: 3, cached: 0 })
    expect(entries.size).toBe(3)
  })

  test("the key follows a library imported as source:  an edit to it is a new key for the app", async () => {
    const lib = makeProject("srclib", ["Card.spellml", "Jokers.spellml", "Deck.spellml", "Pile.spellml"])
    const app = makeProject("srcapp", ["Solitaire.spellml", "styles.css"], {
      imports: [{ path: lib.projectId, source: true }]
    })
    const before = await cache.keyFor(app)
    expect(await cache.keyFor(app)).toBe(before)
    const card = lib.spellFiles.find((it) => it.file === "Card.spellml")!
    card.contents = `${card.contents}\n<!-- an edit -->\n`
    expect(await cache.keyFor(app)).not.toBe(before)
  })

  test("a compile with parse errors isn't kept:  it compiles again, to show them", async () => {
    const project = makeProject("broken", ["Deck.spellml"])
    await project.load(undefined)
    const deck = project.spellFiles[0]!
    await deck.load(undefined)
    deck.contents = `${deck.contents}\n<script>\nthis line means nothing at all ~~~\n</script>\n`
    await project.compile()
    expect(project.compiledCleanly).toBe(false)
    expect(entries.size).toBe(0)
  })
})
