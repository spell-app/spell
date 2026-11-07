import {
  BY_FIELD,
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
 * Every thing in one place's collection, copied into another place (epic `atmosphere` P1):
 * how a program's data moves when its line changes.
 *
 * ```ts
 * await new PlaceCopy({ from: folder, to: account }).copy("recipes")
 * ```
 *
 * - e.g. the recipe box, from a project data folder (`owen@spell/recipes`) to an atmosphere account, and back.
 * - Each thing whole:  its body too, where the place keeps one apart (`getMany()`), not only what its list holds.
 * - A thing the other place has already is UPDATED, by its id;  any other is inserted.  Nothing is removed from either:
 *   it's a copy, so the old place still holds everything until someone empties it.
 * - Who owns a thing, and who wrote it, are the place's to say (`OWNER_FIELD`, `BY_FIELD`):  they're left out, and the
 *   place it goes into writes its own.
 *   - An id an atmosphere account made from its owner (`did:plc:alice/r-1`, everyone's put together) loses that part:
 *     it's the owner's, not the thing's.
 * - Every change goes in ONE `apply()`, so a place that's atomic takes all or none.
 * - With a `view` (a projection, epic `atmosphere` P17):  only what it shows of each thing, and only the things it keeps;
 *   each written whole, so a field it stops showing goes;  a thing there that the view leaves out is REMOVED,
 *   so the copy is the view, rebuilt from nothing.
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
   * - `view`:  what to write of each row, `undefined` to leave it out (`projectedRow()`);  see the class.
   * - Returns how many were inserted and updated, and with a view, removed.
   * - throws what either place throws:  a refusal from `to` leaves `from` as it was
   * - throws `PlaceError` `"refused"` when `to` takes no writes at all
   */
  async copy(
    collection: string,
    { into = collection, context = {}, view }: { into?: string; context?: PlaceContext; view?: PlaceView } = {}
  ): Promise<PlaceCopyReport> {
    const rows = await this.wholeRowsOf(this.from, collection, context)
    const toIdOf = this.to.describe().idOf ?? "id"
    const there = new Set((await this.allRowsOf(this.to, into, context)).flatMap((row) => idOfRow(row, toIdOf) ?? []))
    const kept = new Set<string>()
    const changes: PlaceChange[] = rows.flatMap((row) => {
      const id = this.idFor(row)
      const shown = view ? view(row) : row
      if (id === undefined || !shown) return []
      kept.add(id)
      const fields = this.fieldsOf(shown)
      // a view's thing is written whole, so a field it no longer shows goes
      const kind = there.has(id) && !view ? "update" : "insert"
      return [{ kind, collection: into, id, fields }]
    })
    if (view) {
      for (const id of there) if (!kept.has(id)) changes.push({ kind: "delete", collection: into, id })
    }
    if (!this.to.apply) {
      throw new PlaceError("PlaceCopy.copy():  the place it's copying into can't be written", {
        cause: { kind: "refused", whyNot: "place" }
      })
    }
    if (changes.length) await this.to.apply(changes, context)
    const written = changes.filter(({ kind }) => kind !== "delete")
    const updated = written.filter(({ id }) => there.has(id!)).length
    const removed = changes.length - written.length
    return { inserted: written.length - updated, updated, ...(view && { removed }) }
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

  /** What's written of `row`:  every field but its id, its owner and who wrote it, which the place it goes into says. */
  private fieldsOf(row: PlaceRow): PlaceRow {
    const idOf = this.from.describe().idOf ?? "id"
    const { [idOf]: _id, [OWNER_FIELD]: _owner, [BY_FIELD]: _by, ...fields } = row
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
  /** How many it held that the view leaves out, now gone:  only with a view. */
  removed?: number
}

/** What a copy writes of `row`:  `undefined` leaves it out (a projection's `projectedRow()`). */
export type PlaceView = (row: PlaceRow) => PlaceRow | undefined
