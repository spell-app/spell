import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"

import {
  PlaceError,
  idOfRow,
  type ApplyAnswer,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceRow
} from "spell/places/places.types"
import { WORKBOOK_STYLES_NOTE, Workbook, type SheetJs } from "spell/places/Workbook"
import { SRV } from "spell/server"

import { ChunkFiles } from "./ChunkFiles"
import { contentVersion } from "./contentVersion"

/****************
 * ### `ExcelPlace`
 * An Excel workbook (`.xlsx`) as a place that takes writes, for a browser to reach through `PlaceServer` (epic `data` P38).
 *
 * ```ts
 * new ExcelPlace({ file: "/data/recipes.xlsx", idColumn: "id" })
 * ```
 *
 * - Each sheet is a collection, named by its tab;  one tab alone answers any name (`Workbook`).
 *   `SheetPlace` reads the same file from a browser, at its plain address, and can't write.
 * - The same rules as a CSV file's (`CsvPlace`):
 *   - WITH AN ID COLUMN:  a row's version is a hash of its cells (`contentVersion()`), so editing a row in Excel moves
 *     only that row's version, and only a change to that row is refused, `"out of date"`;  the engine then merges per field
 *   - WITH NONE:  it only adds:  a change to a row says nothing can tell which row it means, and is refused
 * - A save keeps the other sheets, columns the program doesn't know, formulas and column widths;
 *   NOT cell colours and fonts:  the free SheetJS drops styles, which every save's answer says (`WORKBOOK_STYLES_NOTE`).
 * - EVERY SAVE IS READ, CHANGED AND WRITTEN UNDER THE FILE'S `FileLock`, all at once (`ChunkFiles.writeChanged()`):
 *   two writers take turns, and neither loses a row;  Excel or a reader never sees half a file.
 *   - SheetJS is loaded first (`Workbook.sheetJs()`), so what happens under the lock is synchronous, as `CsvPlace`'s is.
 * - A workbook it can't read, or a sheet with a blank or repeated id, refuses a write, and says so, rather than be saved over.
 * - Reads the whole file each time, so a save in Excel is in the next read;  polled, as a file has nothing to say by itself.
 * - Node only.  Takes an absolute path:  who may name which file is whoever makes the place.
 ****************/
export class ExcelPlace implements Place {
  /** The file. */
  readonly file: string
  /** The column holding each row's id, on every sheet. */
  private readonly idColumn: string | undefined
  /** The columns that hold numbers. */
  private readonly numbers: readonly string[] | undefined
  /** Each row's version when it was last read, by its collection, then its id. */
  private versions = new Map<string, Map<string, string>>()

  constructor({ file, idColumn, numbers }: ExcelPlaceProps) {
    this.file = file
    this.idColumn = idColumn
    this.numbers = numbers
  }

  /** What it can do:  all at once.  With no id column it can only add:  nothing says which row a change means. */
  describe(): PlaceCapabilities {
    return {
      kind: "sheet",
      ...(this.idColumn !== undefined && { idOf: this.idColumn }),
      filter: "none",
      sort: "none",
      select: "none",
      page: "none",
      write: this.idColumn === undefined ? ["insert"] : ["insert", "update", "delete"],
      atomic: true,
      ...(this.idColumn !== undefined && { versionCheck: true }),
      live: "poll",
      abort: "soft"
    }
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * Every row of the sheet that holds `collection`.
   * - throws `PlaceError` `"not found"`:  no sheet holds it, or it has no id column;  what SheetJS throws for a file that isn't a workbook
   */
  async list(collection: string, _query: ListQuery, { signal }: PlaceContext = {}): Promise<ListAnswer> {
    const sheetJs = await Workbook.sheetJs()
    signal?.throwIfAborted()
    const workbook = this.workbookNow(sheetJs)
    const { rows, notes } = workbook.rowsOf(collection)
    this.holdVersions(workbook, collection)
    const why = workbook.whyUnclear(collection)
    const all = why ? [...notes, why] : notes
    return { rows, ...this.versionAnswer(), handled: {}, ...(all.length && { notes: all }) }
  }

  /** The version of this row when it was last read. */
  versionOf(collection: string, id: string): string | undefined {
    return this.versions.get(collection)?.get(id)
  }

  /** The file, for a message:  what's said goes to a browser, which has no business knowing the folder. */
  private get name(): string {
    return basename(this.file)
  }

  /** The workbook as it is now:  a new one if the file isn't there. */
  private workbookNow(sheetJs: SheetJs): Workbook {
    const bytes = existsSync(this.file) ? new Uint8Array(readFileSync(this.file)) : undefined
    const { idColumn, numbers } = this
    return new Workbook(bytes, sheetJs, { idColumn, numbers })
  }

  /** SIDE EFFECT:  remembers each row of `collection`'s version. */
  private holdVersions(workbook: Workbook, collection: string): void {
    const { idColumn } = this
    const versions = new Map<string, string>()
    this.versions.set(collection, versions)
    if (idColumn === undefined || workbook.whyUnclear(collection)) return
    workbook.rowsOf(collection).rows.forEach((row, at) => {
      versions.set(idOfRow(row, idColumn)!, contentVersion(workbook.cellsOfRow(collection, at)))
    })
  }

  /** Where the file stands now, for an answer:  its `ETag`. */
  private versionAnswer(): { version?: string } {
    const version = SRV.FileOperations.etagFor(this.file)
    return version === undefined ? {} : { version }
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes, all or none, in one save, under the file's lock.
   * - throws `PlaceError`:
   *   - `"refused"`:  a workbook it can't read, a field with no column, a change to a row with no id, a blank or repeated id
   *   - `"not found"`:  a row that isn't there, or a collection no sheet holds
   *   - `"out of date"`:  a row that's moved on from a change's `version`
   */
  async apply(changes: readonly PlaceChange[], { signal }: PlaceContext = {}): Promise<ApplyAnswer> {
    const sheetJs = await Workbook.sheetJs()
    signal?.throwIfAborted()
    return SRV.FileLock.run(this.file, () => this.applyNow(changes, sheetJs))
  }

  /** `apply()`, under the lock:  synchronous, so nothing else here can write between the read and the save. */
  private applyNow(changes: readonly PlaceChange[], sheetJs: SheetJs): ApplyAnswer {
    const workbook = this.workbookToWrite(sheetJs)
    const byCollection = new Map<string, PlaceChange[]>()
    for (const change of changes)
      byCollection.set(change.collection, [...(byCollection.get(change.collection) ?? []), change])
    const answered: PlaceRow[] = []
    let bytes: Uint8Array | undefined
    for (const [collection, ofIt] of byCollection) {
      const rows = this.rowsToWrite(workbook, collection)
      for (const change of ofIt) {
        const row = this.madeIn(rows, workbook, change)
        if (row) answered.push(row)
      }
      bytes = workbook.saved(collection, rows).bytes
    }
    if (bytes) ChunkFiles.writeChanged([[this.file, bytes]])
    const now = this.workbookNow(sheetJs)
    for (const collection of byCollection.keys()) this.holdVersions(now, collection)
    return { rows: answered, ...this.versionAnswer(), notes: [WORKBOOK_STYLES_NOTE] }
  }

  /** The workbook, if it can be saved over.  - throws `PlaceError` `"refused"`, saying why not */
  private workbookToWrite(sheetJs: SheetJs): Workbook {
    try {
      return this.workbookNow(sheetJs)
    } catch (error) {
      this.refuse(`${this.name} can't be read, so it can't be saved over:  fix it first (${messageOf(error)})`)
    }
  }

  /** `collection`'s rows, each a copy to change:  none for a new workbook's first sheet.  - throws `PlaceError` `"refused"` */
  private rowsToWrite(workbook: Workbook, collection: string): PlaceRow[] {
    if (!workbook.sheets.length) return []
    const why = workbook.whyUnclear(collection)
    if (why) this.refuse(why)
    return workbook.rowsOf(collection).rows.map((row) => ({ ...row }))
  }

  /** Make `change` in `rows`:  the row, unless it's gone.  - throws as `apply()` */
  private madeIn(rows: PlaceRow[], workbook: Workbook, change: PlaceChange): PlaceRow | undefined {
    const { kind, collection, id, version } = change
    const { idColumn } = this
    const fields = fieldsIn(change)
    if (idColumn === undefined) {
      if (kind !== "insert") {
        this.refuse(
          `"${collection}" has no id column, so nothing says which row this means, and it can't be changed:  name the column that holds its ids`
        )
      }
      rows.push(fields)
      return fields
    }
    if (id === undefined) {
      throw new TypeError(`ExcelPlace.apply():  a change in "${collection}" needs an id;  this place makes none`)
    }
    const at = rows.findIndex((row) => idOfRow(row, idColumn) === id)
    const found = rows[at]
    if (kind === "insert") {
      if (found) return Object.assign(found, fields)
      const row = { [idColumn]: id, ...fields }
      rows.push(row)
      return row
    }
    if (!found) {
      throw new PlaceError(`ExcelPlace.apply():  "${collection}" holds nothing with the id "${id}"`, {
        cause: { kind: "not found" }
      })
    }
    if (kind === "delete") {
      rows.splice(at, 1)
      return undefined
    }
    this.mustNotBeOld(workbook, change, version)
    return Object.assign(found, fields)
  }

  /** - throws `PlaceError` `"out of date"` if the row in the file has moved on from what the change was made from */
  private mustNotBeOld(workbook: Workbook, { collection, id }: PlaceChange, version: string | undefined): void {
    if (version === undefined || !workbook.sheets.length) return
    const at = workbook.rowsOf(collection).rows.findIndex((row) => idOfRow(row, this.idColumn) === id)
    if (at < 0 || contentVersion(workbook.cellsOfRow(collection, at)) === version) return
    throw new PlaceError(
      `ExcelPlace.apply():  "${id}" in "${collection}" has changed since ${version};  read it again`,
      {
        cause: { kind: "out of date" }
      }
    )
  }

  /** - throws `PlaceError` `"refused"` */
  private refuse(message: string): never {
    throw new PlaceError(`ExcelPlace:  ${message}`, { cause: { kind: "refused", whyNot: "place" } })
  }
}

/** Constructor props of an `ExcelPlace`. */
export type ExcelPlaceProps = {
  /** The file, absolute:  made by the first save, if it isn't there. */
  file: string
  /** The column holding each row's id, on every sheet.  Left out:  rows can only be added to. */
  idColumn?: string
  /** The columns that hold numbers, for text that reads as one:  a workbook's cells say so themselves. */
  numbers?: readonly string[]
}

/** What `change` writes to cells:  nothing of the engine's. */
function fieldsIn({ fields = {} }: PlaceChange): PlaceRow {
  return Object.fromEntries(Object.entries(fields).filter(([field]) => !field.startsWith("$")))
}

/** `error`'s message. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
