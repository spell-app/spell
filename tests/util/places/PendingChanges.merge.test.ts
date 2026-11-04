import { describe, expect, test, vi } from "vite-plus/test"

import { MemoryPlace, PlaceError, Places, type PlaceConflict, type PlaceWriteFailure } from "spell/util/places"

/** One recipe, in a place that checks versions, read once, with the changes pending for it. */
async function cookbook() {
  const place = new MemoryPlace({ collections: { recipes: [{ id: "r-1", title: "Soup", serves: 2 }] } })
  const places = new Places({ wait: 0, retry: 1 }).add("cookbook", place)
  const pending = places.pendingFor("cookbook")
  const conflicts: PlaceConflict[] = []
  const failures: PlaceWriteFailure[] = []
  places.onConflict((conflict) => conflicts.push(conflict))
  places.onWriteFailed((failure) => failures.push(failure))
  await place.list("recipes", {}, {})
  const someoneElse = (fields: object) =>
    place.applyFromElsewhere([{ kind: "update", collection: "recipes", id: "r-1", fields: { ...fields } }])
  const allSent = () => vi.waitFor(() => expect(pending.hasPending).toBe(false))
  return { place, places, pending, conflicts, failures, someoneElse, allSent }
}

/** A write of `title`. */
const title = (value: string, was: string) => ({ collection: "recipes", id: "r-1", field: "title", value, was })

describe("PendingChanges, out of date", () => {
  test("a change says the version it was made from", async () => {
    const { pending, place } = await cookbook()
    pending.setField(title("Stew", "Soup"))
    expect(pending.changes[0]!.version).toBe(place.versionOf("recipes", "r-1"))
  })

  test("a typed-over change keeps the version the first was made from", async () => {
    const { pending, someoneElse, place } = await cookbook()
    const version = place.versionOf("recipes", "r-1")
    pending.setField(title("St", "Soup"))
    await someoneElse({ serves: 3 })
    await place.list("recipes", {}, {})
    pending.setField(title("Stew", "St"))
    expect(pending.changes).toMatchObject([{ version, was: "Soup" }])
  })

  test("another field moved on:  merged, with no notice, and what they wrote shows", async () => {
    const { pending, places, someoneElse, place, conflicts, failures, allSent } = await cookbook()
    const shown: object[] = []
    places.onRows(({ rows }) => shown.push(...rows))
    await someoneElse({ serves: 3 })
    pending.setField(title("Stew", "Soup"))
    await allSent()
    expect((await place.list("recipes", {}, {})).rows[0]).toEqual({ id: "r-1", title: "Stew", serves: 3 })
    expect(shown).toContainEqual({ id: "r-1", title: "Stew", serves: 3 })
    expect(conflicts).toEqual([])
    expect(failures).toEqual([])
  })

  test("the same field moved on:  mine wins, and the one notice holds what's lost", async () => {
    const { pending, someoneElse, place, conflicts, failures, allSent } = await cookbook()
    await someoneElse({ title: "Theirs" })
    pending.setField(title("Stew", "Soup"))
    await allSent()
    expect((await place.list("recipes", {}, {})).rows[0]).toMatchObject({ title: "Stew" })
    expect(conflicts).toMatchObject([{ field: "title", was: "Soup", mine: "Stew", theirs: "Theirs" }])
    expect(failures).toEqual([])
  })

  test("a group, on a place that does all or nothing, merges whole", async () => {
    const { pending, someoneElse, place, conflicts, failures, allSent } = await cookbook()
    await someoneElse({ title: "Theirs" })
    const group = pending.startGroup()
    pending.setField({ ...title("Stew", "Soup"), group: group.number })
    pending.setField({ collection: "recipes", id: "r-1", field: "serves", value: 5, was: 2, group: group.number })
    group.end()
    await allSent()
    expect((await place.list("recipes", {}, {})).rows[0]).toEqual({ id: "r-1", title: "Stew", serves: 5 })
    expect(conflicts).toMatchObject([{ field: "title", theirs: "Theirs" }])
    expect(failures).toEqual([])
  })

  test("a place that keeps moving on:  after a few merges it ends as a refusal, not a loop", async () => {
    const { pending, place, failures, conflicts, allSent } = await cookbook()
    const sent = vi
      .spyOn(place, "apply")
      .mockRejectedValue(new PlaceError("moved on", { cause: { kind: "out of date" } }))
    pending.setField(title("Stew", "Soup"))
    await allSent()
    expect(sent).toHaveBeenCalledTimes(4)
    expect(failures).toMatchObject([{ error: { kind: "out of date" } }])
    expect(conflicts).toEqual([])
  })

  test("a place with no version check takes what it's given:  the last write wins", async () => {
    const place = new MemoryPlace({
      capabilities: { versionCheck: false },
      collections: { recipes: [{ id: "r-1", title: "Soup" }] }
    })
    const places = new Places({ wait: 0 }).add("cookbook", place)
    const pending = places.pendingFor("cookbook")
    await place.list("recipes", {}, {})
    await place.applyFromElsewhere([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Theirs" } }])
    pending.setField(title("Stew", "Soup"))
    await vi.waitFor(() => expect(pending.hasPending).toBe(false))
    expect((await place.list("recipes", {}, {})).rows[0]).toMatchObject({ title: "Stew" })
  })
})
