import {
  OWNER_FIELD,
  PlaceError,
  idOfRow,
  type Place,
  type PlaceChange,
  type PlaceContext,
  type PlaceRow
} from "./places.types"

/****************
 * ### `PlaceCopy`
 * Every thing in one place's collection, copied into another place:  how a program's data moves when its line changes
 * (epic `atmosphere` P1).
 *
 * ```ts
 * await new PlaceCopy({ from: folder, to: account }).copy("recipes")
 * ```
 *
 * - e.g. the recipe box, from a project data folder (`owen@spell/recipes`) to an atmosphere account, and back.
 * - Each thing whole:  its body too, where the place keeps one apart (`getMany()`), not only what its list holds.
 * - A thing the other place has already is UPDATED, by its id;  any other is inserted.  Nothing is removed from either:
 *   it's a copy, so the old place still holds everything until someone empties it.
 * - Who owns a thing is the place's to say (`OWNER_FIELD`):  it's left out, and the place it goes into writes its own.
 *   - An id an atmosphere account made from its owner (`did:plc:alice/r-1`, everyone's put together) loses that part:
 *     it's the owner's, not the thing's.
 * - Every change goes in ONE `apply()`, so a place that's atomic takes all or none.
 * - NOT the rooms' copy (`RoomCopy`):  that holds ONE room's rows in memory, and works out each change in its order;
 *   this reads one place and writes another, both through their own `Place` methods.
 * - Knows nothing of Things or files:  any two places.
 ****************/
export class PlaceCopy {
  /** Where the things are now. */
  private readonly from: Place
  /** Where they go. */
  private readonly to: Place

  constructor({ from, to }: PlaceCopyProps) {
    this.from = from
    this.to = to
  }

  /**
   * Copy every thing in `collection` of `from` into `into` (the same name, by default) of `to`.
   * - Returns how many were inserted, and how many updated.
   * - throws what either place throws:  a refusal from `to` leaves `from` as it was
   * - throws `PlaceError` `"refused"` when `to` takes no writes at all
   */
  async copy(
    collection: string,
    { into = collection, context = {} }: { into?: string; context?: PlaceContext } = {}
  ): Promise<PlaceCopyReport> {
    const rows = await this.wholeRowsOf(this.from, collection, context)
    const toIdOf = this.to.describe().idOf ?? "id"
    const there = new Set((await this.allRowsOf(this.to, into, context)).flatMap((row) => idOfRow(row, toIdOf) ?? []))
    const changes: PlaceChange[] = rows.flatMap((row) => {
      const id = this.idFor(row)
      if (id === undefined) return []
      const fields = this.fieldsOf(row)
      return [{ kind: there.has(id) ? "update" : "insert", collection: into, id, fields }]
    })
    if (!this.to.apply) {
      throw new PlaceError("PlaceCopy.copy():  the place it's copying into can't be written", {
        cause: { kind: "refused", whyNot: "place" }
      })
    }
    if (changes.length) await this.to.apply(changes, context)
    const updated = changes.filter(({ kind }) => kind === "update").length
    return { inserted: changes.length - updated, updated }
  }

  /** Every row of `collection` in `place`, whole:  its list, then each body, where the place keeps them apart. */
  private async wholeRowsOf(place: Place, collection: string, context: PlaceContext): Promise<PlaceRow[]> {
    const listed = await this.allRowsOf(place, collection, context)
    if (!place.getMany) return listed
    const idOf = place.describe().idOf ?? "id"
    return place.getMany(
      collection,
      listed.flatMap((row) => idOfRow(row, idOf) ?? []),
      context
    )
  }

  /** Every row `place` lists in `collection`, page after page. */
  private async allRowsOf(place: Place, collection: string, context: PlaceContext): Promise<PlaceRow[]> {
    const rows: PlaceRow[] = []
    let at: string | undefined
    do {
      const answer = await place.list(collection, at === undefined ? {} : { page: { at } }, context)
      rows.push(...answer.rows)
      at = answer.nextPage
    } while (at !== undefined)
    return rows
  }

  /** `row`'s id in the place it goes into:  without its owner's part, `did:plc:alice/r-1` => `r-1`. */
  private idFor(row: PlaceRow): string | undefined {
    const id = idOfRow(row, this.from.describe().idOf ?? "id")
    const owner = row[OWNER_FIELD]
    if (id === undefined || typeof owner !== "string") return id
    return id.startsWith(`${owner}/`) ? id.slice(owner.length + 1) : id
  }

  /** What's written of `row`:  every field but its id and its owner, which the place it goes into says. */
  private fieldsOf(row: PlaceRow): PlaceRow {
    const idOf = this.from.describe().idOf ?? "id"
    const { [idOf]: _id, [OWNER_FIELD]: _owner, ...fields } = row
    return fields
  }
}

/** Constructor props of a `PlaceCopy`. */
export type PlaceCopyProps = {
  /** Where the things are now. */
  from: Place
  /** Where they go. */
  to: Place
}

/** What a `PlaceCopy.copy()` did. */
export type PlaceCopyReport = {
  /** How many things were new there. */
  inserted: number
  /** How many it held already, now changed to match. */
  updated: number
}
