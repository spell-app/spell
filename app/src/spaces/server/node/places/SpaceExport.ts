import { mkdir, writeFile } from "fs/promises"
import { dirname, join } from "path"

import { JsonChunks } from "spell/places/JsonChunks"
import { idOfRow, type PlaceRow, type SpaceFileInfo, type SpaceFiles } from "spell/places/places.types"
import type { FolderPlace } from "spell/server/places"
import { zipped } from "spell/app/spaces/server/node/storage/zip"

import type { SpaceMembers } from "./SpaceMembers"

/** What a list file's name ends in, after its collection. */
const LIST_ENDING = ".list.json"

/** The export's own note, beside its files:  what's in it, how to run a program on it, and leaving Spell with the id. */
export const EXPORT_NOTE = "about-this-export.txt"

/** Who was in the space, as the export holds it. */
export const EXPORT_MEMBERS = "members.json"

/** The folder a space's files are in, in the export, each by its name (epic `atmosphere` P15). */
export const EXPORT_FILES = "files"

/** The list of the space's files, in the export:  each one's name, type, size and its file there. */
export const EXPORT_FILES_LIST = "files.json"

/** Where the server's terms are, on its own address:  the promise to hand over a space's keys (epic `atmosphere` T5). */
export const TERMS_PATH = "/terms"

/****************
 * ### `SpaceExport`
 * One space, as a folder of plain JSON files anyone can take away:  LEAVING SPELL (epic `atmosphere` P7).
 *
 * ```ts
 * const out = await SpaceExport.of({ address: "@family/cookbook", place, storage, members, identity: "ana@spell" })
 * await out.writeTo("./my-export")      // or `out.zip()`, the download
 * ```
 *
 * - Its files are laid out as the space's own folder is (`JsonChunks`):
 *   so a program runs on it with one line changed, read as from any web server.
 *   - `family cookbook is a data folder at "./my-export"`, the folder beside its page
 *   - `recipes.list.json`, every thing of a collection, whole
 *   - `recipes/r-1.json`, each thing
 *   - `members.json`, who was in it and what their role let them do, for someone who's a member
 *   - `files/poster.png`, each of its FILES as itself (epic `atmosphere` P15), and `files.json` listing them:
 *     each one's name, type, size and its file in the export
 *   - `about-this-export.txt`, in plain words:  what this is, how to run a program on it, and what leaving with its id
 *     means while Spell holds no keys for it (epic `atmosphere` T5, Q10 A)
 * - Read THROUGH the space's place, as who's asking:
 *   so it's refused to someone who can't read it, and leaves out what Spell took down.
 * - Never Spell's own `__` files (its takedown log, its settings):  they aren't the space's data.
 * - Node only;  `SpaceFolders` makes one, for its route and for `spell space export`.
 ****************/
export class SpaceExport {
  /** The space's address:  `@family/cookbook`. */
  readonly address: string
  /** Each file, by its path in the export, and its bytes. */
  readonly files: ReadonlyArray<readonly [string, Buffer]>

  constructor(address: string, files: ReadonlyArray<readonly [string, Buffer]>) {
    this.address = address
    this.files = files
  }

  /**
   * The space at `address`, read through `place` as `identity`.
   * - throws what the place throws for a read:
   *   `PlaceError` `"refused"` for someone who can't read it, or for a space taken down
   */
  static async of({ address, place, storage, members, files: kept, identity, now = new Date() }: SpaceExportProps) {
    const json = new JsonChunks()
    const context = identity === undefined ? {} : { identity }
    const files: [string, Buffer][] = []
    const collections = (await storage.list(""))
      .filter((name) => name.endsWith(LIST_ENDING) && !name.startsWith("__"))
      .map((name) => json.collectionOfFolder(name.slice(0, -LIST_ENDING.length)))
    for (const collection of collections) {
      const { rows } = await place.list(collection, {}, context)
      const ids = rows.flatMap((row) => idOfRow(row, json.idOf) ?? [])
      const things: PlaceRow[] = ids.length ? await place.getMany(collection, ids, context) : []
      files.push([json.listAddress(collection), Buffer.from(json.listText({ rows: things }))])
      for (const thing of things) {
        files.push([json.bodyAddress(collection, `${idOfRow(thing, json.idOf)}`), Buffer.from(json.bodyText(thing))])
      }
    }
    const listed: Array<SpaceFileInfo & { file: string }> = []
    for (const info of kept ? await kept.list(context) : []) {
      const file = await kept!.read(info.name, context)
      if (!file) continue
      const path = `${EXPORT_FILES}/${fileNameFor(info.name)}`
      files.push([path, Buffer.from(file.bytes)])
      listed.push({ ...info, file: path })
    }
    if (listed.length) files.push([EXPORT_FILES_LIST, Buffer.from(`${JSON.stringify(listed, null, 2)}\n`)])
    const isMember = identity === undefined || !!(await members.memberOf(identity))
    if (isMember) files.push([EXPORT_MEMBERS, Buffer.from(`${JSON.stringify(await members.list(), null, 2)}\n`)])
    files.push([EXPORT_NOTE, Buffer.from(noteFor({ address, spaceId: members.spaceId, collections, now }))])
    return new SpaceExport(address, files)
  }

  /** The export as one zip file:  the download. */
  zip(): Buffer {
    return zipped(this.files)
  }

  /** SIDE EFFECT:  write every file into `folder`, made if it isn't there. */
  async writeTo(folder: string): Promise<void> {
    for (const [path, bytes] of this.files) {
      const file = join(folder, ...path.split("/"))
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, bytes)
    }
  }

  /** The zip's file name, for a download:  `family-cookbook.zip`. */
  get fileName(): string {
    return `${this.address.replace(/^@/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-")}.zip`
  }
}

/** What `SpaceExport.of()` reads. */
export type SpaceExportProps = {
  /** The space's address:  `@family/cookbook`. */
  address: string
  /** Its place, through which every thing is read, as who's asking. */
  place: FolderPlace
  /** Its folder's files, for which collections it has. */
  storage: { list(folder: string): Promise<string[]> }
  /** Who's in it. */
  members: SpaceMembers
  /** Its files, read as who's asking:  left out, none. */
  files?: SpaceFiles
  /** Who's asking:  left out, the server's own code (a command on this machine), trusted. */
  identity?: string
  /** When it is:  the note's date. */
  now?: Date
}

/**
 * A file's name as one file in the export's folder:  every `/`, `\\` and `:` a `-`, and no dot file.
 * - So a name can never climb out of the folder it's written into (`writeTo()`).
 */
function fileNameFor(name: string): string {
  return name.replace(/[/\\:\0]/g, "-").replace(/^\.+/, (dots) => "_".repeat(dots.length))
}

/** The export's note, in plain words. */
function noteFor({
  address,
  spaceId,
  collections,
  now
}: {
  address: string
  spaceId: string
  collections: string[]
  now: Date
}): string {
  const first = collections[0] ?? "recipes"
  return `This is the space ${address}, as Spell held it on ${now.toISOString().slice(0, 10)}.

What's in it
- Every thing in it is a plain JSON file, yours to keep, read or move anywhere.
- ${first}.list.json lists every ${first} thing;  ${first}/<id>.json holds each one.
- ${EXPORT_MEMBERS} is who was in the space, and what each person's role let them do.
- ${EXPORT_FILES}/ holds the space's files, pictures and the like, each as itself;  ${EXPORT_FILES_LIST} lists them.

Running your program on it, without Spell
- Put this folder beside your program's page, and change the one line that says where its data lives:
    family cookbook is a data folder at "./<this folder's name>"
- Nothing else in the program changes.

Leaving Spell with the space's id
- This space's id, ${spaceId}, is Spell's own:  it has no keys yet, so there are none to hand over.
  The data leaves as these plain files, and they're all of it.
- When Spell moves spaces to AT Protocol's Spaces, each one gets a real AT Protocol id, with keys.
  Spell promises to hand those keys over to the space's admins when they ask, so the space can move to another host.
- Spell's terms say so:  ${TERMS_PATH}, on Spell's server.

Deleting
- Deleting the space in Spell removes it at once.  Spell's nightly backups still hold it until they age out.
`
}
