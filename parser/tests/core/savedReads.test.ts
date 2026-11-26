/**
 * What a running program does with the reads the compiler gathered (epic `data` P12), on classes written as compiled spell's are.
 * - The compiling half:  `tests/spell/parserTests/readGathering.test.ts`.
 */
import { parseHTML } from "linkedom"
import { createSignal, enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid, observe } from "spell/util"
import { core, List, Place, Thing } from "spell/parser/core"
import { waitAfter } from "spell/parser/core/saved"
import { MemoryPlace, type ListAnswer, type ListAsk, type ListQuery, type PlaceContext } from "spell/places"

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

/** One whose first `failures` reads fail:  a server that isn't up yet. */
class FlakyPlace extends CountingPlace {
  failures = 0
  tries = 0

  list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    this.tries++
    if (this.failures-- > 0) return Promise.reject(new Error("Not up yet"))
    return super.list(collection, query, context)
  }
}

/** The classes of one program, as compiled spell writes them, and the place behind them. */
function program(
  behind: CountingPlace,
  { select, readOnStartup, checkedEvery }: { select?: string[]; readOnStartup?: string[]; checkedEvery?: number } = {}
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
    static {
      this.declareProp("steps", { itemType: "text", init: () => new List({ instanceType: "text" }) })
    }
    get steps() {
      return this.getProp("steps") as List<string>
    }
    set steps(value) {
      this.setProp("steps", value)
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
    ...(readOnStartup && { readOnStartup }),
    ...(checkedEvery && { checkedEvery })
  })
  return { Recipe, Tag }
}

/** A place holding one recipe and one tag. */
function filled<T extends CountingPlace>(place: T): T {
  void place.apply([
    {
      kind: "insert",
      collection: "recipes",
      id: "r1",
      fields: { id: "r1", title: "Soup", notes: "Salt it", steps: ["Boil", "Stir"] }
    },
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

// Spell never reads ahead:  a page reads only what it draws.  These were the first reads' tests (every list a first
// draw could reach, asked together as the place was first read), rewritten as the behaviour changed on purpose.
describe("what's read before a page draws it", () => {
  test("nothing:  a first read asks only for its own list, and the next list drawn asks for itself", async () => {
    const place = filled(new BatchingPlace({ capabilities: WITH_IDS }))
    const { Recipe, Tag } = program(place)
    const recipes = await core.savedThings(Recipe)
    expect(place.requests).toEqual([[{ collection: "recipes", query: {} }]])
    const tags = await core.savedThings(Tag)
    expect(place.requests).toEqual([[{ collection: "recipes", query: {} }], [{ collection: "tags", query: {} }]])
    expect(recipes.items.map((recipe) => (recipe as InstanceType<typeof Recipe>).title)).toEqual(["Soup"])
    expect(tags.items.map((tag) => (tag as InstanceType<typeof Tag>).word)).toEqual(["quick"])
  })

  test("lists one draw asks for in the same moment still go in ONE request, when the place can", async () => {
    const place = filled(new BatchingPlace({ capabilities: WITH_IDS }))
    const { Recipe, Tag } = program(place)
    await Promise.all([core.savedThings(Recipe), core.savedThings(Tag)])
    expect(place.requests).toEqual([
      [
        { collection: "recipes", query: {} },
        { collection: "tags", query: {} }
      ]
    ])
  })

  test("a collection its place says is read on startup:  read as the program starts, alone, and kept", async () => {
    const place = filled(new BatchingPlace({ capabilities: WITH_IDS }))
    const { Recipe, Tag } = program(place, { readOnStartup: ["Tag"] })
    await settled()
    expect(place.requests).toEqual([[{ collection: "tags", query: {} }]])
    const tags = await core.savedThings(Tag)
    expect(place.requests).toHaveLength(1)
    expect(tags.items.map((tag) => (tag as InstanceType<typeof Tag>).word)).toEqual(["quick"])
    await core.savedThings(Recipe)
    expect(place.requests).toEqual([[{ collection: "tags", query: {} }], [{ collection: "recipes", query: {} }]])
  })
})

describe("a table sorted by its header", () => {
  test("asks its place for the new order, and shows what it answers", async () => {
    const { document, window } = parseHTML("<!doctype html><html><body></body></html>")
    Object.assign(globalThis, { document, window, Node: window.Node, Element: window.Element })
    const place = new CountingPlace({ capabilities: WITH_IDS })
    await place.apply([
      { kind: "insert", collection: "recipes", id: "r1", fields: { id: "r1", title: "Beans" } },
      { kind: "insert", collection: "recipes", id: "r2", fields: { id: "r2", title: "Apples" } }
    ])
    const { Recipe } = program(place)
    const list = await core.savedThings(Recipe)
    const table = document.createElement("ui-table")
    table.append(document.createElement("ui-row"))
    const container = document.createElement("div")
    document.body.append(container)
    const leave = render(
      () =>
        core.drawRead(
          () => list,
          (item) => (item as InstanceType<typeof Recipe>).title as never,
          { items: () => table, paging: () => "all" } as never
        ) as never,
      container
    )
    flush()
    expect(table.textContent).toBe("BeansApples")

    table.dispatchEvent(new window.CustomEvent("ui-sorting", { detail: { key: "Title", direction: "ascending" } }))
    await vi.waitFor(() => {
      flush()
      expect(table.textContent).toBe("ApplesBeans")
    })
    expect(place.requests.at(-1)![0]!.query.sort).toEqual([{ field: "title", descending: false }])
    leave()
  })
})

describe("a read under an if-chain's branch that isn't the one (`core.drawIf()`)", () => {
  test("asks its place nothing until the branch shows;  then once, and shows the answer", async () => {
    const { document, window } = parseHTML("<!doctype html><html><body></body></html>")
    Object.assign(globalThis, { document, window, Node: window.Node, Element: window.Element })
    const place = filled(new CountingPlace({ capabilities: WITH_IDS }))
    const { Recipe } = program(place)
    const [picked, setPicked] = createSignal(false)
    const container = document.createElement("div")
    document.body.append(container)
    const leave = render(
      () =>
        core.drawIf(
          () => picked(),
          () => [
            core.drawRead(
              async () => await core.savedThings(Recipe),
              (item) => (item as InstanceType<typeof Recipe>).title as never,
              { paging: () => "all" } as never
            )
          ],
          () => ["Pick one"]
        ) as never,
      container
    )
    flush()
    await settled()
    expect(container.textContent).toBe("Pick one")
    expect(place.requests).toEqual([])

    setPicked(true)
    await vi.waitFor(() => {
      flush()
      expect(container.textContent).toBe("Soup")
    })
    expect(place.requests).toHaveLength(1)
    leave()
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

  test("a list field it left out, read in a loop:  asked for too, though a list is never unset", async () => {
    const place = filled(new CountingPlace({ capabilities: WITH_IDS }))
    const { Recipe } = program(place, { select: ["title"] })
    const [recipe] = (await core.savedThings(Recipe)).items as Array<InstanceType<typeof Recipe>>
    const seen: string[][] = []
    const stop = observe(() => void seen.push([...recipe!.steps.items]))
    await settled()
    core.flush()
    expect(place.requests).toHaveLength(2)
    expect(seen.at(-1)).toEqual(["Boil", "Stir"])
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

  test("nor when the compiler found nothing read:  read whole, ONCE, not asked again as a field's read", async () => {
    // a library's type, compiled where nothing reads its fields:  `select: []`, on a web server that can't select
    const place = filled(new CountingPlace({ capabilities: { ...WITH_IDS, select: "none" } }))
    const { Recipe } = program(place, { select: [] })
    const [recipe] = (await core.savedThings(Recipe)).items as Array<InstanceType<typeof Recipe>>
    expect(place.requests[0]![0]!.query.select).toBeUndefined()
    expect(recipe!.title).toBe("Soup")
    expect(recipe!.notes).toBe("Salt it")
    await settled()
    expect(place.requests).toHaveLength(1)
  })
})

describe("a place checked every so often:  `check it every 1 second`", () => {
  test("a first read that failed is asked again as the line says, and shows the place's answer by itself", async () => {
    const { document, window } = parseHTML("<!doctype html><html><body></body></html>")
    Object.assign(globalThis, { document, window, Node: window.Node, Element: window.Element })
    const place = filled(new FlakyPlace({ capabilities: WITH_IDS }))
    place.failures = 1
    const { Recipe } = program(place, { checkedEvery: 1 })
    const container = document.createElement("div")
    document.body.append(container)
    const leave = render(
      () =>
        core.drawRead(
          async () => await core.savedThings(Recipe),
          (item) => (item as InstanceType<typeof Recipe>).title as never,
          { failed: () => "Failed", paging: () => "all" } as never
        ) as never,
      container
    )
    await vi.waitFor(() => {
      flush()
      expect(container.textContent).toBe("Failed")
    })
    await vi.waitFor(
      () => {
        flush()
        expect(container.textContent).toBe("Soup")
      },
      { timeout: 3000 }
    )
    // the failed read, then the one the check made
    expect(place.tries).toBe(2)
    leave()
  })
})

describe("waitAfter():  a read that was only too soon (epic `data` I92)", () => {
  const NOW = Date.UTC(2026, 10, 7, 12)
  /** A failure holding the server's answer, as `spell/util`'s `ApiError` does. */
  const failed = (status: number, headers: Record<string, string> = {}) =>
    Object.assign(new Error(`${status}`), { response: new Response("", { status, headers }) })

  test("a 429 waits as its retry-after says, else says no time", () => {
    expect(waitAfter(failed(429, { "retry-after": "30" }), NOW)).toBe(30_000)
    expect(waitAfter(failed(429), NOW)).toBe(0)
  })

  test("GitHub's 403 with no requests left waits until its limit resets", () => {
    const reset = `${NOW / 1000 + 90}`
    expect(waitAfter(failed(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": reset }), NOW)).toBe(90_000)
  })

  test("a read that wasn't sent says its wait by itself (T110)", () => {
    expect(waitAfter(Object.assign(new Error("later"), { retryAt: NOW + 90_000 }), NOW)).toBe(90_000)
  })

  test("any other failure is no wait:  it shows red, as before", () => {
    expect(waitAfter(failed(403), NOW)).toBeUndefined()
    expect(waitAfter(failed(404), NOW)).toBeUndefined()
    expect(waitAfter(new Error("offline"), NOW)).toBeUndefined()
    expect(waitAfter("Lost the signal", NOW)).toBeUndefined()
  })
})

describe("the first few that pass a `where` checked here", () => {
  /** A place that answers two rows a page, asked or not, as a web server gives its own page size. */
  class TwoAPage extends CountingPlace {
    list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
      return super.list(collection, { ...query, page: { at: query.page?.at ?? "0", size: 2 } }, context)
    }
  }

  /** Six recipes, two of every three starting with "S". */
  async function six() {
    const place = new TwoAPage({ capabilities: WITH_IDS })
    const titles = ["Soup", "Stew", "Curry", "Salad", "Sushi", "Tacos"]
    await place.apply(
      titles.map((title, at) => ({
        kind: "insert" as const,
        collection: "recipes",
        id: `r${at}`,
        fields: { id: `r${at}`, title }
      }))
    )
    place.requests = []
    return place
  }

  /** Is a recipe's title one starting with "S"? */
  const startsWithS = (recipe: unknown) => `${(recipe as { title: string }).title}`.startsWith("S")

  test("reads page by page, and stops as soon as there are enough", async () => {
    const place = await six()
    const { Recipe } = program(place)
    const found = await core.savedThings(Recipe, {}, "looks through", { first: 3, where: startsWithS })
    expect(found.items.map((recipe) => (recipe as InstanceType<typeof Recipe>).title)).toEqual([
      "Soup",
      "Stew",
      "Salad"
    ])
    expect(place.requests).toHaveLength(2)
  })

  test("fewer than that there:  every page, and what passed", async () => {
    const place = await six()
    const { Recipe } = program(place)
    const found = await core.savedThings(Recipe, {}, "looks through", { first: 9, where: startsWithS })
    expect(found.items).toHaveLength(4)
    expect(place.requests).toHaveLength(3)
  })

  test("a search for no text is no search", async () => {
    const place = await six()
    const { Recipe } = program(place)
    await core.savedThings(Recipe, { search: { title: " " } })
    expect(place.requests[0]![0]!.query).toEqual({ page: { at: "0", size: 2 } })
  })
})

describe("the first few, on a list that filters by only some of a `where` (epic `data` I55)", () => {
  /** A list that filters by its notes only, two rows a page, as a web server's `it filters by notes` does. */
  class NotesOnly extends CountingPlace {
    takes(_collection: string, { filter = {} }: ListQuery) {
      return { filter: Object.keys(filter).every((field) => field === "notes") }
    }

    async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
      const { filter = {} } = query
      const sent = "notes" in filter ? { filter: { notes: filter.notes } } : {}
      this.requests.push([{ collection, query }])
      const answer = await MemoryPlace.prototype.list.call(
        this,
        collection,
        {
          ...query,
          ...sent,
          ...(!("notes" in filter) && { filter: undefined }),
          page: { at: query.page?.at ?? "0", size: 2 }
        },
        context
      )
      return { ...answer, handled: { filter: Object.keys(filter).every((field) => field === "notes") } }
    }
  }

  /** Ten recipes, every one "hot", every other a soup. */
  async function ten() {
    const place = new NotesOnly({ capabilities: { idOf: "id" } })
    await place.apply(
      Array.from({ length: 10 }, (_, at) => ({
        kind: "insert" as const,
        collection: "recipes",
        id: `r${at}`,
        fields: { id: `r${at}`, title: at % 2 ? "Stew" : "Soup", notes: "hot" }
      }))
    )
    place.requests = []
    return place
  }

  /** Is it a hot soup? */
  const hotSoup = (recipe: unknown) => {
    const { title, notes } = recipe as { title: string; notes: string }
    return notes === "hot" && title === "Soup"
  }

  test('`the first 2 recipes where its notes is "hot" and its title is "Soup"`, as compiled:  page by page, and stops at 2', async () => {
    const place = await ten()
    const { Recipe } = program(place)
    // the title, which it doesn't filter by, stays in the page (`EveryThing.savedAST()`)
    const found = await core.savedThings(Recipe, { filter: { notes: "hot" } }, "looks through", {
      first: 2,
      where: hotSoup
    })
    expect(found.items).toHaveLength(2)
    expect(place.requests).toHaveLength(2)
    // what it filters by still goes to it
    expect(place.requests[0]![0]!.query.filter).toMatchObject({ notes: "hot" })
  })
})

describe("`the first X where ...`, its `where` waiting", () => {
  test("each answer is waited for:  a promise is no yes, and only those that pass come back", async () => {
    const place = new CountingPlace({ capabilities: { idOf: "id" } })
    await place.apply(
      Array.from({ length: 10 }, (_, at) => ({
        kind: "insert" as const,
        collection: "recipes",
        id: `r${at}`,
        fields: { id: `r${at}`, title: at < 6 ? "Stew" : "Soup", notes: "hot" }
      }))
    )
    const { Recipe } = program(place)
    // a `where` reading a field that waits compiles to a function that waits
    const isSoup = async (recipe: unknown) => {
      await Promise.resolve()
      return (recipe as { title: string }).title === "Soup"
    }
    const found = await core.savedThings(Recipe, {}, "looks through", { first: 2, where: isSoup })
    expect(found.items.map((recipe) => (recipe as { id: string }).id)).toEqual(["r6", "r7"])
  })
})

describe("the number of, counted by the place (`core.savedCount()`)", () => {
  /** A place that says how many match, all of them, beside one page of rows:  as a web server's `total` does. */
  class Counting extends CountingPlace {
    async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
      const answer = await super.list(collection, query, context)
      const all = await MemoryPlace.prototype.list.call(this, collection, { ...query, page: undefined }, context)
      return { ...answer, total: all.rows.length }
    }
  }

  test("one row asked for, and its count read", async () => {
    const place = filled(new Counting({ capabilities: WITH_IDS }))
    const { Recipe } = program(place)
    await place.apply([{ kind: "insert", collection: "recipes", id: "r2", fields: { id: "r2", title: "Stew" } }])
    place.requests = []
    expect(await core.savedCount(Recipe, { filter: { title: "Stew" } })).toBe(1)
    expect(await core.savedCount(Recipe)).toBe(2)
    expect(place.requests.map(([ask]) => ask!.query.page)).toEqual([{ size: 1 }, { size: 1 }])
  })

  test("a place that doesn't count:  every one read, and counted here", async () => {
    const place = filled(new CountingPlace({ capabilities: WITH_IDS }))
    const { Recipe } = program(place)
    expect(await core.savedCount(Recipe)).toBe(1)
  })

  /**
   * A place that says only how many pages of 2 there are, whatever size it's asked for:  an estimate, and where its
   * last page is (`ListAnswer.lastPage`).  `pagesSaid` more than there are:  its last page is empty.
   */
  class PagesOnly extends CountingPlace {
    pagesSaid: number | undefined

    async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
      this.requests.push([{ collection, query }])
      const at = Number(query.page?.at ?? 0)
      const ask = { ...query, page: { at: `${at}`, size: 2 } }
      const answer = await MemoryPlace.prototype.list.call(this, collection, ask, context)
      if (at) return answer
      const all = await MemoryPlace.prototype.list.call(this, collection, { ...query, page: undefined }, context)
      const pages = this.pagesSaid ?? Math.ceil(all.rows.length / 2)
      const lastPage = { at: `${(pages - 1) * 2}`, size: 2, rowsBefore: (pages - 1) * 2 }
      return { ...answer, total: pages * 2, totalIsEstimate: true, lastPage }
    }
  }

  test("a place that counts only its pages:  its last page read, and its rows added to those before", async () => {
    const place = filled(new PagesOnly({ capabilities: WITH_IDS }))
    const { Recipe } = program(place)
    for (const id of ["r2", "r3", "r4", "r5"]) {
      await place.apply([{ kind: "insert", collection: "recipes", id, fields: { id, title: "Stew" } }])
    }
    place.requests = []
    // 3 pages of 2:  about 6, and exactly 5
    expect(await core.savedCount(Recipe)).toBe(5)
    expect(place.requests.map(([ask]) => ask!.query.page)).toEqual([{ size: 1 }, { at: "4", size: 2 }])
  })

  test("its last page empty, the estimate wrong:  one page at its own size, counted as it's all of them", async () => {
    const place = filled(new PagesOnly({ capabilities: WITH_IDS }))
    place.pagesSaid = 3
    const { Recipe } = program(place)
    expect(await core.savedCount(Recipe)).toBe(1)
  })

  test("`, roughly`:  its estimate taken at its word, one request", async () => {
    const place = filled(new PagesOnly({ capabilities: WITH_IDS }))
    for (const id of ["r2", "r3", "r4", "r5"]) {
      await place.apply([{ kind: "insert", collection: "recipes", id, fields: { id, title: "Stew" } }])
    }
    place.requests = []
    const { Recipe } = program(place)
    expect(await core.savedCount(Recipe, {}, { roughly: true })).toBe(6)
    expect(place.requests).toHaveLength(1)
  })

  /** A server that pages by 2 and never says how many:  no total, no page count. */
  class PagesByTwo extends CountingPlace {
    async list(collection: string, query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
      this.requests.push([{ collection, query }])
      const at = Number(query.page?.at ?? 0)
      const size = query.page?.size ?? 2
      const all = await MemoryPlace.prototype.list.call(this, collection, { ...query, page: undefined }, context)
      const rows = all.rows.slice(at, at + size)
      return { ...all, rows, ...(at + size < all.rows.length && { nextPage: `${at + size}` }) }
    }
  }

  test("a paged list that gives no total:  not every page read;  no value, unless its first page is all of them", async () => {
    const place = filled(new PagesByTwo({ capabilities: WITH_IDS }))
    for (const id of ["r2", "r3", "r4", "r5"]) {
      await place.apply([{ kind: "insert", collection: "recipes", id, fields: { id, title: "Stew" } }])
    }
    const { Recipe } = program(place)
    place.requests = []
    expect(await core.savedCount(Recipe)).toBeUndefined()
    // one row, then one page at its own size:  never the third page
    expect(place.requests.map(([ask]) => ask!.query.page?.at)).not.toContain("4")
    expect(place.requests.length).toBeLessThanOrEqual(2)
    // two of them, one page
    expect(await core.savedCount(Recipe, { filter: { title: "Soup" } })).toBe(1)
  })

  test("a list that doesn't page:  every one read, and counted here, as before", async () => {
    const place = filled(new CountingPlace({ capabilities: { ...WITH_IDS, page: "none" } }))
    for (const id of ["r2", "r3", "r4"]) {
      await place.apply([{ kind: "insert", collection: "recipes", id, fields: { id, title: "Stew" } }])
    }
    const { Recipe } = program(place)
    expect(await core.savedCount(Recipe)).toBe(4)
  })
})
