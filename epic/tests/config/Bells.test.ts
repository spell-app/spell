/**
 * Tests of `Bells` (epic `epic-engine` P86):  Bells & Whistles for node, read from and written to the epic settings.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import JSON5 from "json5"
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { Bells } from "spell/epic/config/Bells"
import { LayeredSettings } from "spell/epic/config/LayeredSettings"

describe("Bells", () => {
  let folder: string
  let where: { content: string; home: string }

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "bells-"))
    where = { content: join(folder, "epics-repo"), home: join(folder, "home") }
    mkdirSync(where.content)
  })

  afterEach(() => rmSync(folder, { recursive: true }))

  const developer = () => JSON5.parse(readFileSync(join(where.home, ".spell", LayeredSettings.FILE), "utf8"))

  test("nothing set:  every step on, the slider at High", () => {
    const view = Bells.view(where)
    expect(view.burn).toBe("high")
    expect(view.shown).toBe("high")
    expect(view.steps.every((step) => step.on && step.own)).toBe(true)
    expect(view.steps.map((step) => step.key)).not.toContain("autoSend")
    expect(Bells.isOn("designReview", where)).toBe(true)
  })

  test("a switch off at High is your own;  `isOn()` says so, and why", () => {
    Bells.set("designReview", "off", where)
    expect(Bells.isOn("designReview", where)).toBe(false)
    expect(Bells.stateOf("designReview", where)).toEqual({ on: false, why: "switch" })
    expect(developer()).toEqual({ bells: { designReview: false } })
  })

  test("the slider down, a flip kept apart and shown as Custom;  a move clears it;  High brings yours back", () => {
    Bells.set("titleCheck", false, where)
    Bells.set("burn", "low", where)
    expect(Bells.isOn("checksBeforeMerge", where)).toBe(true)
    expect(Bells.stateOf("planCheck", where)).toEqual({ on: false, why: "burn" })
    let view = Bells.set("planCheck", "on", where)
    expect(view.shown).toBe("custom")
    expect(developer().bells.burnFlips).toEqual({ planCheck: true })
    expect(Bells.isOn("planCheck", where)).toBe(true)
    view = Bells.set("burn", "high", where)
    expect(view.shown).toBe("high")
    expect(developer().bells.burnFlips).toEqual({})
    expect(Bells.isOn("titleCheck", where)).toBe(false)
    expect(Bells.isOn("planCheck", where)).toBe(true)
  })

  test("save():  only what differs is written", () => {
    const values = { ...Bells.values(where), speedTest: false }
    Bells.save(values, where)
    expect(developer()).toEqual({ bells: { speedTest: false } })
  })

  test.each([
    ["burn", "lots", /the slider takes low, medium, high/],
    ["nope", true, /no step nope/],
    ["autoSend", false, /the page's own/],
    ["titleCheck", "maybe", /on or off/]
  ])("refuses %s = %j", (key, value, why) => {
    expect(() => Bells.set(key, value, where)).toThrow(why)
  })

  test("a step that's off says so in one line, by its title", () => {
    expect(Bells.offLine("designReview")).toBe("Design review:  off in Bells & Whistles")
  })
})
