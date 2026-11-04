import { parseCsv } from "./csv"
import { DEFAULT_CEILING } from "./PlaceQuery"
import {
  PlaceError,
  type ListAnswer,
  type ListQuery,
  type Place,
  type PlaceCapabilities,
  type PlaceCeiling,
  type PlaceContext
} from "./places.types"
import { SheetTable } from "./SheetTable"
import { WebPlace, type WebPlaceProps } from "./WebPlace"

/****************
 * ### `SheetPlace`
 * A CSV file at a web address as a place, read only:  the hardest case the interface has, with no id, no filter and no write (epic `data` P7).
 *
 * ```ts
 * new SheetPlace({ url: "/data/recipes.csv", collection: "recipes", idColumn: "id", numbers: ["servings"] })
 * ```
 *
 * - A file holds one table, so one place is one collection;  any other name is `"not found"`, not an empty list.
 * - Column names are the fields, and every cell is text unless `numbers` says otherwise.
 * - It can't filter, sort or page, so the engine does (`PlaceQuery`), and it can't be written:  `write: "none"`.
 * - Identity:  the author's `idColumn`, or rows share no identity, and every answer says so (`SheetTable`, `ListAnswer.notes`).
 * - Works from a browser with no key and no server of ours, if the file's server allows it:
 *   the same origin, or one that answers CORS, as a Google Sheet does when it's shared with "anyone with the link".
 *   - That sheet's address is `https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=<tab>`.
 *   - A sheet needing a key, or to be written:  `GoogleSheetPlace`, in `spell/server/places`.
 *   - A CSV file to be written:  `CsvPlace`, there too, with a server in front.
 * - The ceiling holds while it READS:  the engine only counts rows a place has already handed it, by when a 2 GB file is
 *   already in the browser.
 * - Live is polling, through whoever asks again (`pollWhileVisible()`):  each read asks the server whether the browser's
 *   copy is still good (`no-cache`), so an edit shows on the next one.
 ****************/
export class SheetPlace extends WebPlace implements Place {
  /** The one collection it holds. */
  private readonly collection: string
  /** The column holding each row's id. */
  private readonly idColumn: string | undefined
  /** The columns that hold numbers. */
  private readonly numbers: readonly string[] | undefined
  /** How much it will load. */
  private readonly ceiling: PlaceCeiling

  constructor({ collection, idColumn, numbers, ceiling, ...web }: SheetPlaceProps) {
    super({ changeIdHeader: false, ...web })
    this.collection = collection
    this.idColumn = idColumn
    this.numbers = numbers
    this.ceiling = { ...DEFAULT_CEILING, ...ceiling }
  }

  /** What it can do:  be read, whole, by asking again. */
  describe(): PlaceCapabilities {
    return {
      kind: "sheet",
      ...(this.idColumn !== undefined && { idOf: this.idColumn }),
      filter: "none",
      sort: "none",
      select: "none",
      page: "none",
      write: "none",
      atomic: false,
      live: "poll",
      abort: "hard",
      ceiling: this.ceiling
    }
  }

  /**
   * Every row in the file.
   * - throws `PlaceError`:  `"not found"` for another collection, a file that isn't there or an id column it hasn't got;
   *   `"over the ceiling"` for too much of it;  `SyntaxError` for a file half saved;  anything else for no answer
   */
  async list(collection: string, _query: ListQuery, context: PlaceContext): Promise<ListAnswer> {
    if (collection !== this.collection) {
      throw new PlaceError(`SheetPlace.list():  this file holds "${this.collection}", not "${collection}"`, {
        cause: { kind: "not found" }
      })
    }
    const response = await this.answerTo({ url: this.url, urlData: {}, cache: "no-cache" }, context)
    const cells = parseCsv(await this.textUnderCeiling(response))
    const { idColumn, numbers } = this
    const { rows, notes } = new SheetTable({ name: collection, cells, idColumn, numbers })
    if (rows.length > this.ceiling.rows) this.overCeiling(`${this.ceiling.rows} rows`)
    return { rows, ...(notes.length && { notes }), handled: {} }
  }

  /** The file's text, stopping as soon as it's more than the ceiling's bytes.  - throws `PlaceError` once it is */
  private async textUnderCeiling(response: Response): Promise<string> {
    const { bytes } = this.ceiling
    if (Number(response.headers.get("Content-Length")) > bytes) this.overCeiling(`${bytes} bytes`)
    if (!response.body) return response.text()
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let text = ""
    let read = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return text + decoder.decode()
      read += value.length
      if (read > bytes) {
        void reader.cancel().catch(() => {})
        this.overCeiling(`${bytes} bytes`)
      }
      text += decoder.decode(value, { stream: true })
    }
  }

  /** - throws `PlaceError` `"over the ceiling"` */
  private overCeiling(limit: string): never {
    throw new PlaceError(
      `SheetPlace:  "${this.collection}" is more than ${limit};  raise its \`ceiling\`, or split the file`,
      {
        cause: { kind: "over the ceiling" }
      }
    )
  }
}

/** Constructor props of a `SheetPlace`. */
export type SheetPlaceProps = WebPlaceProps & {
  /** The name it's read by. */
  collection: string
  /** The column holding each row's id.  Left out:  rows share no identity, and it says so. */
  idColumn?: string
  /** The columns that hold numbers, so they filter and sort as numbers:  a CSV file's cells are all text. */
  numbers?: readonly string[]
  /** How much it will load, over `DEFAULT_CEILING`. */
  ceiling?: Partial<PlaceCeiling>
}
