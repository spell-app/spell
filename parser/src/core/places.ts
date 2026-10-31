/**
 * A place's rows as things:  ONE thing per type and id, however many reads bring it (epic `data` P2, J11).
 *
 * ```ts
 * const things = new PlaceThings({ cache: places.cache })
 * const result = places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
 * await result.load()
 * const recipes = things.thingsFrom(result)   // made the first time
 * await result.reload()
 * things.thingsFrom(result)                   // the SAME things, changed in place, so what draws them redraws
 * ```
 *
 * - A new id is made by the `Loader`'s entry reading, which stays synchronous:
 *   by the time a row gets here, it has already been waited for.
 * - A known id is changed in place, the way `StateMirror.read()` does it.
 *   - NEVER through `Loader.load()`:  it forgets the undo history, and hands a known thing back unchanged.
 *   - Only the fields the row has:  a read that selected some takes nothing from the others.
 * - All of it runs `whileReading()`:  what it changes joins no undo step and goes to no program running elsewhere,
 *   so a refresh or a heal never comes back as a write.
 * - A reference in a row, `{ "$ref": "Person#matt" }`, finds that thing, or its row in the cache.
 * - By file, `spell/parser/core/places`, NOT in the core's barrel or `model`:  a program with no places pays nothing.
 * - Its only part of `spell/util/places` at run time is `idOfRow()`:  the rest of that folder is the caller's.
 */
import { ITEMS_KEY, TYPE_KEY, untrackCells } from "spell/util"
import type { PlaceCache } from "spell/util/places/PlaceCache"
import type { PlaceResult } from "spell/util/places/PlaceResult"
import { idOfRow, type PlaceRow } from "spell/util/places/places.types"
import { parseRef } from "spell/util/places/refs"

import { whileReading } from "./core"
import { dateIfDeclared, Loader, type LoaderOptions } from "./saving"
import { setField } from "./state"
// Import directly to avoid circular import
import { List } from "./classes/List"
import { Thing } from "./classes/Thing"

/** A thing or a list:  what a row becomes. */
type SpellObject = Thing | List

/** Options for `PlaceThings`. */
export type PlaceThingsOptions = Pick<LoaderOptions, "classNamed"> & {
  /** The cache of rows, where a reference in a row finds what it names. */
  cache: PlaceCache
}

/****************
 * ### `PlaceThings`
 * Makes rows into things, one thing per type and id:  see the file's docs.
 * - One per program:  it's what remembers which things it made.
 * - A `Loader`, for its entry reading:  its `load()` is left to saved things.
 ****************/
export class PlaceThings extends Loader {
  /**
   * Things made from rows.
   * - throws with no `classNamed`, and no running program to find classes in:  see `Loader`
   */
  constructor({ cache, classNamed }: PlaceThingsOptions) {
    super({ entryFor: (ref) => entryOfCachedRow(cache, ref), ...(classNamed && { classNamed }) })
  }

  /**
   * The thing for each row of `result`, in order:  each made, or changed in place -- see the file's docs.
   * - Follows `result`'s rows and nothing else, so a computation re-runs when they change.
   * - throws `TypeError` if `result` has no `type`, or nothing is known by its type's name
   */
  thingsFrom(result: PlaceResult): SpellObject[] {
    const { type, contents = [] } = result
    if (type === undefined) {
      throw new TypeError(
        "PlaceThings.thingsFrom():  this read has no `type`, so its rows can't be things;  give it one"
      )
    }
    const { idOf } = result.place.describe()
    return untrackCells(() => whileReading(() => contents.map((row) => this.thingFrom(type, row, idOf))))
  }

  /**
   * The thing for `row` of `type`:  made, or changed in place.
   * - A row with no id shares no identity:  a new thing each time, belonging to its list alone.
   * - throws `TypeError` if nothing is known by the name `type`
   */
  thingFrom(type: string, row: PlaceRow, idField: string | undefined): SpellObject {
    if (!this.classNamed(type)) {
      throw new TypeError(`PlaceThings.thingFrom():  no class is named "${type}";  check the read's \`type\``)
    }
    const id = idOfRow(row, idField)
    // Never `refText()`:  a place's own ids may hold what a saved reference can't, e.g. an email address's `@`
    const ref = `${type}#${id ?? `row ${++this.rowsWithNoId}`}`
    const known = this.loaded.get(ref)
    if (known) {
      this.changeInPlace(known, row)
      return known
    }
    const made = this.make({ ...row, [TYPE_KEY]: type, ...(id !== undefined && { id }) }, ref) as SpellObject
    if (id === undefined) this.loaded.delete(ref)
    return made
  }

  /** How many rows with no id it's seen:  a name for each, while it's made. */
  private rowsWithNoId = 0

  /** Set each field `row` has on `thing`, read back as an entry's are;  what's the same changes nothing. */
  private changeInPlace(thing: SpellObject, row: PlaceRow): void {
    const fields = thing as unknown as Record<string, unknown>
    for (const [key, json] of Object.entries(row)) {
      if (key === "id" || key.startsWith("$")) continue
      const value = dateIfDeclared(thing.constructor as never, key, this.read(json))
      const current = fields[key]
      if (current instanceof List && Array.isArray(value)) {
        if (!isSameItems(current.items, value)) current.items = value
      } else if (!isSameDate(current, value)) {
        setField(thing, key, value, true)
      }
    }
    const items = row[ITEMS_KEY]
    if (thing instanceof List && Array.isArray(items)) {
      const value = this.read(items) as unknown[]
      if (!isSameItems(thing.items, value)) thing.items = value
    }
  }
}

/** The entry for `ref`, from the row the cache holds for it:  what a reference in a row finds. */
function entryOfCachedRow(cache: PlaceCache, ref: string): Record<string, unknown> | undefined {
  const { type, id } = parseRef(ref)
  const row = cache.rowFor(type, id)
  return row && { ...row, [TYPE_KEY]: type, id }
}

/** Do these two lists hold the same things, in the same order? */
function isSameItems(one: readonly unknown[], other: readonly unknown[]): boolean {
  return one.length === other.length && one.every((item, index) => item === other[index])
}

/** Are these two the same moment?  A row read again makes a new `Date` every time. */
function isSameDate(one: unknown, other: unknown): boolean {
  return one instanceof Date && other instanceof Date && one.getTime() === other.getTime()
}
