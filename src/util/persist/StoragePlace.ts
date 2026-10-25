import type { StorageLike } from "./persist.types"
import { MemoryStorage } from "./MemoryStorage"
import { PrefPlace } from "./PrefPlace"
import { textForValue, valueForText } from "./values"

/****************
 * ### `StoragePlace`
 * A quick `PrefPlace` over a web `Storage`:  `localStorage`, `sessionStorage`, a `MemoryStorage`, or one handed in.
 * - Its keys are `<store>:<key>`, e.g. `spell-site:scheme`.
 * - Its values are text (`textForValue()`):  `dark`, `1`, `{"open":true}`, so plain scripts read them too.
 * - Storage the browser blocks (reading `localStorage` throws:  a private window, an iframe with cookies off):
 *   it keeps values in memory for the visit, and says so once.
 * - No storage at all (node, a server drawing a page):  memory too, silently.
 ****************/
export class StoragePlace extends PrefPlace {
  readonly isAsync = false
  readonly description: string

  constructor({ storage, description }: StoragePlaceProps) {
    super()
    this.findStorage = typeof storage === "function" ? storage : () => storage
    this.description = description
  }

  ////////////////
  // ## Quick
  ////////////////

  read(store: string, key: string): unknown {
    const text = this.attempt("read", store, key, (storage) => storage.getItem(fullKey(store, key)))
    if (text === null || text === undefined) return undefined
    try {
      return valueForText(text)
    } catch (error) {
      console.error(
        `StoragePlace.read():  \`${fullKey(store, key)}\` holds no value it can read;  answering none:`,
        text
      )
      console.error(error)
      return undefined
    }
  }

  /**
   * Keep `value` under `key` for `store`.
   * - throws `TypeError` for a value it can't keep as text (a function ...):  see `textForValue()`
   */
  write(store: string, key: string, value: unknown): void {
    const text = textForValue(value)
    this.attempt("write", store, key, (storage) => storage.setItem(fullKey(store, key), text))
  }

  remove(store: string, key: string): void {
    this.attempt("remove", store, key, (storage) => storage.removeItem(fullKey(store, key)))
  }

  keys(store: string): string[] {
    const start = `${store}:`
    const keys = this.attempt("keys", store, "", (storage) => {
      const found: string[] = []
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)
        if (key?.startsWith(start)) found.push(key.slice(start.length))
      }
      return found
    })
    return keys ?? []
  }

  ////////////////
  // ## The storage
  ////////////////

  /** The storage, found on first use:  the one it was given, or memory when that's blocked or missing. */
  private get storage(): StorageLike {
    return (this._storage ??= this.storageOrMemory())
  }
  private _storage: StorageLike | undefined

  /** Finds the storage:  `StoragePlaceProps.storage`. */
  private findStorage: () => StorageLike | undefined

  /** The storage `findStorage()` finds, or a `MemoryStorage` when it throws (blocked) or finds none. */
  private storageOrMemory(): StorageLike {
    try {
      const storage = this.findStorage()
      if (storage) return storage
    } catch (error) {
      console.error(`StoragePlace:  ${this.description} is blocked;  keeping its values in memory for this visit:`)
      console.error(error)
    }
    return new MemoryStorage()
  }

  /**
   * Run `act` on the storage.
   * - A failure (full, blocked mid-visit) is logged, and answers `undefined`.
   */
  private attempt<T>(method: string, store: string, key: string, act: (storage: StorageLike) => T): T | undefined {
    try {
      return act(this.storage)
    } catch (error) {
      console.error(`StoragePlace.${method}():  ${this.description} refused \`${fullKey(store, key)}\`:`)
      console.error(error)
      return undefined
    }
  }
}

/** Props for a `StoragePlace`. */
export type StoragePlaceProps = {
  /**
   * The storage, or a function that finds it, called on first use.
   * - It may throw (the browser blocks it) or answer `undefined` (there's none):  then values are kept in memory.
   */
  storage: StorageLike | (() => StorageLike | undefined)
  /** What it is, in words:  `PrefPlace.description`. */
  description: string
}

/** `key` of `store`, as the storage keeps it, e.g. `spell-site:scheme`. */
function fullKey(store: string, key: string): string {
  return `${store}:${key}`
}
