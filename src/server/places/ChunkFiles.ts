import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { dirname } from "node:path"

import { PlaceError } from "spell/util/places/places.types"
import { SRV } from "spell/server"

/** How long a file must be quiet before it's told:  an editor's save is often two or three writes. */
const QUIET_MS = 100

/****************
 * ### `ChunkFiles`
 * A folder of files as a place's chunks (epic `data` P5):  the file half of `ChunkedPlace`, and the storage under `FolderPlace`.
 * - Shaped as the app's `SpaceStorage` is:  `read`, `write`, `list`, `remove`, `watch`, each on `/`-separated paths from `root`.
 *   The app's `DiskStorage` is the same shape, on spaces' folder, so a place can't tell them apart.
 * - Writes through `SRV.FileOperations`:  under the file's lock, all at once.
 * - A version is the file's `ETag`, as `StaticHandler` serves it;  a conflict is the file operations' own check (`ifMatch`).
 *   - An `ETag` is the size and the time to the millisecond:  two saves of one size in one millisecond look the same.
 * - Changes heard through `LiveReload`'s watching, so nothing here watches the disk by itself, and a save seen twice is told once.
 * - STATIC, for a tool that writes files straight off and in its own lock (the epic page tool):  `bodyFile()`, `reader()`,
 *   `writeChanged()`, `writeListAndBodies()`.
 * - Node only.  Every path stays inside `root`:  `..`, an absolute path or a dot file is refused (`SRV.fileInside()`).
 ****************/
export class ChunkFiles {
  /** The folder it keeps, absolute. */
  readonly root: string
  /** Hears the disk, once someone's watching. */
  private hearing: DiskChanges | undefined
  /** Who's watching what. */
  private readonly watchers = new Set<{ folder: string; onChange: (path: string) => void }>()

  constructor({ root }: ChunkFilesProps) {
    this.root = root
  }

  ////////////////
  // ## As a store
  ////////////////

  /** The text of file `path`;  `undefined` if there's none. */
  async read(path: string): Promise<string | undefined> {
    const file = this.fileFor(path)
    return existsSync(file) ? readFile(file, "utf8") : undefined
  }

  /** Write file `path` whole, making its folders:  all at once. */
  async write(path: string, text: string): Promise<void> {
    await SRV.FileOperations.save(this.fileFor(path), text)
  }

  /** The names in `folder`, sorted:  a folder's ends in `/`.  Leaves out dot files.  `[]` for a folder that isn't there. */
  async list(folder: string): Promise<string[]> {
    const dir = folder ? this.fileFor(folder) : this.root
    if (!existsSync(dir)) return []
    const entries = await readdir(dir, { withFileTypes: true })
    return entries
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
      .sort()
  }

  /** Remove file or folder `path`, everything inside;  nothing if it isn't there. */
  async remove(path: string): Promise<void> {
    const file = this.fileFor(path)
    if (lstatSync(file, { throwIfNoEntry: false })) await SRV.FileOperations.delete(file)
  }

  /** File `path`'s version now:  `undefined` if it isn't there. */
  versionOf(path: string): string | undefined {
    return SRV.FileOperations.etagFor(this.fileFor(path))
  }

  /** Write file `path` whole, only if it's still at `version`:  its new version.  - throws `PlaceError` `"out of date"` */
  writeIfVersion(path: string, text: string, version: string): Promise<string> {
    return ChunkFiles.saveIfVersion(this.fileFor(path), text, version)
  }

  /** Call `onChange(path)` with each file that changes under `folder`, by anyone, once it's quiet.  Returns what stops it. */
  watch(folder: string, onChange: (path: string) => void): () => void {
    mkdirSync(this.root, { recursive: true })
    this.hearing ??= new DiskChanges(this.root, (path) => this.heard(path))
    const watcher = { folder: folder.replace(/^\/+|\/+$/g, ""), onChange }
    this.watchers.add(watcher)
    return () => {
      this.watchers.delete(watcher)
      if (this.watchers.size) return
      this.hearing?.close()
      this.hearing = undefined
    }
  }

  /** Tell whoever's watching this path. */
  private heard(path: string): void {
    for (const { folder, onChange } of this.watchers) {
      if (!folder || path === folder || path.startsWith(`${folder}/`)) onChange(path)
    }
  }

  /** The absolute file `path` names, inside the root.  - throws on `..` or a dot file */
  private fileFor(path: string): string {
    return SRV.fileInside(this.root, path.replace(/^\/+|\/+$/g, ""))
  }

  ////////////////
  // ## Straight to the files
  ////////////////

  /**
   * Save `file` whole, only if it's still at `version`:  its new version.
   * - The file operations' conflict check, as a place says it.
   * - throws `PlaceError` `"out of date"`;  anything else is what the save threw
   */
  static async saveIfVersion(file: string, text: string, version: string): Promise<string> {
    try {
      return await SRV.FileOperations.save(file, text, { ifMatch: version })
    } catch (error) {
      if (!(error instanceof SRV.HttpError) || error.status !== 409) throw error
      throw new PlaceError(`ChunkFiles:  ${file} has changed since ${version};  read it again`, {
        cause: { kind: "out of date" }
      })
    }
  }

  /**
   * Where a body's file is:  `<folder of the list>/<folder>/<id><ending>`.
   * - `bodyFile("x/x.plan.html", "p1", { folder: "parts", ending: ".html" })` => `x/parts/p1.html`
   */
  static bodyFile(listFile: string, id: string, { folder, ending }: BodyFilePlace): string {
    return `${dirname(listFile)}/${folder}/${id}${ending}`
  }

  /** The bodies of the list at `listFile`, as a reader:  an id to its text, or `undefined`. */
  static reader(listFile: string, place: BodyFilePlace): (id: string) => string | undefined {
    return (id) => {
      const file = ChunkFiles.bodyFile(listFile, id, place)
      return existsSync(file) ? readFileSync(file, "utf8") : undefined
    }
  }

  /**
   * Write each `[file, text]` whose file doesn't already hold `text`, in order, each all at once, making its folders:
   * the files written.
   * - Takes no lock:  the caller holds its own.
   * - The temp name ends `.tmp`:  live reload never reports it.
   */
  static writeChanged(outputs: readonly ChunkFileOutput[]): string[] {
    const written: string[] = []
    for (const [file, text] of outputs) {
      if (existsSync(file) && readFileSync(file, "utf8") === text) continue
      mkdirSync(dirname(file), { recursive: true })
      const temp = `${file}.${process.pid}.tmp`
      try {
        writeFileSync(temp, text)
        renameSync(temp, file)
      } finally {
        rmSync(temp, { force: true })
      }
      written.push(file)
    }
    return written
  }

  /**
   * Write a list and its bodies:  bodies first, the list last, then remove what's `gone`.
   * - So a reader of the list never finds it naming a body that isn't there.
   * - Each only if changed, each all at once:  `writeChanged()`.
   * - Returns the files written.
   */
  static writeListAndBodies({ list, bodies, gone = [] }: ChunkFilesWrite): string[] {
    const written = ChunkFiles.writeChanged([...bodies, list])
    for (const file of gone) rmSync(file, { force: true })
    return written
  }
}

/** Constructor props of `ChunkFiles`. */
export type ChunkFilesProps = {
  /** The folder it keeps. */
  root: string
}

/** Where a list's bodies are, beside it. */
export type BodyFilePlace = {
  /** Their folder, beside the list:  `parts`. */
  folder: string
  /** What each file's name ends in, after its id:  `.html`. */
  ending: string
}

/** One file to write, and its text. */
export type ChunkFileOutput = readonly [file: string, text: string]

/** What `ChunkFiles.writeListAndBodies()` writes. */
export type ChunkFilesWrite = {
  /** The list. */
  list: ChunkFileOutput
  /** Its bodies. */
  bodies: readonly ChunkFileOutput[]
  /** The body files no longer wanted. */
  gone?: readonly string[]
}

/**
 * `LiveReload`'s watching, telling one function instead of open pages.
 * - The kit's ONE way to hear a file change:  quiet for a moment, dot files, lock files and temp files left out, and
 *   a file saved with the same text not told.
 */
class DiskChanges extends SRV.LiveReload {
  /** Told each path, from the root. */
  private readonly onPath: (path: string) => void

  constructor(root: string, onPath: (path: string) => void) {
    super({ root, debounce: QUIET_MS, heartbeat: 0 })
    this.onPath = onPath
    this.watch(root)
  }

  /** What would go to open pages:  a change's path, from the root, `/`-started and encoded. */
  send(event: string, data: unknown): void {
    if (event !== "change") return
    const { path } = data as { path: string }
    this.onPath(path.slice(1).split("/").map(decodeURIComponent).join("/"))
  }
}
