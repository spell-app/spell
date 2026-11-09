import { getProp, setProp } from "spell/util/reactive"

import type { PlaceRow } from "./places.types"

/****************
 * ### `PlaceCache`
 * Every row we hold, by its type and its id:  ONE row per id, handed to everyone who asks.
 * - So two parts showing one recipe show one thing, and a change appears in both.
 * - A row's fields are reactive (spell cells):  what read one re-runs when it really changes.
 *   - A field the row didn't have when something read it tells nobody.
 * - Keyed by type, then id, never by text (`refText()`):
 *   a place's own ids may hold what a saved reference can't, e.g. an email address's `@`.
 * - Knows nothing of places, Things or how a row got here.
 ****************/
export class PlaceCache {
  /** Each type's rows, by id. */
  private rows = new Map<string, Map<string, PlaceRow>>()

  /**
   * The ONE row for `type` and `id`, with `fields` written into it:  made the first time.
   * - Fields not named stay as they were:  a read that selected only some takes nothing from the row.
   */
  keep(type: string, id: string, fields: PlaceRow): PlaceRow {
    let rowsOfType = this.rows.get(type)
    if (!rowsOfType) this.rows.set(type, (rowsOfType = new Map()))
    let row = rowsOfType.get(id)
    if (!row) rowsOfType.set(id, (row = {}))
    for (const [field, value] of Object.entries(fields)) {
      if (!(field in row)) defineField(row, field)
      row[field] = value
    }
    return row
  }

  /** The row for `type` and `id`, if we hold it. */
  rowFor(type: string, id: string): PlaceRow | undefined {
    return this.rows.get(type)?.get(id)
  }

  /**
   * Stop holding the row for `type` and `id`:  the next `keep()` makes a new one.
   * - Whoever still holds the old row keeps it, and no longer hears of changes.
   */
  forget(type: string, id: string): void {
    this.rows.get(type)?.delete(id)
  }
}

/** Make `field` of `row` reactive:  a getter and a setter over its spell cell. */
function defineField(row: PlaceRow, field: string): void {
  Object.defineProperty(row, field, {
    get: () => getProp(row, field),
    set: (value) => setProp(row, field, value),
    enumerable: true,
    configurable: true
  })
}
