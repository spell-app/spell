import { oneAtATime } from "spell/util/places/ChunkedPlace"
import {
  PlaceError,
  idOfRow,
  type ApplyAnswer,
  type ChangesAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceEvent,
  type PlaceRow,
  type SelectingContext,
  type WatchTarget
} from "spell/util/places/places.types"
import { SRV } from "spell/server"

import type { FolderStorage } from "./FolderPlace"
import { PlaceEvents } from "./PlaceEvents"

/** A one-file place's whole contents:  each collection's rows, by its name. */
type FileContents = Record<string, PlaceRow[]>

/** How many times it reads the file again when someone else saves it first. */
const WRITE_TRIES = 5

/****************
 * ### `FilePlace`
 * One file as a place:  JSON5 holding each collection's rows, `{ recipes: [{ id: "r-1", ... }] }` (epic `data` P5, J6).
 *
 * ```ts
 * new FilePlace({ storage: new ChunkFiles({ root: "." }), path: "recipes.json5" })
 * ```
 *
 * - Read whole each time, so an edit in VS Code shows on the next read;  a `watch()` is told what changed, thing by thing,
 *   through the storage's own watch.
 * - Written whole, keeping every comment in it (`SRV.DataFile.textFor()`), so a batch is all or none:  `atomic`.
 * - A thing's version is the FILE's, so a save by anyone means "out of date" for every thing:  the engine merges per field,
 *   so only one field truly changed by both is a conflict.
 * - On a storage shaped like `FolderStorage`, as `FolderPlace` is.
 * - Node only.
 ****************/
export class FilePlace implements Place {
  /** The files. */
  private readonly storage: FolderStorage
  /** The one file. */
  private readonly path: string
  /** The field holding a thing's id. */
  private readonly idField: string
  /** Who's watching, and what's been heard. */
  private readonly events: PlaceEvents
  /** Takes writes one at a time. */
  private readonly inTurn = oneAtATime()
  /** The file's version when it was last read, once it's known. */
  private version: string | undefined
  /** Each thing as it was last seen, as text:  what a change on the disk is told against.  Left out:  it's not been read. */
  private lastSeen: Map<string, string> | undefined

  constructor({ storage, path, idOf = "id" }: FilePlaceProps) {
    this.storage = storage
    this.path = path
    this.idField = idOf
    this.events = new PlaceEvents({ onFirstWatcher: () => this.hearTheDisk() })
  }

  /** What it can do:  all the writes at once, and no querying of its own. */
  describe(): PlaceCapabilities {
    return {
      idOf: this.idField,
      filter: "none",
      sort: "none",
      select: "none",
      page: "none",
      write: ["insert", "update", "delete"],
      atomic: true,
      ...(this.storage.writeIfVersion && this.storage.versionOf && { versionCheck: true }),
      live: "push",
      abort: "soft"
    }
  }

  ////////////////
  // ## Reading
  ////////////////

  /** Every row of `collection`:  none if it's not in the file. */
  async list(collection: string, _query: ListQuery, { signal }: PlaceContext = {}): Promise<ListAnswer> {
    signal?.throwIfAborted()
    const { contents } = await this.readFile()
    return { rows: contents[collection] ?? [], version: this.events.version, handled: {} }
  }

  /** The rows of `collection` with these ids. */
  async getMany(collection: string, ids: readonly string[], { signal }: SelectingContext = {}): Promise<PlaceRow[]> {
    signal?.throwIfAborted()
    const { contents } = await this.readFile()
    return (contents[collection] ?? []).filter((row) => ids.includes(this.idOf(row) ?? ""))
  }

  /** The file's version when it was last read:  it's the version of everything in it. */
  versionOf(_collection: string, _id: string): string | undefined {
    return this.version
  }

  /** What changed in `collection` since `token`, a list's `version`. */
  async changesSince(collection: string, token: string, context: PlaceContext = {}): Promise<ChangesAnswer> {
    const { rows } = await this.list(collection, {}, context)
    return this.events.changesSince(collection, token) ?? { rows, removed: [], token: this.events.version }
  }

  /** Tell `onEvent` of each change to `target`, by this place or on the disk.  Returns what stops it. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    return this.events.watch(target, onEvent)
  }

  /** The file now, its version noted first:  so a save just after makes that version old.  Anything new in it is told. */
  private async readFile(): Promise<{ contents: FileContents; version: string | undefined; text: string }> {
    const version = this.storage.versionOf?.(this.path)
    const text = (await this.storage.read(this.path)) ?? ""
    const contents = text.trim() ? SRV.DataFile.parse<FileContents>(text) : {}
    this.version = version
    this.tellDifferences(contents)
    return { contents, version, text }
  }

  /** Tell whoever's watching what's different from what was last seen. */
  private tellDifferences(contents: FileContents): void {
    const now = new Map<string, string>()
    const events: PlaceEvent[] = []
    for (const [collection, rows] of Object.entries(contents)) {
      for (const row of rows) {
        const id = this.idOf(row)
        if (id === undefined) continue
        const key = `${collection}\n${id}`
        const text = JSON.stringify(row)
        now.set(key, text)
        if (this.lastSeen && this.lastSeen.get(key) !== text) events.push({ collection, id, row })
      }
    }
    for (const key of this.lastSeen?.keys() ?? []) {
      if (now.has(key)) continue
      const [collection, id] = key.split("\n")
      events.push({ collection: collection!, id: id! })
    }
    this.lastSeen = now
    for (const event of events) this.events.tell(event)
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes, all or none, in one save.
   * - throws `PlaceError`:  not found, or out of date if the file has moved on from a change's `version`
   */
  apply(changes: readonly PlaceChange[], { signal }: PlaceContext = {}): Promise<ApplyAnswer> {
    return this.inTurn(async () => {
      signal?.throwIfAborted()
      for (let tries = 1; ; tries++) {
        const { contents, version, text } = await this.readFile()
        const stale = changes.find((change) => change.version !== undefined && change.version !== version)
        if (this.describe().versionCheck && stale) this.outOfDate(stale)
        const rows = changes.map((change) => this.madeIn(contents, change)).filter((row) => row !== undefined)
        const written = SRV.DataFile.textFor(text, contents)
        try {
          await this.writeFile(written, version)
        } catch (error) {
          if (tries < WRITE_TRIES && error instanceof PlaceError && error.kind === "out of date") continue
          throw error
        }
        this.version = this.storage.versionOf?.(this.path)
        this.tellDifferences(contents)
        return { rows }
      }
    })
  }

  /** Write the whole file, only if it's still at `version`, on a storage that can tell. */
  private async writeFile(text: string, version: string | undefined): Promise<void> {
    if (version !== undefined && this.storage.writeIfVersion)
      await this.storage.writeIfVersion(this.path, text, version)
    else await this.storage.write(this.path, text)
  }

  /** Make `change` in `contents`:  its row, unless it deleted one.  - throws `PlaceError` `"not found"` */
  private madeIn(contents: FileContents, { kind, collection, id, fields }: PlaceChange): PlaceRow | undefined {
    if (id === undefined) {
      throw new TypeError(`FilePlace.apply():  a change in "${collection}" needs an id;  this place makes none`)
    }
    const rows = (contents[collection] ??= [])
    const at = rows.findIndex((row) => this.idOf(row) === id)
    if (kind === "insert") {
      const row = { ...fields, [this.idField]: id }
      if (at < 0) rows.push(row)
      else rows[at] = row
      return row
    }
    if (at < 0) {
      throw new PlaceError(`FilePlace.apply():  "${collection}" holds nothing with the id "${id}"`, {
        cause: { kind: "not found" }
      })
    }
    if (kind === "delete") {
      rows.splice(at, 1)
      return undefined
    }
    return Object.assign(rows[at]!, fields)
  }

  /** - throws `PlaceError` `"out of date"` */
  private outOfDate({ collection, id, version }: PlaceChange): never {
    throw new PlaceError(
      `FilePlace.apply():  "${id}" in "${collection}" has changed since ${version};  read it again`,
      {
        cause: { kind: "out of date" }
      }
    )
  }

  /** `row`'s id. */
  private idOf(row: PlaceRow): string | undefined {
    return idOfRow(row, this.idField)
  }

  /** Hear the storage:  the file changing means reading it.  Returns what stops it. */
  private hearTheDisk(): () => void {
    void this.readFile().catch(() => {})
    return this.storage.watch(this.path, () => {
      // half typed:  logged, and the next save is read again
      this.readFile().catch((error: unknown) => console.error(`FilePlace:  can't read ${this.path} yet:`, error))
    })
  }
}

/** Constructor props of a `FilePlace`. */
export type FilePlaceProps = {
  /** The storage it's in. */
  storage: FolderStorage
  /** The file, from the storage's root. */
  path: string
  /** The field holding a thing's id;  default `id`. */
  idOf?: string
}
