import { SPELL_FILE, SpaceRefusal, type AtProtoSpace, type BlobRef, type SpaceFileRecord } from "./AtProtoSpace"
import {
  fileKeyFor,
  type SpaceFileBytes,
  type SpaceFileInfo,
  type SpaceFiles,
  type SpaceFileWrite
} from "./places.types"

/** What a host says for a record that isn't there. */
const NOT_THERE = "RecordNotFound"

/****************
 * ### `AtProtoSpaceFiles`
 * A space's FILES in a real AT Protocol Space (epic `atmosphere` P15):  the same calls Spell's own server answers
 * (`SpaceFiles`;  its `FolderFiles`), so a space can move between them and its programs never notice.
 *
 * ```ts
 * const files = new AtProtoSpaceFiles({ space })          // signed in as the org's account, as Spell writes (Q6)
 * await files.write([{ name: "poster.png", mimeType: "image/png", bytes }])
 * ```
 *
 * - A file is a blob and one record naming it, as P12 found the alpha keeps one (`AtProtoSpace.writeFile()`):
 *   the record's key is its name's (`fileKeyFor()`), so writing a name again replaces it.
 * - Whose files:  one account's records in the space (`author`), the space's authority unless said:
 *   Spell writes every file as the org's account.
 * - Several at once:  every blob goes up first, then the records, one at a time.
 *   - The alpha has no batch of records in a space, so for a moment someone may see some of them changed:
 *     NOT all together, as on Spell's own server.
 * - The host's own checks stand:  who reads is the Space's member list;  who writes, the signed-in account itself.
 *   - `context` is taken and left alone:  the signed-in account is who's asking.
 * - Bytes nothing points to any more are the writer's host's to delete.
 * - Taken by file, in no barrel, as `AtProtoSpace` is.
 ****************/
export class AtProtoSpaceFiles implements SpaceFiles {
  /** The space. */
  readonly space: AtProtoSpace
  /** Whose files they are:  the account whose records are read. */
  private readonly author: string
  /** The collection a file's record is in. */
  private readonly collection: string

  constructor({ space, author = space.authority, collection = SPELL_FILE }: AtProtoSpaceFilesProps) {
    this.space = space
    this.author = author
    this.collection = collection
  }

  /** Every file, by name.  - throws `SpaceRefusal` */
  async list(): Promise<SpaceFileInfo[]> {
    const records = await this.space.records(this.author, this.collection)
    return records
      .map(({ value }) => infoOf(value as SpaceFileRecord))
      .sort((one, other) => (one.name < other.name ? -1 : 1))
  }

  /** The file named `name`, with its bytes:  `undefined` for none.  - throws `SpaceRefusal` for any other no */
  async read(name: string): Promise<SpaceFileBytes | undefined> {
    try {
      const file = await this.space.file(this.author, fileKeyFor(name), this.collection)
      return { ...infoOf(file), bytes: file.bytes }
    } catch (error) {
      if (error instanceof SpaceRefusal && error.error === NOT_THERE) return undefined
      throw error
    }
  }

  /** Write `files`:  every blob up first, then each record.  - throws `SpaceRefusal`;  `TypeError` for a bad name */
  async write(files: readonly SpaceFileWrite[]): Promise<SpaceFileInfo[]> {
    const byKey = new Map(files.map((file) => [fileKeyFor(file.name), file]))
    const blobs = new Map<string, BlobRef>()
    for (const [key, { bytes, mimeType }] of byKey) blobs.set(key, await this.space.upload(bytes, mimeType))
    for (const [key, { name }] of byKey) {
      await this.space.putFile(key, { name, blob: blobs.get(key)! }, this.collection)
    }
    return [...byKey.values()].map(({ name, mimeType, bytes }) => ({ name, mimeType, size: bytes.length }))
  }

  /** Remove the files named `names`;  one that isn't there is skipped.  - throws `SpaceRefusal` for any other no */
  async remove(names: readonly string[]): Promise<void> {
    for (const key of new Set(names.map(fileKeyFor))) {
      await this.space.remove(this.collection, key).catch((error: unknown) => {
        if (!(error instanceof SpaceRefusal && error.error === NOT_THERE)) throw error
      })
    }
  }
}

/** `AtProtoSpaceFiles`' settings. */
export type AtProtoSpaceFilesProps = {
  /** The space, reached as the account that writes its files. */
  space: AtProtoSpace
  /** Whose files are read:  default the space's authority, the org's account Spell writes as. */
  author?: string
  /** The collection a file's record is in:  default Spell's (`SPELL_FILE`). */
  collection?: string
}

/** A file's record as a reader sees it:  its name, type and size. */
function infoOf({ name, mimeType, size }: Pick<SpaceFileRecord, "name" | "mimeType" | "size">): SpaceFileInfo {
  return { name, mimeType, size }
}
