import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { SPACES } from "spell/app/spaces"
import { HomeLayouts } from "spell/app/spaces/server/node/projects/homeOrderRoutes"

/**
 * Whose a change of the home page is (epic `mockup` T51):  `@spell`'s people change everyone's files,
 * anyone else their own, laid over them;  over a folder and prefs of the test's own.
 */
describe("HomeLayouts", () => {
  const OWEN = { id: "owen", org: "spell" }
  const ANA = { id: "ana", org: "acme" }
  let folder: string
  let kept: Map<string, unknown>
  let layouts: HomeLayouts

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "home-layouts-"))
    writeFileSync(join(folder, "homeOrder.json"), JSON.stringify({ sections: ["start", "examples"] }))
    kept = new Map()
    const prefs = {
      load: async (person: { id: string }, store: string, key: string) => kept.get(`${person.id}:${store}:${key}`),
      save: async (person: { id: string }, store: string, key: string, value: unknown) => {
        if (value === undefined) kept.delete(`${person.id}:${store}:${key}`)
        else kept.set(`${person.id}:${store}:${key}`, value)
        return value
      }
    }
    layouts = new HomeLayouts({ defaultsFolder: folder, prefs, editsDefaults: true })
  })
  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  const fileOf = (name: string) => JSON.parse(readFileSync(join(folder, name), "utf8")) as object

  test("@spell's person changes everyone's:  the files, nothing of their own", async () => {
    const answer = await layouts.change(OWEN, { text: { key: "section:examples:en", title: "Try these" } })
    expect(answer.setsDefaults).toBe(true)
    expect(fileOf("homeTexts.json")).toEqual({ "section:examples:en": { title: "Try these" } })
    await layouts.change(OWEN, { order: { group: "sections", names: ["examples", "start"] } })
    expect(fileOf("homeOrder.json")).toEqual({ sections: ["examples", "start"] })
    expect(kept.size).toBe(0)
  })

  test("anyone else changes their own, over everyone's;  Reset to default forgets it", async () => {
    const answer = await layouts.change(ANA, { order: { group: "start", names: ["blank", "counter"] } })
    expect(answer.setsDefaults).toBe(false)
    expect(answer.mine.order).toEqual({ start: ["blank", "counter"] })
    expect(fileOf("homeOrder.json")).toEqual({ sections: ["start", "examples"] })
    expect(SPACES.layeredHome(answer.defaults, answer.mine).order.sections).toEqual(["start", "examples"])
    expect((await layouts.change(ANA, { reset: true })).mine).toEqual(SPACES.NO_HOME_CHANGES)
    expect(kept.size).toBe(0)
  })

  test("outside Spell's own checkout, @spell's person's changes are their own too", async () => {
    const installed = new HomeLayouts({ ...layouts.options, editsDefaults: false })
    expect((await installed.change(OWEN, { text: { key: "@spell/examples/a", line: "Mine" } })).mine.texts).toEqual({
      "@spell/examples/a": { line: "Mine" }
    })
  })

  test("a change that can't be one is refused, 400", async () => {
    await expect(layouts.change(ANA, {})).rejects.toMatchObject({ status: 400 })
    await expect(layouts.change(ANA, { order: { group: "@acme/x", names: ["a"] } })).rejects.toMatchObject({ status: 400 })
    await expect(layouts.change(ANA, { text: { key: "", title: "x" } })).rejects.toMatchObject({ status: 400 })
  })
})

describe("HomeLayouts:  your own apps", () => {
  test("their order is always your own, @spell's person's too", async () => {
    const kept = new Map<string, unknown>()
    const prefs = {
      load: async (_person: unknown, store: string, key: string) => kept.get(`${store}:${key}`),
      save: async (_person: unknown, store: string, key: string, value: unknown) => {
        kept.set(`${store}:${key}`, value)
        return value
      }
    }
    const folder = mkdtempSync(join(tmpdir(), "home-layouts-"))
    try {
      const layouts = new HomeLayouts({ defaultsFolder: folder, prefs, editsDefaults: true })
      const answer = await layouts.change({ id: "owen", org: "spell" }, { order: { group: "owen@spell", names: ["b", "a"] } })
      expect(answer.setsDefaults).toBe(true)
      expect(answer.mine.order).toEqual({ "owen@spell": ["b", "a"] })
      expect(answer.defaults.order).toEqual({})
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
