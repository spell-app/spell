import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"

import { CsvFile } from "spell/util/places/CsvFile"
import { isListPosition, positionAtIndex } from "spell/util/places/positions"
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
  type PlaceRow,
  type SelectingContext
} from "spell/util/places/places.types"
import { SRV } from "spell/server"

import { ChunkFiles } from "./ChunkFiles"

/** The operation that saves a file's whole list of rows:  `call()`. */
export const CSV_SAVE_ROWS = "save rows"

/** What a file that isn't UTF-8 reads as:  saving would change every letter that became this. */
const UNREADABLE_LETTER = "�"

/** A row with no position sorts after those with one. */
const LAST_POSITION = "~"

/** What `CSV_SAVE_ROWS` is handed. */
export type CsvSaveRowsInput = {
  /** Every row, in the order the file should now hold them. */
  rows: PlaceRow[]
  /** The file's version these were read at, a list's `version`:  left out, the rows replace what's there, whatever that is. */
  from?: string
}

/** What `CSV_SAVE_ROWS` answers. */
export type CsvSaveRowsAnswer = {
  /** How many rows are new. */
  added: number
  /** How many went somewhere else. */
  moved: number
  /** How many have an edited cell. */
  edited: number
  /** How many are gone. */
  removed: number
  /** Where the file stands now. */
  version: string | undefined
  /** What it wants known about the save:  a row with no id whose edit reads as one gone and one new. */
  notes: string[]
}

/** A row's version:  a hash of what it holds, as the cells of its line.  So changing one row moves that row's, and no other's. */
export function csvRowVersion(cells: readonly string[]): string {
  return createHash("sha1").update(JSON.stringify(cells)).digest("hex")
}

/****************
 * ### `CsvPlace`
 * A CSV file as a place that takes writes, for a browser to reach through `PlaceServer` (epic `data` P14).
 *
 * ```ts
 * new CsvPlace({ file: "/data/recipes.csv", collection: "recipes", idColumn: "id", numbers: ["servings"] })
 * ```
 *
 * - One file, one collection.  `SheetPlace` reads the same file from a browser, at its plain address, and can't write.
 * - A SAVE CHANGES ONLY THE LINES THAT CHANGED (`CsvFile`), so a diff of the file shows what was done, and nothing else.
 * - WITH AN ID COLUMN:
 *   - a row's version is a hash of its cells (`csvRowVersion()`):  a CSV file has no version column, and a person's editor won't write one
 *     - so editing a row in VS Code moves only that row's version, and only a change to that row is refused, `"out of date"`
 *     - the engine then merges per field (`PendingChanges`), and a clash gets the usual notice
 *     - changed and changed back is the same version, which is right:  the content is the same
 *   - a field `positionField` names reads as the row's place in the file (`ListPosition`), and writing it moves the row:
 *     so a program moves a row as it would in a live room, and the file's own order is the truth
 *     - a move made from an old copy lands by its position, among the rows as they are now:  nothing refuses it
 * - WITH NONE (`idColumn` left out):
 *   - `apply()` only adds:  a change to a row says nothing can tell which row it means, and is refused
 *   - `call(CSV_SAVE_ROWS, ...)` compares a whole list by each row's text:  added and moved rows are found, and an edited row reads as
 *     one gone and one new, which its answer says
 * - Columns the program doesn't know, the file's quoting and its line ends all stay.
 * - EVERY SAVE IS READ, CHANGED AND WRITTEN UNDER THE FILE'S `FileLock`, all at once (`ChunkFiles.writeChanged()`):
 *   - so two writers, in one process or two, take turns, and neither loses a row
 *   - a reader, or VS Code, never sees half a file
 *   - SYNCHRONOUS ON PURPOSE:  it can't interleave with another write here, and the demo's REST server, which can't wait, uses it too
 *     (a lock held across an `await` would block that one until it timed out)
 * - A FILE IT CAN'T TRUST REFUSES A WRITE, AND SAYS SO, rather than be saved over:
 *   half saved, not UTF-8 (saving would lose every letter it can't read), or a row with a blank or repeated id.
 *   - A read of a half-saved file answers as it last read, with a note, as `FolderPlace` does:  it may just be someone typing.
 * - Reads the whole file each time, so an edit in VS Code is in the next read;  polled, as a file has nothing to say by itself.
 * - Node only.  Takes an absolute path:  who may name which file is whoever makes the place.
 ****************/
export class CsvPlace implements Place {
  /** The file. */
  readonly file: string
  /** The one collection it holds. */
  private readonly collection: string
  /** The column holding each row's id. */
  private readonly idColumn: string | undefined
  /** The columns that hold numbers. */
  private readonly numbers: readonly string[] | undefined
  /** The field a row's place in the file reads as. */
  private readonly positionField: string | undefined
  /** The rows it last read whole:  what a half-saved file answers with. */
  private lastGood: PlaceRow[] | undefined
  /** Each row's version when it was last read, by id. */
  private versions = new Map<string, string>()

  constructor({ file, collection, idColumn, numbers, positionField }: CsvPlaceProps) {
    this.file = file
    this.collection = collection
    this.idColumn = idColumn
    this.numbers = numbers
    this.positionField = positionField
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
   * Every row in the file.
   * - A file half saved answers as it last read, and says so.
   * - throws `PlaceError`:  `"not found"` for another collection, or an id column it hasn't got;
   *   `SyntaxError` for a file half saved that it's never read whole
   */
  async list(collection: string, _query: ListQuery, { signal }: PlaceContext = {}): Promise<ListAnswer> {
    signal?.throwIfAborted()
    this.mustHold(collection)
    try {
      const csv = this.csvNow()
      const notes = csv.whyUnclear ? [...csv.notes, csv.whyUnclear] : csv.notes
      return {
        rows: this.heldRows(csv),
        ...this.versionAnswer(),
        handled: {},
        ...(notes.length && { notes: [...notes] })
      }
    } catch (error) {
      if (!(error instanceof SyntaxError) || !this.lastGood) throw error
      const note = `"${collection}" can't be read just now, so this is how it last read:  ${error.message}`
      return { rows: this.lastGood, ...this.versionAnswer(), handled: {}, notes: [note] }
    }
  }

  /** The version of this row when it was last read. */
  versionOf(_collection: string, id: string): string | undefined {
    return this.versions.get(id)
  }

  /** The file as it is now, parsed.  - throws `SyntaxError` for a file half saved */
  csvNow(): CsvFile {
    return this.csvIn(this.textNow())
  }

  /** The file, for a message:  what's said goes to a browser, which has no business knowing the folder. */
  private get name(): string {
    return basename(this.file)
  }

  /** The file's text:  `""` if it isn't there. */
  private textNow(): string {
    return existsSync(this.file) ? readFileSync(this.file, "utf8") : ""
  }

  /** The file's version, for a list's answer and `CSV_SAVE_ROWS`:  its `ETag`.  Left out:  it isn't there. */
  private versionNow(): string | undefined {
    return SRV.FileOperations.etagFor(this.file)
  }

  /** `text` parsed. */
  private csvIn(text: string): CsvFile {
    const { collection: name, idColumn, numbers } = this
    return new CsvFile(text, { name, idColumn, numbers })
  }

  /** The rows of `csv`, each with its place in the file if it's asked for.  SIDE EFFECT:  remembers them, and their versions. */
  private heldRows(csv: CsvFile): PlaceRow[] {
    const { positionField, idColumn } = this
    const rows = positionField ? csv.rows.map((row, at) => ({ ...row, [positionField]: placeAt(at) })) : [...csv.rows]
    this.lastGood = rows
    this.versions = new Map()
    if (idColumn === undefined || csv.whyUnclear) return rows
    csv.rows.forEach((row, at) => this.versions.set(idOfRow(row, idColumn)!, csvRowVersion(csv.cellsOfRow(at))))
    return rows
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes, all or none, in one save:  see `applyNow()`.
   * - throws `PlaceError`:  refused, not found or out of date
   */
  async apply(changes: readonly PlaceChange[], { signal }: PlaceContext = {}): Promise<ApplyAnswer> {
    signal?.throwIfAborted()
    return this.applyNow(changes)
  }

  /**
   * Make these changes, all or none, in one save, under the file's lock, and answer before returning.
   * - throws `PlaceError`:
   *   - `"refused"`:  a file it can't trust, a field with no column, a change to a row with no id
   *   - `"not found"`:  a row that isn't there, or another collection
   *   - `"out of date"`:  a row that's moved on from a change's `version`
   */
  applyNow(changes: readonly PlaceChange[]): ApplyAnswer {
    return SRV.FileLock.run(this.file, () => {
      const csv = this.csvToWrite()
      const rows = new Map<PlaceRow, string>(
        csv.rows.map((row, at): [PlaceRow, string] => [{ ...row }, positionAtIndex(at)])
      )
      const answered: { row: PlaceRow; id: string | undefined; position: unknown }[] = []
      for (const change of changes) {
        const row = this.madeIn(rows, csv, change)
        if (row) answered.push({ row, id: change.id, position: this.positionIn(change) })
      }
      const ordered = [...rows].sort(([, one], [, other]) => (one < other ? -1 : one > other ? 1 : 0))
      this.writeAndHold(
        csv,
        ordered.map(([row]) => row)
      )
      const now = this.lastGood ?? []
      const { idColumn, positionField } = this
      const rowsNow = answered.map(({ row, id, position }) => {
        const found = idColumn === undefined ? undefined : now.find((each) => idOfRow(each, idColumn) === id)
        const kept = found ?? row
        // the position it was given, not the one the file now makes:  the rows around it haven't heard yet
        return position !== undefined && positionField ? { ...kept, [positionField]: position } : kept
      })
      return { rows: rowsNow, ...this.versionAnswer() }
    })
  }

  /** Run the operation `name`:  only `CSV_SAVE_ROWS`.  - throws what `saveRows()` does;  `PlaceError` `"not found"` for any other */
  async call(name: string, input: unknown, { signal }: SelectingContext = {}): Promise<unknown> {
    signal?.throwIfAborted()
    if (name !== CSV_SAVE_ROWS) {
      throw new PlaceError(`CsvPlace:  ${this.name} has no operation "${name}"`, { cause: { kind: "not found" } })
    }
    return this.saveRows(input as CsvSaveRowsInput)
  }

  /**
   * Save a whole list of rows, by comparing it with the file:  what a file with no id column can do beyond adding.
   * - An edited row with no id reads as one gone and one new:  the answer's `notes` say so.
   * - throws `PlaceError`:  `"refused"` as `applyNow()`;  `"out of date"` if the file isn't at `from`:  there's no row to merge on, so read it again
   */
  saveRows({ rows, from }: CsvSaveRowsInput): CsvSaveRowsAnswer {
    return SRV.FileLock.run(this.file, () => {
      if (from !== undefined && from !== this.versionNow()) {
        throw new PlaceError(`CsvPlace:  ${this.name} has changed since ${from};  read it again`, {
          cause: { kind: "out of date" }
        })
      }
      const csv = this.csvToWrite()
      const fields = this.positionField
      const without = fields ? rows.map(({ [fields]: _position, ...row }) => row) : rows
      const { added, moved, edited, removed } = this.writeAndHold(csv, without)
      const readsAsBoth = this.idColumn === undefined && added.length > 0 && removed.length > 0
      const note = `"${this.collection}" has no id column, so an edited row can't be told from one removed and one added:  it's saved as that`
      return {
        added: added.length,
        moved: moved.length,
        edited: edited.length,
        removed: removed.length,
        version: this.versionNow(),
        notes: readsAsBoth ? [note] : []
      }
    })
  }

  /** The file, if it can be saved over.  - throws `PlaceError` `"refused"`, saying why not */
  private csvToWrite(): CsvFile {
    const text = this.textNow()
    let csv: CsvFile
    try {
      csv = this.csvIn(text)
    } catch (error) {
      if (!(error instanceof SyntaxError || error instanceof PlaceError)) throw error
      this.refuse(`${this.name} can't be read, so it can't be saved over:  fix it first (${error.message})`)
    }
    if (text.includes(UNREADABLE_LETTER)) {
      this.refuse(
        `${this.name} isn't UTF-8, so saving it would change letters this can't read:  save it as UTF-8 first`
      )
    }
    if (csv.whyUnclear) this.refuse(csv.whyUnclear)
    return csv
  }

  /** Save `rows` by comparing them with `csv`, and hold what the file now says. */
  private writeAndHold(csv: CsvFile, rows: readonly PlaceRow[]) {
    const save = csv.saved(rows)
    ChunkFiles.writeChanged([[this.file, save.text]])
    this.heldRows(this.csvIn(save.text))
    return save
  }

  /** Make `change` in `rows`, each row's position beside it:  the row, unless it's gone.  - throws as `applyNow()` */
  private madeIn(rows: Map<PlaceRow, string>, csv: CsvFile, change: PlaceChange): PlaceRow | undefined {
    const { kind, collection, id, version } = change
    this.mustHold(collection)
    const { idColumn } = this
    const position = this.positionIn(change)
    const at = isListPosition(position) ? position.at : undefined
    const fields = this.fieldsIn(change)
    if (idColumn === undefined) {
      if (kind !== "insert") {
        this.refuse(
          `"${collection}" has no id column, so nothing says which row this means, and it can't be changed:  name the column that holds its ids`
        )
      }
      const row = { ...fields }
      rows.set(row, at ?? LAST_POSITION)
      return row
    }
    if (id === undefined) {
      throw new TypeError(`CsvPlace.apply():  a change in "${collection}" needs an id;  this place makes none`)
    }
    const found = [...rows.keys()].find((row) => idOfRow(row, idColumn) === id)
    if (kind === "insert") {
      const row = found ? Object.assign(found, fields) : { [idColumn]: id, ...fields }
      rows.set(row, at ?? rows.get(row) ?? LAST_POSITION)
      return row
    }
    if (!found) {
      throw new PlaceError(`CsvPlace.apply():  "${collection}" holds nothing with the id "${id}"`, {
        cause: { kind: "not found" }
      })
    }
    if (kind === "delete") {
      rows.delete(found)
      return undefined
    }
    this.mustNotBeOld(csv, found, change, version)
    Object.assign(found, fields)
    if (at !== undefined) rows.set(found, at)
    return found
  }

  /** - throws `PlaceError` `"out of date"` if the row in the file has moved on from what the change was made from */
  private mustNotBeOld(
    csv: CsvFile,
    row: PlaceRow,
    { collection, id }: PlaceChange,
    version: string | undefined
  ): void {
    if (version === undefined) return
    const at = csv.rows.findIndex((each) => idOfRow(each, this.idColumn) === id)
    if (at < 0 || csvRowVersion(csv.cellsOfRow(at)) === version) return
    throw new PlaceError(`CsvPlace.apply():  "${id}" in "${collection}" has changed since ${version};  read it again`, {
      cause: { kind: "out of date" }
    })
  }

  /** What `change` writes to cells:  not its position, nor anything of the engine's. */
  private fieldsIn({ fields = {} }: PlaceChange): PlaceRow {
    const { positionField } = this
    return Object.fromEntries(
      Object.entries(fields).filter(([field]) => field !== positionField && !field.startsWith("$"))
    )
  }

  /** The position `change` gives its row. */
  private positionIn({ fields }: PlaceChange): unknown {
    return this.positionField ? fields?.[this.positionField] : undefined
  }

  /** Where the file stands now, for an answer. */
  private versionAnswer(): { version?: string } {
    const version = this.versionNow()
    return version === undefined ? {} : { version }
  }

  /** - throws `PlaceError` `"not found"` for any collection but its own */
  private mustHold(collection: string): void {
    if (collection === this.collection) return
    throw new PlaceError(`CsvPlace:  ${this.name} holds "${this.collection}", not "${collection}"`, {
      cause: { kind: "not found" }
    })
  }

  /** - throws `PlaceError` `"refused"` */
  private refuse(message: string): never {
    throw new PlaceError(`CsvPlace:  ${message}`, { cause: { kind: "refused", whyNot: "place" } })
  }
}

/** Constructor props of a `CsvPlace`. */
export type CsvPlaceProps = {
  /** The file, absolute:  made by the first save, if it isn't there. */
  file: string
  /** The name it's read by. */
  collection: string
  /** The column holding each row's id.  Left out:  rows are told apart by their whole text, and can only be added to. */
  idColumn?: string
  /** The columns that hold numbers, so they filter and sort as numbers:  a CSV file's cells are all text. */
  numbers?: readonly string[]
  /** The field a row's place in the file reads as, and writing it moves the row.  Left out:  rows have no such field. */
  positionField?: string
}

/** Row `at`'s place in the file, for a reader:  it isn't in any list but the one. */
function placeAt(at: number) {
  return { parent: null, at: positionAtIndex(at) }
}
