/**
 * What a running program hears of what changes in its places, and who's here (epic `data` P13), on classes written as compiled spell's are.
 * - The compiling half:  `tests/spell/parserTests/liveWords.test.ts`.
 * - On a real room, in two real pages:  the app folder's `tests/spell/liveRoom.test.ts`.
 */
import { createRoot, enableExternalSource, flush } from "solid-js"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core, on, Place, Thing } from "spell/parser/core"
import { MemoryPlace, type PersonHere, type PlaceCapabilities, type WatchTarget } from "spell/places"

/** How long to let what's asked be answered. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 30))

/** One that says nothing of what changes, as a plain web server doesn't:  it has to be asked. */
class SilentPlace extends MemoryPlace {
  describe(): PlaceCapabilities {
    return { ...super.describe(), live: "poll" }
  }
  watch(_target: WatchTarget): () => void {
    return () => {}
  }
}

/** A place with no network:  every write fails, as a fetch would. */
class OfflinePlace extends MemoryPlace {
  override apply(): Promise<never> {
    return Promise.reject(new TypeError("Failed to fetch"))
  }
}

/** The event a change of `Recipe` told, as a handler sees it. */
type Told = { kind: string; fields: string[]; recipe?: unknown; thing?: unknown }

/** A program:  its `Recipe`, in `behind`, saying what it heard;  a new run, unless it's `inThisRun`. */
function program(
  behind: MemoryPlace,
  { select, noHandler, inThisRun }: { select?: string[]; noHandler?: boolean; inThisRun?: boolean } = {}
) {
  if (!inThisRun) core.resetRuntime()
  const someoneElse: Told[] = []
  const anyone: Told[] = []
  class Recipe extends Thing {
    static {
      this.declareProp("title", { type: "text" })
      this.declareProp("notes", { type: "text" })
    }
    get title() {
      return this.getProp("title") as string
    }
    set title(value) {
      this.setProp("title", value)
    }
    get notes() {
      return this.getProp("notes") as string
    }
    set notes(value) {
      this.setProp("notes", value)
    }
    static savedIn = { place: "cookbook", collection: "recipes", ...(select && { select }) }
  }
  if (!noHandler) {
    ;(Recipe.prototype as unknown as { onSomeoneElseChange(event: Told): void }).onSomeoneElseChange = (event) => {
      someoneElse.push(event)
    }
  }
  class Cookbook extends Place {
    makePlace() {
      return behind
    }
  }
  core.place(new Cookbook(), { name: "cookbook" })
  on("a-recipe-change", (event: unknown) => void anyone.push(event as Told))
  return { Recipe, someoneElse, anyone }
}

/** A place holding one recipe. */
function filled<T extends MemoryPlace>(place: T): T {
  void place.apply([
    { kind: "insert", collection: "recipes", id: "r1", fields: { id: "r1", title: "Soup", notes: "Salt" } }
  ])
  return place
}

const WITH_IDS = { idOf: "id", select: "every field" as const }

beforeAll(() => bridgeSolid({ enableExternalSource, flush }))
beforeEach(() => core.resetRuntime())

describe("when someone else changes it", () => {
  test("a place that says what changed:  the thing's handler runs, with the fields, and the program's listener too", async () => {
    const place = filled(new MemoryPlace({ capabilities: WITH_IDS }))
    const { Recipe, someoneElse, anyone } = program(place)
    const [recipe] = (await core.savedThings(Recipe)).items as InstanceType<typeof Recipe>[]
    await place.apply([{ kind: "update", collection: "recipes", id: "r1", fields: { title: "Stew" } }])
    await settled()
    expect(recipe!.title).toBe("Stew")
    expect(someoneElse.map(({ fields }) => fields)).toEqual([["title"]])
    expect(anyone).toHaveLength(1)
    expect(anyone[0]!.recipe).toBe(recipe)
  })

  test("my own change is heard by `when a recipe changes`, one event for one step, and not by the other", async () => {
    const place = filled(new MemoryPlace({ capabilities: WITH_IDS }))
    const { Recipe, someoneElse, anyone } = program(place)
    const [recipe] = (await core.savedThings(Recipe)).items as InstanceType<typeof Recipe>[]
    recipe!.title = "Stew"
    recipe!.notes = "Slowly"
    await settled()
    expect(anyone.map(({ fields }) => fields)).toEqual([["title", "notes"]])
    expect(someoneElse).toEqual([])
    await new Promise((resolve) => setTimeout(resolve, 700))
    expect(await place.getMany("recipes", ["r1"], {})).toMatchObject([{ title: "Stew" }])
    expect(someoneElse).toEqual([])
  })

  test("a place that says nothing:  asking again finds what's different, what came and what went", async () => {
    const place = filled(new SilentPlace({ capabilities: WITH_IDS }))
    const { Recipe, someoneElse, anyone } = program(place)
    const recipes = await core.savedThings(Recipe)
    await place.apply([
      { kind: "update", collection: "recipes", id: "r1", fields: { title: "Stew" } },
      { kind: "insert", collection: "recipes", id: "r2", fields: { id: "r2", title: "Dal" } }
    ])
    await settled()
    expect(someoneElse).toEqual([])
    await core.reloadSaved(Recipe)
    await settled()
    expect(recipes.items).toHaveLength(2)
    expect(someoneElse.map(({ kind, fields }) => [kind, fields])).toEqual([
      ["changed", ["title"]],
      ["added", []]
    ])
    await place.apply([{ kind: "delete", collection: "recipes", id: "r1" }])
    await core.reloadSaved(Recipe)
    await settled()
    expect(recipes.items).toHaveLength(1)
    expect(someoneElse.at(-1)!.kind).toBe("removed")
    expect(anyone.at(-1)!.kind).toBe("removed")
  })

  test("asking again and finding the same is no change", async () => {
    const place = filled(new SilentPlace({ capabilities: WITH_IDS }))
    const { Recipe, someoneElse, anyone } = program(place)
    await core.savedThings(Recipe)
    await core.reloadSaved(Recipe)
    await settled()
    expect(someoneElse).toEqual([])
    expect(anyone).toEqual([])
  })

  test("a field first left out, then asked for, is no change;  a read can't tell of what it left out, until it's asked for", async () => {
    const place = filled(new SilentPlace({ capabilities: WITH_IDS }))
    const { Recipe, someoneElse } = program(place, { select: ["title"] })
    const [recipe] = (await core.savedThings(Recipe)).items as InstanceType<typeof Recipe>[]
    expect(recipe!.notes).toBe("")
    await vi.waitFor(() => expect(recipe!.notes).toBe("Salt"))
    await settled()
    expect(someoneElse).toEqual([])
  })

  test("nobody takes it, and a draft of that thing is open:  a plain notice;  with a handler, or no draft, none", async () => {
    const notify = vi.spyOn(core, "notify").mockResolvedValue(undefined)
    const place = filled(new MemoryPlace({ capabilities: WITH_IDS }))
    const { Recipe } = program(place, { noHandler: true })
    const [recipe] = (await core.savedThings(Recipe)).items as InstanceType<typeof Recipe>[]
    await place.apply([{ kind: "update", collection: "recipes", id: "r1", fields: { title: "Stew" } }])
    await settled()
    expect(notify).not.toHaveBeenCalled()
    core.draftOf(recipe!)
    await place.apply([{ kind: "update", collection: "recipes", id: "r1", fields: { title: "Broth" } }])
    await vi.waitFor(() => expect(notify).toHaveBeenCalledTimes(1))
    expect(notify.mock.calls[0]![0]).toMatch(/while you were editing/)
    notify.mockRestore()
  })
})

describe("who's here", () => {
  /** A place with people, whose list a test sets. */
  class RoomLike extends MemoryPlace {
    people: readonly PersonHere[] = [{ id: "me", name: "Me", page: "p-me" }]
    listeners = new Set<(people: readonly PersonHere[]) => void>()
    currentPerson() {
      return this.people[0]!
    }
    peopleHere() {
      return this.people
    }
    onPeopleHere(listener: (people: readonly PersonHere[]) => void) {
      this.listeners.add(listener)
      return () => this.listeners.delete(listener)
    }
    say(people: readonly PersonHere[]) {
      this.people = people
      this.listeners.forEach((listener) => listener(people))
    }
  }

  test("with no place that says:  only you, under the name its server knows you by, else a guest", async () => {
    const { SPELL_SERVER } = globalThis as { SPELL_SERVER?: unknown }
    ;(globalThis as { SPELL_SERVER?: unknown }).SPELL_SERVER = { person: "Ana" }
    core.resetRuntime()
    expect(core.currentPerson()).toMatchObject({ id: "Ana", name: "Ana" })
    expect(core.peopleHere().items).toEqual([core.currentPerson()])
    await settled()
    expect(core.peopleHere().items).toEqual([core.currentPerson()])
    ;(globalThis as { SPELL_SERVER?: unknown }).SPELL_SERVER = SPELL_SERVER
    core.resetRuntime()
    expect(core.currentPerson().name).toMatch(/^Guest \d+$/)
  })

  test("a place that says:  the one list follows who comes and goes, and you stay the same object", async () => {
    const place = new RoomLike()
    program(place)
    const people = core.peopleHere()
    await vi.waitFor(() => expect(place.listeners.size).toBe(1))
    const me = core.currentPerson()
    expect(people.items).toEqual([me])
    const bo = { id: "bo", name: "Bo", page: "p-bo" }
    place.say([{ id: "me", name: "Me", page: "p-me" }, bo])
    expect(core.peopleHere()).toBe(people)
    expect(people.items.map((person) => (person as PersonHere).name)).toEqual([me.name, "Bo"])
    expect(people.items[0]).toBe(me)
    place.say([{ id: "me", name: "Me", page: "p-me" }])
    expect(people.items).toEqual([me])
  })
})

describe("what the last visit left waiting (epic `solid-2-final` P13)", () => {
  test("a write left for a place this visit never uses is sent at idle;  a place with nothing waiting isn't made", async () => {
    const { Places } = await import("spell/places")
    const { MemoryStorage } = await import("spell/util/persist/MemoryStorage")
    const storage = new MemoryStorage()
    const was = (globalThis as { localStorage?: unknown }).localStorage
    ;(globalThis as { localStorage?: unknown }).localStorage = storage
    try {
      // the last visit:  offline, its change kept on this device
      const offline = new OfflinePlace()
      const last = new Places({ keepPendingAs: "@owen/cookbook", wait: 0, retry: 60_000 }).add("cookbook", offline)
      const pending = last.pendingFor("cookbook")
      pending.setField({ collection: "recipes", type: "Recipe", id: "r1", field: "title", value: "Stew", was: "Soup" })
      await vi.waitFor(() => expect(pending.queue.state.kind).toBe("failed"))
      pending.queue.stop()

      // this visit:  the program names the place, and a second one, and reads neither
      const behind = filled(new MemoryPlace({ capabilities: WITH_IDS }))
      const pantry = vi.fn(() => new MemoryPlace())
      core.resetRuntime()
      await core.remember("@owen/cookbook")
      program(behind, { inThisRun: true })
      class Pantry extends Place {
        makePlace = pantry
      }
      core.place(new Pantry(), { name: "pantry" })
      await vi.waitFor(async () =>
        expect(await behind.getMany("recipes", ["r1"], {})).toMatchObject([{ title: "Stew" }])
      )
      expect(pantry).not.toHaveBeenCalled()
    } finally {
      ;(globalThis as { localStorage?: unknown }).localStorage = was
    }
  })
})

/** A place that answers two rows a page, as a server does that pages by itself. */
class TwoAPage extends MemoryPlace {
  override list(...[collection, query, context]: Parameters<MemoryPlace["list"]>) {
    return super.list(collection, { ...query, page: { size: 2, ...query.page } }, context)
  }
}

/** Insert recipes `ids` into `place`, titled `title`. */
function inserted(place: MemoryPlace, ids: string[], title = "Soup") {
  return place.apply(ids.map((id) => ({ kind: "insert", collection: "recipes", id, fields: { id, title } }) as const))
}

describe("where someone else's change lands", () => {
  test("an announced new thing shows once, when the page that holds it is read later (I152)", async () => {
    const place = new TwoAPage({ capabilities: WITH_IDS })
    await inserted(place, ["r1", "r2", "r3", "r4"])
    const { Recipe } = program(place)
    // held, as a drawing holds it, so its next page joins what it has
    let letGo = () => {}
    const drawing = createRoot((dispose) => {
      letGo = dispose
      return core.savedThings(Recipe, {}, "as drawn")
    })
    const drawn = await drawing
    expect(drawn.items).toHaveLength(2)
    await inserted(place, ["r5"])
    await settled()
    expect((drawn.items as InstanceType<typeof Recipe>[]).map(({ id }) => id)).toEqual(["r1", "r2", "r5"])
    const all = await core.savedThings(Recipe)
    letGo()
    expect((all.items as InstanceType<typeof Recipe>[]).map(({ id }) => id).sort()).toEqual([
      "r1",
      "r2",
      "r3",
      "r4",
      "r5"
    ])
  })

  test("a list of chosen ids takes only those (I151)", async () => {
    const place = filled(new MemoryPlace({ capabilities: WITH_IDS }))
    const { Recipe } = program(place)
    const chosen = await core.savedThings(Recipe, { ids: ["r1"] })
    await inserted(place, ["r2"])
    await settled()
    expect((chosen.items as InstanceType<typeof Recipe>[]).map(({ id }) => id)).toEqual(["r1"])
  })

  test("a search takes only a new thing holding its text (I151)", async () => {
    const place = filled(new MemoryPlace({ capabilities: WITH_IDS }))
    const { Recipe } = program(place)
    const soups = await core.savedThings(Recipe, { search: { title: "soup" } })
    await inserted(place, ["r2"], "Dal")
    await inserted(place, ["r3"], "Tomato Soup")
    await settled()
    expect((soups.items as InstanceType<typeof Recipe>[]).map(({ id }) => id)).toEqual(["r1", "r3"])
  })
})

describe("after my own save (Q5)", () => {
  test("a list on screen its place sorted itself is asked again once, and shows the new order", async () => {
    const place = new MemoryPlace({ capabilities: WITH_IDS })
    await place.apply([
      { kind: "insert", collection: "recipes", id: "r1", fields: { id: "r1", title: "Apple pie" } },
      { kind: "insert", collection: "recipes", id: "r2", fields: { id: "r2", title: "Bread" } }
    ])
    const { Recipe, someoneElse } = program(place)
    let letGo = () => {}
    const sorted = await createRoot((dispose) => {
      letGo = dispose
      return core.savedThings(Recipe, { sort: [{ field: "title" }] })
    })
    const plain = await core.savedThings(Recipe)
    const lists = vi.spyOn(place, "list")
    const [apple] = sorted.items as InstanceType<typeof Recipe>[]
    apple!.title = "Zucchini bread"
    await vi.waitFor(() => expect(lists).toHaveBeenCalledTimes(1))
    await settled()
    expect((sorted.items as InstanceType<typeof Recipe>[]).map(({ id }) => id)).toEqual(["r2", "r1"])
    expect(lists.mock.calls[0]![1]).toMatchObject({ sort: [{ field: "title" }] })
    expect(someoneElse).toEqual([])
    expect(plain.items).toHaveLength(2)
    letGo()
  })
})
