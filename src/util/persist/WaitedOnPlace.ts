import { PrefPlace } from "./PrefPlace"

/****************
 * ### `WaitedOnPlace`
 * A `PrefPlace` whose every read must be waited on:  the browser's database (`DatabasePlace`), a server
 * (`ServerPlace`).
 * - A quick read (`read()`, `keys()`) throws `TypeError`, naming `load()`:  `PrefStore` refuses one first.
 * - A quick write (`write()`, `remove()`) is done later, without waiting:  a failure is logged by `save()`.
 * - A subclass writes the waited-on methods:  `load()`, `save()`, `loadKeys()`, `removeUnder()`,
 *   and `update()` when it can do it in one step.
 ****************/
export abstract class WaitedOnPlace extends PrefPlace {
  readonly isAsync = true

  /** throws `TypeError`:  use `load()` */
  read(store: string): unknown {
    throw this.quickReadError("read", store)
  }

  /** throws `TypeError`:  use `loadKeys()` */
  keys(store: string): string[] {
    throw this.quickReadError("keys", store)
  }

  /** `save()`, not waited on. */
  write(store: string, key: string, value: unknown): void {
    void this.save(store, key, value)
  }

  /** `save()` of nothing, not waited on. */
  remove(store: string, key: string): void {
    void this.save(store, key, undefined)
  }

  abstract override load(store: string, key: string): Promise<unknown>
  abstract override save(store: string, key: string, value: unknown): Promise<void>
  abstract override loadKeys(store: string): Promise<string[]>
  abstract override removeUnder(store: string, prefix: string): Promise<void>

  /** The `TypeError` a quick read throws, naming what to use instead. */
  private quickReadError(method: string, store: string): TypeError {
    return new TypeError(
      `PrefPlace.${method}():  \`${store}\` keeps its values in ${this.description}, which must be waited on;  ` +
        "use `load()` or `loadKeys()`"
    )
  }
}
