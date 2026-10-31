import { createMemo, createRoot, createSignal, enableExternalSource, flush, onCleanup } from "solid-js"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid, observe } from "spell/util"
import { MemoryPlace, Places, type Place, type PlaceRow, type PlaceResult } from "spell/util/places"
import { App, core, List, Thing } from "spell/parser/core"
import { PlaceThings } from "spell/parser/core/places"

/**
 * A place's rows as things (`places.ts`):  one thing per id, a refresh changing it in place, undo kept (epic `data` J11).
 * - And a read made inside a memo, on the repo's Solid:  it aborts when its input changes, through `onCleanup()`.
 */

////////////////
// ## Classes under test
////////////////

/** `a recipe is a thing`, with a title, serves, a day it was added and tags, and turning it over is one undo step. */
class Recipe extends Thing {
  static {
    this.declareProp("title", { type: "text" })
    this.declareProp("serves", { type: "number" })
    this.declareProp("added", { type: "date" })
    this.declareProp("tags", { itemType: "text", init: () => new List({ instanceType: "text" }) })
    this.declareProp("author", { type: "Person" })
  }
  get title(): string {
    return this.getProp("title")
  }
  set title(title: string) {
    this.setProp("title", title)
  }
  get serves(): number {
    return this.getProp("serves")
  }
  set serves(serves: number) {
    this.setProp("serves", serves)
  }
  get added(): Date {
    return this.getProp("added")
  }
  set added(added: Date) {
    this.setProp("added", added)
  }
  get tags(): List<string> {
    return this.getProp("tags")
  }
  get author(): Person {
    return this.getProp("author")
  }
  set author(author: Person) {
    this.setProp("author", author)
  }

  /** Double it, as a person would:  one undo step. */
  doubleIt(): void {
    this.serves = this.serves * 2
  }

  static {
    this.declareAction("doubleIt", { undoneAs: "Double It" })
  }
}

/** `a person is a thing`, with a name. */
class Person extends Thing {
  get name(): string {
    return this.getProp("name")
  }
  set name(name: string) {
    this.setProp("name", name)
  }
}

/** `a menu is a list of recipes`. */
class Menu extends List<Recipe> {}

/** The classes this program has. */
const CLASSES: Record<string, new (props?: Record<string, unknown>) => Thing | List> = { Recipe, Person, Menu }

/** The cookbook:  a place with one recipe, its rows edited by `apply()`, as someone else's change would be. */
function cookbook(rows: PlaceRow[] = [{ id: "r-1", title: "Soup", serves: 2 }]) {
  const place = new MemoryPlace({ collections: { recipes: rows } })
  const places = new Places().add("cookbook", place)
  const things = new PlaceThings({ cache: places.cache, classNamed: (name) => CLASSES[name] })
  const read = (query?: { filter: Record<string, unknown> }) =>
    places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe", ...(query && { query }) })
  return { place, places, things, read }
}

/** Someone else changes `r-1`, at the place. */
function changeIt(place: MemoryPlace, fields: PlaceRow) {
  return place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields }])
}

beforeEach(() => {
  core.resetRuntime()
})

describe("PlaceThings, one thing per id", () => {
  test("a row becomes a real thing, of its class, made through its setters", async () => {
    const { things, read } = cookbook()
    const result = read()
    await result.load()
    const [recipe] = things.thingsFrom(result) as Recipe[]
    expect(recipe).toBeInstanceOf(Recipe)
    expect(recipe!.id).toBe("r-1")
    expect(recipe!.title).toBe("Soup")
    expect(recipe!.serves).toBe(2)
  })

  test("two reads of one id, one thing", async () => {
    const { things, read } = cookbook()
    const all = read()
    const soups = read({ filter: { title: "Soup" } })
    await Promise.all([all.load(), soups.load()])
    expect(things.thingsFrom(soups)[0]).toBe(things.thingsFrom(all)[0])
  })

  test("an id that's a number is text, the same thing", async () => {
    const { things, read } = cookbook([{ id: 12, title: "Soup" }])
    const result = read()
    await result.load()
    const [recipe] = things.thingsFrom(result)
    expect(recipe!.id).toBe("12")
    expect(things.thingsFrom(result)[0]).toBe(recipe)
  })

  test("an id a saved reference couldn't hold is fine:  an email address's @", async () => {
    const { things, read } = cookbook([{ id: "owen@spell.dev", title: "Soup" }])
    const result = read()
    await result.load()
    expect(things.thingsFrom(result)[0]!.id).toBe("owen@spell.dev")
  })

  test("a place whose id field has another name still names the thing by it", async () => {
    const place = new MemoryPlace({
      capabilities: { idOf: "path" },
      collections: { recipes: [{ path: "soup.json", title: "Soup" }] }
    })
    const places = new Places().add("files", place)
    const things = new PlaceThings({ cache: places.cache, classNamed: (name) => CLASSES[name] })
    const result = places.read({ placeName: "files", collection: "recipes", type: "Recipe" })
    await result.load()
    expect(things.thingsFrom(result)[0]!.id).toBe("soup.json")
  })

  test("a place with no ids shares no identity:  a new thing each time", async () => {
    const place = new MemoryPlace({
      capabilities: { idOf: undefined },
      collections: { recipes: [{ title: "Soup" }] }
    })
    const places = new Places().add("sheet", place)
    const things = new PlaceThings({ cache: places.cache, classNamed: (name) => CLASSES[name] })
    const result = places.read({ placeName: "sheet", collection: "recipes", type: "Recipe" })
    await result.load()
    const [one] = things.thingsFrom(result) as Recipe[]
    const [other] = things.thingsFrom(result) as Recipe[]
    expect(one!.title).toBe("Soup")
    expect(other).not.toBe(one)
  })

  test("a reference in a row finds that thing, by its row in the cache", async () => {
    const { places, things, read } = cookbook([{ id: "r-1", title: "Soup", author: { $ref: "Person#owen" } }])
    places.cache.keep("Person", "owen", { id: "owen", name: "Owen" })
    const result = read()
    await result.load()
    const [recipe] = things.thingsFrom(result) as Recipe[]
    expect(recipe!.author).toBeInstanceOf(Person)
    expect(recipe!.author.name).toBe("Owen")
  })

  test("a read with no type, or a type nobody knows:  a clear error", async () => {
    const { places, things } = cookbook()
    const untyped = places.read({ placeName: "cookbook", collection: "recipes" })
    await untyped.load()
    expect(() => things.thingsFrom(untyped)).toThrow(/has no `type`/)
    const unknown = places.read({ placeName: "cookbook", collection: "recipes", type: "Nope" })
    await unknown.load()
    expect(() => things.thingsFrom(unknown)).toThrow(/no class is named "Nope"/)
  })
})

describe("PlaceThings, a refresh", () => {
  /** A cookbook read, and the one recipe it made. */
  async function aRecipe(rows?: PlaceRow[]) {
    const book = cookbook(rows)
    const result = book.read()
    await result.load()
    const [recipe] = book.things.thingsFrom(result) as Recipe[]
    return { ...book, result, recipe: recipe! }
  }

  /** `result` read again, and its rows taken in. */
  async function refresh({ things, result }: { things: PlaceThings; result: PlaceResult }) {
    await result.reload()
    return things.thingsFrom(result)
  }

  test("changes the known thing IN PLACE, so what reads it hears", async () => {
    const book = await aRecipe()
    const seen: string[] = []
    const stop = observe(() => void seen.push(book.recipe.title))
    await changeIt(book.place, { title: "Stew" })
    const [again] = await refresh(book)
    expect(again).toBe(book.recipe)
    expect(book.recipe.title).toBe("Stew")
    expect(seen).toEqual(["Soup", "Stew"])
    stop()
  })

  test("a field the read didn't bring stays as it was", async () => {
    const book = cookbook()
    const whole = book.read()
    await whole.load()
    const [recipe] = book.things.thingsFrom(whole) as Recipe[]
    const titles = book.places.read({
      placeName: "cookbook",
      collection: "recipes",
      type: "Recipe",
      query: { select: ["id", "title"] }
    })
    await titles.load()
    book.things.thingsFrom(titles)
    expect(recipe!.serves).toBe(2)
  })

  test("KEEPS the undo history:  the step still undoes", async () => {
    const game = new App()
    const book = await aRecipe()
    book.recipe.doubleIt()
    expect(book.recipe.serves).toBe(4)
    expect(game.canUndo).toBe(true)

    await changeIt(book.place, { title: "Stew" })
    await refresh(book)
    expect(book.recipe.title).toBe("Stew")
    expect(game.canUndo).toBe(true)

    game.undo()
    expect(book.recipe.serves).toBe(2)
    expect(book.recipe.title).toBe("Stew")
  })

  test("Loader.load(), by contrast, forgets it:  why a refresh never goes that way", async () => {
    const game = new App()
    const book = await aRecipe()
    book.recipe.doubleIt()
    book.places.cache.keep("Person", "owen", { name: "Owen" })
    book.things.load("Person#owen")
    expect(game.canUndo).toBe(false)
  })

  test("what it reads joins no undo step, even with an action running", async () => {
    const game = new App()
    const book = await aRecipe()
    await changeIt(book.place, { title: "Stew" })
    await book.result.reload()
    /** An action that takes in a refresh, and changes nothing else. */
    class Refreshing extends Thing {
      takeIn(): void {
        book.things.thingsFrom(book.result)
      }
      static {
        this.declareAction("takeIn", { undoneAs: "Take In" })
      }
    }
    new Refreshing().takeIn()
    expect(book.recipe.title).toBe("Stew")
    expect(game.canUndo).toBe(false)
  })

  test("what it reads doesn't come back as a write;  a person's change still does", async () => {
    const book = await aRecipe()
    const set = vi.fn()
    core.remote = { set } as unknown as typeof core.remote
    try {
      await changeIt(book.place, { title: "Stew", serves: 3 })
      await refresh(book)
      expect(book.recipe.title).toBe("Stew")
      expect(set).not.toHaveBeenCalled()

      book.recipe.title = "Mine"
      expect(set).toHaveBeenCalledOnce()
      expect(set).toHaveBeenCalledWith(book.recipe, "title", "Mine")
    } finally {
      core.remote = undefined
    }
  })

  test("what a new row makes doesn't come back as a write either", async () => {
    const book = cookbook()
    const set = vi.fn()
    core.remote = { set } as unknown as typeof core.remote
    try {
      const result = book.read()
      await result.load()
      book.things.thingsFrom(result)
      expect(set).not.toHaveBeenCalled()
    } finally {
      core.remote = undefined
    }
  })

  test("a date is a date, the same date changes nothing, and a list gets its items", async () => {
    const added = "2026-10-31T00:00:00.000Z"
    const book = await aRecipe([{ id: "r-1", title: "Soup", added, tags: ["hot"] }])
    const { recipe } = book
    const firstDate = recipe.added
    expect(firstDate).toBeInstanceOf(Date)
    expect(recipe.tags.items).toEqual(["hot"])
    const tags = recipe.tags

    await refresh(book)
    expect(recipe.added).toBe(firstDate)

    await changeIt(book.place, { tags: ["hot", "quick"], added: "2026-11-01T00:00:00.000Z" })
    await refresh(book)
    expect(recipe.tags).toBe(tags)
    expect(recipe.tags.items).toEqual(["hot", "quick"])
    expect(recipe.added).toEqual(new Date("2026-11-01T00:00:00.000Z"))
  })

  test("a list type's row keeps its items in place too", async () => {
    const place = new MemoryPlace({
      collections: { menus: [{ id: "m-1", $items: [{ $type: "Recipe", id: "r-1", title: "Soup" }] }] }
    })
    const places = new Places().add("cookbook", place)
    const things = new PlaceThings({ cache: places.cache, classNamed: (name) => CLASSES[name] })
    const result = places.read({ placeName: "cookbook", collection: "menus", type: "Menu" })
    await result.load()
    const [menu] = things.thingsFrom(result) as Menu[]
    expect(menu).toBeInstanceOf(Menu)
    expect(menu!.items).toHaveLength(1)
    const [soup] = menu!.items

    await place.apply([
      {
        kind: "update",
        collection: "menus",
        id: "m-1",
        fields: {
          $items: [
            { $type: "Recipe", id: "r-1", title: "Soup" },
            { $type: "Recipe", id: "r-2", title: "Stew" }
          ]
        }
      }
    ])
    await result.reload()
    expect(things.thingsFrom(result)[0]).toBe(menu)
    expect(menu!.items).toHaveLength(2)
    expect(menu!.items[0]).toBe(soup)
  })
})

describe("a read inside a memo, on the repo's Solid", () => {
  /**
   * A place that holds each `list()` until the test answers it:  it records the signal, and never looks at it.
   * - So only a real abort can show in `signal.aborted`.
   */
  function heldPlace() {
    const asks: { filter: unknown; signal: AbortSignal; answer: (rows: PlaceRow[]) => void }[] = []
    const place: Place = {
      describe: () => ({
        idOf: "id",
        filter: "every field",
        sort: "every field",
        select: "every field",
        page: "none",
        write: "none",
        atomic: false,
        live: "none",
        abort: "soft"
      }),
      list: (_collection, query, { signal }) =>
        new Promise((resolve) => {
          asks.push({
            filter: query.filter,
            signal: signal!,
            answer: (rows) => resolve({ rows, handled: { filter: true } })
          })
        })
    }
    return { asks, places: new Places().add("cookbook", place) }
  }

  /** A memo reading what's searched for, as a part of a page would:  each read leaves through `onCleanup()`. */
  function searching(places: Places, runs: { count: number }, firstSearch = "so") {
    const [search, setSearch] = createSignal(firstSearch)
    const results: PlaceResult[] = []
    const dispose = createRoot((dispose) => {
      createMemo(() => {
        runs.count++
        const result = places.read({
          placeName: "cookbook",
          collection: "recipes",
          type: "Recipe",
          query: { filter: { title: search() } }
        })
        onCleanup(() => result.leave())
        results.push(result)
        return result.load()
      })
      return dispose
    })
    return { setSearch, results, dispose }
  }

  beforeAll(() => {
    bridgeSolid({ enableExternalSource, flush })
  })

  test("its input changing aborts the read, and starts the newest", async () => {
    const { asks, places } = heldPlace()
    const { setSearch, results, dispose } = searching(places, { count: 0 })
    flush()
    expect(asks).toHaveLength(1)
    expect(asks[0]!.signal.aborted).toBe(false)

    setSearch("sou")
    flush()
    expect(asks).toHaveLength(2)
    expect(asks[0]!.signal.aborted).toBe(true)
    expect(asks[1]!.signal.aborted).toBe(false)
    expect(asks[1]!.filter).toEqual({ title: "sou" })

    // the older answers last, and is dropped
    asks[1]!.answer([{ id: "new" }])
    asks[0]!.answer([{ id: "old" }])
    await results[1]!.load()
    await Promise.resolve()
    expect(results[1]!.contents).toEqual([{ id: "new" }])
    expect(results[0]!.contents).toBeUndefined()
    dispose()
  })

  test("being disposed aborts the read", () => {
    const { asks, places } = heldPlace()
    const { dispose } = searching(places, { count: 0 })
    flush()
    dispose()
    expect(asks[0]!.signal.aborted).toBe(true)
  })

  test("a read made in a memo doesn't re-run it, however its state changes", async () => {
    const { asks, places } = heldPlace()
    const runs = { count: 0 }
    const { results, dispose } = searching(places, runs)
    flush()
    expect(runs.count).toBe(1)
    asks[0]!.answer([{ id: "r-1" }])
    await results[0]!.load()
    flush()
    await Promise.resolve()
    flush()
    expect(runs.count).toBe(1)
    expect(asks).toHaveLength(1)
    dispose()
  })

  test("two memos reading one list share a request;  one going leaves it running", () => {
    const { asks, places } = heldPlace()
    const one = searching(places, { count: 0 })
    const other = searching(places, { count: 0 })
    flush()
    expect(asks).toHaveLength(1)
    one.dispose()
    expect(asks[0]!.signal.aborted).toBe(false)
    other.dispose()
    expect(asks[0]!.signal.aborted).toBe(true)
  })

  test("a memo over a refresh sees the rows change, and its things change in place", async () => {
    const place = new MemoryPlace({ collections: { recipes: [{ id: "r-1", title: "Soup" }] } })
    const places = new Places().add("cookbook", place)
    const things = new PlaceThings({ cache: places.cache, classNamed: (name) => CLASSES[name] })
    const result = places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
    await result.load()

    const titles: string[] = []
    const dispose = createRoot((dispose) => {
      createMemo(() => {
        const [recipe] = things.thingsFrom(result) as Recipe[]
        titles.push(recipe!.title)
      })
      return dispose
    })
    flush()
    await changeIt(place, { title: "Stew" })
    await result.reload()
    flush()
    expect(titles.at(-1)).toBe("Stew")
    dispose()
  })
})
