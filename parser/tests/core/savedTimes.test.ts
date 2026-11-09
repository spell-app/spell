/**
 * `created` and `modified`, stamped by Spell on what's saved (epic `data` T57), on classes written as compiled spell's are.
 * - The compiling half:  `tests/spell/parserTests/savedTimes.test.ts`.
 * - Python's twin reads the same rows:  `tests/py/core/tests/test_places.py`.
 */
import { fileURLToPath } from "node:url"
import { enableExternalSource, flush } from "solid-js"
import { beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { readJSON5File } from "spell/util/node/json5.ts"
import { core, Place, Thing } from "spell/parser/core"
import { MemoryPlace, type PlaceCapabilities, type PlaceChange, type PlaceContext, type PlaceRow } from "spell/places"

/** The rows both cores read:  an old one with no times, and one stamped. */
const FIXTURE = readJSON5File<{ old: PlaceRow; stamped: PlaceRow }>(
  fileURLToPath(new URL("./savedRowTimes.expected.json5", import.meta.url))
)

/** A place in memory that keeps every change it's sent. */
class KeepingPlace extends MemoryPlace {
  sent: PlaceChange[] = []

  apply(changes: readonly PlaceChange[], context: PlaceContext) {
    this.sent.push(...changes)
    return super.apply(changes, context)
  }
}

/** A recipe as compiled spell writes it, with `times` as its line says. */
function program(behind: KeepingPlace, times: string[] | undefined = ["created", "modified"]) {
  core.resetRuntime()
  class Recipe extends Thing {
    static {
      this.declareProp("title", { type: "text" })
      this.declareProp("created", { type: "date" })
      this.declareProp("modified", { type: "date" })
    }
    get title() {
      return this.getProp("title") as string
    }
    set title(value) {
      this.setProp("title", value)
    }
    get created() {
      return this.getProp("created") as Date | undefined
    }
    set created(value) {
      this.setProp("created", value)
    }
    get modified() {
      return this.getProp("modified") as Date | undefined
    }
    set modified(value) {
      this.setProp("modified", value)
    }
    static savedIn = { place: "cookbook", collection: "recipes", ...(times && { times }) }
  }
  class Cookbook extends Place {
    makePlace() {
      return behind
    }
  }
  core.place(new Cookbook(), { name: "cookbook" })
  return Recipe
}

/** A place holding `rows`, that can say what it can hold. */
const holding = (rows: PlaceRow[], can: Partial<PlaceCapabilities> = {}) =>
  new KeepingPlace({ capabilities: { ...can, idOf: "id" }, collections: { recipes: rows } })

/** Until everything's gone out. */
const sentAtLeast = (place: KeepingPlace, count: number) =>
  vi.waitFor(() => expect(place.sent.length).toBeGreaterThanOrEqual(count), { timeout: 3000 })

beforeAll(() => bridgeSolid({ enableExternalSource, flush }))

describe("stamped when it's saved", () => {
  test("a new thing has both, and shows them at once", async () => {
    const place = holding([])
    const Recipe = program(place)
    await core.savedThings(Recipe)
    const pie = new Recipe({ title: "Pie" })
    core.saveThing(pie)
    expect(pie.created).toBeInstanceOf(Date)
    await sentAtLeast(place, 1)
    expect(place.sent[0]!.fields).toMatchObject({ created: pie.created!.toISOString(), modified: expect.any(String) })
  })

  test("a change stamps modified, not created", async () => {
    const place = holding([{ ...FIXTURE.stamped }])
    const Recipe = program(place)
    const [soup] = (await core.savedThings(Recipe)).items as InstanceType<typeof Recipe>[]
    soup!.title = "Stew"
    await sentAtLeast(place, 1)
    const { fields } = place.sent[0]!
    expect(fields).toMatchObject({ title: "Stew", modified: expect.any(String) })
    expect(fields).not.toHaveProperty("created")
  })

  test("a stamp is no undo step, and no change anybody made", async () => {
    const place = holding([{ ...FIXTURE.stamped }])
    const Recipe = program(place)
    const [soup] = (await core.savedThings(Recipe)).items as InstanceType<typeof Recipe>[]
    soup!.title = "Stew"
    await sentAtLeast(place, 1)
    expect(core.RUNTIME.history.canUndo).toBe(false)
    expect(place.sent).toHaveLength(1)
  })

  test("a draft is stamped when it's saved, not as it's typed in", async () => {
    const place = holding([{ ...FIXTURE.stamped }])
    const Recipe = program(place)
    const [soup] = (await core.savedThings(Recipe)).items as InstanceType<typeof Recipe>[]
    const draft = core.draftOf(soup!)
    draft.title = "Typing"
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(place.sent).toHaveLength(0)
    core.saveDraft(draft)
    await sentAtLeast(place, 1)
    expect(place.sent[0]!.fields).toHaveProperty("modified")
  })
})

describe("where nothing's stamped", () => {
  test("a type that keeps no times", async () => {
    const place = holding([])
    const Recipe = program(place, [])
    await core.savedThings(Recipe)
    core.saveThing(new Recipe({ title: "Pie" }))
    await sentAtLeast(place, 1)
    expect(place.sent[0]!.fields).not.toHaveProperty("created")
  })

  test("a type with its own created:  only what it left to Spell", async () => {
    const place = holding([])
    const Recipe = program(place, ["modified"])
    await core.savedThings(Recipe)
    core.saveThing(new Recipe({ title: "Pie" }))
    await sentAtLeast(place, 1)
    expect(place.sent[0]!.fields).toHaveProperty("modified")
    expect(place.sent[0]!.fields).not.toHaveProperty("created")
  })

  test("a place that can't hold them, as a web server", async () => {
    const place = holding([{ id: "r-1", title: "Soup" }], { timesHeld: undefined })
    const Recipe = program(place)
    const [soup] = (await core.savedThings(Recipe)).items as InstanceType<typeof Recipe>[]
    soup!.title = "Stew"
    await sentAtLeast(place, 1)
    expect(place.sent[0]!.fields).not.toHaveProperty("modified")
  })

  test("a sheet with only one of the columns:  only that one", async () => {
    const place = holding([{ id: "r-1", title: "Soup" }], { timesHeld: ["modified"] })
    const Recipe = program(place)
    await core.savedThings(Recipe)
    core.saveThing(new Recipe({ title: "Pie" }))
    await sentAtLeast(place, 1)
    expect(place.sent[0]!.fields).toHaveProperty("modified")
    expect(place.sent[0]!.fields).not.toHaveProperty("created")
  })
})

describe("rows saved before this", () => {
  test("an old row reads with nothing made up, and its next change stamps modified only", async () => {
    const place = holding([{ ...FIXTURE.old }])
    const Recipe = program(place)
    const [old] = (await core.savedThings(Recipe)).items as InstanceType<typeof Recipe>[]
    expect(old!.created).toBeFalsy()
    old!.title = "Changed"
    await sentAtLeast(place, 1)
    expect(place.sent[0]!.fields).not.toHaveProperty("created")
    expect(place.sent[0]!.fields).toHaveProperty("modified")
  })

  test("newest first:  a thing with none sorts last, on the core's sort", async () => {
    const place = holding([{ ...FIXTURE.old }, { ...FIXTURE.stamped }])
    const Recipe = program(place)
    const list = await core.savedThings(Recipe)
    const sorted = core.sortedBy(list, (recipe: InstanceType<typeof Recipe>) => core.descending(recipe.created))
    expect((sorted as unknown as { items: { id: string }[] }).items.map(({ id }) => id)).toEqual([
      FIXTURE.stamped.id,
      FIXTURE.old.id
    ])
  })
})
