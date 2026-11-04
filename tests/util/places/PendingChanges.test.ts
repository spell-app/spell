import { describe, expect, test, vi } from "vite-plus/test"

import { MemoryPlace, Places, type PlaceCapabilities, type PlaceWriteFailure } from "spell/util/places"
import { MemoryStorage } from "spell/util/persist/MemoryStorage"

import { TroubledPlace } from "./fakePlaces"

/** One recipe, in a place that fails when it's told to, and the changes pending for it. */
function cookbook(capabilities: Partial<PlaceCapabilities> = {}, props: ConstructorParameters<typeof Places>[0] = {}) {
  const place = new TroubledPlace({
    capabilities,
    collections: {
      recipes: [
        { id: "r-1", title: "Soup", serves: 2 },
        { id: "r-2", title: "Stew", serves: 4 }
      ]
    }
  })
  const places = new Places({ wait: 0, retry: 1, ...props }).add("cookbook", place)
  const pending = places.pendingFor("cookbook")
  const failures: PlaceWriteFailure[] = []
  places.onWriteFailed((failure) => failures.push(failure))
  return { place, places, pending, failures }
}

/** Write the title of recipe `id`. */
const titleWrite = (value: string, was: string, id = "r-1", group?: number) => ({
  collection: "recipes",
  type: "Recipe",
  id,
  field: "title",
  value,
  was,
  ...(group !== undefined && { group })
})

/** What `place` holds of `id`. */
async function kept(place: MemoryPlace, id = "r-1") {
  const [row] = await place.getMany("recipes", [id])
  return row
}

/** Wait until nothing's pending. */
const allSent = (pending: { hasPending: boolean }) => vi.waitFor(() => expect(pending.hasPending).toBe(false))

describe("PendingChanges, writing", () => {
  test("a write shows at once in the cache, and reaches the place, as one field of one thing", async () => {
    const { place, places, pending } = cookbook()
    const reading = places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
    await reading.load()
    pending.setField(titleWrite("Broth", "Soup"))
    expect(reading.contents![0]!.title).toBe("Broth")
    expect((await kept(place))!.title).toBe("Soup")
    await allSent(pending)
    expect((await kept(place))!.title).toBe("Broth")
    expect(place.sent[0]![0]).toMatchObject({
      kind: "update",
      collection: "recipes",
      id: "r-1",
      fields: { title: "Broth" }
    })
    expect(place.sent[0]![0]!.changeId).toEqual(expect.any(String))
    // only what a place understands goes to it
    expect(place.sent[0]![0]).not.toHaveProperty("was")
    expect(place.sent[0]![0]).not.toHaveProperty("type")
    reading.leave()
  })

  test("a second write to a field not yet sent replaces it:  typing is one change", async () => {
    const { place, pending } = cookbook()
    pending.setField(titleWrite("B", "Soup"))
    pending.setField(titleWrite("Br", "B"))
    pending.setField(titleWrite("Bro", "Br"))
    expect(pending.changes).toHaveLength(1)
    expect(pending.changes[0]!.was).toBe("Soup")
    await allSent(pending)
    expect(place.sent.flat()).toHaveLength(1)
    expect((await kept(place))!.title).toBe("Bro")
  })

  test("changes go in the order made, and a change made while one is on its way waits for it", async () => {
    const { place, pending } = cookbook()
    pending.setField(titleWrite("One", "Soup"))
    pending.setField({ collection: "recipes", id: "r-2", field: "serves", value: 8, was: 4 })
    pending.queue.changed({ now: true })
    pending.setField(titleWrite("Two", "One"))
    await allSent(pending)
    expect(place.sent.flat().map(({ fields }) => fields)).toEqual([{ title: "One" }, { serves: 8 }, { title: "Two" }])
  })

  test("a place with a limit per request gets them a request at a time", async () => {
    const { place, pending } = cookbook({ rateLimit: { requests: 5, perSeconds: 1, changesPerRequest: 1 } })
    pending.setField(titleWrite("One", "Soup"))
    pending.setField({ collection: "recipes", id: "r-2", field: "serves", value: 8, was: 4 })
    await allSent(pending)
    expect(place.sent.map((changes) => changes.length)).toEqual([1, 1])
  })

  test("as the page goes away, it asks for a request that outlives it", async () => {
    const { place, pending } = cookbook()
    pending.setField(titleWrite("Broth", "Soup"))
    await pending.queue.save({ keepalive: true })
    expect(place.contexts[0]).toEqual({ keepalive: true })
  })
})

describe("PendingChanges, no answer", () => {
  test("offline, then back:  it resends with the SAME id until it goes through", async () => {
    const { place, pending, failures } = cookbook({}, { retry: 40 })
    place.nextWrites = ["fails", "fails"]
    pending.setField(titleWrite("Broth", "Soup"))
    await vi.waitFor(() => expect(pending.queue.state.kind).toBe("failed"), { interval: 5 })
    expect(pending.hasPending).toBe(true)
    await allSent(pending)
    const ids = place.sent.flat().map(({ changeId }) => changeId)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(1)
    expect((await kept(place))!.title).toBe("Broth")
    expect(failures).toEqual([])
  })

  test("an answer lost:  sent again, and a place that remembers ids makes it once", async () => {
    const { place, places, pending } = cookbook()
    const reading = places.read({ placeName: "cookbook", collection: "recipes" })
    place.nextWrites = ["loses its answer"]
    pending.insert({ collection: "recipes", id: "r-3", fields: { title: "Pie" } })
    await allSent(pending)
    expect(place.sent).toHaveLength(2)
    await reading.load()
    expect(reading.contents!.filter(({ id }) => id === "r-3")).toHaveLength(1)
    reading.leave()
  })
})

describe("PendingChanges, refused", () => {
  test("it's dropped, put back, healed, and one failure says so;  Retry tries again", async () => {
    const { place, places, pending, failures } = cookbook()
    const rows = vi.fn()
    place.nextWrites = ["refuses"]
    places.onRows(rows)
    pending.setField(titleWrite("Broth", "Soup"))
    await vi.waitFor(() => expect(failures).toHaveLength(1))
    expect(pending.hasPending).toBe(false)
    expect(failures[0]!.error.kind).toBe("refused")
    expect(failures[0]!.changes[0]!.field).toBe("title")
    await vi.waitFor(() => expect(places.cache.rowFor("Recipe", "r-1")!.title).toBe("Soup"))
    expect(pending.queue.state.kind).toBe("idle")

    failures[0]!.retry()
    expect(places.cache.rowFor("Recipe", "r-1")!.title).toBe("Broth")
    await allSent(pending)
    expect((await kept(place))!.title).toBe("Broth")
    expect(failures).toHaveLength(1)
  })

  test("a refusal leaves another pending change of that thing on top", async () => {
    const { place, places, pending, failures } = cookbook()
    place.nextWrites = ["refuses"]
    const group = pending.startGroup()
    pending.setField({
      collection: "recipes",
      type: "Recipe",
      id: "r-1",
      field: "serves",
      value: 9,
      was: 2,
      group: group.number
    })
    pending.setField(titleWrite("Broth", "Soup"))
    group.end()
    await vi.waitFor(() => expect(failures).toHaveLength(1))
    await allSent(pending)
    expect(places.cache.rowFor("Recipe", "r-1")!.serves).toBe(2)
    expect((await kept(place))!.title).toBe("Broth")
  })

  test("a place that isn't all or nothing:  each is tried alone, so only the refused one is lost", async () => {
    const { place, pending, failures } = cookbook({ atomic: false })
    place.nextWrites = ["refuses", "refuses"]
    pending.setField(titleWrite("Broth", "Soup"))
    pending.setField({ collection: "recipes", id: "r-2", field: "serves", value: 8, was: 4 })
    await allSent(pending)
    expect(failures).toHaveLength(1)
    expect(failures[0]!.changes[0]!.field).toBe("title")
    expect((await kept(place, "r-2"))!.serves).toBe(8)
  })

  test("a place that is all or nothing:  a group refused is refused whole", async () => {
    const { place, pending, failures } = cookbook()
    place.nextWrites = ["refuses"]
    const group = pending.startGroup()
    pending.setField(titleWrite("Broth", "Soup", "r-1", group.number))
    pending.setField({ collection: "recipes", id: "r-2", field: "serves", value: 8, was: 4, group: group.number })
    group.end()
    await vi.waitFor(() => expect(failures).toHaveLength(1))
    expect(failures[0]!.changes).toHaveLength(2)
    expect(place.sent).toHaveLength(1)
    expect((await kept(place, "r-2"))!.serves).toBe(4)
  })

  test("deleting what's already gone is what was wanted", async () => {
    const { pending, failures } = cookbook()
    pending.delete({ collection: "recipes", id: "nobody" })
    await allSent(pending)
    expect(failures).toEqual([])
  })

  test("a place that takes no changes at all refuses", async () => {
    const places = new Places({ wait: 0 }).add("list only", {
      describe: () => new MemoryPlace().describe(),
      list: async () => ({ rows: [], handled: {} })
    })
    const failures: PlaceWriteFailure[] = []
    places.onWriteFailed((failure) => failures.push(failure))
    places.pendingFor("list only").delete({ collection: "x", id: "1" })
    await vi.waitFor(() => expect(failures).toHaveLength(1))
  })
})

describe("PendingChanges, undo", () => {
  test("a write back to what it was, before it's sent, drops the change:  nothing goes", async () => {
    const { place, pending } = cookbook({}, { wait: 50 })
    pending.setField(titleWrite("Broth", "Soup"))
    pending.setField(titleWrite("Soup", "Broth"))
    expect(pending.hasPending).toBe(false)
    expect(pending.queue.state.kind).toBe("idle")
    await new Promise((resolve) => setTimeout(resolve, 70))
    expect(place.sent).toEqual([])
  })

  test("once it has gone, a write back is a reversing change", async () => {
    const { place, pending } = cookbook()
    pending.setField(titleWrite("Broth", "Soup"))
    await allSent(pending)
    pending.setField(titleWrite("Soup", "Broth"))
    await allSent(pending)
    expect(place.sent.flat().map(({ fields }) => fields)).toEqual([{ title: "Broth" }, { title: "Soup" }])
    expect((await kept(place))!.title).toBe("Soup")
  })
})

describe("PendingChanges, groups", () => {
  test("an action's changes show at once, and go out together when it ends", async () => {
    const { place, places, pending } = cookbook()
    const group = pending.startGroup()
    pending.setField(titleWrite("Broth", "Soup", "r-1", group.number))
    pending.setField({ collection: "recipes", id: "r-2", field: "serves", value: 8, was: 4, group: group.number })
    expect(places.cache.rowFor("Recipe", "r-1")!.title).toBe("Broth")
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(place.sent).toEqual([])
    group.end()
    await allSent(pending)
    expect(place.sent.map((changes) => changes.length)).toEqual([2])
  })

  test("cancelling drops them:  nothing left, and what showed is put back", async () => {
    const { place, places, pending } = cookbook()
    const group = pending.startGroup()
    pending.setField(titleWrite("Broth", "Soup", "r-1", group.number))
    group.cancel()
    group.end()
    expect(pending.hasPending).toBe(false)
    expect(places.cache.rowFor("Recipe", "r-1")!.title).toBe("Soup")
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(place.sent).toEqual([])
  })

  test("what comes after an open group waits, to keep the order", async () => {
    const { place, pending } = cookbook()
    const group = pending.startGroup()
    pending.setField(titleWrite("One", "Soup", "r-1", group.number))
    pending.setField({ collection: "recipes", id: "r-2", field: "serves", value: 8, was: 4 })
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(place.sent).toEqual([])
    group.end()
    await allSent(pending)
    expect(place.sent.flat().map(({ fields }) => fields)).toEqual([{ title: "One" }, { serves: 8 }])
  })
})

describe("PendingChanges, closing the tab", () => {
  test("what's pending is sent on the next visit, with the same id, on top of what's read", async () => {
    const storage = new MemoryStorage()
    const props = { keepPendingAs: "@owen/cookbook", storage: () => storage }
    const first = cookbook({}, { ...props, retry: 10_000 })
    first.place.nextWrites = ["fails"]
    first.pending.setField(titleWrite("Broth", "Soup"))
    await vi.waitFor(() => expect(first.pending.queue.state.kind).toBe("failed"))
    const { changeId } = first.pending.changes[0]!
    first.pending.queue.stop()

    // the same device, a new page:  the place hasn't heard
    const place = new TroubledPlace({ collections: { recipes: [{ id: "r-1", title: "Soup" }] } })
    const places = new Places({ wait: 0, retry: 1, ...props })
    const heard = vi.fn()
    places.onRows(heard)
    places.add("cookbook", place)
    const pending = places.pendingFor("cookbook")
    expect(pending.changes[0]!.changeId).toBe(changeId)
    await allSent(pending)
    expect(place.sent[0]![0]!.changeId).toBe(changeId)
    expect((await kept(place))!.title).toBe("Broth")
    expect(heard).toHaveBeenCalled()
  })

  test("an unfinished action is never kept:  closing the tab really drops it", () => {
    const storage = new MemoryStorage()
    const props = { keepPendingAs: "@owen/cookbook", storage: () => storage }
    const { pending } = cookbook({}, props)
    const group = pending.startGroup()
    pending.setField(titleWrite("Broth", "Soup", "r-1", group.number))
    const next = new Places({ ...props }).add("cookbook", new MemoryPlace())
    expect(next.pendingFor("cookbook").changes).toEqual([])
  })

  test("a refusal left from the last visit is told to whoever comes to listen", async () => {
    const storage = new MemoryStorage()
    const props = { keepPendingAs: "@owen/cookbook", storage: () => storage }
    const first = cookbook({}, { ...props, retry: 10_000 })
    first.place.nextWrites = ["fails"]
    first.pending.setField(titleWrite("Broth", "Soup"))
    await vi.waitFor(() => expect(first.pending.queue.state.kind).toBe("failed"))
    first.pending.queue.stop()

    const place = new TroubledPlace({ collections: { recipes: [{ id: "r-1", title: "Soup" }] } })
    place.nextWrites = ["refuses"]
    const places = new Places({ wait: 0, retry: 1, ...props }).add("cookbook", place)
    await allSent(places.pendingFor("cookbook"))
    const failures: PlaceWriteFailure[] = []
    places.onWriteFailed((failure) => failures.push(failure))
    expect(failures).toHaveLength(1)
  })
})

describe("PendingChanges, reading your own write", () => {
  test("a read answered while it's pending shows it, and a later read shows what the place holds", async () => {
    const { places, pending, place } = cookbook()
    place.nextWrites = ["fails", "fails"]
    pending.setField(titleWrite("Broth", "Soup"))
    const reading = places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
    await reading.load()
    expect(reading.contents![0]!.title).toBe("Broth")
    await reading.reload()
    expect(reading.contents![0]!.title).toBe("Broth")
    await allSent(pending)
    await reading.reload()
    expect(reading.contents![0]!.title).toBe("Broth")
    reading.leave()
  })

  test("a new thing shows in a list, a deleted one doesn't, and a filter still holds", () => {
    const { pending } = cookbook({}, { wait: 10_000 })
    const rows = [
      { id: "r-1", title: "Soup" },
      { id: "r-2", title: "Stew" }
    ]
    pending.insert({ collection: "recipes", id: "r-3", fields: { title: "Soup" } })
    pending.delete({ collection: "recipes", id: "r-2" })
    expect(pending.replayOn("recipes", rows).map(({ id }) => id)).toEqual(["r-1", "r-3"])
    expect(pending.replayOn("recipes", rows, { filter: { title: "Stew" } })).toEqual([])
    // the answer is shared:  what it holds isn't touched
    expect(rows).toHaveLength(2)
    pending.queue.done()
  })

  test("deleting what's unsent drops it;  deleting what was just added sends nothing", async () => {
    const { place, pending } = cookbook()
    pending.insert({ collection: "recipes", id: "r-3", fields: { title: "Pie" } })
    pending.setField({ collection: "recipes", id: "r-3", field: "serves", value: 3 })
    expect(pending.changes).toHaveLength(1)
    pending.delete({ collection: "recipes", id: "r-3" })
    expect(pending.hasPending).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(place.sent).toEqual([])
  })
})

describe("PendingChanges, a place that makes its own ids", () => {
  test("it's sent with no id, and what's pending follows the id the place chose", async () => {
    const { place, places, pending } = cookbook({ makesIds: true })
    const renames = vi.fn()
    places.onRows(({ renamed }) => renamed && renames(renamed))
    pending.insert({ collection: "recipes", type: "Recipe", id: "mine", fields: { title: "Pie" } })
    await pending.queue.save()
    expect(place.sent[0]![0]!.id).toBeUndefined()
    expect(place.sent[0]![0]!.fields).toEqual({ title: "Pie" })
    expect(renames).toHaveBeenCalledWith([{ from: "mine", to: "m-1" }])
    pending.setField({ collection: "recipes", id: "m-1", field: "title", value: "Tart" })
    await allSent(pending)
    expect((await kept(place, "m-1"))!.title).toBe("Tart")
  })
})
