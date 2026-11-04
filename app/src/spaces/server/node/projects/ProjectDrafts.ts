/**
 * A project's DRAFTS, PUBLISH and VERSIONS, on disk (epic `editor` P24, in atmosphere's shapes).
 * - Your edits go into your DRAFT, never the public file:  one per person per file, every save overwriting it.
 *   - In the project's own private folder, `__draft/`, at its file's place, named for you and the day
 *     (Q22, Q24):  `Deck.spellml`'s is `__draft/Deck.owen-2026-11-03.spellml`.
 *   - A draft that's the same as the published file is no draft:  saving one deletes it.
 * - PUBLISH writes each of the project's drafts to its public file, keeps the whole project as a new VERSION,
 *   and deletes the drafts.
 *   - A version is a zip of the project, `versions/<project>.<day>-<time>.zip` (Q22), every one kept unless the
 *     project file caps them (`versionsKept`, Q26).
 *   - It refuses (409) when a published file changed since your draft of it started, unless told to anyway (Q25).
 * - The private folders, `__draft/` and `versions/`, are never served:  `isPrivatePath()`, which the routes ask.
 * - Who may publish, and so draft (Q27):  `mayPublish()`, a stand-in until atmosphere's roles.
 * - Node only:  the routes (`project-utils.ts`) are its one caller;  the editor asks through `SPACES.ProjectFiles`.
 * - Its storage moves to ATSpaces later (epic `atmosphere`):  the shapes it answers stay (`SPACES.DraftJSON` ...).
 */
import { createHash } from "crypto"
import { readFile } from "fs/promises"
import JSON5 from "json5"
import { crc32, deflateRawSync, inflateRawSync } from "zlib"

import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { SPACES, type DraftJSON, type PublishJSON, type VersionJSON } from "spell/app/spaces"

import * as fileUtils from "./file-utils"

export class ProjectDrafts {
  /** the project's id, e.g. `@spell/examples/Counter` */
  readonly projectId: string
  /** whose drafts:  this machine's person until sign-in */
  readonly person: string

  constructor(projectId: string, person: string = SPACES.LOCAL_PERSON) {
    this.projectId = projectId
    this.person = person
  }

  /** Is `filePath` (from the project's folder) inside its private folders, `__draft/` or `versions/`? */
  static isPrivatePath(filePath: string): boolean {
    const first = filePath.replace(/^\/+/, "").split("/")[0]
    return first === DRAFT_FOLDER || first === VERSIONS_FOLDER
  }

  /**
   * May `person` publish this project, and so draft it (Q27)?
   * - STAND-IN until atmosphere's roles (who is a Lead of what):  this machine's person may publish anything this
   *   machine serves, as it's theirs.
   */
  mayPublish(): boolean {
    return this.person === SPACES.LOCAL_PERSON
  }

  ////////////////
  // ## Drafts
  ////////////////

  /** Your draft of `filePath`'s text, or `undefined` when you have none. */
  async read(filePath: string): Promise<string | undefined> {
    const path = await this.draftPathOf(filePath)
    return path === undefined ? undefined : ((await fileUtils.loadTextFile(path, "OPTIONAL")) ?? undefined)
  }

  /**
   * Save `contents` as your draft of `filePath`.
   * - The same as the published file:  your draft goes instead.
   * - throws 403 when you may not publish (`mayPublish()`), so may not draft
   */
  async save(filePath: string, contents: string): Promise<void> {
    if (!this.mayPublish()) throw new SRV.HttpError(403, `${this.person} may not draft ${this.projectId}`)
    const published = await fileUtils.loadTextFile(this.publicPath(filePath), "OPTIONAL")
    if (published === contents) return await this.discard(filePath)
    const old = await this.draftPathOf(filePath)
    const path = this.newDraftPath(filePath)
    await fileUtils.saveTextFile(path, contents)
    if (old && old !== path) await fileUtils.deletePath(old)
    const records = await this.records()
    records[filePath] ??= { person: this.person, startedFrom: hashOf(published ?? "") }
    await this.saveRecords(records)
  }

  /** Delete your draft of `filePath`, back to what's published.  Nothing to delete:  nothing happens. */
  async discard(filePath: string): Promise<void> {
    const path = await this.draftPathOf(filePath)
    if (path) await fileUtils.deletePath(path)
    const records = await this.records()
    if (!(filePath in records)) return
    delete records[filePath]
    await this.saveRecords(records)
  }

  /** Your drafts, each with whether its published file changed since it started (`clashes`), and both texts then. */
  async drafts(): Promise<DraftJSON[]> {
    const records = await this.records()
    const answers = await Promise.all(
      Object.entries(records).map(async ([filePath, record]) => {
        const mine = await this.read(filePath)
        if (mine === undefined) return undefined
        const theirs = (await fileUtils.loadTextFile(this.publicPath(filePath), "OPTIONAL")) ?? ""
        const clashes = hashOf(theirs) !== record.startedFrom
        return { filePath, person: record.person, clashes, mine, theirs }
      })
    )
    return answers.filter((draft) => draft !== undefined)
  }

  /** The files you have a draft of, from the project's folder, e.g. `["/Counter.spell"]`:  the index lists new ones. */
  async draftedFiles(): Promise<string[]> {
    return Object.keys(await this.records())
  }

  ////////////////
  // ## Publish
  ////////////////

  /**
   * Publish every draft:  write each to its public file, keep the project as a new version, delete the drafts.
   * - throws 409 when a published file changed since your draft of it started, unless `anyway` (Q25)
   * - Nothing drafted:  nothing written, no version.
   */
  async publish({ anyway = false }: { anyway?: boolean } = {}): Promise<PublishJSON> {
    if (!this.mayPublish()) throw new SRV.HttpError(403, `${this.person} may not publish ${this.projectId}`)
    const drafts = await this.drafts()
    if (!drafts.length) return { published: [] }
    const clashes = drafts.filter((draft) => draft.clashes).map((draft) => draft.filePath)
    if (clashes.length && !anyway) {
      throw new SRV.HttpError(409, `changed since your draft began:  ${clashes.join(", ")}`)
    }
    for (const { filePath, mine } of drafts) {
      await fileUtils.saveTextFile(this.publicPath(filePath), mine)
      await this.discard(filePath)
    }
    const version = await this.keepVersion()
    return { published: drafts.map((draft) => draft.filePath), version }
  }

  ////////////////
  // ## Versions
  ////////////////

  /** The project's versions, newest first. */
  async versions(): Promise<VersionJSON[]> {
    const folder = this.projectPath(VERSIONS_FOLDER)
    if (!(await fileUtils.pathExists(folder))) return []
    const names = await fileUtils.getFolderContents(folder, { namesOnly: true, pattern: /\.zip$/ })
    return names
      .map((name) => ({ name, at: name.slice(this.projectName.length + 1, -".zip".length) }))
      .sort((one, other) => other.at.localeCompare(one.at))
  }

  /**
   * Make a draft of every file version `name` holds that differs from what's published:  restoring is drafting,
   * so nothing public changes until Publish.
   * - Returns the files drafted.
   * - throws 404 when there's no such version
   */
  async restore(name: string): Promise<string[]> {
    const path = this.projectPath(VERSIONS_FOLDER, name)
    if (name.includes("/") || !(await fileUtils.pathExists(path))) {
      throw new SRV.HttpError(404, `${this.projectId} has no version ${name}`)
    }
    const drafted: string[] = []
    for (const [filePath, contents] of unzipped(await readFile(path))) {
      const published = await fileUtils.loadTextFile(this.publicPath(filePath), "OPTIONAL")
      if (published === contents.toString("utf8")) continue
      await this.save(filePath, contents.toString("utf8"))
      drafted.push(filePath)
    }
    return drafted
  }

  /** Zip the project's public files as a new version, then drop the oldest past the project's cap.  Returns its name. */
  private async keepVersion(): Promise<string> {
    const files = await this.publicFiles(this.projectPath())
    const entries = await Promise.all(
      files.map(async (filePath) => [filePath, await readFile(this.publicPath(filePath))] as const)
    )
    // two in the same second:  the second gets `-2`, so no version is ever written over
    const stamp = versionStamp(new Date())
    let name = `${this.projectName}.${stamp}.zip`
    for (let count = 2; await fileUtils.pathExists(this.projectPath(VERSIONS_FOLDER, name)); count++) {
      name = `${this.projectName}.${stamp}-${count}.zip`
    }
    await fileUtils.saveBinaryFile(this.projectPath(VERSIONS_FOLDER, name), zipped(entries))
    const kept = (await fileUtils.loadJSONFile(this.projectPath(SP.PROJECT_FILE), "OPTIONAL"))?.versionsKept
    if (typeof kept === "number" && kept > 0) {
      for (const { name: old } of (await this.versions()).slice(kept)) {
        await fileUtils.deletePath(this.projectPath(VERSIONS_FOLDER, old))
      }
    }
    return name
  }

  /** Every public file under `folder`, from the project's folder:  never the private folders, nor hidden files. */
  private async publicFiles(folder: string, from = ""): Promise<string[]> {
    const names = await fileUtils.getFolderContents(folder, {
      includeFolders: true,
      namesOnly: true,
      ignoreHidden: true
    })
    const files: string[] = []
    for (const name of names) {
      const filePath = `${from}/${name}`
      if (ProjectDrafts.isPrivatePath(filePath)) continue
      const path = fileUtils.joinPath(folder, name)
      if (await fileUtils.pathIsAFolder(path)) files.push(...(await this.publicFiles(path, filePath)))
      else files.push(filePath)
    }
    return files
  }

  ////////////////
  // ## Where things are
  ////////////////

  /** the project's folder name, e.g. `Counter` */
  get projectName(): string {
    return SP.SpellLocation.getProjectLocation(this.projectId).projectName ?? "project"
  }

  /** Path on disk of `parts`, inside the project's folder. */
  private projectPath(...parts: string[]): string {
    return fileUtils.joinPath(SP.SpellLocation.getProjectLocation(this.projectId).serverPath, ...parts)
  }

  /** Path on disk of `filePath`'s public file. */
  private publicPath(filePath: string): string {
    return this.projectPath(...filePath.replace(/^\/+/, "").split("/"))
  }

  /** Where today's draft of `filePath` goes:  `__draft/<folder>/<name>.<person>-<day><extensions>` (Q24). */
  private newDraftPath(filePath: string): string {
    const { folder, stem, extensions } = partsOf(filePath)
    return this.projectPath(DRAFT_FOLDER, ...folder, `${stem}.${this.person}-${dayStamp(new Date())}${extensions}`)
  }

  /** Path on disk of your draft of `filePath`, whichever day it was saved, or `undefined`. */
  private async draftPathOf(filePath: string): Promise<string | undefined> {
    const { folder, stem, extensions } = partsOf(filePath)
    const where = this.projectPath(DRAFT_FOLDER, ...folder)
    if (!(await fileUtils.pathExists(where))) return undefined
    const mine = new RegExp(`^${escaped(stem)}\\.${escaped(this.person)}-\\d{4}-\\d{2}-\\d{2}${escaped(extensions)}$`)
    const name = (await fileUtils.getFolderContents(where, { namesOnly: true })).find((each) => mine.test(each))
    return name === undefined ? undefined : fileUtils.joinPath(where, name)
  }

  /** What's drafted, by file:  `__draft/__drafts.json5`. */
  private async records(): Promise<Record<string, DraftRecord>> {
    const text = await fileUtils.loadTextFile(this.projectPath(DRAFT_FOLDER, RECORDS_FILE), "OPTIONAL")
    return text ? JSON5.parse(text) : {}
  }

  private async saveRecords(records: Record<string, DraftRecord>): Promise<void> {
    const path = this.projectPath(DRAFT_FOLDER, RECORDS_FILE)
    if (Object.keys(records).length) await fileUtils.saveJSON5File(path, records)
    else if (await fileUtils.pathExists(path)) await fileUtils.deletePath(path)
  }
}

/** Drafts' private folder in a project. */
export const DRAFT_FOLDER = "__draft"
/** Versions' private folder in a project. */
export const VERSIONS_FOLDER = "versions"
/** What's drafted, by file, inside `__draft/`. */
const RECORDS_FILE = "__drafts.json5"

/** A draft's record:  who, and the published text's hash as it started, to see a clash. */
type DraftRecord = { person: string; startedFrom: string }

function hashOf(text: string): string {
  return createHash("sha1").update(text).digest("hex")
}

/** `/a/Deck.spellml` => `{ folder: ["a"], stem: "Deck", extensions: ".spellml" }` */
function partsOf(filePath: string): { folder: string[]; stem: string; extensions: string } {
  const parts = filePath.replace(/^\/+/, "").split("/")
  const name = parts.pop()!
  const dot = name.indexOf(".")
  return dot < 0
    ? { folder: parts, stem: name, extensions: "" }
    : { folder: parts, stem: name.slice(0, dot), extensions: name.slice(dot) }
}

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** `2026-11-03` */
function dayStamp(date: Date): string {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`
}

/** `2026-11-03-091502`:  sortable, and one per second */
function versionStamp(date: Date): string {
  return `${dayStamp(date)}-${twoDigits(date.getHours())}${twoDigits(date.getMinutes())}${twoDigits(date.getSeconds())}`
}

function twoDigits(number: number): string {
  return String(number).padStart(2, "0")
}

////////////////
// ## Zip
////////////////

/**
 * A zip of `entries` (paths from the project's folder, and their bytes), each deflated:  what every unzip opens.
 * - Small on purpose, on node's own `zlib`:  no package for one writer and one reader.
 */
function zipped(entries: ReadonlyArray<readonly [string, Buffer]>): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const [filePath, data] of entries) {
    const name = Buffer.from(filePath.replace(/^\/+/, ""), "utf8")
    const packed = deflateRawSync(data)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(packed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(packed.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, name, packed)
    centrals.push(central, name)
    offset += local.length + name.length + packed.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}

/** The files `zipped()` wrote:  each `/path` and its bytes. */
function unzipped(zip: Buffer): Array<[string, Buffer]> {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (end < 0) throw new TypeError("ProjectDrafts:  not a zip")
  const count = zip.readUInt16LE(end + 10)
  let at = zip.readUInt32LE(end + 16)
  const files: Array<[string, Buffer]> = []
  for (let index = 0; index < count; index++) {
    const method = zip.readUInt16LE(at + 10)
    const packedSize = zip.readUInt32LE(at + 20)
    const nameLength = zip.readUInt16LE(at + 28)
    const extraLength = zip.readUInt16LE(at + 30)
    const commentLength = zip.readUInt16LE(at + 32)
    const localAt = zip.readUInt32LE(at + 42)
    const name = zip.toString("utf8", at + 46, at + 46 + nameLength)
    const dataAt = localAt + 30 + zip.readUInt16LE(localAt + 26) + zip.readUInt16LE(localAt + 28)
    const packed = zip.subarray(dataAt, dataAt + packedSize)
    files.push([`/${name}`, method === 8 ? inflateRawSync(packed) : Buffer.from(packed)])
    at += 46 + nameLength + extraLength + commentLength
  }
  return files
}
