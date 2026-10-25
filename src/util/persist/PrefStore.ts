import type { PrefPlaceName, ValueInfo } from "./persist.types"
import { MemoryStorage } from "./MemoryStorage"
import { PrefPlace } from "./PrefPlace"
import { StoragePlace } from "./StoragePlace"
import { choicesOf, defaultFor, isAllowed } from "./values"

/****************
 * ### `PrefStore`
 * The preferences one app keeps for each person:  a theme, a panel's width, the last folder opened.
 * - ONE per app, named for it:  every key it writes starts with its name and a colon.
 *   - e.g. `new PrefStore("spell-site")` keeps `scheme` at `spell-site:scheme`
 *   - So two apps on one site never share a value, and `forgetAll()` forgets only its own.
 * - It always asks the same way;  WHERE it keeps them is its place's business (`PrefStoreOptions.place`):
 *   - the browser's storage, unless it says otherwise
 *   - per tab, or memory, by name (`session`, `memory`)
 *   - the browser's database or the page server, waited on (`DatabasePlace.shared`, `ServerPlace.shared`)
 * - In the browser's storage, values are text people and plain scripts can read:  `dark`, `1`, `{"open":true}`
 *   (`textForValue()`);  the browser's database keeps them as they are, a server as JSON.
 * - A pref may be declared, with its type, choices and default (`declare()`):
 *   `get()` then answers its default while nothing's kept, and refuses to keep what it doesn't allow.
 * - Quick (`get()`, `set()` ...) and waited on (`load()`, `save()`, `update()`):
 *   a place that must be waited on refuses a quick read, and does a quick write later.
 * - NEVER throws when storage fails (blocked, full, a value it can't read):  it logs, and answers the default.
 *   - It throws `TypeError` for a caller's mistake:  a store name with a colon, no key, a value its declaration
 *     doesn't allow, a quick read of a waited-on place.
 * - Generic, in the kit's util:  nothing spell-specific, and nothing imported from outside this folder,
 *   so Spell UI uses it too.
 ****************/
export class PrefStore {
  /** Its name:  the start of every key it writes, before the colon. */
  readonly name: string
  /** Where it keeps its values. */
  readonly place: PrefPlace

  /**
   * A store named `name`, keeping its values in `place`.
   * - throws `TypeError` for an empty name, or one with a colon
   */
  constructor(name: string, { place = "local" }: PrefStoreOptions = {}) {
    if (!name || name.includes(":")) {
      throw new TypeError(
        `new PrefStore():  \`${name}\` can't name a store;  give it a name with no colon, e.g. "spell-site"`
      )
    }
    this.name = name
    this.place = placeFor(place)
  }

  ////////////////
  // ## Declaring
  ////////////////

  /**
   * Declare pref `key`:  its type, its choices, its default.  Returns this store.
   * - e.g. `prefs.declare("scheme", { oneOf: ["light", "dark", "auto"] })`:  `get("scheme")` is `"light"` until set
   * - Its default:  `defaultFor()` -- its `default`, else its first choice, else its type's (`0`, `""`, `false`).
   */
  declare(key: string, info: ValueInfo): this {
    this.checkKey("declare", key)
    this.declared.set(key, info)
    return this
  }

  /** What `key` reads as while nothing's kept:  its declared default, or `undefined`. */
  defaultFor(key: string): unknown {
    return defaultFor(this.declared.get(key))
  }

  ////////////////
  // ## Quick
  ////////////////

  /**
   * Does it keep a value under `key`?
   * - throws `TypeError` when its place must be waited on
   */
  has(key: string): boolean {
    this.checkQuickRead("has", key)
    return this.place.read(this.name, key) !== undefined
  }

  /**
   * The value kept under `key`, else `fallback`, else its declared default.
   * - A kept value its declaration doesn't allow reads as the default, logged.
   * - throws `TypeError` when its place must be waited on:  use `load()`
   */
  get<T = unknown>(key: string): T | undefined
  get<T>(key: string, fallback: T): T
  get(key: string, fallback?: unknown): unknown {
    this.checkQuickRead("get", key)
    return this.keptOrDefault("get", key, this.place.read(this.name, key), fallback)
  }

  /**
   * Keep `value` under `key`;  `undefined` forgets it.  Returns `value`.
   * - A place that must be waited on keeps it later:  a failure is logged.
   * - throws `TypeError` for a value its declaration doesn't allow, or one it can't keep (a function ...)
   */
  set<T>(key: string, value: T): T {
    this.checkWrite("set", key, value)
    if (value === undefined) this.place.remove(this.name, key)
    else this.place.write(this.name, key, value)
    return value
  }

  /** Forget the value under `key`. */
  forget(key: string): void {
    this.set(key, undefined)
  }

  /**
   * Every key it keeps that starts with `prefix`:  keys with a shared start act like a folder (`layout/`).
   * - throws `TypeError` when its place must be waited on:  use `loadKeysUnder()`
   */
  keysUnder(prefix = ""): string[] {
    this.checkQuickRead("keysUnder")
    return this.place.keys(this.name).filter((key) => key.startsWith(prefix))
  }

  /**
   * Forget every key that starts with `prefix`.
   * - A quick place has forgotten them when it returns;  the promise says when a waited-on one has.
   */
  forgetUnder(prefix: string): Promise<void> {
    return this.place.removeUnder(this.name, prefix)
  }

  /** Forget every key it keeps, and no other store's:  as `forgetUnder("")`. */
  forgetAll(): Promise<void> {
    return this.forgetUnder("")
  }

  /**
   * Move the value kept under `oldKey` to `newKey`, when a pref is renamed.  Returns this store.
   * - Only when `newKey` keeps none yet;  `oldKey` is forgotten either way.
   * - Nothing kept under `oldKey`:  nothing happens.  So it's safe to call on every start.
   * - throws `TypeError` when its place must be waited on
   */
  rename(oldKey: string, newKey: string): this {
    this.checkQuickRead("rename", oldKey)
    this.checkKey("rename", newKey)
    const value = this.place.read(this.name, oldKey)
    if (value === undefined) return this
    if (this.place.read(this.name, newKey) === undefined) this.place.write(this.name, newKey, value)
    this.place.remove(this.name, oldKey)
    return this
  }

  ////////////////
  // ## Waited on
  ////////////////

  /** `get()`, waited on:  for every place. */
  async load<T = unknown>(key: string, fallback?: T): Promise<T | undefined> {
    this.checkKey("load", key)
    return this.keptOrDefault("load", key, await this.place.load(this.name, key), fallback) as T | undefined
  }

  /** `set()`, waited on:  for every place.  Returns `value`. */
  async save<T>(key: string, value: T): Promise<T> {
    this.checkWrite("save", key, value)
    await this.place.save(this.name, key, value)
    return value
  }

  /**
   * Read, change and save `key`'s value as one step:  `change` gets the value (`load()`'s), and answers the new one.
   * - One at a time for each key in this page;  the browser's database also keeps other tabs out, in one transaction.
   * - Returns the new value.
   * - throws `TypeError` for a new value its declaration doesn't allow:  nothing is saved
   */
  update<T>(key: string, change: (value: T) => T): Promise<T> {
    this.checkKey("update", key)
    const before = this.updating.get(key) ?? Promise.resolve()
    const after = before.then(
      async () =>
        (await this.place.update(this.name, key, (kept) => {
          const value = change(this.keptOrDefault("update", key, kept, undefined) as T)
          this.checkWrite("update", key, value)
          return value
        })) as T
    )
    const settled = after.then(
      () => undefined,
      () => undefined
    )
    this.updating.set(key, settled)
    void settled.then(() => {
      if (this.updating.get(key) === settled) this.updating.delete(key)
    })
    return after
  }

  /** `keysUnder()`, waited on:  for every place. */
  async loadKeysUnder(prefix = ""): Promise<string[]> {
    return (await this.place.loadKeys(this.name)).filter((key) => key.startsWith(prefix))
  }

  ////////////////
  // ## Checks
  ////////////////

  /** `kept` when there is one its declaration allows, else `fallback`, else `key`'s default. */
  private keptOrDefault(method: string, key: string, kept: unknown, fallback: unknown): unknown {
    const info = this.declared.get(key)
    if (kept !== undefined) {
      if (isAllowed(info, kept)) return kept
      console.error(
        `PrefStore.${method}():  \`${this.name}:${key}\` isn't ${allowedText(info)};  answering its default:`,
        kept
      )
    }
    return fallback !== undefined ? fallback : defaultFor(info)
  }

  /** Throws `TypeError` for no `key`. */
  private checkKey(method: string, key: string): void {
    if (!key) throw new TypeError(`PrefStore.${method}():  no key;  pass the pref's name, e.g. "scheme"`)
  }

  /** Throws `TypeError` for no `key`, or a place that must be waited on. */
  private checkQuickRead(method: string, key?: string): void {
    if (key !== undefined) this.checkKey(method, key)
    if (!this.place.isAsync) return
    throw new TypeError(
      `PrefStore.${method}():  \`${this.name}\` keeps its values in ${this.place.description}, which must be waited on;  ` +
        "use `load()` or `loadKeysUnder()`"
    )
  }

  /** Throws `TypeError` for no `key`, or a `value` its declaration doesn't allow. */
  private checkWrite(method: string, key: string, value: unknown): void {
    this.checkKey(method, key)
    const info = this.declared.get(key)
    if (value === undefined || isAllowed(info, value)) return
    throw new TypeError(`PrefStore.${method}():  \`${key}\` is ${allowedText(info)};  not \`${shown(value)}\``)
  }

  /** Each declared pref's declaration, by key. */
  private declared = new Map<string, ValueInfo>()

  /** The update under way for each key:  see `update()`. */
  private updating = new Map<string, Promise<void>>()
}

/** Options for a `PrefStore`. */
export type PrefStoreOptions = {
  /**
   * Where it keeps its values:  a place's name (`PrefPlaceNames`), or a place itself (a `StoragePlace` over a test's
   * storage ...).
   * - Default `local`:  the browser's lasting storage.
   */
  place?: PrefPlaceName | PrefPlace
}

////////////////
// ## Places by name
////////////////

/** What each place the page shares is, by name:  made on first use, see `placeFor()`. */
const SHARED_PLACES = {
  local: { storage: () => globalThis.localStorage, description: "the browser's storage" },
  session: { storage: () => globalThis.sessionStorage, description: "the browser's per-tab storage" }
} as const

/** The place each name has made, so every store on the page shares one. */
const sharedPlaces = new Map<PrefPlaceName, PrefPlace>()

/**
 * The place `place` names, or `place` itself.
 * - `local` and `session`:  ONE for the page, shared by every store.
 * - `memory`:  a new one each time, so a store's values are its own (a server's request, a test).
 */
function placeFor(place: PrefPlaceName | PrefPlace): PrefPlace {
  if (place instanceof PrefPlace) return place
  if (place === "memory") return new StoragePlace({ storage: new MemoryStorage(), description: "memory" })
  let shared = sharedPlaces.get(place)
  if (!shared) sharedPlaces.set(place, (shared = new StoragePlace(SHARED_PLACES[place])))
  return shared
}

/** What `info` allows, in words:  `one of light, dark, auto`, `a number`, `anything`. */
function allowedText(info: ValueInfo | undefined): string {
  const choices = info && choicesOf(info)
  if (choices) return `one of ${choices.map(shown).join(", ")}`
  return info?.type ? `a ${info.type}` : "anything"
}

/** `value` for a message:  plain data as JSON (`{"left":30}`), anything else as its string. */
function shown(value: unknown): string {
  if (typeof value === "string") return value
  return (typeof value === "object" && JSON.stringify(value)) || String(value as string)
}
