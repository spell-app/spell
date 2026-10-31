/**
 * One CSV file as the recipe servers' box of recipes, so REST, GraphQL and a sheet are three ways into one file (epic `data` I21).
 * - Node only;  a test helper, as `recipeServers.ts` is.
 * - The writer stays here, not in `spell/util/places`:  a sheet in the engine is read only (`SheetPlace`), and only this demo writes one.
 */
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

import { parseCsv } from "spell/util/places/csv"
import { SRV, type Handler } from "spell/server"
import { ChunkFiles } from "spell/server/places"

import { answeredAcrossOrigins, FIRST_RECIPES, RecipeBox, type WireRecipe } from "./recipeServers"

/** Where the file is served. */
const CSV_PATH = "/recipes.csv"

/** The column that says which recipe a row is. */
const ID_COLUMN = "id"

/** The column the servers call `name`:  a sheet says `title`, as the page does. */
const TITLE_COLUMN = "title"

/** The columns of a file it makes itself. */
const FIRST_COLUMNS = [ID_COLUMN, TITLE_COLUMN, "cuisine", "servings", "notes"]

/** What needs quotes in a CSV file. */
const NEEDS_QUOTES = /[",\r\n]/

/****************
 * ### `RecipeFile`
 * A `RecipeBox` whose recipes are the rows of a CSV file:  the file is the truth, and the box only holds what it last read.
 * - EVERY request reads the file first (`readOutsideChanges()`), so an edit in VS Code is in the very next answer.
 *   - So it needs no watcher at all:  everything that asks here polls, and a small file costs nothing to read.
 *   - It also means a write is made onto what's in the file now:  an edit saved a moment ago isn't written over.
 * - A write saves the whole file at once (`ChunkFiles.writeChanged()`:  a temp file, then a rename).
 *   - Its quoting is the writer's:  a field quoted with no need comes back without.  Other columns are kept.
 * - A VERSION IS THE ROW'S OWN CONTENT, hashed:  a CSV file has no version column, and a person's editor won't write one.
 *   - So editing one row in VS Code moves that row's version, and no other's:  REST's `If-Match` clashes on that row only (412),
 *     and the page merges per field, as with any other second person.
 *   - Not the file's version:  every edit would clash with every row.
 *   - Changed and changed back is the same version, which is right:  the content is the same.
 * - A file it can't read (half saved, no `id` column, a blank or repeated id):  it answers as it last read, says so once in the
 *   log, and refuses every write (409), so a broken file is never replaced by an old copy.
 ****************/
export class RecipeFile extends RecipeBox {
  /** The file, absolute. */
  readonly file: string
  /** The file's columns, in its order. */
  private columns = FIRST_COLUMNS
  /** The file's text as last read or written. */
  private text = ""
  /** Why the file's text can't be used. */
  private unreadable: Error | undefined

  constructor({ file, firstText }: RecipeFileProps) {
    super([])
    this.file = file
    if (!existsSync(file)) {
      ChunkFiles.writeChanged([[file, firstText ?? csvFor(FIRST_COLUMNS, FIRST_RECIPES.map(withVersion))]])
    }
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
      this.holdRowsOf(text)
      this.unreadable = undefined
    } catch (error) {
      this.unreadable = error as Error
      console.error(`RecipeFile:  ${this.file} can't be read yet;  it stays as it last read`, error)
    }
  }

  /** Add a row, and save the file.  - throws `HttpError` 409, while the file can't be read */
  add(fields: Partial<WireRecipe>): WireRecipe {
    this.refuseIfUnreadable()
    return this.saved(super.add(fields).id)
  }

  /** Change a row, and save the file.  - throws `HttpError` 409, while the file can't be read */
  change(id: string, fields: Partial<WireRecipe>): WireRecipe {
    this.refuseIfUnreadable()
    return this.saved(super.change(id, fields).id)
  }

  /** Take a row out, and save the file.  - throws `HttpError` 409, while the file can't be read */
  remove(id: string): void {
    this.refuseIfUnreadable()
    super.remove(id)
    this.save()
  }

  /** The row `id`, as the saved file holds it. */
  private saved(id: string): WireRecipe {
    this.save()
    return this.recipes.get(id)!
  }

  /** Write the file, and hold what it now says:  so the box and the file can't differ, down to a number's text. */
  private save(): void {
    const text = csvFor(this.columns, [...this.recipes.values()])
    ChunkFiles.writeChanged([[this.file, text]])
    this.text = text
    this.holdRowsOf(text)
  }

  /** Hold the rows of `text`, or nothing changes.  - throws `SyntaxError` for a file that's half saved, or doesn't say which row is which */
  private holdRowsOf(text: string): void {
    const [header, ...rows] = parseCsv(text)
    if (!header?.includes(ID_COLUMN)) throw new SyntaxError(`RecipeFile:  ${this.file} has no "${ID_COLUMN}" column`)
    const recipes = new Map<string, WireRecipe>()
    for (const cells of rows) {
      const recipe = recipeFor(header, cells)
      if (!recipe.id || recipes.has(recipe.id)) {
        throw new SyntaxError(`RecipeFile:  ${this.file} has a blank or repeated id:  "${recipe.id}"`)
      }
      recipes.set(recipe.id, recipe)
    }
    this.columns = header
    this.recipes.clear()
    for (const [id, recipe] of recipes) this.recipes.set(id, recipe)
  }

  /** - throws `HttpError` 409:  writing now would replace what someone's halfway through with an old copy */
  private refuseIfUnreadable(): void {
    if (this.unreadable)
      throw new SRV.HttpError(409, `${this.file} can't be read, so it can't be saved over:  fix it first`)
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
 * - A sheet can't write, whatever else can:  anything else is a 405.
 */
export function csvHandler(box: RecipeFile): Handler {
  return (request, reply, next) => {
    if (request.path !== CSV_PATH) return next()
    if (answeredAcrossOrigins(request, reply)) return
    if (request.method !== "GET") return void reply.status(405).json({ error: "a sheet is read only" })
    box.readOutsideChanges()
    reply.type("text/csv").send(box.csv)
  }
}

/**
 * `recipes` as a CSV file, with a line end after every row.
 * - Quotes only what needs it, as RFC 4180 says, and as `parseCsv()` reads.
 */
export function csvFor(columns: readonly string[], recipes: readonly WireRecipe[]): string {
  const rows = recipes.map((recipe) => columns.map((column) => cellFor(recipe, column)))
  return [columns, ...rows].map((cells) => `${cells.map(quoted).join(",")}\n`).join("")
}

/** The text of `recipe`'s cell in `column`. */
function cellFor(recipe: WireRecipe, column: string): string {
  const name = column === TITLE_COLUMN ? "name" : column
  return `${(recipe as Record<string, string | number | undefined>)[name] ?? ""}`
}

/** `cell`, as a CSV file holds it. */
function quoted(cell: string): string {
  return NEEDS_QUOTES.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell
}

/** The recipe in a row:  any other column rides along, and is written back. */
function recipeFor(header: readonly string[], cells: readonly string[]): WireRecipe {
  const { [TITLE_COLUMN]: title = "", ...row } = Object.fromEntries(
    header.map((column, index) => [column, cells[index] ?? ""])
  )
  return withVersion({
    cuisine: "",
    notes: "",
    ...row,
    id: row[ID_COLUMN] ?? "",
    name: title,
    servings: Number(row.servings) || 0
  })
}

/** `recipe`, its version its content's hash, as a number:  what `If-Match` says. */
function withVersion(recipe: Omit<WireRecipe, "version">): WireRecipe {
  const hash = createHash("sha1").update(JSON.stringify(recipe)).digest("hex")
  return { ...recipe, version: Number.parseInt(hash.slice(0, 8), 16) }
}
