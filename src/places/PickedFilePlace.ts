import { DatabasePlace } from "spell/util/persist/DatabasePlace"

import { oneAtATime } from "./ChunkedPlace"
import { CsvFile } from "./CsvFile"
import {
  idOfRow,
  PlaceError,
  type ApplyAnswer,
  type ListAnswer,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceEvent,
  type PlaceRow,
  type WatchTarget
} from "./places.types"
import { Workbook } from "./Workbook"

/** Where every picked file's handle and copy are kept:  a store of the browser's database (`DatabasePlace`). */
export const PICKED_FILES_STORE = "spell-picked-files"

/****************
 * ### `PickedFilePlace`
 * A file on this computer that a person picked or dropped, as a place (epic `editor` P41):
 * `family cookbook is a json file you pick`, or `... a json file on this device`.
 * - Every change is kept on this device first, in a COPY of the file's contents, so a reload loses nothing.
 * - Then, where the browser can (Chrome and Edge, with a file HANDLE), it goes back to the same file:
 *   - at once, while the person still lets the page write it
 *   - else when they save (`save()`), from a click or a key:  asking the browser first, before anything slow
 * - Elsewhere (Safari, Firefox:  a plain file, no handle) a save DOWNLOADS the file, with the same name.
 * - Remembers ONE file per program and place name (`key`):  the last one opened into it, its handle kept in the
 *   browser's database, so the next visit still saves to it.
 * - Never writes over someone else's change:  before each write it reads the file's modified time and size again,
 *   and a difference is a CONFLICT the page asks about (`keepTheirs()`, `keepYours()`, `keepBoth()`).
 *   - Read first, every time:  in Chrome a write through a handle whose file was renamed makes a NEW file at the old
 *     name, with no error (the P41 spike), so "not found" has to be found before writing.
 * - What the page shows (an "Open a file" line, "Reopen", "Can't find", "This file changed") is its `status`,
 *   told to `onStatus()` listeners;  core's `pickedFiles.ts` draws them.  This class shows nothing itself.
 * - The formats are the ones places already have:  JSON (`{ "recipes": [...] }`, or a bare list), CSV (`CsvFile`),
 *   Excel (`Workbook`).
 * - The browser's pickers, its download and its change observer are handed in (`PickedFileBrowser`), so tests run
 *   against fakes (`tests/places/fakeFileHandle.ts`).
 ****************/
export class PickedFilePlace implements Place {
  /** What it's kept under in the browser's database:  `<program>/<place name>`. */
  readonly key: string
  /** The file's format. */
  readonly format: PickedFileFormat
  /** The field holding a row's id. */
  private readonly idField: string
  /** The browser's own pickers, download and observer, or a test's. */
  private readonly browser: PickedFileBrowser
  /** Where its handle and copy are kept. */
  private readonly memory: PickedFileMemory
  /** Its reads and writes, one at a time. */
  private readonly inTurn = oneAtATime()
  /** Who's told of a row changing. */
  private readonly watchers = new Set<(event: PlaceEvent) => void>()
  /** Who's told of `status` changing, or a conflict. */
  private readonly statusListeners = new Set<(status: PickedFileStatus) => void>()
  /** What's kept:  read from the database once, as it's first asked. */
  private kept: KeptFile | undefined
  /** `kept` has been read. */
  private loading: Promise<void> | undefined
  /** Each collection's rows, as the copy holds them. */
  private contents: FileContents = {}
  /** Each row as it was last told, as text, by collection and id:  what a change is told against. */
  private lastTold = new Map<string, string>()
  /** Where it stands:  see `PickedFileStatus`. */
  private _status: PickedFileStatus = "no file"
  /** Stops watching the tab and the file:  set while anyone watches. */
  private stopWatchingFile: (() => void) | undefined

  constructor({ key, format = "json", idOf = "id", browser = BROWSER, memory }: PickedFilePlaceProps) {
    this.key = key
    this.format = format
    this.idField = idOf
    this.browser = browser
    this.memory = memory ?? databaseMemory(key)
  }

  /** Where it stands now. */
  get status(): PickedFileStatus {
    return this._status
  }

  /** The file's name, `recipes.json`;  none before a file is picked. */
  get fileName(): string | undefined {
    return this.kept?.name
  }

  /** Can this browser save back to the file itself (Chrome, Edge), not only download it? */
  get canWriteFiles(): boolean {
    return this.browser.canPickHandles
  }

  /** Hear `status` change, and each conflict (`"conflict"`).  Returns what stops it. */
  onStatus(listener: (status: PickedFileStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  /** What it can do:  every write at once, no querying of its own, and it says what changed. */
  describe(): PlaceCapabilities {
    return {
      kind: `${this.format} file`,
      idOf: this.idField,
      filter: "none",
      sort: "none",
      select: "none",
      page: "none",
      write: ["insert", "update", "delete"],
      atomic: true,
      timesHeld: this.format === "json" ? "every field" : [],
      live: "push",
      abort: "soft"
    }
  }

  ////////////////
  // ## Reading
  ////////////////

  /** Every row of `collection`, from the copy on this device:  none before a file is picked. */
  async list(collection: string): Promise<ListAnswer> {
    await this.opened()
    return { rows: this.rowsOf(collection), handled: {} }
  }

  /** The rows of `collection` with these ids. */
  async getMany(collection: string, ids: readonly string[]): Promise<PlaceRow[]> {
    await this.opened()
    return this.rowsOf(collection).filter((row) => ids.includes(idOfRow(row, this.idField) ?? ""))
  }

  /** Tell `onEvent` of each row changing in `target`'s collection:  a file read again, picked, or kept as theirs. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    const listener = (event: PlaceEvent) => {
      if (event.collection === target.collection && (target.id === undefined || event.id === target.id)) onEvent(event)
    }
    this.watchers.add(listener)
    this.stopWatchingFile ??= this.watchFile()
    return () => {
      this.watchers.delete(listener)
      if (this.watchers.size) return
      this.stopWatchingFile?.()
      this.stopWatchingFile = undefined
    }
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes, all or none:  kept on this device at once, then written to the file where it can be without
   * asking (its handle, and the person still lets the page write it).
   * - A file it can't write now stays changed on this device:  `status` says why, and a save writes it later.
   * - throws `PlaceError` `"not found"` for an update or delete of a row it doesn't hold;
   *   `"refused"` for a CSV or Excel file whose rows are unclear (`CsvFile.whyUnclear`)
   */
  apply(changes: readonly PlaceChange[]): Promise<ApplyAnswer> {
    return this.inTurn(async () => {
      await this.loaded()
      const contents = structuredClone(this.contents)
      const rows = changes.map((change) => this.madeIn(contents, change)).filter((row) => row !== undefined)
      const touched = new Set(changes.map((change) => change.collection))
      const data = await this.dataFor(contents, touched)
      this.contents = contents
      this.rememberTold()
      await this.keep({ ...this.keptOrNew(), data, unsaved: true })
      if (this.kept?.handle && (await this.isAllowed())) await this.writeChecked()
      else if (this.kept?.handle && this._status === "ready") this.setStatus("needs permission")
      return { rows }
    })
  }

  /**
   * Save to the file now, from a person's click or key:  asks the browser first, AT ONCE, before anything slow,
   * so the click still counts (Owen, 2026-11-19:  the browser only asks right after one).
   * - No handle (Safari, Firefox):  the file is downloaded, with its name;  `status` is `"downloaded"` the first time.
   * - No file yet, where the browser has handles:  the save picker, to choose where (`saveAsNew()`).
   * - NEVER throws:  what went wrong is `status`.
   */
  save(): Promise<void> {
    const asked = this.kept?.handle && this.ask()
    return this.inTurn(async () => {
      await this.loaded()
      if (this.kept?.data === undefined) return
      if (!this.kept.handle && this.browser.canPickHandles) return this.writeToNewFile()
      if (!this.kept.handle) return this.download()
      if ((await asked) === "granted") await this.writeChecked()
      else this.setStatus("needs permission")
    }).catch((error: unknown) => this.failed("save()", error))
  }

  /**
   * Ask the browser to let the page use the file again, from a person's click (the Reopen line's button), then read it.
   * - A file that changed while it couldn't be read, with changes of mine kept here:  a conflict.
   * - NEVER throws.
   */
  reopen(): Promise<void> {
    const asked = this.ask()
    return this.inTurn(async () => {
      if ((await asked) !== "granted") return this.setStatus("needs permission")
      await this.readFileOrKeep()
    }).catch((error: unknown) => this.failed("reopen()", error))
  }

  /**
   * Show the picker, from a person's click, and make the file picked this place's file:  its rows read, and remembered
   * for next time, replacing the one before (Q69).
   * - Cancelled:  nothing changes.
   * - NEVER throws.
   */
  async pick(): Promise<void> {
    try {
      const picked = await this.browser.pickFile(this.format, this.kept?.handle)
      if (picked) await this.use(picked)
    } catch (error) {
      this.failed("pick()", error)
    }
  }

  /**
   * Make `file` this place's file:  a handle (a pick, or a drop that gave one, as `<ui-uploader>`'s does), else a plain
   * file, read but never written back.
   * - throws `SyntaxError` for a file that isn't its format
   */
  use(file: FileHandle | FileRead): Promise<void> {
    return this.inTurn(async () => {
      await this.loaded()
      const handle = isHandle(file) ? file : undefined
      const read = handle ? await handle.getFile() : (file as FileRead)
      const data = await dataOf(read, this.format)
      this.contents = await this.contentsOf(data)
      await this.keep({ ...(handle && { handle }), name: read.name, data, seen: seenOf(read), unsaved: false })
      this.tellDifferences()
      this.setStatus(handle ? "ready" : "plain file")
      this.watchAgain()
    })
  }

  /**
   * Read the file again, as it is now, replacing what this page shows:  "This file changed.  Read it again?"
   * - NEVER throws.
   */
  readAgain(): Promise<void> {
    return this.inTurn(() => this.readFile()).catch((error: unknown) => this.failed("readAgain()", error))
  }

  /**
   * A conflict, kept as THEIRS:  the file read again, and my unsaved changes set aside on this device, not lost
   * (`setAside()`).
   * - NEVER throws.
   */
  keepTheirs(): Promise<void> {
    return this.inTurn(async () => {
      if (this.kept?.data !== undefined) await this.memory.setAside(this.kept.data)
      await this.readFile()
    }).catch((error: unknown) => this.failed("keepTheirs()", error))
  }

  /** A conflict, kept as MINE:  written over theirs.  NEVER throws. */
  keepYours(): Promise<void> {
    return this.inTurn(() => this.writeFile()).catch((error: unknown) => this.failed("keepYours()", error))
  }

  /**
   * Mine saved to a new file the person picks (a conflict's Keep both, the can't-find line's Save as new file), which
   * becomes this place's file;  theirs stays as it is.
   * - Cancelled:  nothing changes.  No handles here (Safari, Firefox):  a download.
   * - NEVER throws.
   */
  saveAsNew(): Promise<void> {
    return this.inTurn(async () => {
      await this.loaded()
      if (!this.browser.canPickHandles) return this.download()
      await this.writeToNewFile()
    }).catch((error: unknown) => this.failed("saveAsNew()", error))
  }

  /** The save picker, then the copy written to the file it names, now this place's file.  Cancelled:  nothing. */
  private async writeToNewFile(): Promise<void> {
    const handle = await this.browser.pickNewFile(this.keptOrNew().name)
    if (!handle) return
    await this.keep({ ...this.keptOrNew(), handle, name: handle.name })
    await this.writeFile()
    this.watchAgain()
  }

  /** A new file:  watched in place of the old one, while anyone watches. */
  private watchAgain(): void {
    this.stopWatchingFile?.()
    this.stopWatchingFile = this.watchers.size ? this.watchFile() : undefined
  }

  /** What was set aside by Keep theirs, the last time:  its data.  None:  nothing was. */
  setAside(): Promise<string | Uint8Array | undefined> {
    return this.memory.setAsideData()
  }

  /**
   * Check the file against what this page last read or wrote:  as the tab comes back into view, and when the browser's
   * change observer says so (Q74).
   * - Changed, with nothing of mine unsaved:  `"changed"`, so the page offers to read it again.
   * - Gone:  `"not found"`.
   * - NEVER throws.
   */
  check(): Promise<void> {
    return this.inTurn(async () => {
      if (!this.kept?.handle || !(await this.isAllowed())) return
      const read = await this.fileNowOrMissing()
      if (!read) return
      if (sameAsSeen(read, this.kept.seen)) return
      this.setStatus(this.kept.unsaved ? "conflict" : "changed")
    }).catch((error: unknown) => this.failed("check()", error))
  }

  ////////////////
  // ## The file
  ////////////////

  /** What's kept, read once;  then the file itself, quietly, where the page may still read it (Q70). */
  private opened(): Promise<void> {
    return (this.loading ??= this.inTurn(async () => {
      await this.loaded()
      if (!this.kept) return this.setStatus("no file")
      if (!this.kept.handle) return this.setStatus("plain file")
      if (!(await this.isAllowed())) return this.setStatus("needs permission")
      await this.readFileOrKeep()
    }).catch((error: unknown) => this.failed("opened()", error)))
  }

  /** `kept`, from the database, and the copy's rows. */
  private async loaded(): Promise<void> {
    if (this.kept !== undefined || this.loadedOnce) return
    this.loadedOnce = true
    this.kept = await this.memory.load()
    if (this.kept?.data !== undefined) this.contents = await this.contentsOf(this.kept.data)
    this.rememberTold()
  }
  /** `kept` has been asked for. */
  private loadedOnce = false

  /**
   * Read the file, where the page may:  unchanged since last seen, with changes of mine kept here, they're written;
   * changed under changes of mine, a conflict;  else what it holds is taken.
   */
  private async readFileOrKeep(): Promise<void> {
    const read = await this.fileNowOrMissing()
    if (!read || !this.kept) return
    if (this.kept.unsaved && !sameAsSeen(read, this.kept.seen)) return this.setStatus("conflict")
    if (this.kept.unsaved) return this.writeChecked()
    await this.take(read)
  }

  /** Read the file and take what it holds, whatever this page had.  Gone:  `"not found"`. */
  private async readFile(): Promise<void> {
    const read = await this.fileNowOrMissing()
    if (read) await this.take(read)
  }

  /** `read` is now what this page holds:  its rows told, the copy and what was seen kept. */
  private async take(read: FileRead): Promise<void> {
    const data = await dataOf(read, this.format)
    this.contents = await this.contentsOf(data)
    await this.keep({ ...this.keptOrNew(), name: read.name, data, seen: seenOf(read), unsaved: false })
    this.tellDifferences()
    this.setStatus("ready")
  }

  /** Write the copy to the file, unless it's gone or changed since last seen:  then the status says so. */
  private async writeChecked(): Promise<void> {
    const read = await this.fileNowOrMissing()
    if (!read) return
    if (this.kept?.seen && !sameAsSeen(read, this.kept.seen)) return this.setStatus("conflict")
    await this.writeFile()
  }

  /** Write the copy to the file, whatever it holds now, and note what it is after. */
  private async writeFile(): Promise<void> {
    const { handle, data } = this.kept ?? {}
    if (!handle?.createWritable || data === undefined) return
    const writer = await handle.createWritable()
    await writer.write(data)
    await writer.close()
    const after = await handle.getFile()
    await this.keep({ ...this.kept!, seen: seenOf(after), unsaved: false })
    this.setStatus("ready")
  }

  /** The file now, or `undefined` with the status `"not found"` when it was moved, renamed or deleted. */
  private async fileNowOrMissing(): Promise<FileRead | undefined> {
    try {
      return await this.kept!.handle!.getFile()
    } catch (error) {
      if (!isNotFound(error)) throw error
      this.setStatus("not found")
      return undefined
    }
  }

  /** Hand the person the copy, as a download named as the file was;  the first time, the status says where it went. */
  private async download(): Promise<void> {
    const { name, data } = this.kept ?? {}
    if (data === undefined) return
    this.browser.download(name ?? `${this.key.split("/").pop()}.${this.format}`, data, this.format)
    const isFirst = !(await this.memory.hasDownloaded())
    await this.memory.noteDownloaded()
    await this.keep({ ...this.kept!, unsaved: false })
    this.setStatus(isFirst ? "downloaded" : "plain file")
  }

  /** May the page write the file without asking?  A handle with no permission check (a test's) may. */
  private async isAllowed(): Promise<boolean> {
    const handle = this.kept?.handle
    if (!handle?.queryPermission) return true
    return (await handle.queryPermission({ mode: "readwrite" })) === "granted"
  }

  /**
   * Ask the browser to let the page write the file:  called at once from a person's action, never after a wait.
   * - NEVER throws:  a refusal, or no click to ask from, is `"denied"`.
   */
  private async ask(): Promise<PermissionState> {
    const handle = this.kept?.handle
    if (!handle?.requestPermission) return "granted"
    try {
      return await handle.requestPermission({ mode: "readwrite" })
    } catch {
      return "denied"
    }
  }

  /**
   * Watch for the file changing while the page is open (Q74):  the tab coming back into view, and the browser's
   * change observer, where it has one.  Returns what stops it.
   */
  private watchFile(): () => void {
    const stops = [
      this.browser.onTabShown(() => void this.check()),
      this.kept?.handle ? this.browser.observe(this.kept.handle, () => void this.check()) : undefined
    ]
    return () => stops.forEach((stop) => stop?.())
  }

  ////////////////
  // ## Rows
  ////////////////

  /** `collection`'s rows in the copy. */
  private rowsOf(collection: string): PlaceRow[] {
    return this.contents[collection] ?? this.contents[ANY_COLLECTION] ?? []
  }

  /** Each collection's rows in `data`, read as the format says. */
  private async contentsOf(data: string | Uint8Array): Promise<FileContents> {
    if (this.format === "json") return jsonContentsOf(data as string)
    if (this.format === "csv") return { [ANY_COLLECTION]: [...this.csvOf(data as string).rows] }
    const book = new Workbook(data as Uint8Array, await Workbook.sheetJs(), { idColumn: this.idField })
    return Object.fromEntries(book.sheets.map((sheet) => [sheet, book.rowsOf(sheet).rows]))
  }

  /** The file's data with `contents` in it, only the collections `touched` changed in a CSV or Excel file. */
  private async dataFor(contents: FileContents, touched: Set<string>): Promise<string | Uint8Array> {
    const data = this.kept?.data
    if (this.format === "json") return jsonTextOf(contents, typeof data === "string" ? data : undefined)
    if (this.format === "csv")
      return this.csvOf((data as string | undefined) ?? "").saved(this.rowsOfAny(contents)).text
    const sheetJs = await Workbook.sheetJs()
    let bytes = data as Uint8Array | undefined
    for (const collection of touched) {
      bytes = new Workbook(bytes, sheetJs, { idColumn: this.idField }).saved(
        collection,
        contents[collection] ?? []
      ).bytes
    }
    return bytes ?? new Uint8Array()
  }

  /** A CSV file's one list of rows, whatever it was asked for by. */
  private rowsOfAny(contents: FileContents): PlaceRow[] {
    return Object.values(contents).flat()
  }

  /** `text` as a CSV file, with its id column. */
  private csvOf(text: string): CsvFile {
    return new CsvFile(text, { name: this.fileName ?? this.key, idColumn: this.idField, addsColumns: true })
  }

  /** Make `change` in `contents`:  its row, unless it deleted one.  - throws `PlaceError` `"not found"` */
  private madeIn(contents: FileContents, { kind, collection, id, fields }: PlaceChange): PlaceRow | undefined {
    if (id === undefined) {
      throw new TypeError(`PickedFilePlace.apply():  a change in "${collection}" needs an id;  this place makes none`)
    }
    const key = collection in contents || !(ANY_COLLECTION in contents) ? collection : ANY_COLLECTION
    const rows = (contents[key] ??= [])
    const at = rows.findIndex((row) => idOfRow(row, this.idField) === id)
    if (kind === "insert") {
      const row = { ...fields, [this.idField]: id }
      if (at < 0) rows.push(row)
      else rows[at] = row
      return row
    }
    if (at < 0) {
      throw new PlaceError(`PickedFilePlace.apply():  "${collection}" holds nothing with the id "${id}"`, {
        cause: { kind: "not found" }
      })
    }
    if (kind === "delete") {
      rows.splice(at, 1)
      return undefined
    }
    return Object.assign(rows[at]!, fields)
  }

  /** Tell whoever's watching each row that differs from what was last told. */
  private tellDifferences(): void {
    const before = this.lastTold
    this.rememberTold()
    const events: PlaceEvent[] = []
    for (const [key, text] of this.lastTold) {
      if (before.get(key) === text) continue
      const [collection, id] = key.split("\n") as [string, string]
      events.push({ collection, id, row: JSON.parse(text) as PlaceRow })
    }
    for (const key of before.keys()) {
      if (this.lastTold.has(key)) continue
      const [collection, id] = key.split("\n") as [string, string]
      events.push({ collection, id })
    }
    for (const event of events) for (const watcher of this.watchers) watcher(event)
  }

  /** Note each row as it is now, as what's been told. */
  private rememberTold(): void {
    this.lastTold = new Map()
    for (const [collection, rows] of Object.entries(this.contents)) {
      for (const row of rows) {
        const id = idOfRow(row, this.idField)
        if (id !== undefined) this.lastTold.set(`${collection}\n${id}`, JSON.stringify(row))
      }
    }
  }

  ////////////////
  // ## Keeping
  ////////////////

  /** What's kept, or a new record for a file with no name yet. */
  private keptOrNew(): KeptFile {
    return this.kept ?? { name: `${this.key.split("/").pop()}.${this.format}`, unsaved: true }
  }

  /** Keep `kept`, here and in the browser's database. */
  private async keep(kept: KeptFile): Promise<void> {
    this.kept = kept
    await this.memory.save(kept)
  }

  /** The status is now `status`, told to every listener;  a conflict is told each time. */
  private setStatus(status: PickedFileStatus): void {
    if (status === this._status && status !== "conflict") return
    this._status = status
    for (const listener of this.statusListeners) listener(status)
  }

  /** Something went wrong outside the file's own cases:  logged, and the status left as it was. */
  private failed(method: string, error: unknown): void {
    console.error(`PickedFilePlace.${method}:  ${this.fileName ?? this.key}`, error)
  }
}

////////////////
// ## Types
////////////////

/** A file's format, by its kind's word:  `json file`, `csv file`, `excel file`. */
export type PickedFileFormat = "json" | "csv" | "excel"

/**
 * Where a picked file's place stands, what the page shows for it:
 * - `"no file"`:  nothing picked yet:  "Open a file"
 * - `"ready"`:  the file is read, and saves go to it
 * - `"needs permission"`:  the browser forgot the page may use it (a reload, a site setting):  "Reopen"
 * - `"not found"`:  moved, renamed or deleted:  "Can't find", with Find it and Save as new file
 * - `"changed"`:  someone else changed it, and nothing here is unsaved:  "This file changed.  Read it again?"
 * - `"conflict"`:  someone else changed it, and something here is unsaved:  keep theirs, keep yours, or keep both
 * - `"plain file"`:  this browser can't write files (Safari, Firefox):  a save downloads it
 * - `"downloaded"`:  the first download:  where it went, and why
 */
export type PickedFileStatus =
  | "no file"
  | "ready"
  | "needs permission"
  | "not found"
  | "changed"
  | "conflict"
  | "plain file"
  | "downloaded"

/** What a picked file reads as:  the browser's `File`, or a test's. */
export type FileRead = {
  /** Its name, `recipes.json`. */
  readonly name: string
  /** When it last changed, ms since 1970. */
  readonly lastModified: number
  /** Its size in bytes. */
  readonly size: number
  /** Its text. */
  text(): Promise<string>
  /** Its bytes. */
  arrayBuffer(): Promise<ArrayBuffer>
}

/** A file's HANDLE, the browser's key to it on disk (`FileSystemFileHandle`, Chrome and Edge), or a test's. */
export type FileHandle = {
  /** The file's name. */
  readonly name: string
  /** The file as it is now.  - throws a `DOMException` `NotFoundError` once it's moved, renamed or deleted */
  getFile(): Promise<FileRead>
  /** A writer that swaps the file in whole once it's closed. */
  createWritable?(): Promise<{ write(data: string | Uint8Array): Promise<void>; close(): Promise<void> }>
  /** May the page use it, without asking? */
  queryPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>
  /** Ask the person:  only right after a click or a key. */
  requestPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>
}

/** The browser's part:  its pickers, its download, its change observer, the tab coming back into view. */
export type PickedFileBrowser = {
  /** Can it pick a file as a handle (`showOpenFilePicker()`)? */
  canPickHandles: boolean
  /**
   * Show the picker:  a handle where it can, else a plain file;  `undefined` when cancelled.
   * - `near`:  the file before, so the picker starts in its folder (Find it, Q73)
   */
  pickFile(format: PickedFileFormat, near?: FileHandle): Promise<FileHandle | FileRead | undefined>
  /** Show the save picker, named `name`:  the new file's handle;  `undefined` when cancelled. */
  pickNewFile(name: string): Promise<FileHandle | undefined>
  /** Hand the person `data` as a download named `name`. */
  download(name: string, data: string | Uint8Array, format: PickedFileFormat): void
  /** Hear the tab come back into view.  Returns what stops it. */
  onTabShown(listener: () => void): () => void
  /** Hear `handle`'s file change, where the browser has an observer.  Returns what stops it;  none:  `undefined`. */
  observe(handle: FileHandle, listener: () => void): (() => void) | undefined
}

/** Where one place's file is kept:  the browser's database, or a test's memory. */
export type PickedFileMemory = {
  /** What's kept, if anything. */
  load(): Promise<KeptFile | undefined>
  /** Keep `kept`. */
  save(kept: KeptFile): Promise<void>
  /** Set `data` aside:  unsaved changes a Keep theirs replaced. */
  setAside(data: string | Uint8Array): Promise<void>
  /** What was last set aside. */
  setAsideData(): Promise<string | Uint8Array | undefined>
  /** Has a save downloaded this file before? */
  hasDownloaded(): Promise<boolean>
  /** A save downloaded it. */
  noteDownloaded(): Promise<void>
}

/** What's kept of one place's file. */
export type KeptFile = {
  /** Its handle, where the browser gives one. */
  handle?: FileHandle
  /** Its name. */
  name: string
  /** The copy on this device:  its text, or an Excel file's bytes.  Left out:  nothing yet. */
  data?: string | Uint8Array
  /** The file as this page last read or wrote it.  Left out:  never read through a handle. */
  seen?: SeenFile
  /** The copy holds changes the file doesn't. */
  unsaved: boolean
}

/** A file as it was last seen:  enough to tell it changed (the spike:  a rewrite always moves the time). */
export type SeenFile = { lastModified: number; size: number }

/** Constructor props of a `PickedFilePlace`. */
export type PickedFilePlaceProps = {
  /** What it's kept under:  `<program>/<place name>`. */
  key: string
  /** The file's format;  default JSON. */
  format?: PickedFileFormat
  /** The field holding a row's id;  default `id`. */
  idOf?: string
  /** The browser's part;  default this browser's. */
  browser?: PickedFileBrowser
  /** Where it's kept;  default the browser's database, `PICKED_FILES_STORE`. */
  memory?: PickedFileMemory
}

/** Each collection's rows. */
type FileContents = Record<string, PlaceRow[]>

/** The collection a file with one list holds (a bare JSON list, a CSV file):  any name reads it. */
const ANY_COLLECTION = ""

////////////////
// ## Helpers
////////////////

/** Is `file` a handle, not a plain file? */
function isHandle(file: FileHandle | FileRead): file is FileHandle {
  return typeof (file as FileHandle).getFile === "function"
}

/** Is `error` the browser saying the file isn't there? */
function isNotFound(error: unknown): boolean {
  return (error as { name?: string } | undefined)?.name === "NotFoundError"
}

/** `read` as it's seen. */
function seenOf(read: FileRead): SeenFile {
  return { lastModified: read.lastModified, size: read.size }
}

/** Is `read` the file as `seen`?  None seen:  yes. */
function sameAsSeen(read: FileRead, seen: SeenFile | undefined): boolean {
  return !seen || (read.lastModified === seen.lastModified && read.size === seen.size)
}

/** `read`'s data, at once:  Chrome won't read a `File` after its file changes (the spike). */
async function dataOf(read: FileRead, format: PickedFileFormat): Promise<string | Uint8Array> {
  return format === "excel" ? new Uint8Array(await read.arrayBuffer()) : read.text()
}

/** A JSON file's rows:  `{ "recipes": [...] }`, each list a collection, or a bare list.  - throws `SyntaxError` */
function jsonContentsOf(text: string): FileContents {
  if (!text.trim()) return {}
  const json = JSON.parse(text) as unknown
  if (Array.isArray(json)) return { [ANY_COLLECTION]: json as PlaceRow[] }
  if (!json || typeof json !== "object")
    throw new SyntaxError("PickedFilePlace:  a json file holds an object or a list")
  return Object.fromEntries(Object.entries(json).filter(([, value]) => Array.isArray(value))) as FileContents
}

/** A JSON file's text with `contents` in it, keeping what else `before` held, indented 2 spaces. */
function jsonTextOf(contents: FileContents, before: string | undefined): string {
  if (ANY_COLLECTION in contents) return `${JSON.stringify(contents[ANY_COLLECTION], null, 2)}\n`
  let held: Record<string, unknown> = {}
  try {
    const json = before?.trim() ? (JSON.parse(before) as unknown) : {}
    if (json && typeof json === "object" && !Array.isArray(json)) held = json as Record<string, unknown>
  } catch {
    // what it held wasn't JSON:  only the rows go back
  }
  return `${JSON.stringify({ ...held, ...contents }, null, 2)}\n`
}

/** One place's file, kept in the browser's database under `key`. */
function databaseMemory(key: string): PickedFileMemory {
  const database = () => DatabasePlace.shared
  return {
    load: async () => (await database().load(PICKED_FILES_STORE, key)) as KeptFile | undefined,
    save: (kept) => database().save(PICKED_FILES_STORE, key, kept),
    setAside: (data) => database().save(PICKED_FILES_STORE, `${key}#set-aside`, data),
    setAsideData: async () =>
      (await database().load(PICKED_FILES_STORE, `${key}#set-aside`)) as string | Uint8Array | undefined,
    hasDownloaded: async () => Boolean(await database().load(PICKED_FILES_STORE, `${key}#downloaded`)),
    noteDownloaded: () => database().save(PICKED_FILES_STORE, `${key}#downloaded`, true)
  }
}

/** Each format's file types, for the pickers. */
const FILE_TYPES: Record<PickedFileFormat, { description: string; accept: Record<string, string[]> }> = {
  json: { description: "JSON", accept: { "application/json": [".json"] } },
  csv: { description: "CSV", accept: { "text/csv": [".csv"] } },
  excel: {
    description: "Excel",
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }
  }
}

/** What the browser's file pickers are, where it has them:  Chrome's and Edge's. */
type PickerWindow = {
  showOpenFilePicker?(options: object): Promise<FileHandle[]>
  showSaveFilePicker?(options: object): Promise<FileHandle>
  FileSystemObserver?: new (callback: () => void) => { observe(handle: FileHandle): Promise<void>; disconnect(): void }
}

/** Is `error` the person closing a picker? */
function isCancel(error: unknown): boolean {
  return (error as { name?: string } | undefined)?.name === "AbortError"
}

/** This browser's part:  its pickers where it has them, else a plain `<input type="file">`. */
const BROWSER: PickedFileBrowser = {
  get canPickHandles() {
    return typeof (globalThis as PickerWindow).showOpenFilePicker === "function"
  },
  async pickFile(format, near) {
    const picker = globalThis as PickerWindow
    if (picker.showOpenFilePicker) {
      try {
        const [handle] = await picker.showOpenFilePicker({
          types: [FILE_TYPES[format]],
          ...(near && { startIn: near })
        })
        return handle
      } catch (error) {
        if (isCancel(error)) return undefined
        // the file before is gone, so its folder can't be where the picker starts:  start where it likes
        if (near) return BROWSER.pickFile(format)
        throw error
      }
    }
    return pickPlainFile(format)
  },
  async pickNewFile(name) {
    try {
      return await (globalThis as PickerWindow).showSaveFilePicker?.({ suggestedName: name })
    } catch (error) {
      if (isCancel(error)) return undefined
      throw error
    }
  },
  download(name, data, format) {
    const type = Object.keys(FILE_TYPES[format].accept)[0]!
    const url = URL.createObjectURL(new Blob([data as BlobPart], { type }))
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_KEPT_MS)
  },
  onTabShown(listener) {
    if (typeof document === "undefined") return () => {}
    const heard = () => {
      if (document.visibilityState === "visible") listener()
    }
    document.addEventListener("visibilitychange", heard)
    return () => document.removeEventListener("visibilitychange", heard)
  },
  observe(handle, listener) {
    // Chrome's change observer, still experimental:  checked for, never assumed (Q74)
    const Observer = (globalThis as PickerWindow).FileSystemObserver
    if (!Observer) return undefined
    const observer = new Observer(listener)
    observer.observe(handle).catch(() => observer.disconnect())
    return () => observer.disconnect()
  }
}

/** How long a download's address stays good:  long enough for the browser to start it. */
const DOWNLOAD_URL_KEPT_MS = 60_000

/** A plain file from an `<input type="file">`:  what Safari and Firefox give.  `undefined` when cancelled. */
function pickPlainFile(format: PickedFileFormat): Promise<FileRead | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = Object.values(FILE_TYPES[format].accept).flat().join(",")
    input.addEventListener("change", () => resolve(input.files?.[0]))
    input.addEventListener("cancel", () => resolve(undefined))
    input.click()
  })
}
