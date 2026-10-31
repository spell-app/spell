import { PrefStore } from "spell/util/persist/PrefStore"
import type { PrefPlace } from "spell/util/persist/PrefPlace"

import type {
  ApplyAnswer,
  ListAnswer,
  Place,
  PlaceCapabilities,
  PlaceChange,
  PlaceContext,
  PlaceRow,
  SelectingContext
} from "./places.types"

/** The field a preference's key is under, in a row. */
const ID_FIELD = "id"
/** The field a preference's value is under, in a row. */
const VALUE_FIELD = "value"

/** A store's name, only to reach the place every store shares by default:  nothing is kept under it. */
const DEFAULT_STORE = "this-device"

/** What preferences can do:  list and write key by key, with nothing clever. */
const DEVICE_CAPABILITIES: PlaceCapabilities = {
  kind: "this device",
  idOf: ID_FIELD,
  filter: "none",
  sort: "none",
  select: "none",
  page: "none",
  write: ["insert", "update", "delete"],
  atomic: false,
  live: "none",
  abort: "soft"
}

/****************
 * ### `DevicePlace`
 * "This device" as a place:  an adapter over a `PrefPlace`, where preferences are kept.
 * - A collection is a preference store's name;  each row is one key, `{ id: "scheme", value: "dark" }`.
 * - Reads and writes the same keys `PrefStore` does, and changes nothing in it.
 * - NOTE:  a `PrefPlace` NEVER throws, so neither can this when storage fails:
 *   a failed read looks like nothing kept, and a failed write goes unnoticed.
 ****************/
export class DevicePlace implements Place {
  /** Where the values are kept:  STATIC for the place's life. */
  readonly prefPlace: PrefPlace

  /** Over `prefPlace`;  left out, the browser's own storage, the one `new PrefStore(name)` uses. */
  constructor({ prefPlace = new PrefStore(DEFAULT_STORE).place, wholeRows = false }: DevicePlaceProps = {}) {
    this.prefPlace = prefPlace
    this.wholeRows = wholeRows
  }

  /** Is each key's value a whole row, as JSON?  See `DevicePlaceProps`. */
  private readonly wholeRows: boolean

  /** What it can do. */
  describe(): PlaceCapabilities {
    return DEVICE_CAPABILITIES
  }

  /** Every key of the store `collection`:  it does nothing with `query`, and says so. */
  async list(collection: string, _query: unknown, { signal }: PlaceContext = {}): Promise<ListAnswer> {
    signal?.throwIfAborted()
    const keys = await this.prefPlace.loadKeys(collection)
    return { rows: await this.rowsFor(collection, keys), handled: {} }
  }

  /** The keys named `ids` of the store `collection`;  one with nothing kept is left out. */
  async getMany(collection: string, ids: readonly string[], { signal }: SelectingContext = {}): Promise<PlaceRow[]> {
    signal?.throwIfAborted()
    return this.rowsFor(collection, ids)
  }

  /**
   * Keep or forget each key, in turn.
   * - throws `TypeError` for a change with no id, or that writes no `value`
   */
  async apply(changes: readonly PlaceChange[], { signal }: PlaceContext = {}): Promise<ApplyAnswer> {
    signal?.throwIfAborted()
    const rows: PlaceRow[] = []
    for (const { kind, collection, id, fields } of changes) {
      if (id === undefined) throw new TypeError(`DevicePlace.apply():  a ${kind} needs an id:  the preference's key`)
      if (kind === "delete") {
        await this.prefPlace.save(collection, id, undefined)
        continue
      }
      if (this.wholeRows) {
        const held = JSON.parse(((await this.prefPlace.load(collection, id)) as string | undefined) ?? "{}") as PlaceRow
        const row = { ...held, ...fields }
        await this.prefPlace.save(collection, id, JSON.stringify(row))
        rows.push({ ...row, [ID_FIELD]: id })
        continue
      }
      const value = fields?.[VALUE_FIELD]
      if (value === undefined) {
        throw new TypeError(`DevicePlace.apply():  a ${kind} of "${id}" needs a \`value\`;  delete it to forget it`)
      }
      await this.prefPlace.save(collection, id, value)
      rows.push({ [ID_FIELD]: id, [VALUE_FIELD]: value })
    }
    return { rows }
  }

  /** A row for each of `keys` holding a value. */
  private async rowsFor(store: string, keys: readonly string[]): Promise<PlaceRow[]> {
    const values = await Promise.all(keys.map((key) => this.prefPlace.load(store, key)))
    const rows = keys.map((key, index) => ({ [ID_FIELD]: key, [VALUE_FIELD]: values[index] }))
    const kept = rows.filter((row) => row[VALUE_FIELD] !== undefined)
    if (!this.wholeRows) return kept
    return kept.map((row) => ({
      ...(JSON.parse(`${row[VALUE_FIELD] as string}`) as PlaceRow),
      [ID_FIELD]: row[ID_FIELD]
    }))
  }
}

/** Constructor props of a `DevicePlace`. */
export type DevicePlaceProps = {
  /** Where the values are kept. */
  prefPlace?: PrefPlace
  /**
   * Each key's value is a whole row, as JSON, for things kept on this device:  `family cookbook is this device`.
   * - Left out:  each row is one key and its `value`, a preference.
   */
  wholeRows?: boolean
}
