import { WaitedOnPlace } from "./WaitedOnPlace"

/****************
 * ### `DatabasePlace`
 * A waited-on `PrefPlace` in the browser's database (IndexedDB):  for big values, and values that aren't text.
 * - ONE database for the site, `spell-prefs`, with one table of values, each under `[store, key]`.
 * - Values are kept as the browser copies them, not as text:
 *   a `Blob`, a `Date`, a `Map`, a file handle (`FileSystemFileHandle`) come back as they went in.
 * - `update()` reads, changes and saves in ONE database transaction:  two tabs never read the same value.
 * - No database (node, a server drawing a page), or one the browser refuses:
 *   values are kept in memory for the visit, and a refusal is logged once.
 * - NEVER throws on a storage failure:  it logs, and a read answers `undefined`.
 * - `DatabasePlace.shared`:  the one every store on the page uses, unless a test makes its own.
 ****************/
export class DatabasePlace extends WaitedOnPlace {
  readonly description = "the browser's database"
  /** Its database's name:  `spell-prefs`, or a test's. */
  readonly name: string

  constructor({ name = DATABASE_NAME, indexedDB }: DatabasePlaceProps = {}) {
    super()
    this.name = name
    this.findDatabases = () => indexedDB ?? globalThis.indexedDB
  }

  /**
   * The one place for the page, made on first use.
   * - STATIC:  a site has one database, whichever store asks, and every store shares its connection.
   */
  static get shared(): DatabasePlace {
    return (DatabasePlace._shared ??= new DatabasePlace())
  }
  private static _shared: DatabasePlace | undefined

  ////////////////
  // ## Waited on
  ////////////////

  async load(store: string, key: string): Promise<unknown> {
    const database = await this.database()
    if (!database) return this.memoryOf(store).get(key)
    return this.ask("load", store, key, database, "readonly", (table) => table.get([store, key]))
  }

  async save(store: string, key: string, value: unknown): Promise<void> {
    const database = await this.database()
    if (!database) {
      if (value === undefined) this.memoryOf(store).delete(key)
      else this.memoryOf(store).set(key, value)
      return
    }
    await this.ask("save", store, key, database, "readwrite", (table): IDBRequest =>
      value === undefined ? table.delete([store, key]) : table.put(value, [store, key])
    )
  }

  async loadKeys(store: string): Promise<string[]> {
    const database = await this.database()
    if (!database) return [...this.memoryOf(store).keys()]
    const keys = await this.ask("loadKeys", store, "", database, "readonly", (table) =>
      table.getAllKeys(rangeUnder(store, ""))
    )
    return (keys ?? []).map((pair) => (pair as [string, string])[1])
  }

  async removeUnder(store: string, prefix: string): Promise<void> {
    const database = await this.database()
    if (!database) {
      const memory = this.memoryOf(store)
      for (const key of memory.keys()) if (key.startsWith(prefix)) memory.delete(key)
      return
    }
    await this.ask("removeUnder", store, prefix, database, "readwrite", (table) =>
      table.delete(rangeUnder(store, prefix))
    )
  }

  /**
   * Read, `change` and save `store`'s value under `key` in ONE transaction:  no other tab reads in between.
   * - Returns the new value.
   * - `change` throws (a value its store doesn't allow):  nothing is saved, and the throw is passed on.
   */
  override async update(store: string, key: string, change: (kept: unknown) => unknown): Promise<unknown> {
    const database = await this.database()
    if (!database) return super.update(store, key, change)
    let changed: unknown
    let thrown: { error: unknown } | undefined
    await this.ask("update", store, key, database, "readwrite", (table) => {
      const reading = table.get([store, key])
      reading.onsuccess = () => {
        try {
          changed = change(reading.result)
        } catch (error) {
          thrown = { error }
          reading.transaction?.abort()
          return
        }
        if (changed === undefined) table.delete([store, key])
        else table.put(changed, [store, key])
      }
      return reading
    })
    if (thrown) throw thrown.error
    return changed
  }

  ////////////////
  // ## The database
  ////////////////

  /** The database, opened on first use;  `undefined` when there's none, or the browser refuses it. */
  private database(): Promise<IDBDatabase | undefined> {
    return (this.opening ??= this.open())
  }
  private opening: Promise<IDBDatabase | undefined> | undefined

  /** Finds the browser's databases (`indexedDB`):  `DatabasePlaceProps.indexedDB`. */
  private findDatabases: () => IDBFactory | undefined

  /** Open the database, making its table the first time;  `undefined`, logged, when it can't. */
  private async open(): Promise<IDBDatabase | undefined> {
    try {
      const databases = this.findDatabases()
      if (!databases) return undefined
      return await new Promise<IDBDatabase>((resolve, reject) => {
        const opening = databases.open(this.name, DATABASE_VERSION)
        opening.onupgradeneeded = () => opening.result.createObjectStore(TABLE)
        opening.onsuccess = () => resolve(opening.result)
        opening.onerror = () => reject(opening.error)
      })
    } catch (error) {
      console.error(`DatabasePlace:  the browser refused its database, \`${this.name}\`;  keeping values in memory:`)
      console.error(error)
      return undefined
    }
  }

  /**
   * Run `request` on the table in a transaction, and answer its result once the transaction is done.
   * - A failure (full, refused) is logged, and answers `undefined`.
   */
  private async ask<T>(
    method: string,
    store: string,
    key: string,
    database: IDBDatabase,
    mode: IDBTransactionMode,
    request: (table: IDBObjectStore) => IDBRequest<T>
  ): Promise<T | undefined> {
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(TABLE, mode)
        const asked = request(transaction.objectStore(TABLE))
        transaction.oncomplete = () => resolve(asked.result)
        transaction.onabort = transaction.onerror = () => reject(transaction.error ?? asked.error)
      })
    } catch (error) {
      if (error === null) return undefined // aborted on purpose:  `update()`'s `change` threw
      console.error(`DatabasePlace.${method}():  ${this.description} refused \`${store}\` \`${key}\`:`)
      console.error(error)
      return undefined
    }
  }

  ////////////////
  // ## Memory, when there's no database
  ////////////////

  /** `store`'s values, kept in memory when there's no database. */
  private memoryOf(store: string): Map<string, unknown> {
    let memory = this.memory.get(store)
    if (!memory) this.memory.set(store, (memory = new Map()))
    return memory
  }
  private memory = new Map<string, Map<string, unknown>>()
}

/** Props for a `DatabasePlace`. */
export type DatabasePlaceProps = {
  /** Its database's name:  default `spell-prefs`;  a test's own keeps the site's out of it. */
  name?: string
  /** The browser's databases:  default `globalThis.indexedDB`. */
  indexedDB?: IDBFactory
}

/** The site's one database of preferences. */
const DATABASE_NAME = "spell-prefs"
/** Its version:  1 until its table changes shape. */
const DATABASE_VERSION = 1
/** Its one table, of values under `[store, key]`. */
const TABLE = "values"

/** The keys of `store` that start with `prefix`, as a range of `[store, key]` pairs. */
function rangeUnder(store: string, prefix: string): IDBKeyRange {
  return IDBKeyRange.bound([store, prefix], [store, `${prefix}￿`])
}
