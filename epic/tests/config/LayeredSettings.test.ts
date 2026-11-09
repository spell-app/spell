/**
 * Tests of `LayeredSettings` (epic `epic-engine` I235):  `epic_settings.json5`'s three layers, merged key by key.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import JSON5 from "json5"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { LayeredSettings } from "spell/epic/config/LayeredSettings"

const KEY = "away.finishedPhaseDays"

describe("LayeredSettings", () => {
  let folder: string
  let content: string
  let home: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "layered-settings-"))
    content = join(folder, "epics-repo")
    home = join(folder, "home")
    mkdirSync(content)
    mkdirSync(join(home, ".spell"), { recursive: true })
  })

  afterEach(() => {
    rmSync(folder, { recursive: true })
    vi.restoreAllMocks()
  })

  const read = () => LayeredSettings.read(content, { home })
  const writeOrg = (text: string) => writeFileSync(join(content, LayeredSettings.FILE), text)
  const writeDeveloper = (text: string) => writeFileSync(join(home, ".spell", LayeredSettings.FILE), text)

  test("the kit's own file holds the built-in values, and is the default layer", () => {
    expect(JSON5.parse(readFileSync(LayeredSettings.DEFAULT_FILE, "utf8"))).toEqual(LayeredSettings.BUILT_IN)
    const settings = read()
    expect(settings.values.away.finishedPhaseDays).toBe(3)
    expect(settings.sourceOf(KEY)).toBe("default")
    expect(settings.layers.map(({ name, found }) => [name, found])).toEqual([
      ["default", true],
      ["org", false],
      ["developer", false]
    ])
  })

  test("the org's file overrides the default, the developer's the org's", () => {
    writeOrg("{ away: { finishedPhaseDays: 5 } }")
    expect(read().values.away.finishedPhaseDays).toBe(5)
    expect(read().sourceOf(KEY)).toBe("org")
    writeDeveloper("// mine\n{ away: { finishedPhaseDays: 9 } }")
    expect(read().values.away.finishedPhaseDays).toBe(9)
    expect(read().sourceOf(KEY)).toBe("developer")
    expect(read().entries).toEqual([{ key: KEY, value: 9, source: "developer" }])
  })

  test("key by key:  a layer that names one key leaves the others to the layer below", () => {
    writeOrg("{ away: { finishedPhaseDays: 5 }, somethingNew: 1 }")
    writeDeveloper("{ away: {} }")
    const settings = read()
    expect(settings.values.away.finishedPhaseDays).toBe(5)
    expect(settings.sourceOf(KEY)).toBe("org")
    expect(settings.layers.flatMap(({ problems }) => problems)).toEqual([])
  })

  test("a file that won't read falls through to the layer below, and says so once", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    writeOrg("{ away: { finishedPhaseDays: 5 } }")
    writeDeveloper("{ not json5")
    const settings = read()
    expect(settings.values.away.finishedPhaseDays).toBe(5)
    expect(settings.layers[2].problems[0]).toMatch(/can't read it/)
    read()
    expect(logged).toHaveBeenCalledTimes(1)
  })

  test.each(['"soon"', "-1", "NaN"])("a bad value (%s) falls through to the layer below", (bad) => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    writeOrg("{ away: { finishedPhaseDays: 5 } }")
    writeDeveloper(`{ away: { finishedPhaseDays: ${bad} } }`)
    const settings = read()
    expect(settings.values.away.finishedPhaseDays).toBe(5)
    expect(settings.sourceOf(KEY)).toBe("org")
    expect(settings.layers[2].problems[0]).toMatch(/finishedPhaseDays/)
  })

  test("the wrong shape:  an object of settings that isn't one", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    writeDeveloper("{ away: 2 }")
    expect(read().values.away.finishedPhaseDays).toBe(3)
    writeDeveloper("[1, 2]")
    expect(read().values.away.finishedPhaseDays).toBe(3)
    expect(read().layers[2].problems[0]).toMatch(/isn't an object/)
  })

  test("no epic repo:  no org layer", () => {
    expect(LayeredSettings.read(undefined, { home }).layers.map(({ name }) => name)).toEqual(["default", "developer"])
  })
})
