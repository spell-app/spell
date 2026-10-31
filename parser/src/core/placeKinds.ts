/**
 * What's behind each kind of place spell knows by itself, from what a program's line says (epic `data` P11).
 * - The ONE table of them:  `family cookbook is a web service at "..."` compiles to its word, `"web service"`.
 * - A word, the same one `PlaceCapabilities.kind` says, as the side bar shows it (J55).
 * - A kind a library adds isn't here:  it's a class of its own, with its own `makePlace()` (`classes/Place.ts`).
 * - Imports `spell/util/places` as a TYPE only:  `saved.ts` loads that folder when a program first names a place,
 *   and hands it in.
 */
import { schemaOf } from "spell/util"
import type * as PlacesFolder from "spell/util/places"
import type { Place as PlaceBehind } from "spell/util/places/places.types"

/** What a program's lines say about one place. */
export type PlaceDetails = {
  /** The place's name, as written:  `family cookbook`. */
  name: string
  /** Its kind's word:  `web service`.  A kind a library added:  nothing here, its class knows. */
  kind?: string
  /** Its address, as written. */
  at?: string
  /** Each collection's mapping, by the name it goes by:  its address there, and its fields' names there. */
  collections?: Record<string, { at?: string; fields?: Record<string, string> }>
  /** The NAME of the key it needs:  never the key. */
  keyNamed?: string
  /** How often it's asked what changed, in seconds. */
  checkedEvery?: number
  /** The field holding a row's version, on a web service that has one. */
  versionsIn?: string
  /** The column holding a row's id, on a sheet. */
  idColumn?: string
  /** Each named operation's address, by its name. */
  operations?: Record<string, string>
}

/** What a kind needs to make its place. */
export type PlaceMaking = {
  /** What the lines say. */
  details: PlaceDetails
  /** `spell/util/places`, loaded. */
  folder: typeof PlacesFolder
  /** The collection first read from this place. */
  collection: string
  /** The class first read from this place:  what a sheet's numbers and a graph service's fields are read from. */
  Class: Function
}

/** A row's id, in a place that isn't told otherwise. */
const ID_FIELD = "id"

/** A place on the far side of a server:  an address with a scheme, or from the top of this server. */
const IS_SERVER_ADDRESS = /^(?:[a-z][a-z0-9+.-]*:|\/)/i

/**
 * What's behind the place `making` describes.
 * - throws `TypeError` for a kind nobody knows, and for one that needs a server side it wasn't given
 */
export function placeBehind(making: PlaceMaking): PlaceBehind {
  const { details, folder } = making
  const make = KINDS[details.kind ?? ""]
  if (!make) {
    throw new TypeError(`core.place():  there's no kind of place called "${details.kind}";  a library can add one`)
  }
  return make(making, folder)
}

/** Each kind's word, and how its place is made. */
const KINDS: Record<string, (making: PlaceMaking, folder: typeof PlacesFolder) => PlaceBehind> = {
  "web service": ({ details }, { RestPlace }) =>
    new RestPlace({
      url: details.at!,
      collections: restCollections(details),
      ...(details.versionsIn !== undefined && { versions: { field: details.versionsIn } }),
      ...(details.operations && { operations: details.operations }),
      ...(details.keyNamed !== undefined && { keyNamed: details.keyNamed })
    }),
  "graph service": (making, { GraphPlace }) =>
    new GraphPlace({
      url: making.details.at!,
      collections: graphCollections(making),
      ...(making.details.keyNamed !== undefined && { keyNamed: making.details.keyNamed })
    }),
  folder: ({ details }, { RemotePlace, ChunkedPlace, WebChunks, JsonChunks }) => {
    const at = details.at!
    if (IS_SERVER_ADDRESS.test(at)) return new RemotePlace({ url: at, can: { kind: "folder" } })
    return new ChunkedPlace({ store: new WebChunks({ url: at }), format: new JsonChunks({}) })
  },
  file: ({ details }, { RemotePlace }) => {
    const at = details.at!
    if (IS_SERVER_ADDRESS.test(at)) return new RemotePlace({ url: at, can: { kind: "file" } })
    throw new TypeError(
      `core.place():  "${details.name}" is a file, and a browser can't write one by itself:  give it a server side, at its address`
    )
  },
  "live room": ({ details }, { LiveRoomPlace }) => new LiveRoomPlace({ url: details.at!.replace(/^ws/, "http") }),
  sheet: ({ details, collection, Class }, { SheetPlace }) =>
    new SheetPlace({
      url: new URL(details.at!, globalThis.location?.href).href,
      collection,
      numbers: fieldsOfKind(Class, "number"),
      ...(details.idColumn !== undefined && { idColumn: details.idColumn })
    }),
  "this device": (_making, { DevicePlace }) => new DevicePlace({ wholeRows: true }),
  "in memory": (_making, { MemoryPlace }) => new MemoryPlace()
}

/** A web service's mapping:  each collection's address, and its fields' names there. */
function restCollections({ collections = {} }: PlaceDetails) {
  return Object.fromEntries(
    Object.entries(collections).map(([name, { at, fields }]) => [
      name,
      { ...(at !== undefined && { path: at.includes("{") ? at : `${at}{/id}` }), ...(fields && { fields }) }
    ])
  )
}

/**
 * A graph service's mapping, by convention:  a service that follows it needs no lines (epic `data` P11).
 * - `recipes` lists, `recipe(id)` finds one;  pages by connection.
 * - `addRecipe`, `changeRecipe`, `removeRecipe` write, taking a `RecipeInput!` and a `RecipePatch!`.
 * - Its fields are what the class declares, by each one's name there.
 */
function graphCollections({ details, collection, Class }: PlaceMaking) {
  const { at, fields = {} } = details.collections?.[collection] ?? {}
  const list = at ?? collection
  const one = list.replace(/s$/, "")
  const named = one.charAt(0).toUpperCase() + one.slice(1)
  const selected = [ID_FIELD, ...declaredFields(Class).filter((field) => field !== ID_FIELD)]
  return {
    [collection]: {
      list,
      one,
      paging: "connection" as const,
      fields: selected.map((field) => (fields[field] ? `${field}: ${fields[field]}` : field)),
      insert: { mutation: `add${named}`, input: `${named}Input!` },
      update: { mutation: `change${named}`, id: "ID!", input: `${named}Patch!` },
      delete: { mutation: `remove${named}`, id: "ID!" }
    }
  }
}

/** Every field `Class` declares of a plain value, its parents' too:  what can be asked for by name. */
function declaredFields(Class: Function): string[] {
  const names: string[] = []
  for (let schema = schemaOf(Class) as ReturnType<typeof schemaOf> | undefined; schema; schema = schema.parent) {
    for (const [name, info] of schema.declared) if (isPlainField(info)) names.push(name)
  }
  return names
}

/** Is a field declared as this a plain value, and not a thing or a list of them? */
function isPlainField(info: { type?: unknown }): boolean {
  return ["text", "number", "choice", "date", undefined].includes(info.type as string | undefined)
}

/** Every field `Class` declares of `kind`. */
function fieldsOfKind(Class: Function, kind: string): string[] {
  const names: string[] = []
  for (let schema = schemaOf(Class) as ReturnType<typeof schemaOf> | undefined; schema; schema = schema.parent) {
    for (const [name, info] of schema.declared) if ((info as { type?: unknown }).type === kind) names.push(name)
  }
  return names
}
