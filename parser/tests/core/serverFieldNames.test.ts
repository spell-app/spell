/**
 * What a place sends, read as what a type declares (epic `data` P23):  names by their words, numbers from text, nothing for
 * what wasn't sent;  and written back the way it came.
 * - The words that say it:  `tests/spell/parserTests/serverFieldNames.test.ts`.
 */
import { enableExternalSource, flush } from "solid-js"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core, Place, Thing } from "spell/parser/core"
import { MemoryPlace, type PlaceChange, type PlaceContext } from "spell/util/places"

/** A place in memory that keeps every change it's sent. */
class KeepingPlace extends MemoryPlace {
  sent: PlaceChange[] = []

  apply(changes: readonly PlaceChange[], context: PlaceContext) {
    this.sent.push(...changes)
    return super.apply(changes, context)
  }
}

/** A character as compiled spell writes it, kept in `behind`, which writes numbers `numbersLike`. */
function program(
  behind: KeepingPlace,
  { numbersLike, unclearNumbers }: { numbersLike?: string; unclearNumbers?: "," } = {}
) {
  core.resetRuntime()
  class Character extends Thing {
    static {
      this.declareProp("name", { type: "text" })
      this.declareProp("height", { type: "number", nothingAs: ["unknown"] })
      this.declareProp("mass", { type: "number" })
      this.declareProp("hairColor", { type: "text" })
      this.declareProp("averageHeight", { type: "number", storedAs: "avg_ht" })
    }
    get name() {
      return this.getProp("name") as string | undefined
    }
    set name(value) {
      this.setProp("name", value)
    }
    get height() {
      return this.getProp("height") as number | undefined
    }
    set height(value) {
      this.setProp("height", value)
    }
    get mass() {
      return this.getProp("mass") as number | undefined
    }
    set mass(value) {
      this.setProp("mass", value)
    }
    get hairColor() {
      return this.getProp("hairColor") as string | undefined
    }
    set hairColor(value) {
      this.setProp("hairColor", value)
    }
    get averageHeight() {
      return this.getProp("averageHeight") as number | undefined
    }
    set averageHeight(value) {
      this.setProp("averageHeight", value)
    }
    static savedIn = { place: "star wars", collection: "people" }
  }
  class StarWars extends Place {
    makePlace() {
      return behind
    }
  }
  core.place(new StarWars(), {
    name: "star wars",
    ...(numbersLike !== undefined && { numbersLike }),
    ...(unclearNumbers !== undefined && { unclearNumbers })
  })
  return { Character }
}

/** A place holding `rows` of people. */
function holding(rows: Array<Record<string, unknown>>): KeepingPlace {
  const place = new KeepingPlace({ capabilities: { idOf: "id" } })
  void place.apply(
    rows.map((fields) => ({ kind: "insert", collection: "people", id: `${fields.id}`, fields })),
    {}
  )
  place.sent = []
  return place
}

beforeAll(() => bridgeSolid({ enableExternalSource, flush }))
beforeEach(() => core.resetRuntime())

describe("what a place sends, as the type declares it", () => {
  test("names by their words, numbers from their text, its words for nothing quiet", async () => {
    const place = holding([
      { id: "1", name: "Luke", height: "172", mass: "1,358", "Hair Color": "blond", avg_ht: "1 200" },
      { id: "2", name: "Jabba", height: "unknown", mass: null }
    ])
    const { Character } = program(place)
    const [luke, jabba] = (await core.savedThings(Character)).items as Array<InstanceType<typeof Character>>
    expect([luke!.height, luke!.mass, luke!.hairColor, luke!.averageHeight]).toEqual([172, 1358, "blond", 1200])
    expect([jabba!.height, jabba!.mass, jabba!.hairColor]).toEqual([undefined, undefined, undefined])
  })

  test("a field it didn't send is nothing, not its type's default", async () => {
    const { Character } = program(holding([{ id: "1", name: "R2-D2" }]))
    const [r2] = (await core.savedThings(Character)).items as Array<InstanceType<typeof Character>>
    expect([r2!.height, r2!.mass, r2!.hairColor]).toEqual([undefined, undefined, undefined])
  })

  test("a place that writes a comma for the fraction;  and a language that does, for what the text can't settle", async () => {
    const commas = program(holding([{ id: "1", height: "1,72", mass: "1.358,5" }]), { numbersLike: "1.200,5" })
    const [one] = (await core.savedThings(commas.Character)).items as Array<InstanceType<typeof commas.Character>>
    expect([one!.height, one!.mass]).toEqual([1.72, 1358.5])
    const spanish = program(holding([{ id: "1", height: "1,200", mass: "1,5" }]), { unclearNumbers: "," })
    const [two] = (await core.savedThings(spanish.Character)).items as Array<InstanceType<typeof spanish.Character>>
    expect([two!.height, two!.mass]).toEqual([1.2, 1.5])
  })

  test("text that isn't a number:  nothing, said once on the program's console", async () => {
    const said: string[] = []
    const warn = core.console.warn
    core.console.warn = (...message: unknown[]) => void said.push(message.join(" "))
    try {
      const { Character } = program(
        holding([
          { id: "1", mass: "about 80" },
          { id: "2", mass: "a lot" }
        ])
      )
      const things = (await core.savedThings(Character)).items as Array<InstanceType<typeof Character>>
      expect(things.map((thing) => thing.mass)).toEqual([undefined, undefined])
      expect(said.filter((line) => line.includes("Character.mass"))).toHaveLength(1)
    } finally {
      core.console.warn = warn
    }
  })
})

describe("written back the way it came", () => {
  test("a number sent as text goes back as text;  nothing, as its word for it", async () => {
    const place = holding([{ id: "1", height: "172" }])
    const { Character } = program(place)
    const [luke] = (await core.savedThings(Character)).items as Array<InstanceType<typeof Character>>
    luke!.height = 180
    await vi.waitFor(() => expect(place.sent).toHaveLength(1), { timeout: 3000 })
    luke!.height = undefined
    await vi.waitFor(() => expect(place.sent).toHaveLength(2), { timeout: 3000 })
    expect(place.sent.map(({ fields }) => fields?.height)).toEqual(["180", "unknown"])
  })
})
