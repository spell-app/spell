import { PlaceCopy } from "spell/places/PlaceCopy"
import {
  PlaceError,
  SPACE_PROJECTION_OPERATIONS,
  projectedRow,
  type PlaceChange,
  type PlaceContext,
  type PlaceEvent,
  type PlaceRow,
  type Projection
} from "spell/places/places.types"
import { SaveQueue } from "spell/places/SaveQueue"
import type { SRV } from "spell/server"
import type { FolderOperation, FolderPlace } from "spell/server/places"
import { SP } from "spell/parser/spell"
import { isSpaceName } from "spell/app/spaces/models/spaceNames"
import type { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"

import type { SpaceMembers } from "./SpaceMembers"

/** Where a space keeps what it projects, by name:  in its `__settings/`, so never listed, read direct or exported. */
const PROJECTIONS_FILE = "__settings/projections.json5"

/** How long after a write the target didn't take it tries again, ms. */
const RETRY_MS = 5000

/** A list file's name, `signups.list.json`:  its collection's, before the suffix. */
const LIST_FILE = /^(.+)\.list\.json$/

/****************
 * ### `SpaceProjections`
 * What one space projects:  part of its data, written into other spaces where their readers can see it
 * (epic `atmosphere` P17, Q16 A).
 *
 * ```ts
 * await projections.set("published_sheet", { into: "@rs/picnic", fields: ["person", "shift"] }, context)
 * projections.written(events)            // a write went through on the space:  each projection follows it
 * await projections.rebuild("published_sheet")
 * ```
 *
 * - A program says one in a line or two (`the published sheet is a projection of the sign up sheet`);  a manager's
 *   page tells this space (`setProjection`), which keeps it in its `__settings/projections.json5`.
 * - Only the fields named are shown:  a new field stays private until someone adds it.
 * - FROM WHAT'S THERE:  the space's `FolderPlace` tells of each write (`onWritten`);  each thing is written whole into
 *   the target as Spell itself (no identity, as the org), or removed there once it leaves the view.
 * - A failed write waits in the ONE retry queue (Q19 A), the kit's `SaveQueue`, kept on the server's disk.
 * - REBUILD:  `PlaceCopy` over every collection, with the projection as its view, so nothing is lost.
 * - Who reads the target is its own list's to say;  Spell never decides a read.
 * - Setting one takes a manager of BOTH spaces:  else anyone could write into a space they don't manage.
 * - Node only;  made by the app's `SpaceFolders`, one per space.
 ****************/
export class SpaceProjections {
  /** The source space's address:  `@rs/picnic-private`. */
  readonly address: string
  /** The source's files:  its settings, and which collections it has. */
  private readonly storage: DiskStorage
  /** The source's members, for who may set one. */
  private readonly members: SpaceMembers
  /** A space's own place, by its address:  the source, and each target. */
  private readonly placeAt: (address: string) => Promise<FolderPlace | undefined>
  /** A space's members, by its address:  for a target's manager. */
  private readonly membersAt: (address: string) => SpaceMembers | undefined
  /** Each target's changes, sent in order until each goes through. */
  private readonly queue: SaveQueue
  /** What it projects, by name, read once. */
  private kept: Promise<Record<string, Projection>> | undefined

  constructor({
    address,
    storage,
    members,
    placeAt,
    membersAt,
    queueStorage,
    retry = RETRY_MS
  }: SpaceProjectionsProps) {
    this.address = address
    this.storage = storage
    this.members = members
    this.placeAt = placeAt
    this.membersAt = membersAt
    this.queue = new SaveQueue({
      key: `projections:${address}`,
      storage: () => queueStorage,
      save: () => this.sendQueued(),
      wait: 0,
      retry
    })
    // what a restart left unsent goes now
    if (this.unsent.length) this.queue.changed({ now: true })
  }

  /** What it projects, by name. */
  projections(): Promise<Record<string, Projection>> {
    const kept = (this.kept ??= readJSON5<Record<string, Projection>>(this.storage, PROJECTIONS_FILE)
      .then((said) => said ?? {})
      .catch(() => ({})))
    return kept
  }

  /** Resolves once every queued change has gone, or failed and waits to try again:  `true` when nothing's left. */
  get settled(): Promise<boolean> {
    return this.queue.settled
  }

  /** The changes not yet in their targets, oldest first. */
  get unsent(): readonly QueuedChange[] {
    return this.queue.kept<QueuedChange[]>() ?? []
  }

  /** What `SpaceFolders` merges into the space's own operations:  see `SPACE_PROJECTION_OPERATIONS`. */
  get operations(): Record<string, FolderOperation> {
    return {
      [SPACE_PROJECTION_OPERATIONS.projections]: async (_input, context) => {
        await this.members.askerOrDie(context, "see what it projects", "canRead")
        return this.projections()
      },
      [SPACE_PROJECTION_OPERATIONS.set]: async (input, context) => {
        const { name, ...projection } = (input ?? {}) as { name?: unknown } & Partial<Projection>
        return this.set(nameOrDie(name), projectionOrDie(projection), context)
      },
      [SPACE_PROJECTION_OPERATIONS.rebuild]: async (input, context) => {
        await this.members.askerOrDie(context, "rebuild what it projects", "canManage")
        return this.rebuild(nameOrDie((input as { name?: unknown } | undefined)?.name))
      }
    }
  }

  /**
   * Keep `projection` as `name`, and build it, when it's new or changed:  the same again changes nothing.
   * - Returns what the rebuild did, or `{ unchanged: true }`.
   * - throws `PlaceError` `"refused"`, `"role"`, for anyone who doesn't manage both spaces;
   *   `"not found"` for a target that's no space's own folder
   */
  async set(name: string, projection: Projection, context: PlaceContext = {}): Promise<object> {
    await this.members.askerOrDie(context, "project its data", "canManage")
    const target = this.membersAt(projection.into)
    if (!target) {
      throw new PlaceError(`${projection.into} isn't a space's own folder:  a projection is written into one`, {
        cause: { kind: "not found" }
      })
    }
    await target.askerOrDie(context, `write a projection into ${projection.into}`, "canManage")
    const kept = await this.projections()
    if (JSON.stringify(kept[name]) === JSON.stringify(projection)) return { unchanged: true }
    this.kept = Promise.resolve({ ...kept, [name]: projection })
    await writeJSON5(this.storage, PROJECTIONS_FILE, await this.kept)
    return this.rebuild(name)
  }

  /**
   * Write projection `name` again from nothing:  every collection of the space, through its view (`PlaceCopy`).
   * - throws `PlaceError` `"not found"` for a name it doesn't project, or a target with no folder
   */
  async rebuild(name: string): Promise<{ inserted: number; updated: number; removed: number }> {
    const projection = (await this.projections())[name]
    if (!projection)
      throw new PlaceError(`${this.address} projects nothing called "${name}"`, { cause: { kind: "not found" } })
    const [from, to] = [await this.placeAt(this.address), await this.placeAt(projection.into)]
    if (!from || !to) {
      throw new PlaceError(`A projection of ${this.address} into ${projection.into} needs both spaces' folders`, {
        cause: { kind: "not found" }
      })
    }
    const total = { inserted: 0, updated: 0, removed: 0 }
    for (const collection of await this.collections()) {
      const view = (row: PlaceRow) => projectedRow(projection, row)
      const done = await new PlaceCopy({ from, to }).copy(collection, { view })
      total.inserted += done.inserted
      total.updated += done.updated
      total.removed += done.removed ?? 0
    }
    return total
  }

  /** SIDE EFFECT:  these writes went through on the space:  each projection's change queued, and sent.  NEVER throws. */
  written = (written: readonly PlaceEvent[]): void => {
    void this.queueChanges(written).catch((error: unknown) => {
      console.error(`SpaceProjections:  ${this.address}'s projections couldn't follow a write`, error)
    })
  }

  /** Stop sending:  what's unsent stays on the disk, for the next start. */
  stop(): void {
    this.queue.stop()
  }

  ////////////////
  // ## Following writes
  ////////////////

  /** Each projection's change for each write, queued and sent. */
  private async queueChanges(written: readonly PlaceEvent[]): Promise<void> {
    const projections = Object.values(await this.projections())
    if (!projections.length) return
    const changes: QueuedChange[] = []
    for (const { into, ...projection } of projections) {
      for (const { collection, id, row } of written) {
        const shown = row && projectedRow({ into, ...projection }, row)
        changes.push(shown ? { into, collection, id, row: shown } : { into, collection, id })
      }
    }
    this.queue.keep([...this.unsent, ...changes])
    this.queue.changed({ now: true })
  }

  /** Send every queued change, oldest first, each kept until it's gone.  - throws a target's refusal for now */
  private async sendQueued(): Promise<void> {
    for (let [next] = this.unsent; next; [next] = this.unsent) {
      await this.send(next)
      this.queue.keep(this.unsent.slice(1))
    }
  }

  /** One change into its target, as Spell itself:  the thing whole, or gone, if it's there. */
  private async send({ into, collection, id, row }: QueuedChange): Promise<void> {
    const target = await this.placeAt(into)
    if (!target) return console.error(`SpaceProjections:  ${into} has no folder;  "${collection}" ${id} dropped`)
    const isThere = (await target.bodyOf(collection, id)) !== undefined
    const change: PlaceChange | undefined = row
      ? { kind: "insert", collection, id, fields: row }
      : isThere
        ? { kind: "delete", collection, id }
        : undefined
    if (change) await target.apply([change])
  }

  /** The space's collections:  each list file's, but spaces' own `__` names. */
  private async collections(): Promise<string[]> {
    return (await this.storage.list("")).flatMap((name) => {
      const collection = LIST_FILE.exec(name)?.[1]
      return collection && !collection.startsWith("__") && !isSpaceName(collection) ? [collection] : []
    })
  }
}

/** Constructor props of `SpaceProjections`. */
export type SpaceProjectionsProps = {
  /** The source space's address:  `@rs/picnic-private`. */
  address: string
  /** The source's files. */
  storage: DiskStorage
  /** The source's members. */
  members: SpaceMembers
  /** A space's own place, by its address. */
  placeAt: (address: string) => Promise<FolderPlace | undefined>
  /** A space's members, by its address:  `undefined` for no space's own folder. */
  membersAt: (address: string) => SpaceMembers | undefined
  /** Where its unsent changes are kept:  one file for every space's (`SRV.FileStorage`). */
  queueStorage: SRV.FileStorage
  /** How long after a change the target didn't take it tries again, ms:  default `RETRY_MS`. */
  retry?: number
}

/** One change waiting for its target:  a thing's projected fields, or none, for a thing that left the view. */
type QueuedChange = {
  /** The target space's address. */
  into: string
  /** The collection, the same name in both spaces. */
  collection: string
  /** The thing's id, the same in both. */
  id: string
  /** What it shows of the thing:  left out, the thing's gone from the view. */
  row?: PlaceRow
}

/** A projection's name, as a program's line makes it:  `published_sheet`.  - throws `TypeError` */
function nameOrDie(name: unknown): string {
  if (typeof name === "string" && name) return name
  throw new TypeError(`SpaceProjections:  a projection needs a name, not ${JSON.stringify(name)}`)
}

/** A projection as sent:  a space's address, fields named, a filter of text.  - throws `TypeError` */
function projectionOrDie({ into, fields, where }: Partial<Projection>): Projection {
  if (typeof into !== "string" || !SP.SpellLocation.isAddress(into)) {
    throw new TypeError(
      `SpaceProjections:  a projection is written into a space, by its address, not ${JSON.stringify(into)}`
    )
  }
  if (!Array.isArray(fields) || !fields.length || !fields.every((field) => typeof field === "string")) {
    throw new TypeError("SpaceProjections:  a projection shows fields, by name")
  }
  const isFilter = where === undefined || Object.values(where).every((text) => typeof text === "string")
  if (!isFilter) throw new TypeError("SpaceProjections:  a projection's filter is fields and their text")
  return { into, fields, ...(where && Object.keys(where).length ? { where } : {}) }
}
