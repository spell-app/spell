import { afterEach, describe, expect, test } from "vite-plus/test"

import { DatabasePlace, PrefStore } from "spell/util/persist"
import { DevicePlace, writeAnswerFor } from "spell/util/places"

/** The store these tests keep things in, on the browser's storage. */
const STORE = "DevicePlace-test"

afterEach(async () => {
  await new PrefStore(STORE).forgetAll()
})

describe("DevicePlace.list()", () => {
  test("reads back what preferences hold, each with its value as a preference reads", async () => {
    const prefs = new PrefStore(STORE)
    prefs.set("scheme", "dark")
    prefs.set("width", 30)
    prefs.set("open", { left: true })
    const { rows, handled } = await new DevicePlace().list(STORE, {}, {})
    // in whatever order the browser's storage lists them
    expect(rows.sort((one, other) => `${one.id}`.localeCompare(`${other.id}`))).toEqual([
      { id: "open", value: { left: true } },
      { id: "scheme", value: "dark" },
      { id: "width", value: 30 }
    ])
    expect(handled).toEqual({})
  })

  test("a store it holds nothing for is empty, and another store's keys stay out", async () => {
    new PrefStore(STORE).set("scheme", "dark")
    expect((await new DevicePlace().list("DevicePlace-test-other", {}, {})).rows).toEqual([])
  })

  test("reads a place that must be waited on", async () => {
    const store = `${STORE}-database`
    const prefPlace = new DatabasePlace({ name: "spell-prefs-test-device" })
    await prefPlace.save(store, "scheme", "dark")
    const place = new DevicePlace({ prefPlace })
    expect((await place.list(store, {}, {})).rows).toEqual([{ id: "scheme", value: "dark" }])
    await prefPlace.removeUnder(store, "")
  })
})

describe("DevicePlace.getMany()", () => {
  test("answers the keys that hold something", async () => {
    new PrefStore(STORE).set("scheme", "dark")
    expect(await new DevicePlace().getMany(STORE, ["scheme", "nope"], {})).toEqual([{ id: "scheme", value: "dark" }])
  })
})

describe("DevicePlace.apply()", () => {
  test("what it writes, preferences read;  what it deletes, they forget", async () => {
    const place = new DevicePlace()
    const prefs = new PrefStore(STORE)
    const { rows } = await place.apply(
      [{ kind: "insert", collection: STORE, id: "scheme", fields: { value: "dark" } }],
      {}
    )
    expect(rows).toEqual([{ id: "scheme", value: "dark" }])
    expect(prefs.get("scheme")).toBe("dark")
    await place.apply([{ kind: "delete", collection: STORE, id: "scheme" }], {})
    expect(prefs.has("scheme")).toBe(false)
  })

  test("a caller's mistakes throw", async () => {
    const place = new DevicePlace()
    await expect(place.apply([{ kind: "update", collection: STORE, fields: { value: 1 } }], {})).rejects.toThrow(
      /needs an id/
    )
    await expect(place.apply([{ kind: "update", collection: STORE, id: "scheme" }], {})).rejects.toThrow(
      /needs a `value`/
    )
  })
})

describe("DevicePlace.describe()", () => {
  test("says it handles nothing clever, and takes writes", () => {
    const place = new DevicePlace()
    expect(place.describe()).toMatchObject({ idOf: "id", filter: "none", page: "none", abort: "soft" })
    expect(writeAnswerFor(place, { collection: STORE })).toEqual({ canWrite: true })
  })
})
