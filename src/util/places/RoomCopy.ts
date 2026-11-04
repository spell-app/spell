import { isListPosition, POSITIONS_KEY, withListEdits } from "./positions"
import {
  PlaceError,
  type ApplyAnswer,
  type PersonHere,
  type PlaceChange,
  type PlacePerson,
  type PlaceRow
} from "./places.types"

/** The field holding a row's id, in a room. */
export const ROOM_ID_FIELD = "id"

/**
 * Every row of a room, by collection:  what a referee hands someone who's behind.
 * - JSON all the way down.
 */
export type RoomSnapshot = Record<string, PlaceRow[]>

/**
 * A value replaced by a change that hadn't seen it, as the referee saw it.
 * - On an entry, so whoever lost can be told, with their words.
 */
export type RoomOverwrite = {
  /** The collection. */
  collection: string
  /** The thing. */
  id: string
  /** The field. */
  field: string
  /** The value that lost. */
  value: unknown
  /** Who it was from. */
  from: string
}

/**
 * One step in a room's one order:  a batch of changes, all or none, with its sequence number.
 * - A delete stays here as a marker until the log is trimmed:  whoever's further behind gets a snapshot.
 */
export type RoomEntry = {
  /** Its place in the order:  each one more than the last. */
  seq: number
  /** Who sent it:  a `LiveRoomPlace`'s `clientId`, or `FROM_THE_PLACE`. */
  from: string
  /** What it changed, as the referee settled it. */
  changes: PlaceChange[]
  /** What it overwrote. */
  overwrote?: RoomOverwrite[]
}

/** Who an entry's from when someone changed the store itself:  a file saved by hand. */
export const FROM_THE_PLACE = "the place"

/** What a page says to a referee. */
export type RoomAsk =
  /** Get me back in step:  what's happened since `since`, or everything. */
  | { kind: "catch-up"; run?: string; since?: number }
  /** Make these, all or none. */
  | { kind: "changes"; from: string; changes: PlaceChange[] }
  /** Run this named action.  `callId` makes it once. */
  | { kind: "call"; from: string; callId: string; name: string; input: unknown }
  /** Am I in step?  Here's what I hold. */
  | { kind: "check"; run?: string; seq: number; checksum: string }
  /** Here I am, and who I am:  sent each time the connection opens. */
  | { kind: "here"; from: string; person: PlacePerson }

/** What a referee says to a page. */
export type RoomAnswer =
  /** Everything:  replace what you hold. */
  | { kind: "snapshot"; run: string; seq: number; rows: RoomSnapshot }
  /** What's happened since you asked. */
  | { kind: "entries"; run: string; entries: RoomEntry[] }
  /** One more step:  to everyone, the sender too. */
  | { kind: "entry"; run: string; entry: RoomEntry }
  /** Those were made already, at `seq`:  to the sender. */
  | { kind: "seen"; changeIds: string[]; seq: number; result?: unknown }
  /** The answer to a call:  to the sender, after its entry. */
  | { kind: "called"; callId: string; result: unknown }
  /** The answer's no:  to the sender. */
  | { kind: "refused"; changeIds: string[]; errorKind: "refused" | "not found"; message: string }
  /** It couldn't be made just now, so send it again:  to the sender. */
  | { kind: "no answer"; changeIds: string[]; message: string }
  /** Where the room stands. */
  | { kind: "at"; run: string; seq: number }
  /** Everyone here now, in the order they came:  to everyone, each time it changes. */
  | { kind: "people"; people: PersonHere[] }

/****************
 * ### `RoomCopy`
 * One copy of a room's rows:  the referee's, and each page's, changed the same way, so they can't come to differ by themselves.
 * - The ONE place a change is worked out:  a set, an addition, a list edit, a removal.  So a checksum of two copies should match.
 * - A batch is all or none:  `plan()` works it out and changes nothing, `commit()` makes it.
 * - Hands out copies of rows.  Plain JSON in, plain JSON out:  no reading, no sending.
 ****************/
export class RoomCopy {
  /** Each row, by collection and id. */
  private collections = new Map<string, Map<string, PlaceRow>>()
  /** Its checksum, once asked for, until it changes. */
  private keptChecksum: string | undefined

  constructor(snapshot: RoomSnapshot = {}) {
    this.replaceWith(snapshot)
  }

  /** Hold exactly these rows. */
  replaceWith(snapshot: RoomSnapshot): void {
    this.collections = new Map(
      Object.entries(snapshot).map(([collection, rows]) => [
        collection,
        new Map(rows.map((row) => [`${row[ROOM_ID_FIELD] as string}`, row]))
      ])
    )
    this.keptChecksum = undefined
  }

  /** Every row it holds. */
  get snapshot(): RoomSnapshot {
    return Object.fromEntries(
      [...this.collections].map(([collection, rows]) => [collection, structuredClone([...rows.values()])])
    )
  }

  /** The collections it holds. */
  get collectionNames(): string[] {
    return [...this.collections.keys()]
  }

  /** Every row of `collection`, in the order added. */
  rowsOf(collection: string): PlaceRow[] {
    return structuredClone([...(this.collections.get(collection)?.values() ?? [])])
  }

  /** The row of `collection` with this id. */
  rowFor(collection: string, id: string): PlaceRow | undefined {
    const row = this.collections.get(collection)?.get(id)
    return row && structuredClone(row)
  }

  /**
   * What these changes would make, without making them:  `undefined` for a row that goes.
   * - All of it, or it throws.
   * - An update to something that's gone is a refusal:  a delete beats a later edit.
   * - A delete of something that's gone is nothing:  doing it twice is doing it.
   * - throws `PlaceError`, `"not found"`
   */
  plan(changes: readonly PlaceChange[]): RoomPlan {
    const plan: RoomPlan = new Map()
    for (const change of changes) {
      const { collection, id } = change
      if (id === undefined)
        throw new TypeError("RoomCopy.plan():  a room's changes name their things;  browsers make the ids")
      const key = planKey(collection, id)
      const row = plan.has(key) ? plan.get(key)!.row : this.collections.get(collection)?.get(id)
      plan.set(key, { collection, id, row: this.rowAfter(change, row) })
    }
    return plan
  }

  /** Make what `plan()` worked out. */
  commit(plan: RoomPlan): void {
    for (const { collection, id, row } of plan.values()) {
      let rows = this.collections.get(collection)
      if (!rows) this.collections.set(collection, (rows = new Map()))
      if (row) rows.set(id, row)
      else rows.delete(id)
    }
    this.keptChecksum = undefined
  }

  /** `row` after `change`.  - throws:  see `plan()` */
  private rowAfter(
    { kind, collection, id, fields, adds, list }: PlaceChange,
    row: PlaceRow | undefined
  ): PlaceRow | undefined {
    if (kind === "delete") return undefined
    if (kind === "insert") return { ...fields, [ROOM_ID_FIELD]: id }
    if (!row) {
      throw new PlaceError(`This room's "${collection}" holds nothing with the id "${id}":  someone deleted it`, {
        cause: { kind: "not found" }
      })
    }
    let after: PlaceRow = { ...row, ...fields }
    for (const [field, by] of Object.entries(adds ?? {})) after[field] = (Number(after[field]) || 0) + by
    for (const [field, edits] of Object.entries(list ?? {})) after = withListEdits(after, field, edits)
    return after
  }

  /**
   * A short text standing for every row:  two copies with the same one hold the same.
   * - Whatever order they were added in, and whatever order their fields are in.
   * - Worked out once, until a change.  About a millisecond per thousand small rows.
   */
  get checksum(): string {
    return (this.keptChecksum ??= checksumOf(this.collections))
  }

  /** The other rows of `collection` under `parent` holding a position in `field`, for settling a tie. */
  positionsBeside(collection: string, field: string, parent: string | null, leaveOut: string): string[] {
    const positions: string[] = []
    for (const [id, row] of this.collections.get(collection) ?? []) {
      const position = row[field]
      if (id !== leaveOut && isListPosition(position) && position.parent === parent) positions.push(position.at)
    }
    return positions
  }
}

/** What a batch would make, by thing:  `RoomCopy.plan()`. */
export type RoomPlan = Map<string, { collection: string; id: string; row: PlaceRow | undefined }>

/** The key of a thing in a plan. */
function planKey(collection: string, id: string): string {
  return `${collection}\n${id}`
}

/** A row as a store keeps it:  no positions of a list's items, which are worked out again from its order. */
export function rowForStore(row: PlaceRow): PlaceRow {
  const { [POSITIONS_KEY]: _positions, ...kept } = row
  return kept
}

/** Two rounds of FNV-1a over a stable text of every row:  not for security, only for noticing a difference. */
function checksumOf(collections: Map<string, Map<string, PlaceRow>>): string {
  const parts: string[] = []
  for (const collection of [...collections.keys()].sort()) {
    const rows = collections.get(collection)!
    if (!rows.size) continue
    parts.push(collection)
    for (const id of [...rows.keys()].sort()) parts.push(id, stableText(rows.get(id)))
  }
  const text = parts.join("\n")
  let one = 0x811c9dc5
  let other = 0x9747b28c
  for (let at = 0; at < text.length; at++) {
    const code = text.charCodeAt(at)
    one = Math.imul(one ^ code, 0x01000193)
    other = Math.imul(other ^ code, 0x5bd1e995)
  }
  return `${(one >>> 0).toString(36)}-${(other >>> 0).toString(36)}`
}

/** `value` as JSON, its keys in order. */
function stableText(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableText).join(",")}]`
  if (typeof value !== "object" || value === null) return JSON.stringify(value) ?? "null"
  const object = value as Record<string, unknown>
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableText(object[key])}`)
    .join(",")}}`
}

/** A batch's answer to whoever sent it:  each row written, in order, from the copy. */
export function answerFromCopy(copy: RoomCopy, changes: readonly PlaceChange[]): ApplyAnswer {
  const rows: PlaceRow[] = []
  for (const { kind, collection, id } of changes) {
    const row = kind === "delete" || id === undefined ? undefined : copy.rowFor(collection, id)
    if (row) rows.push(row)
  }
  return { rows }
}
