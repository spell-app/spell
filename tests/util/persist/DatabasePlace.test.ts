import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { DatabasePlace, PrefStore } from "spell/util/persist"

/** The test's own database:  the site's `spell-prefs` stays out of it. */
const NAME = "spell-prefs-test"
const place = new DatabasePlace({ name: NAME })

afterAll(async () => {
  await place.removeUnder("db-test", "")
  await place.removeUnder("db-test-other", "")
})

////////////////
// ## Values
////////////////

describe("DatabasePlace", () => {
  test("keeps values as the browser copies them:  a `Blob`, a `Date`, a `Map` come back as they went in", async () => {
    const prefs = new PrefStore("db-test", { place })
    const blob = new Blob(["a whole file"], { type: "text/plain" })
    const when = new Date("2026-10-24T12:00:00Z")
    await prefs.save("file", blob)
    await prefs.save("when", when)
    await prefs.save("layout", new Map([["left", 30]]))
    const file = await prefs.load<Blob>("file")
    expect(file).toBeInstanceOf(Blob)
    expect(await file!.text()).toBe("a whole file")
    expect(await prefs.load("when")).toEqual(when)
    expect(await prefs.load("layout")).toEqual(new Map([["left", 30]]))
  })

  test("keeps a big value:  a 10 MB string", async () => {
    const prefs = new PrefStore("db-test", { place })
    const big = "x".repeat(10 * 1024 * 1024)
    await prefs.save("big", big)
    expect((await prefs.load<string>("big"))?.length).toBe(big.length)
    await prefs.save("big", undefined)
    expect(await prefs.load("big")).toBeUndefined()
  })

  test("a waited-on read WAITS:  nothing kept answers the default, not a promise", async () => {
    const prefs = new PrefStore("db-test", { place }).declare("scheme", { oneOf: ["light", "dark"] })
    expect(await prefs.load("scheme")).toBe("light")
    expect(await prefs.load("nothing", 7)).toBe(7)
  })

  test("lists a store's keys, without its name, and NEVER another store's", async () => {
    const prefs = new PrefStore("db-test", { place })
    const other = new PrefStore("db-test-other", { place })
    await prefs.save("layout/left", 30)
    await prefs.save("layout/right", 70)
    await other.save("layout/left", 1)
    expect((await prefs.loadKeysUnder("layout/")).sort()).toEqual(["layout/left", "layout/right"])
    await prefs.forgetUnder("layout/")
    expect(await prefs.loadKeysUnder("layout/")).toEqual([])
    expect(await other.loadKeysUnder()).toEqual(["layout/left"])
  })

  test("refuses a quick read, naming `load()`", () => {
    const prefs = new PrefStore("db-test", { place })
    expect(() => prefs.get("scheme")).toThrow(/the browser's database, which must be waited on;  use `load\(\)`/)
  })

  test("a quick `set()` saves later, without waiting", async () => {
    const prefs = new PrefStore("db-test", { place })
    prefs.set("quick", "later")
    await vi.waitFor(async () => expect(await prefs.load("quick")).toBe("later"))
  })
})

////////////////
// ## One step
////////////////

describe("DatabasePlace.update()", () => {
  test("reads, changes and saves in ONE transaction:  two at once never read the same value", async () => {
    const prefs = new PrefStore("db-test", { place }).declare("visits", { type: "number" })
    const results = await Promise.all([
      prefs.update<number>("visits", (visits) => visits + 1),
      prefs.update<number>("visits", (visits) => visits + 1),
      // as another tab would:  past this page's store, straight to the database
      place.update("db-test", "visits", (visits) => ((visits as number | undefined) ?? 0) + 1)
    ])
    expect(results.sort()).toEqual([1, 2, 3])
    expect(await prefs.load("visits")).toBe(3)
  })

  test("a value its declaration doesn't allow throws, and NOTHING is saved", async () => {
    const prefs = new PrefStore("db-test", { place }).declare("mode", { oneOf: ["edit", "debug"] })
    await prefs.save("mode", "debug")
    await expect(prefs.update("mode", () => "run")).rejects.toThrow("`mode` is one of edit, debug;  not `run`")
    expect(await prefs.load("mode")).toBe("debug")
  })
})

////////////////
// ## No database
////////////////

describe("DatabasePlace, with no database", () => {
  test("keeps values in memory for the visit", async () => {
    const memory = new DatabasePlace({ name: "none", indexedDB: undefined })
    vi.spyOn(memory as unknown as { findDatabases: () => undefined }, "findDatabases").mockReturnValue(undefined)
    const prefs = new PrefStore("db-test", { place: memory })
    await prefs.save("theme", "dark")
    expect(await prefs.load("theme")).toBe("dark")
    expect(await prefs.loadKeysUnder()).toEqual(["theme"])
    expect(await prefs.update("count", () => 1)).toBe(1)
  })

  test("a database the browser refuses:  memory too, said once", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const refusing = new DatabasePlace({ name: "refused", indexedDB: refusingDatabases() })
    const prefs = new PrefStore("db-test", { place: refusing })
    await prefs.save("theme", "dark")
    expect(await prefs.load("theme")).toBe("dark")
    expect(errors.mock.calls[0][0]).toMatch(/refused its database, `refused`;  keeping values in memory/)
    errors.mockRestore()
  })
})

////////////////
// ## Helpers
////////////////

/** Databases whose every `open()` fails, as a browser that refuses them answers. */
function refusingDatabases(): IDBFactory {
  return {
    open() {
      throw new DOMException("The operation is insecure.", "SecurityError")
    }
  } as unknown as IDBFactory
}
