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
    expect(read().entries[0]).toEqual({ key: KEY, value: 9, source: "developer" })
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

  test("a map (`bells.burnFlips`) takes any key, each true or false, and is one entry", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    writeDeveloper("{ bells: { burn: 'low', burnFlips: { titleCheck: true } } }")
    expect(read().values.bells.burnFlips).toEqual({ titleCheck: true })
    expect(read().entries.find((entry) => entry.key === "bells.burnFlips")?.value).toEqual({ titleCheck: true })
    writeDeveloper("{ bells: { burnFlips: { titleCheck: 'yes' } } }")
    expect(read().values.bells.burnFlips).toEqual({})
    expect(read().layers[2].problems[0]).toMatch(/true or false/)
  })

  test("a key with a few words takes only those:  bells.burn", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    writeDeveloper("{ bells: { burn: 'lots' } }")
    expect(read().values.bells.burn).toBe("high")
    expect(read().layers[2].problems[0]).toMatch(/one of low, medium, high/)
  })

  describe("set()", () => {
    const set = (key: string, value: unknown) => LayeredSettings.set(key, value, { content, home })
    const developerFile = () => readFileSync(join(home, ".spell", LayeredSettings.FILE), "utf8")

    test("writes the developer's file only, keeping its comments", () => {
      writeDeveloper("// mine\n{ away: { finishedPhaseDays: 9 } }")
      const settings = set("bells.designReview", false)
      expect(settings.values.bells.designReview).toBe(false)
      expect(settings.sourceOf("bells.designReview")).toBe("developer")
      expect(developerFile()).toMatch(/\/\/ mine/)
      expect(JSON5.parse(developerFile())).toEqual({ away: { finishedPhaseDays: 9 }, bells: { designReview: false } })
    })

    test("makes the file and its folder when there's none", () => {
      rmSync(join(home, ".spell"), { recursive: true })
      expect(set("bells.burn", "medium").values.bells.burn).toBe("medium")
    })

    test("a map's key, a whole map, and undefined taking a map's key out", () => {
      set("bells.burnFlips.titleCheck", true)
      expect(read().values.bells.burnFlips).toEqual({ titleCheck: true })
      set("bells.burnFlips.titleCheck", undefined)
      expect(read().values.bells.burnFlips).toEqual({})
      set("bells.burnFlips", { speedTest: false })
      expect(read().values.bells.burnFlips).toEqual({ speedTest: false })
    })

    test.each([
      ["bells.nope", true, /no setting bells.nope/],
      ["bells.designReview", "off", /takes a boolean/],
      ["bells.burn", "lots", /one of low, medium, high/],
      ["away.finishedPhaseDays", -2, /a number, 0 or more/],
      ["bells", {}, /a group/],
      ["bells.burnFlips", { x: 1 }, /object of true or false/]
    ])("refuses %s = %j, writing nothing", (key, value, why) => {
      expect(() => set(key, value)).toThrow(why)
      expect(read().layers[2].found).toBe(false)
    })

    test("setMany():  one wrong value, nothing written", () => {
      expect(() => LayeredSettings.setMany({ "bells.burn": "low", "bells.titleCheck": 3 }, { content, home })).toThrow(
        TypeError
      )
      expect(read().values.bells.burn).toBe("high")
    })
  })
})
