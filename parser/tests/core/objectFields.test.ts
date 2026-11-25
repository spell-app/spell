/**
 * A field a place sends as an object of any keys, declared `its "meta" is an object`:  what ingest writes for a free-form
 * field.  Held whole:  every key, one row's own too, and everything inside;  and written back whole.
 * - The words that write it:  `tests/spell/ingest/PlaceSpecFreeForm.test.ts`.
 */
import { enableExternalSource, flush } from "solid-js"
import { beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core, Place, Thing } from "spell/parser/core"
import { MemoryPlace, type PlaceChange, type PlaceContext } from "spell/places"

/** A place in memory that keeps every change it's sent. */
class KeepingPlace extends MemoryPlace {
  sent: PlaceChange[] = []

  apply(changes: readonly PlaceChange[], context: PlaceContext) {
    this.sent.push(...changes)
    return super.apply(changes, context)
  }
}

/** A job as compiled spell writes `its "meta" is an object`, kept in `behind`. */
function program(behind: KeepingPlace) {
  core.resetRuntime()
  class Job extends Thing {
    static {
      this.declareProp("name", { type: "text" })
      this.declareProp("meta", { type: "Object" })
    }
    get name() {
      return this.getProp("name") as string | undefined
    }
    set name(value) {
      this.setProp("name", value)
    }
    get meta() {
      return this.getProp("meta") as Record<string, unknown> | undefined
    }
    set meta(value) {
      this.setProp("meta", value)
    }
    static savedIn = { place: "lab", collection: "jobs" }
  }
  class Lab extends Place {
    makePlace() {
      return behind
    }
  }
  core.place(new Lab(), { name: "lab" })
  return { Job }
}

/** A place holding `rows` of jobs. */
function holding(rows: Array<Record<string, unknown>>): KeepingPlace {
  const place = new KeepingPlace({ capabilities: { idOf: "id" } })
  void place.apply(
    rows.map((fields) => ({ kind: "insert", collection: "jobs", id: `${fields.id}`, fields })),
    {}
  )
  place.sent = []
  return place
}

beforeAll(() => bridgeSolid({ enableExternalSource, flush }))
beforeEach(() => core.resetRuntime())

describe("an object field", () => {
  test("holds each row's object whole:  its own keys, one the others lack, lists and objects inside", async () => {
    const { Job } = program(
      holding([
        { id: "1", name: "warm up", meta: { owner: "ada", runs: [1, 2] } },
        { id: "2", name: "cool down", meta: { owner: "bo", extra_key: true, deep: { a: { b: 1 } } } },
        { id: "3", name: "idle", meta: null }
      ])
    )
    const [one, two, three] = (await core.savedThings(Job)).items as Array<InstanceType<typeof Job>>
    expect(JSON.parse(JSON.stringify(one!.meta))).toEqual({ owner: "ada", runs: [1, 2] })
    expect(JSON.parse(JSON.stringify(two!.meta))).toEqual({ owner: "bo", extra_key: true, deep: { a: { b: 1 } } })
    expect(two!.meta!.owner).toBe("bo")
    expect(three!.meta).toBeUndefined()
  })

  test("written back whole, every key it holds", async () => {
    const place = holding([{ id: "1", name: "warm up", meta: { owner: "ada", deep: { a: 1 } } }])
    const { Job } = program(place)
    const [job] = (await core.savedThings(Job)).items as Array<InstanceType<typeof Job>>
    job!.meta = { owner: "cy", deep: { a: 2 }, added: "yes" }
    await vi.waitFor(() => expect(place.sent).toHaveLength(1), { timeout: 3000 })
    expect(place.sent[0]!.fields?.meta).toEqual({ owner: "cy", deep: { a: 2 }, added: "yes" })
  })
})
