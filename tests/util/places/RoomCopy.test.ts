import { describe, expect, test } from "vite-plus/test"

import { PlaceError, RoomCopy, rowForStore, withListEdits, type PlaceChange } from "spell/util/places"

const update = (id: string, rest: Partial<PlaceChange>): PlaceChange => ({
  kind: "update",
  collection: "c",
  id,
  ...rest
})

describe("RoomCopy", () => {
  test("a set, an addition, a list edit, an insert and a delete", () => {
    const copy = new RoomCopy({ c: [{ id: "a", n: 1, tags: [] }] })
    copy.commit(
      copy.plan([
        update("a", { fields: { title: "T" }, adds: { n: 2 }, list: { tags: [{ key: '"x"', at: "h", item: "x" }] } }),
        { kind: "insert", collection: "c", id: "b", fields: { n: 5 } },
        { kind: "delete", collection: "c", id: "gone" }
      ])
    )
    expect(copy.rowFor("c", "a")).toMatchObject({ title: "T", n: 3, tags: ["x"] })
    expect(copy.rowFor("c", "b")).toEqual({ id: "b", n: 5 })
  })

  test("a batch is all or none:  an update to what's gone throws, and changes nothing", () => {
    const copy = new RoomCopy({ c: [{ id: "a", n: 1 }] })
    let error: unknown
    try {
      copy.plan([update("a", { fields: { n: 2 } }), update("gone", { fields: { n: 2 } })])
    } catch (thrown) {
      error = thrown
    }
    expect(error).toBeInstanceOf(PlaceError)
    expect((error as PlaceError).kind).toBe("not found")
    expect(copy.rowFor("c", "a")).toEqual({ id: "a", n: 1 })
  })

  test("a later change in a batch sees what an earlier one made", () => {
    const copy = new RoomCopy()
    copy.commit(
      copy.plan([{ kind: "insert", collection: "c", id: "a", fields: { n: 1 } }, update("a", { adds: { n: 1 } })])
    )
    expect(copy.rowFor("c", "a")).toEqual({ id: "a", n: 2 })
  })

  test("its checksum says the same for the same rows, whatever the order, and differently for different ones", () => {
    const one = new RoomCopy({ c: [{ id: "a", x: 1, y: 2 }, { id: "b" }] })
    const other = new RoomCopy({ c: [{ id: "b" }, { y: 2, x: 1, id: "a" }] })
    expect(one.checksum).toBe(other.checksum)
    other.commit(other.plan([update("b", { fields: { z: 1 } })]))
    expect(one.checksum).not.toBe(other.checksum)
  })

  test("hands out copies", () => {
    const copy = new RoomCopy({ c: [{ id: "a", n: 1 }] })
    copy.rowFor("c", "a")!.n = 99
    copy.rowsOf("c")[0]!.n = 99
    expect(copy.rowFor("c", "a")!.n).toBe(1)
  })

  test("a store gets a row with no positions", () => {
    const row = withListEdits({ id: "a", tags: [] }, "tags", [{ key: '"x"', at: "h", item: "x" }])
    expect(rowForStore(row)).toEqual({ id: "a", tags: ["x"] })
  })
})
