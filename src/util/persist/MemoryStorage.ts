import type { StorageLike } from "./persist.types"

/****************
 * ### `MemoryStorage`
 * A web `Storage` kept in memory, for this page only:  what a `memory` place keeps its values in.
 * - Also where a `StoragePlace` keeps them when the browser blocks its storage, for the visit.
 * - Keys in the order they were first set, as the browser's storages list them.
 ****************/
export class MemoryStorage implements StorageLike {
  /** The values, by key. */
  private values = new Map<string, string>()

  /** How many keys it holds. */
  get length(): number {
    return this.values.size
  }

  /** The key at `index`, or `null` past the end. */
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  /** The value under `key`, or `null` for none. */
  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  /** Keep `value` under `key`. */
  setItem(key: string, value: string): void {
    this.values.set(key, String(value))
  }

  /** Forget `key`. */
  removeItem(key: string): void {
    this.values.delete(key)
  }
}
