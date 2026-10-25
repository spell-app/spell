import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { MemoryStorage, PrefPlace, PrefStore, StoragePlace, type StorageLike } from "spell/util/persist"

/** Every store a test made on the browser's storage, forgotten after it. */
const made: PrefStore[] = []

afterEach(async () => {
  await Promise.all(made.splice(0).map((store) => store.forgetAll()))
  vi.restoreAllMocks()
})

////////////////
// ## Keys and values
////////////////

describe("PrefStore", () => {
  test("keeps each key under its name and a colon, in the browser's storage", () => {
    const prefs = store("PrefStore-test-site")
    prefs.set("scheme", "dark")
    expect(localStorage.getItem("PrefStore-test-site:scheme")).toBe("dark")
    expect(prefs.get("scheme")).toBe("dark")
  })

  test("reads a key a plain script wrote, byte for byte", () => {
    localStorage.setItem("PrefStore-test-raw:scheme", "light")
    localStorage.setItem("PrefStore-test-raw:open", '["a","b"]')
    const prefs = store("PrefStore-test-raw")
    expect(prefs.get("scheme")).toBe("light")
    expect(prefs.get("open")).toEqual(["a", "b"])
  })

  test('keeps values people can read:  a number as `1`, a string `"1"` quoted', () => {
    const prefs = store("PrefStore-test-values")
    prefs.set("count", 1)
    prefs.set("label", "1")
    prefs.set("layout", { left: 30 })
    expect(localStorage.getItem("PrefStore-test-values:count")).toBe("1")
    expect(localStorage.getItem("PrefStore-test-values:label")).toBe('"1"')
    expect(localStorage.getItem("PrefStore-test-values:layout")).toBe('{"left":30}')
    expect(prefs.get("count")).toBe(1)
    expect(prefs.get("label")).toBe("1")
    expect(prefs.get("layout")).toEqual({ left: 30 })
  })

  test("`set(key, undefined)` and `forget()` forget the key", () => {
    const prefs = store("PrefStore-test-forget")
    prefs.set("a", 1)
    prefs.set("a", undefined)
    expect(prefs.has("a")).toBe(false)
    prefs.set("b", 2)
    prefs.forget("b")
    expect(localStorage.getItem("PrefStore-test-forget:b")).toBeNull()
  })

  test("answers `fallback` while nothing's kept", () => {
    const prefs = store("PrefStore-test-fallback")
    expect(prefs.get("width")).toBeUndefined()
    expect(prefs.get("width", 250)).toBe(250)
  })

  test("NEVER shares a value with another store, even one whose name starts the same", () => {
    const site = store("PrefStore-test-app")
    const other = store("PrefStore-test-app2")
    site.set("theme", "dark")
    expect(other.get("theme")).toBeUndefined()
    // a quick place has forgotten them when it returns:  no wait
    void other.forgetAll()
    expect(site.get("theme")).toBe("dark")
  })

  test("throws `TypeError` for a store name with a colon, or no key", () => {
    expect(() => new PrefStore("a:b")).toThrow(/no colon/)
    expect(() => new PrefStore("")).toThrow(TypeError)
    expect(() => store("PrefStore-test-key").get("")).toThrow(/no key/)
  })
})

////////////////
// ## Declared prefs
////////////////

describe("PrefStore.declare()", () => {
  test("a pref's default is its first choice, until set", () => {
    const prefs = store("PrefStore-test-declared").declare("scheme", { oneOf: ["light", "dark", "auto"] })
    expect(prefs.get("scheme")).toBe("light")
    prefs.set("scheme", "auto")
    expect(prefs.get("scheme")).toBe("auto")
  })

  test("a declared `default` wins over the first choice;  a passed fallback wins over both", () => {
    const prefs = store("PrefStore-test-default").declare("scheme", {
      oneOf: ["light", "dark", "auto"],
      default: "auto"
    })
    expect(prefs.get("scheme")).toBe("auto")
    expect(prefs.defaultFor("scheme")).toBe("auto")
    expect(prefs.get("scheme", "dark")).toBe("dark")
  })

  test('a type\'s default:  0, "" or false', () => {
    const prefs = store("PrefStore-test-types")
      .declare("count", { type: "number" })
      .declare("title", { type: "text" })
      .declare("lineNumbers", { type: "choice" })
    expect([prefs.get("count"), prefs.get("title"), prefs.get("lineNumbers")]).toEqual([0, "", false])
  })

  test("a kept value its declaration doesn't allow reads as the default, logged", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined)
    localStorage.setItem("PrefStore-test-stale:scheme", "purple")
    const prefs = store("PrefStore-test-stale").declare("scheme", { oneOf: ["light", "dark"] })
    expect(prefs.get("scheme")).toBe("light")
    expect(errors).toHaveBeenCalledOnce()
  })

  test("throws `TypeError` for a value its declaration doesn't allow", () => {
    const prefs = store("PrefStore-test-refuse").declare("scheme", { oneOf: ["light", "dark"] })
    expect(() => prefs.set("scheme", "purple")).toThrow("`scheme` is one of light, dark;  not `purple`")
    expect(prefs.has("scheme")).toBe(false)
  })
})

////////////////
// ## Keys as folders
////////////////

describe("PrefStore.keysUnder() / forgetUnder() / forgetAll() / rename()", () => {
  test("lists and forgets the keys under a prefix, as a folder", () => {
    const prefs = store("PrefStore-test-folders")
    prefs.set("layout/left", 30)
    prefs.set("layout/right", 70)
    prefs.set("theme", "dark")
    expect(prefs.keysUnder("layout/").sort()).toEqual(["layout/left", "layout/right"])
    expect(prefs.keysUnder().sort()).toEqual(["layout/left", "layout/right", "theme"])
    void prefs.forgetUnder("layout/")
    expect(prefs.keysUnder()).toEqual(["theme"])
  })

  test("`forgetAll()` forgets ONLY its own keys", () => {
    localStorage.setItem("PrefStore-test-neighbour:theme", "dark")
    const prefs = store("PrefStore-test-all")
    prefs.set("a", 1)
    void prefs.forgetAll()
    expect(prefs.keysUnder()).toEqual([])
    expect(localStorage.getItem("PrefStore-test-neighbour:theme")).toBe("dark")
    localStorage.removeItem("PrefStore-test-neighbour:theme")
  })

  test("`rename()` moves a value to its new key once, and forgets the old", () => {
    const prefs = store("PrefStore-test-rename")
    prefs.set("spellEditor.mode", "debug")
    prefs.rename("spellEditor.mode", "mode").rename("spellEditor.mode", "mode")
    expect(prefs.get("mode")).toBe("debug")
    expect(prefs.has("spellEditor.mode")).toBe(false)
  })

  test("`rename()` keeps a value already under the new key", () => {
    const prefs = store("PrefStore-test-rename-kept")
    prefs.set("old", "a")
    prefs.set("new", "b")
    prefs.rename("old", "new")
    expect(prefs.get("new")).toBe("b")
    expect(prefs.has("old")).toBe(false)
  })
})

////////////////
// ## When storage fails
////////////////

describe("PrefStore, when storage fails", () => {
  test("blocked storage:  keeps values in memory for the visit, and says so ONCE", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const blocked = new StoragePlace({
      storage: () => {
        throw new DOMException("The operation is insecure.", "SecurityError")
      },
      description: "the blocked storage"
    })
    const prefs = new PrefStore("blocked", { place: blocked })
    prefs.set("theme", "dark")
    expect(prefs.get("theme")).toBe("dark")
    prefs.set("width", 3)
    expect(errors.mock.calls[0][0]).toMatch(/blocked;  keeping its values in memory/)
    expect(errors).toHaveBeenCalledTimes(2)
  })

  test("full storage:  NEVER throws, logs, and answers the default", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const prefs = new PrefStore("full", {
      place: new StoragePlace({ storage: new FullStorage(), description: "full" })
    })
    expect(prefs.set("draft", "a long draft")).toBe("a long draft")
    expect(prefs.get("draft", "")).toBe("")
    expect(errors.mock.calls[0][0]).toMatch(/StoragePlace.write\(\):  full refused `full:draft`/)
  })

  test("a value it can't read:  answers the default, logged", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const storage = new MemoryStorage()
    storage.setItem("broken:layout", "{oops")
    const prefs = new PrefStore("broken", { place: new StoragePlace({ storage, description: "test storage" }) })
    expect(prefs.get("layout", { left: 50 })).toEqual({ left: 50 })
    expect(errors).toHaveBeenCalled()
  })

  test("`memory`:  each store's values are its own", () => {
    const one = new PrefStore("request", { place: "memory" })
    const two = new PrefStore("request", { place: "memory" })
    one.set("person", "owen")
    expect(two.get("person")).toBeUndefined()
  })
})

////////////////
// ## Waited on
////////////////

describe("PrefStore, waited on", () => {
  test("`load()` / `save()` / `loadKeysUnder()` work on a quick place too", async () => {
    const prefs = store("PrefStore-test-waited")
    await prefs.save("theme", "dark")
    expect(await prefs.load("theme")).toBe("dark")
    expect(await prefs.loadKeysUnder()).toEqual(["theme"])
  })

  test("a waited-on place refuses a quick read, naming `load()`", () => {
    const prefs = new PrefStore("slow", { place: new WaitedOnPlace() })
    expect(() => prefs.get("theme")).toThrow(/must be waited on;  use `load\(\)`/)
    expect(() => prefs.keysUnder()).toThrow(TypeError)
  })

  test("a waited-on place loads and saves, defaults included", async () => {
    const prefs = new PrefStore("slow", { place: new WaitedOnPlace() }).declare("scheme", { oneOf: ["light", "dark"] })
    expect(await prefs.load("scheme")).toBe("light")
    await prefs.save("scheme", "dark")
    expect(await prefs.load("scheme")).toBe("dark")
    await prefs.save("scheme", undefined)
    expect(await prefs.loadKeysUnder()).toEqual([])
  })

  test("`update()` reads, changes and saves as ONE step:  two at once never read the same value", async () => {
    const prefs = new PrefStore("slow", { place: new WaitedOnPlace() }).declare("visits", { type: "number" })
    const [first, second] = await Promise.all([
      prefs.update<number>("visits", (visits) => visits + 1),
      prefs.update<number>("visits", (visits) => visits + 1)
    ])
    expect([first, second]).toEqual([1, 2])
    expect(await prefs.load("visits")).toBe(2)
  })
})

////////////////
// ## Helpers
////////////////

/** A store on the browser's storage, forgotten after the test. */
function store(name: string): PrefStore {
  const prefs = new PrefStore(name)
  made.push(prefs)
  return prefs
}

/** A storage that's always full:  every write throws, as the browser's does. */
class FullStorage extends MemoryStorage implements StorageLike {
  override setItem(): void {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError")
  }
}

/** A place that must be waited on, as the database and the server are:  memory, a turn later. */
class WaitedOnPlace extends PrefPlace {
  readonly isAsync = true
  readonly description = "a slow place"
  private values = new Map<string, unknown>()

  read(): unknown {
    throw new Error("WaitedOnPlace.read():  PrefStore should have refused a quick read")
  }
  write(store: string, key: string, value: unknown): void {
    void this.save(store, key, value)
  }
  remove(store: string, key: string): void {
    void this.save(store, key, undefined)
  }
  keys(): string[] {
    throw new Error("WaitedOnPlace.keys():  PrefStore should have refused a quick read")
  }

  override async load(store: string, key: string): Promise<unknown> {
    await Promise.resolve()
    return this.values.get(`${store}:${key}`)
  }
  override async save(store: string, key: string, value: unknown): Promise<void> {
    await Promise.resolve()
    if (value === undefined) this.values.delete(`${store}:${key}`)
    else this.values.set(`${store}:${key}`, value)
  }
  override async loadKeys(store: string): Promise<string[]> {
    await Promise.resolve()
    return [...this.values.keys()]
      .filter((key) => key.startsWith(`${store}:`))
      .map((key) => key.slice(store.length + 1))
  }
}
