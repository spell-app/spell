import { createMemo, createRoot, createSignal, enableExternalSource, flush, onCleanup } from "solid-js"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid, observe } from "spell/util"
import { MemoryStorage } from "spell/util/persist/MemoryStorage"
import {
  MemoryPlace,
  PlaceError,
  Places,
  type Place,
  type PlaceChange,
  type PlaceContext,
  type PlaceRow,
  type PlaceResult,
  type PlacesProps
} from "spell/util/places"
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

////////////////
// ## What's done to a thing goes to its place (epic `data` P3)
////////////////

/** A place that fails or refuses when the test says so:  each of `nextWrites` is used up in turn. */
class TroubledPlace extends MemoryPlace {
  nextWrites: ("fails" | "refuses")[] = []
  sent: PlaceChange[][] = []

  override async apply(changes: readonly PlaceChange[], context: PlaceContext = {}) {
    this.sent.push([...changes])
    const trouble = this.nextWrites.shift()
    if (trouble === "fails") throw new TypeError("Failed to fetch")
    if (trouble === "refuses") throw new PlaceError("no", { cause: { kind: "refused" } })
    return super.apply(changes, context)
  }
}

/** A cookbook whose things write back, and its first recipe. */
async function writing(options: { showMe?: (thing: object) => void; props?: PlacesProps } = {}) {
  const place = new TroubledPlace({
    collections: { recipes: [{ id: "r-1", title: "Soup", serves: 2, tags: ["hot"] }], people: [{ id: "matt" }] }
  })
  const places = new Places({ wait: 0, retry: 1, ...options.props }).add("cookbook", place)
  const things = new PlaceThings({
    places,
    classNamed: (name) => CLASSES[name],
    ...(options.showMe && { showMe: options.showMe })
  })
  const result = places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
  await result.load()
  const [recipe] = things.thingsFrom(result) as Recipe[]
  const pending = places.pendingFor("cookbook")
  const allSent = () => vi.waitFor(() => expect(pending.hasPending).toBe(false))
  const onPlace = async () => (await place.getMany("recipes", ["r-1"]))[0]!
  return { place, places, things, result, recipe: recipe!, pending, allSent, onPlace }
}

describe("PlaceThings, writes", () => {
  test("setting a property is a pending change, shown at once, and reaches the place", async () => {
    const { recipe, pending, allSent, onPlace } = await writing()
    recipe.title = "Stew"
    expect(recipe.title).toBe("Stew")
    expect(pending.changes).toHaveLength(1)
    expect(pending.changes[0]).toMatchObject({ kind: "update", id: "r-1", field: "title", was: "Soup" })
    await allSent()
    expect((await onPlace()).title).toBe("Stew")
  })

  test("a change to a list is a write of that field, the whole list", async () => {
    const { recipe, allSent, onPlace } = await writing()
    recipe.tags.add("spicy")
    await allSent()
    expect((await onPlace()).tags).toEqual(["hot", "spicy"])
  })

  test("a thing with no place sends nothing, with places in the program", async () => {
    const { pending } = await writing()
    const loose = new Recipe({ title: "Mine" })
    loose.title = "Yours"
    expect(pending.hasPending).toBe(false)
  })

  test("a thing's reference and a date go as a row holds them", async () => {
    const { recipe, pending } = await writing()
    recipe.author = new Person({ id: "matt" })
    recipe.added = new Date("2026-10-31T00:00:00.000Z")
    expect(pending.changes.map(({ fields }) => fields)).toEqual([
      { author: { $ref: "Person#matt" } },
      { added: "2026-10-31T00:00:00.000Z" }
    ])
    pending.queue.done()
  })
})

describe("PlaceThings, what's read is no write", () => {
  test("rows read, refreshed or healed queue nothing, and undo doesn't see them;  a handler still hears", async () => {
    const { place, places, recipe, result, things, pending } = await writing()
    const heard = vi.fn()
    ;(recipe as unknown as { whenTitleChanges: (...args: unknown[]) => void }).whenTitleChanges = heard
    await place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Theirs" } }])
    place.sent = []
    await result.reload()
    things.thingsFrom(result)
    expect(recipe.title).toBe("Theirs")
    await place.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Healed" } }])
    place.sent = []
    await places.heal.heal({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
    expect(recipe.title).toBe("Healed")
    expect(pending.hasPending).toBe(false)
    expect(place.sent).toEqual([])
    expect(core.RUNTIME.history.canUndo).toBe(false)
  })

  test("a read answered while a write is pending doesn't take it back", async () => {
    const { place, recipe, result, things, pending, allSent } = await writing()
    place.nextWrites = ["fails", "fails", "fails"]
    recipe.title = "Mine"
    await result.reload()
    things.thingsFrom(result)
    expect(recipe.title).toBe("Mine")
    expect(pending.changes[0]!.field).toBe("title")
    await allSent()
  })
})

describe("PlaceThings, undo", () => {
  test("before it's sent, undo drops the change:  nothing goes", async () => {
    const { place, recipe, pending, allSent } = await writing()
    recipe.title = "Stew"
    // the action ends, so what's pending goes:  the title leaves, and its change waits behind it
    recipe.doubleIt()
    expect(recipe.serves).toBe(4)
    expect(pending.changes).toHaveLength(2)
    core.RUNTIME.history.undo()
    expect(recipe.serves).toBe(2)
    expect(pending.changes).toHaveLength(1)
    await allSent()
    expect(place.sent.flat().map(({ fields }) => fields)).toEqual([{ title: "Stew" }])
  })

  test("sent with no answer, it may have been made:  undo sends a reversing change after it", async () => {
    const { place, recipe, pending, allSent, onPlace } = await writing({ props: { retry: 20 } })
    place.nextWrites = ["fails"]
    recipe.doubleIt()
    await vi.waitFor(() => expect(place.sent).toHaveLength(1), { interval: 2 })
    core.RUNTIME.history.undo()
    expect(pending.changes).toHaveLength(2)
    await allSent()
    expect((await onPlace()).serves).toBe(2)
  })

  test("after it's sent, undo sends a reversing change", async () => {
    const { place, recipe, allSent, onPlace } = await writing()
    recipe.doubleIt()
    await allSent()
    expect((await onPlace()).serves).toBe(4)
    core.RUNTIME.history.undo()
    await allSent()
    expect((await onPlace()).serves).toBe(2)
    expect(place.sent.flat().map(({ fields }) => fields)).toEqual([{ serves: 4 }, { serves: 2 }])
  })
})

describe("PlaceThings, actions", () => {
  test("a declared action's changes show at once, and go out when it ends", async () => {
    const { place, recipe, allSent } = await writing()
    let finish = () => {}
    const slowly = core.RUNTIME.history.run({ undoneAs: "Rename" }, async () => {
      recipe.title = "Stew"
      await new Promise<void>((resolve) => (finish = resolve))
      recipe.serves = 9
    })
    expect(recipe.title).toBe("Stew")
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(place.sent).toEqual([])
    finish()
    await slowly
    await allSent()
    expect(place.sent.map((changes) => changes.length)).toEqual([2])
  })

  test("what a person runs through the queue goes out together when it ends", async () => {
    const { place, recipe, allSent } = await writing()
    let finish = () => {}
    const act = recipe as unknown as Record<string, unknown>
    act.slowRename = async function () {
      recipe.title = "Stew"
      recipe.serves = 9
      await new Promise<void>((resolve) => (finish = resolve))
    }
    expect(core.runAction(recipe, "slowRename")).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(place.sent).toEqual([])
    finish()
    await allSent()
    expect(place.sent.map((changes) => changes.length)).toEqual([2])
  })

  test("cancelling an unfinished action drops its writes, and they go back", async () => {
    const { place, recipe, pending, onPlace } = await writing()
    const act = recipe as unknown as Record<string, unknown>
    act.slowRename = async function () {
      recipe.title = "Stew"
      await core.pauseFor(10, "seconds")
      recipe.serves = 9
    }
    core.runAction(recipe, "slowRename")
    expect(recipe.title).toBe("Stew")
    core.cancelActions(recipe, "slowRename")
    expect(pending.hasPending).toBe(false)
    expect(recipe.title).toBe("Soup")
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(place.sent).toEqual([])
    expect((await onPlace()).title).toBe("Soup")
  })
})

describe("PlaceThings, refused", () => {
  test("it heals back to the place's copy, and a notice offers Retry and Show me, which work", async () => {
    const shown: object[] = []
    const { place, recipe, allSent, onPlace } = await writing({ showMe: (thing) => shown.push(thing) })
    const notify = vi.spyOn(core, "notify").mockResolvedValue(undefined)
    place.nextWrites = ["refuses"]
    recipe.title = "Stew"
    await vi.waitFor(() => expect(notify).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(recipe.title).toBe("Soup"))
    const [message, options] = notify.mock.calls[0]!
    expect(message).toBe("Couldn't save your change to Recipe r-1")
    expect(options!.class).toBe("error")
    expect(options!.actions!.map(({ text }) => text)).toEqual(["Retry", "Show me"])

    options!.actions![1]!.click()
    expect(shown).toEqual([recipe])

    options!.actions![0]!.click()
    expect(recipe.title).toBe("Stew")
    await allSent()
    expect((await onPlace()).title).toBe("Stew")
    notify.mockRestore()
  })

  test("a heal mid-way keeps a write made since on top", async () => {
    const { place, recipe, allSent, onPlace } = await writing()
    const notify = vi.spyOn(core, "notify").mockResolvedValue(undefined)
    // first the two together, then the title on its own
    place.nextWrites = ["refuses", "refuses"]
    recipe.title = "Refused"
    recipe.serves = 7
    await vi.waitFor(() => expect(notify).toHaveBeenCalled())
    await allSent()
    expect(recipe.serves).toBe(7)
    expect((await onPlace()).serves).toBe(7)
    notify.mockRestore()
  })
})

describe("core.notify's actions", () => {
  test("each reaches the page's toast with its handler, and the toast stays until it's closed", async () => {
    const toast = vi.fn(() => ({ closed: Promise.resolve() }))
    const key = Symbol.for("spell-ui:runtime")
    const page = globalThis as unknown as Record<symbol, unknown>
    const runtime = { load: async () => runtime, toast }
    page[key] = runtime
    const click = vi.fn()
    await core.notify("Oops", { actions: [{ text: "Retry", click }] })
    delete page[key]
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Oops", displayTime: 0, actions: [{ text: "Retry", click }] })
    )
  })
})

describe("PlaceThings, a new saved thing", () => {
  test("it goes whole, under the id it made in the browser", async () => {
    const { things, places, place, allSent } = await writing()
    const recipe = new Recipe({ title: "Pie" })
    things.saveNew(recipe, { placeName: "cookbook", collection: "recipes" })
    expect(recipe.id).toMatch(/^recipe-/)
    recipe.serves = 3
    await allSent()
    expect((await place.getMany("recipes", [recipe.id]))[0]).toMatchObject({ title: "Pie", serves: 3 })
    expect(places.cache.rowFor("Recipe", recipe.id)!.title).toBe("Pie")
  })

  test("a place that makes its own ids renames the thing, and writes follow", async () => {
    const place = new MemoryPlace({ capabilities: { makesIds: true }, collections: { recipes: [] } })
    const places = new Places({ wait: 0 }).add("cookbook", place)
    const things = new PlaceThings({ places, classNamed: (name) => CLASSES[name] })
    const recipe = new Recipe({ title: "Pie" })
    things.saveNew(recipe, { placeName: "cookbook", collection: "recipes" })
    const pending = places.pendingFor("cookbook")
    await vi.waitFor(() => expect(pending.hasPending).toBe(false))
    expect(recipe.id).toBe("m-1")
    recipe.title = "Tart"
    await vi.waitFor(() => expect(pending.hasPending).toBe(false))
    expect((await place.getMany("recipes", ["m-1"]))[0]!.title).toBe("Tart")
  })

  test("remove() deletes it at the place", async () => {
    const { things, recipe, allSent, place } = await writing()
    things.remove(recipe)
    await allSent()
    expect(await place.getMany("recipes", ["r-1"])).toEqual([])
  })
})

describe("PlaceDraft", () => {
  test("a draft holds its changes apart:  the thing stays, nothing goes;  cancelled, they're gone", async () => {
    const { things, recipe, pending, place } = await writing()
    const draft = things.draftOf(recipe)
    expect(things.draftOf(recipe)).toBe(draft)
    const copy = draft.thing as Recipe
    expect(copy.title).toBe("Soup")
    copy.title = "Stew"
    copy.tags.add("spicy")
    expect(draft.hasChanges).toBe(true)
    expect(recipe.title).toBe("Soup")
    expect(recipe.tags.items).toEqual(["hot"])
    expect(pending.hasPending).toBe(false)
    draft.cancel()
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(place.sent).toEqual([])
    expect(things.draftOf(recipe)).not.toBe(draft)
  })

  test("saved, its changes go out together, as one group", async () => {
    const { things, recipe, place, allSent, onPlace } = await writing()
    const draft = things.draftOf(recipe)
    const copy = draft.thing as Recipe
    copy.title = "Stew"
    copy.serves = 9
    copy.tags.add("spicy")
    draft.save()
    expect(recipe.title).toBe("Stew")
    expect(recipe.tags.items).toEqual(["hot", "spicy"])
    await allSent()
    expect(place.sent.map((changes) => changes.length)).toEqual([3])
    expect(await onPlace()).toMatchObject({ title: "Stew", serves: 9, tags: ["hot", "spicy"] })
  })

  test("it's kept on this device, and comes back on the next visit", async () => {
    const storage = new MemoryStorage()
    const props = { keepPendingAs: "@owen/cookbook", storage: () => storage }
    const first = await writing({ props })
    ;(first.things.draftOf(first.recipe).thing as Recipe).title = "Half typed"

    const second = await writing({ props })
    const draft = second.things.draftOf(second.recipe)
    expect((draft.thing as Recipe).title).toBe("Half typed")
    expect(second.recipe.title).toBe("Soup")
    draft.cancel()
    expect(second.things.draftOf(second.recipe).hasChanges).toBe(false)
  })

  test("a thing kept in no place needs none", async () => {
    const { things } = await writing()
    expect(() => things.draftOf(new Recipe({ title: "Mine" }))).toThrow(TypeError)
  })
})
