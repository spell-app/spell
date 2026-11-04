import type { ChunkFormat, ChunkList } from "./ChunkedPlace"
import type { PlaceRow } from "./places.types"

/** What a list file's name ends in. */
const LIST_ENDING = ".list.json"

/** What a thing's file name ends in. */
const BODY_ENDING = ".json"

/** What can't be in one file's name, or would mean something else in it:  a dot file is never served or written. */
const UNSAFE_IN_A_NAME = /^\.|[%/\\:\0]/g

/****************
 * ### `JsonChunks`
 * The `ChunkFormat` of plain JSON things (epic `data` P5):  a list file, and one file per thing.
 *
 * ```text
 * recipes.list.json     { "rows": [{ "id": "r-1", "title": "Dal" }], "versions": { "r-1": "\"1a-9f\"" } }
 * recipes/r-1.json      { "id": "r-1", "title": "Dal", "servings": 6, "notes": "Temper the spices last." }
 * ```
 *
 * - The list sits beside its folder, not in it, so no id can land on it.
 * - A thing is addressed plainly by its collection and id:  an id is one file name, whatever it holds
 *   (`a/b` is the file `a%2Fb.json`;  `new one` the file `new one.json`).
 * - An ADDRESS is a URL path, so it's encoded once more (`recipes/a%252Fb.json`):  a static host, `ChunkFiles` and the app's
 *   `DiskStorage` all read an address that way.
 * - A thing's id comes from its file's name, whatever the file says:  so a file copied in VS Code is a new thing.
 * - Strict JSON, no comments:  a static host and a browser read it as it is.
 ****************/
export class JsonChunks implements ChunkFormat {
  /** The field holding a thing's id. */
  readonly idOf: string
  /** Which fields each collection's summaries hold. */
  private readonly summaries: Readonly<Record<string, readonly string[]>>

  constructor({ idOf = "id", summaries = {} }: JsonChunksProps = {}) {
    this.idOf = idOf
    this.summaries = summaries
  }

  /** `recipes.list.json` */
  listAddress(collection: string): string {
    return `${addressOf(collection)}${LIST_ENDING}`
  }

  /** `recipes/r-1.json` */
  bodyAddress(collection: string, id: string): string {
    return `${this.folderOf(collection)}/${addressOf(id)}${BODY_ENDING}`
  }

  /** The folder holding a collection's things:  `recipes`. */
  folderOf(collection: string): string {
    return addressOf(collection)
  }

  /** Which collection this folder on the disk holds. */
  collectionOfFolder(name: string): string {
    return nameIn(name)
  }

  /** Which thing this file name in a collection's folder holds;  `undefined` for any other file. */
  idOfFile(name: string): string | undefined {
    if (!name.endsWith(BODY_ENDING) || name.startsWith(".")) return undefined
    return nameIn(name.slice(0, -BODY_ENDING.length))
  }

  /** Which fields a summary in `collection` holds, besides its id. */
  summaryFields(collection: string): readonly string[] {
    return this.summaries[collection] ?? []
  }

  /** - throws `SyntaxError` for what isn't JSON */
  listIn(text: string): ChunkList {
    const { rows = [], versions } = JSON.parse(text) as Partial<ChunkList>
    return { rows, ...(versions && { versions }) }
  }

  /** - throws `SyntaxError` for what isn't JSON, or isn't one thing */
  bodyIn(text: string, collection: string, id: string): PlaceRow {
    const thing = JSON.parse(text) as unknown
    if (thing === null || typeof thing !== "object" || Array.isArray(thing)) {
      throw new SyntaxError(`JsonChunks:  "${id}" in "${collection}" should hold one thing, in { }`)
    }
    return { ...(thing as PlaceRow), [this.idOf]: id }
  }

  /** The list's file, laid out for a person to read. */
  listText(list: ChunkList): string {
    return `${JSON.stringify(list, null, 2)}\n`
  }

  /** A thing's file, laid out for a person to read. */
  bodyText(row: PlaceRow): string {
    return `${JSON.stringify(row, null, 2)}\n`
  }
}

/** Constructor props of a `JsonChunks`. */
export type JsonChunksProps = {
  /** The field holding a thing's id;  default `id`. */
  idOf?: string
  /** Which fields each collection's list holds, besides the id:  `{ recipes: ["title"] }`.  One not named:  ids alone. */
  summaries?: Readonly<Record<string, readonly string[]>>
}

/** `name` as an address's part:  one file's name, nothing that would climb or hide as a dot file, as a URL path says it. */
function addressOf(name: string): string {
  const fileName = name.replace(
    UNSAFE_IN_A_NAME,
    (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()}`
  )
  return encodeURIComponent(fileName)
}

/** What a file's `name` on the disk stands for;  a name that was never encoded (`100%`) stands for itself. */
function nameIn(name: string): string {
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}
