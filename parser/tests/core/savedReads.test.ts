/**
 * What a running program does with the reads the compiler gathered (epic `data` P12), on classes written as compiled spell's are.
 * - The compiling half:  `tests/spell/parserTests/readGathering.test.ts`.
 */
import { enableExternalSource, flush } from "solid-js"
import { beforeAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { bridgeSolid, observe } from "spell/util"
import { core, Place, Thing } from "spell/parser/core"
import { MemoryPlace, type ListAnswer, type ListAsk, type ListQuery, type PlaceContext } from "spell/util/places"

/** How long to let what's asked be answered. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 30))

/** A place in memory that counts how it's asked:  each entry a request. */
class CountingPlace extends MemoryPlace {
  requests: ListAsk[][] = []

  list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    this.requests.push([{ collection, query }])
    return super.list(collection, query, context)
  }
}

/** One that can answer several in one request. */
class BatchingPlace extends CountingPlace {
  async listMany(asks: readonly ListAsk[], context: PlaceContext): Promise<ListAnswer[]> {
    this.requests.push([...asks])
    return Promise.all(
      asks.map(({ collection, query }) => MemoryPlace.prototype.list.call(this, collection, query, context))
    )
  }
}

/** The classes of one program, as compiled spell writes them, and the place behind them. */
function program(
  behind: CountingPlace,
  { select, firstReads = false }: { select?: string[]; firstReads?: boolean } = {}
) {
  core.resetRuntime()
  class Recipe extends Thing {
    static {
      this.declareProp("title", { type: "text" })
    }
    get title() {
      return this.getProp("title") as string
    }
    set title(value) {
      this.setProp("title", value)
    }
    static {
      this.declareProp("notes", { type: "text" })
    }
    get notes() {
      return this.getProp("notes") as string
    }
    set notes(value) {
      this.setProp("notes", value)
    }
    static savedIn = { place: "cookbook", collection: "recipes", ...(select && { select }) }
  }
  class Tag extends Thing {
    static {
      this.declareProp("word", { type: "text" })
    }
    get word() {
      return this.getProp("word") as string
    }
    set word(value) {
      this.setProp("word", value)
    }
    static savedIn = { place: "cookbook", collection: "tags" }
  }
  class Cookbook extends Place {
    makePlace() {
      return behind
    }
  }
  core.place(new Cookbook(), {
    name: "cookbook",
    ...(firstReads && { firstReads: () => [[Recipe], [Tag]] as Array<[Function]> })
  })
  return { Recipe, Tag }
}

/** A place holding one recipe and one tag. */
function filled<T extends CountingPlace>(place: T): T {
  void place.apply([
    { kind: "insert", collection: "recipes", id: "r1", fields: { id: "r1", title: "Soup", notes: "Salt it" } },
    { kind: "insert", collection: "tags", id: "t1", fields: { id: "t1", word: "quick" } }
  ])
  return place
}

const WITH_IDS = {
  idOf: "id",
  select: "every field" as const,
  filter: "every field" as const,
  sort: "every field" as const
}

beforeAll(() => bridgeSolid({ enableExternalSource, flush }))
beforeEach(() => core.resetRuntime())

describe("what a first draw reads", () => {
  test("asked for together, in ONE request, when the place can;  the draw that reaches it later asks nothing", async () => {
    const place = filled(new BatchingPlace({ capabilities: WITH_IDS }))
    const { Recipe, Tag } = program(place, { firstReads: true })
    const recipes = await core.savedThings(Recipe)
    expect(place.requests).toEqual([
      [
        { collection: "recipes", query: {} },
        { collection: "tags", query: {} }
      ]
    ])
    const tags = await core.savedThings(Tag)
    expect(place.requests).toHaveLength(1)
    expect(recipes.items.map((recipe) => (recipe as InstanceType<typeof Recipe>).title)).toEqual(["Soup"])
    expect(tags.items.map((tag) => (tag as InstanceType<typeof Tag>).word)).toEqual(["quick"])
  })

  test("a place that can't answer several:  one trip, a request per list, with no waiting for the first", async () => {
    const place = filled(new CountingPlace({ capabilities: WITH_IDS }))
    const { Recipe, Tag } = program(place, { firstReads: true })
    await core.savedThings(Recipe)
    expect(place.requests).toHaveLength(2)
    await core.savedThings(Tag)
    expect(place.requests).toHaveLength(2)
  })

  test("without them:  the part drawn after the first answer asks after it, as it always did", async () => {
    const place = filled(new BatchingPlace({ capabilities: WITH_IDS }))
    const { Recipe, Tag } = program(place)
    await core.savedThings(Recipe)
    expect(place.requests).toHaveLength(1)
    await core.savedThings(Tag)
    expect(place.requests).toHaveLength(2)
  })
})

describe("a field the compiler left out", () => {
  test("is asked for, once more, when something reads it anyway:  and whoever read it sees it appear", async () => {
    const place = filled(new CountingPlace({ capabilities: WITH_IDS }))
    const { Recipe } = program(place, { select: ["title"] })
    const [recipe] = (await core.savedThings(Recipe)).items as Array<InstanceType<typeof Recipe>>
    expect(place.requests.at(-1)![0]!.query.select).toEqual(["title", "id"])
    expect(recipe!.title).toBe("Soup")

    const seen: string[] = []
    const stop = observe(() => void seen.push(recipe!.notes))
    await settled()
    core.flush()
    expect(place.requests).toHaveLength(2)
    expect(place.requests[1]![0]!.query.select).toBeUndefined()
    expect(seen.at(-1)).toBe("Salt it")
    // twice over, it's still one more ask
    void recipe!.notes
    await settled()
    expect(place.requests).toHaveLength(2)
    stop()
  })

  test("what only shows a thing doesn't count as needing it", async () => {
    const { whileOnlyShowing } = await import("spell/util")
    const place = filled(new CountingPlace({ capabilities: WITH_IDS }))
    const { Recipe } = program(place, { select: ["title"] })
    const [recipe] = (await core.savedThings(Recipe)).items as Array<InstanceType<typeof Recipe>>
    expect(whileOnlyShowing(() => recipe!.notes)).toBe("")
    await settled()
    expect(place.requests).toHaveLength(1)
  })

  test("a place that can't leave fields out is asked for them all", async () => {
    const place = filled(new CountingPlace({ capabilities: { ...WITH_IDS, select: "none" } }))
    const { Recipe } = program(place, { select: ["title"] })
    const [recipe] = (await core.savedThings(Recipe)).items as Array<InstanceType<typeof Recipe>>
    expect(place.requests[0]![0]!.query.select).toBeUndefined()
    expect(recipe!.notes).toBe("Salt it")
  })
})
