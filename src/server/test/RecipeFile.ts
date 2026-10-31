/**
 * One CSV file as the recipe servers' box of recipes, so REST, GraphQL and a sheet are three ways into one file (epic `data` I21).
 * - Node only;  a test helper, as `recipeServers.ts` is.
 * - The file's reading and writing are `CsvPlace`'s, the real thing (epic `data` P14):  this only says it in the servers' names.
 */
import { existsSync, readFileSync } from "node:fs"

import { CsvFile, PlaceError, type PlaceChange, type PlaceRow } from "spell/util/places"
import { SRV, type Handler } from "spell/server"
import { ChunkFiles, CsvPlace, csvRowVersion } from "spell/server/places"

import { answeredAcrossOrigins, FIRST_RECIPES, RecipeBox, type WireRecipe } from "./recipeServers"

/** Where the file is served. */
const CSV_PATH = "/recipes.csv"

/** The one collection. */
const COLLECTION = "recipes"

/** The column that says which recipe a row is. */
const ID_COLUMN = "id"

/** The column the servers call `name`:  a sheet says `title`, as the page does. */
const TITLE_COLUMN = "title"

/** The columns that hold numbers. */
const NUMBERS = ["servings"]

/** The field a row's place in the file reads as, for a page that moves rows:  a live room's word for it. */
const POSITION_FIELD = "place"

/****************
 * ### `RecipeFile`
 * A `RecipeBox` whose recipes are the rows of a CSV file:  the file is the truth, and the box only holds what it last read.
 * - EVERY request reads the file first (`readOutsideChanges()`), so an edit in VS Code is in the very next answer.
 *   - So it needs no watcher at all:  everything that asks here polls, and a small file costs nothing to read.
 *   - It also means a write is made onto what's in the file now:  an edit saved a moment ago isn't written over.
 * - A write is `place.applyNow()`:  only the lines that changed change, and any other column stays.
 * - A VERSION IS THE ROW'S OWN CONTENT, hashed (`csvRowVersion()`), as a number:  what `If-Match` says.
 *   - So editing one row in VS Code moves that row's version, and no other's:  REST's `If-Match` clashes on that row only (412),
 *     and the page merges per field, as with any other second person.
 * - A file it can't read (half saved, no `id` column, a blank or repeated id):  it answers as it last read, says so once in the
 *   log, and refuses every write (409), so a broken file is never replaced by an old copy.
 ****************/
export class RecipeFile extends RecipeBox {
  /** The file, absolute. */
  readonly file: string
  /** The file as a place:  what `/api/places/recipes-csv` serves. */
  readonly place: CsvPlace
  /** The file's text as last read or written. */
  private text = ""
  /** The file's columns, as last read. */
  private columns: readonly string[] = []

  constructor({ file, firstText }: RecipeFileProps) {
    super([])
    this.file = file
    this.place = new CsvPlace({
      file,
      collection: COLLECTION,
      idColumn: ID_COLUMN,
      numbers: NUMBERS,
      positionField: POSITION_FIELD
    })
    if (!existsSync(file)) ChunkFiles.writeChanged([[file, firstText ?? firstRecipesText()]])
    this.readOutsideChanges()
  }

  /** The file as it was last read:  what `csvHandler()` serves. */
  get csv(): string {
    return this.text
  }

  /** Read the file, if it's changed.  - NEVER throws:  what can't be read is logged, and held to refuse writes */
  readOutsideChanges(): void {
    const text = existsSync(this.file) ? readFileSync(this.file, "utf8") : ""
    if (text === this.text && this.recipes.size) return
    this.text = text
    try {
      this.holdRowsOf(this.place.csvNow())
    } catch (error) {
      console.error(`RecipeFile:  ${this.file} can't be read yet;  it stays as it last read`, error)
    }
  }

  /** Add a row, and save the file.  - throws `HttpError` 409, while the file can't be read */
  add(fields: Partial<WireRecipe>): WireRecipe {
    const id = this.idFor(fields)
    this.save({ kind: "insert", collection: COLLECTION, id, fields: this.cellsFor({ ...fields, id }) })
    return this.recipes.get(id)!
  }

  /** Change a row, and save the file.  - throws `HttpError` 409, while the file can't be read */
  change(id: string, fields: Partial<WireRecipe>): WireRecipe {
    this.save({ kind: "update", collection: COLLECTION, id, fields: this.cellsFor(fields) })
    return this.recipes.get(id)!
  }

  /** Take a row out, and save the file.  - throws `HttpError` 409, while the file can't be read */
  remove(id: string): void {
    this.save({ kind: "delete", collection: COLLECTION, id })
  }

  /** Make `change`, and hold what the file now says:  so the box and the file can't differ, down to a number's text. */
  private save(change: PlaceChange): void {
    try {
      this.place.applyNow([change])
    } catch (error) {
      if (error instanceof PlaceError && error.kind === "refused") throw new SRV.HttpError(409, error.message)
      throw error
    }
    this.readOutsideChanges()
  }

  /** `fields` in the file's names:  `name` is its `title`, and what it has no column for isn't kept, as a real service's unknown field isn't. */
  private cellsFor({ name, version: _version, ...fields }: Partial<WireRecipe>): PlaceRow {
    const row: PlaceRow = { ...fields, ...(name !== undefined && { [TITLE_COLUMN]: name }) }
    return Object.fromEntries(Object.entries(row).filter(([column]) => this.columns.includes(column)))
  }

  /** Hold the rows of `csv`, or nothing changes.  - throws `SyntaxError` for a file that doesn't say which row is which */
  private holdRowsOf(csv: CsvFile): void {
    if (csv.whyUnclear || !csv.columns.includes(ID_COLUMN)) {
      throw new SyntaxError(csv.whyUnclear ?? `RecipeFile:  ${this.file} has no "${ID_COLUMN}" column`)
    }
    this.columns = csv.columns
    this.recipes.clear()
    csv.rows.forEach((row, at) => {
      const recipe = recipeFor(row, csv.cellsOfRow(at))
      this.recipes.set(recipe.id, recipe)
    })
  }
}

/** Constructor props of a `RecipeFile`. */
export type RecipeFileProps = {
  /** The file:  made if it isn't there. */
  file: string
  /** What to make it with:  left out, the first recipes. */
  firstText?: string
}

/**
 * The file itself, at `/recipes.csv`, for a sheet to read:  `GET` only.
 * - A plain address can't write, whatever else can:  anything else is a 405.  What writes it is its place server.
 */
export function csvHandler(box: RecipeFile): Handler {
  return (request, reply, next) => {
    if (request.path !== CSV_PATH) return next()
    if (answeredAcrossOrigins(request, reply)) return
    if (request.method !== "GET") return void reply.status(405).json({ error: "a sheet is read only at this address" })
    box.readOutsideChanges()
    reply.type("text/csv").send(box.csv)
  }
}

/** A file holding the first recipes. */
function firstRecipesText(): string {
  const rows = FIRST_RECIPES.map(({ id, name, ...fields }) => ({ [ID_COLUMN]: id, [TITLE_COLUMN]: name, ...fields }))
  return new CsvFile("", { name: COLLECTION, idColumn: ID_COLUMN }).saved(rows).text
}

/** The recipe in a row:  any other column rides along.  Its version:  a hash of `cells`. */
function recipeFor({ [TITLE_COLUMN]: title = "", ...row }: PlaceRow, cells: readonly string[]): WireRecipe {
  return {
    cuisine: "",
    notes: "",
    ...row,
    id: `${row[ID_COLUMN] as string}`,
    name: `${title as string}`,
    servings: Number(row.servings) || 0,
    version: Number.parseInt(csvRowVersion(cells).slice(0, 8), 16)
  } as WireRecipe
}
