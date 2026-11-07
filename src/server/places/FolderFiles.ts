import {
  FILES_COLLECTION,
  fileKeyFor,
  type PlaceChange,
  type PlaceContext,
  type PlaceRow,
  type SpaceFileBytes,
  type SpaceFileInfo,
  type SpaceFiles,
  type SpaceFileWrite
} from "spell/places/places.types"

import { contentHash } from "./contentVersion"
import type { FolderPlace } from "./FolderPlace"

/** The field of a file's record holding the hash its bytes are kept under:  never handed to a reader. */
const HASH_FIELD = "hash"

/****************
 * ### `FolderFiles`
 * A space's FILES on Spell's own server (epic `atmosphere` P15):  the same calls a real Space answers
 * (`SpaceFiles`), on the space's own folder.
 *
 * ```ts
 * const files = new FolderFiles({ place, bytes })      // the app's `SpaceFolders` makes one per space
 * await files.write([{ name: "poster.png", mimeType: "image/png", bytes }], { identity: "ana@spell" })
 * ```
 *
 * - A file is its bytes and ONE record naming it, as an AT Protocol Space keeps one (P12):
 *   - the record is a thing of the space's folder, in `__files` (`FILES_COLLECTION`):  its name, type, size and the
 *     hash of its bytes;  its id is its name's key (`fileKeyFor()`)
 *   - the bytes are kept by their hash (`contentHash()`), in `__blobs/` (`FileBytes`):  two files with the same bytes
 *     keep one copy
 *   - nobody ever sees the hash:  a reader gets a name, a type and a size
 * - Every record goes through the space's `FolderPlace`, so a file is checked as a thing is:
 *   members and roles, `publicWrite`, takedowns (a file is taken down as its record is), and the space's limit.
 * - The bytes count against the SAME limit as the things:  the folder's `roomForOrDie()`, before they're kept.
 * - Several at once:  every file's bytes first, then ONE `apply()` of their records, so nobody sees half.
 *   - The records refused (a role that can't write), the bytes just kept go again.
 * - Deleting:  bytes go once no record points to them, a taken-down one's included (`FolderPlace.everyThingKept()`),
 *   so a file put back still has its bytes.
 * - Node only;  imports the kit's places by file, as the rest of `spell/server/places` does.
 ****************/
export class FolderFiles implements SpaceFiles {
  /** The space's folder:  its records, and every check. */
  private readonly place: FolderPlace
  /** Where the bytes are kept, by hash. */
  private readonly bytes: FileBytes

  constructor({ place, bytes }: FolderFilesProps) {
    this.place = place
    this.bytes = bytes
  }

  /** Every file, by name, as `context` may read them.  - throws what the place throws for a read */
  async list(context: PlaceContext = {}): Promise<SpaceFileInfo[]> {
    const { rows } = await this.place.list(FILES_COLLECTION, {}, context)
    return rows.map(infoOf).sort((one, other) => (one.name < other.name ? -1 : 1))
  }

  /** The file named `name`, with its bytes:  `undefined` for none, or one taken down.  - throws as `list()` */
  async read(name: string, context: PlaceContext = {}): Promise<SpaceFileBytes | undefined> {
    const [record] = await this.place.getMany(FILES_COLLECTION, [fileKeyFor(name)], context)
    const hash = record?.[HASH_FIELD]
    if (!record || typeof hash !== "string") return undefined
    const bytes = await this.bytes.read(hash)
    if (!bytes) {
      console.error(`FolderFiles:  "${name}" points to bytes that aren't there (${hash});  it reads as no file`)
      return undefined
    }
    return { ...infoOf(record), bytes }
  }

  /**
   * Write `files`, new or replacing the ones with their names:  bytes first, then their records together.
   * - Two with one name:  the last one.
   * - throws `TypeError` for a name no file may have;  `PlaceError` as the place refuses, or `"over the ceiling"`
   */
  async write(files: readonly SpaceFileWrite[], context: PlaceContext = {}): Promise<SpaceFileInfo[]> {
    const byKey = new Map(files.map((file) => [fileKeyFor(file.name), file]))
    const kept = await this.keptByKey()

    // the bytes first:  each new one counted against the space's limit, then kept by its hash
    const hashes = new Map([...byKey].map(([key, { bytes }]) => [key, contentHash(bytes)]))
    const fresh = new Map<string, Uint8Array>()
    for (const [key, { bytes }] of byKey) {
      const hash = hashes.get(key)!
      if (!fresh.has(hash) && !(await this.bytes.has(hash))) fresh.set(hash, bytes)
    }
    await this.place.roomForOrDie([...fresh.values()].reduce((total, bytes) => total + bytes.length, 0))
    for (const [hash, bytes] of fresh) await this.bytes.write(hash, bytes)

    // then every record, in one go
    const changes: PlaceChange[] = [...byKey].map(([key, { name, mimeType, bytes }]) => ({
      kind: kept.has(key) ? "update" : "insert",
      collection: FILES_COLLECTION,
      id: key,
      fields: { name, mimeType, size: bytes.length, [HASH_FIELD]: hashes.get(key)! }
    }))
    try {
      await this.place.apply(changes, context)
    } catch (error) {
      await this.letGoOf([...fresh.keys()])
      throw error
    }
    await this.letGoOf([...byKey.keys()].flatMap((key) => hashOf(kept.get(key)) ?? []))
    return [...byKey.values()].map(({ name, mimeType, bytes }) => ({ name, mimeType, size: bytes.length }))
  }

  /** Remove the files named `names`:  their records together, then the bytes nothing points to.  - throws as `write()` */
  async remove(names: readonly string[], context: PlaceContext = {}): Promise<void> {
    const kept = await this.keptByKey()
    const gone = [...new Set(names.map(fileKeyFor))].filter((key) => kept.has(key))
    if (!gone.length) return
    await this.place.apply(
      gone.map((id) => ({ kind: "delete", collection: FILES_COLLECTION, id })),
      context
    )
    await this.letGoOf(gone.flatMap((key) => hashOf(kept.get(key)) ?? []))
  }

  /** Every file's record kept, by its key, taken down or not. */
  private async keptByKey(): Promise<Map<string, PlaceRow>> {
    const rows = await this.place.everyThingKept(FILES_COLLECTION)
    return new Map(rows.map((row) => [`${row.id}`, row]))
  }

  /** Let go of each of `hashes` no record points to any more.  - NEVER throws:  bytes left over are logged */
  private async letGoOf(hashes: readonly string[]): Promise<void> {
    if (!hashes.length) return
    try {
      const pointedTo = new Set((await this.place.everyThingKept(FILES_COLLECTION)).flatMap((row) => hashOf(row) ?? []))
      for (const hash of new Set(hashes)) if (!pointedTo.has(hash)) await this.bytes.remove(hash)
    } catch (ignored) {
      console.error(
        "FolderFiles:  couldn't let go of bytes no file points to;  they stay until the next change:",
        ignored
      )
    }
  }
}

/** Where a space's files' bytes are kept, each by its hash:  the app's are a folder of the space, `__blobs/`. */
export type FileBytes = {
  /** The bytes kept under `hash`:  `undefined` for none. */
  read(hash: string): Promise<Uint8Array | undefined>
  /** Are there bytes kept under `hash`? */
  has(hash: string): Promise<boolean>
  /** SIDE EFFECT:  keep `bytes` under `hash`, all at once. */
  write(hash: string, bytes: Uint8Array): Promise<void>
  /** SIDE EFFECT:  let go of the bytes under `hash`;  nothing if there are none. */
  remove(hash: string): Promise<void>
}

/** Constructor props of `FolderFiles`. */
export type FolderFilesProps = {
  /** The space's folder, written by its members. */
  place: FolderPlace
  /** Where its files' bytes are kept. */
  bytes: FileBytes
}

/** A file's record as a reader sees it:  its name, type and size, never its hash. */
function infoOf(record: PlaceRow): SpaceFileInfo {
  return { name: `${record.name}`, mimeType: `${record.mimeType}`, size: Number(record.size) }
}

/** The hash a file's record points to:  `undefined` for none. */
function hashOf(record: PlaceRow | undefined): string | undefined {
  const hash = record?.[HASH_FIELD]
  return typeof hash === "string" ? hash : undefined
}
