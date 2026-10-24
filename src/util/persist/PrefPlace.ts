/****************
 * ### `PrefPlace`
 * Where a `PrefStore` keeps its values:  the browser's storage, or memory.
 * - Every method takes the store's name and the key apart:  the place decides how to join them.
 * - A QUICK place (`isAsync` false) answers at once;  its waited-on methods wrap the quick ones.
 * - A WAITED-ON place (`isAsync` true) refuses a quick read, and does a quick write later, without waiting.
 * - NEVER throws on a storage failure (blocked, full, a bad value):  it logs, and a read answers `undefined`.
 * - Generic:  knows nothing of what's kept, or by whom.
 ****************/
export abstract class PrefPlace {
  /** Must its reads be waited on (`load()`)?  Then a quick `read()` throws. */
  abstract readonly isAsync: boolean
  /** What it is, in words, for messages:  e.g. `the browser's storage`. */
  abstract readonly description: string

  ////////////////
  // ## Quick
  ////////////////

  /** `store`'s value under `key`, or `undefined` for none. */
  abstract read(store: string, key: string): unknown
  /** Keep `value` under `key` for `store`. */
  abstract write(store: string, key: string, value: unknown): void
  /** Forget `store`'s value under `key`. */
  abstract remove(store: string, key: string): void
  /** Every key `store` keeps, without its name. */
  abstract keys(store: string): string[]

  /** Forget every key `store` keeps that starts with `prefix` -- every key, for `""`. */
  removeUnder(store: string, prefix: string): void {
    for (const key of this.keys(store)) if (key.startsWith(prefix)) this.remove(store, key)
  }

  ////////////////
  // ## Waited on
  ////////////////

  /** `read()`, waited on. */
  async load(store: string, key: string): Promise<unknown> {
    return this.read(store, key)
  }

  /** `write()`, waited on;  `undefined` forgets the key. */
  async save(store: string, key: string, value: unknown): Promise<void> {
    if (value === undefined) this.remove(store, key)
    else this.write(store, key, value)
  }

  /** `keys()`, waited on. */
  async loadKeys(store: string): Promise<string[]> {
    return this.keys(store)
  }
}
