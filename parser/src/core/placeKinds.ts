/**
 * What's behind each kind of place spell knows by itself, from what a program's line says (epic `data` P11).
 * - The ONE table of them:  `family cookbook is a web server at "..."` compiles to its word, `"web server"`.
 * - A word, the same one `PlaceCapabilities.kind` says, as the side bar shows it (J55).
 * - A kind a library adds isn't here:  it's a class of its own, with its own `makePlace()` (`classes/Place.ts`).
 * - Imports `spell/util/places` as a TYPE only:  `saved.ts` loads that folder when a program first names a place,
 *   and hands it in.
 */
import { schemaOf } from "spell/util"
import type * as PlacesFolder from "spell/util/places"
import type { ListQuery, Place as PlaceBehind, PlacePerson } from "spell/util/places/places.types"

/** What a program's lines say about one place. */
export type PlaceDetails = {
  /** The place's name, as written:  `family cookbook`. */
  name: string
  /** Its kind's word:  `web server`.  A kind a library added:  nothing here, its class knows. */
  kind?: string
  /** Its address, as written. */
  at?: string
  /** Each collection's mapping, by the name it goes by:  its address there, and its fields' names there. */
  collections?: Record<string, { at?: string; fields?: Record<string, string> }>
  /** The NAME of the key it needs:  never the key. */
  keyNamed?: string
  /** How often it's asked what changed, in seconds. */
  checkedEvery?: number
  /** The field holding a row's version, on a web server that has one. */
  versionsIn?: string
  /** The column holding a row's id, on a sheet. */
  idColumn?: string
  /** Each named operation's address, by its name. */
  operations?: Record<string, string>
  /** The accounts a shared atmosphere account is limited to:  left out, whoever holds its records. */
  accounts?: readonly string[]
  /**
   * What a first draw reads from it, as the compiler found them (epic `data` P12):  each a class and what's asked.
   * - Read when the place is first read:  each class is declared by then.
   * - Asked for together:  one trip, not one per part of the page.
   */
  firstReads?: () => Array<[Function, ListQuery?]>
}

/** What a kind needs to make its place. */
export type PlaceMaking = {
  /** What the lines say. */
  details: PlaceDetails
  /** `spell/util/places`, loaded. */
  folder: typeof PlacesFolder
  /** The collection first read from this place. */
  collection: string
  /** The class first read from this place:  what a sheet's numbers and a graphql server's fields are read from. */
  Class: Function
  /** Who's at this page, for a place that has people. */
  person: PlacePerson
}

/** A row's id, in a place that isn't told otherwise. */
const ID_FIELD = "id"

/** The id in a Google Sheet's address. */
const GOOGLE_SHEET_ID = /\/spreadsheets\/d\/([\w-]+)/

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

/**
 * SIDE EFFECT:  `behind`, made for the first class read from it, knows the collection `making` is about too:
 * a graphql server's mapping is worked out per class, and a program may save several in one place.
 */
export function knowCollection(behind: PlaceBehind, making: PlaceMaking): void {
  const { GraphPlace } = making.folder
  if (!(behind instanceof GraphPlace)) return
  const { collection } = making
  behind.addCollection(collection, graphCollections(making)[collection]!)
}

/** Each kind's word, and how its place is made. */
const KINDS: Record<string, (making: PlaceMaking, folder: typeof PlacesFolder) => PlaceBehind> = {
  "web server": ({ details }, { RestPlace }) =>
    new RestPlace({
      url: details.at!,
      collections: restCollections(details),
      ...(details.versionsIn !== undefined && { versions: { field: details.versionsIn } }),
      ...(details.operations && { operations: details.operations }),
      ...(details.keyNamed !== undefined && { keyNamed: details.keyNamed })
    }),
  "graphql server": (making, { GraphPlace }) =>
    new GraphPlace({
      url: making.details.at!,
      collections: graphCollections(making),
      ...(making.details.keyNamed !== undefined && { keyNamed: making.details.keyNamed })
    }),
  "data folder": ({ details }, { RemotePlace, ChunkedPlace, WebChunks, JsonChunks }) => {
    const at = details.at!
    if (IS_SERVER_ADDRESS.test(at)) return new RemotePlace({ url: at, can: { kind: "data folder" } })
    return new ChunkedPlace({ store: new WebChunks({ url: at }), format: new JsonChunks({}) })
  },
  file: ({ details }, { RemotePlace }) => {
    const at = details.at!
    if (IS_SERVER_ADDRESS.test(at)) return new RemotePlace({ url: at, can: { kind: "file" } })
    throw new TypeError(
      `core.place():  "${details.name}" is a file, and a browser can't write one by itself:  give it a server side, at its address`
    )
  },
  room: ({ details, person }, { LiveRoomPlace }) =>
    new LiveRoomPlace({ url: details.at!.replace(/^ws/, "http"), person }),
  sheet: ({ details, collection, Class }, { SheetPlace, RemotePlace, isPlaceServerAddress }) => {
    const at = details.at!
    const { idColumn } = details
    // a server in front:  it knows the file's numbers, and it's what takes writes;  with no id column, rows share no identity
    if (isPlaceServerAddress(at)) {
      return new RemotePlace({ url: at, can: { kind: "sheet", atomic: true, idOf: idColumn as string } })
    }
    return new SheetPlace({
      url: new URL(at, globalThis.location?.href).href,
      collection,
      numbers: fieldsOfKind(Class, "number"),
      ...(idColumn !== undefined && { idColumn })
    })
  },
  "google sheet": ({ details, collection, Class }, { SheetPlace, RemotePlace, isPlaceServerAddress }) => {
    const at = details.at!
    const { idColumn } = details
    // a server in front:  `GoogleSheetPlace`, which holds the key, and takes writes
    if (isPlaceServerAddress(at)) {
      return new RemotePlace({
        url: at,
        can: { kind: "google sheet", atomic: true, ...(idColumn !== undefined && { idOf: idColumn }) }
      })
    }
    // no key:  anyone with its link can read it, as its one tab's CSV, and nothing can write it
    return new SheetPlace({
      url: googleSheetCsvAddress(at),
      collection,
      numbers: fieldsOfKind(Class, "number"),
      ...(idColumn !== undefined && { idColumn })
    })
  },
  "atmosphere account": ({ details, person }, { AtProtoPlace }) =>
    new AtProtoPlace({
      kind: "atmosphere account",
      accounts: [details.at!],
      collections: atmosphereCollections(details),
      person
    }),
  "personal atmosphere account": ({ details, person }, { AtProtoPlace }) =>
    new AtProtoPlace({
      kind: "personal atmosphere account",
      ...(details.at !== undefined && { corner: details.at }),
      ...(details.accounts && { accounts: details.accounts }),
      collections: atmosphereCollections(details),
      person
    }),
  "database on this device": (_making, { DevicePlace }) => new DevicePlace({ wholeRows: true }),
  "in memory database": (_making, { MemoryPlace }) => new MemoryPlace()
}

/**
 * The address a Google Sheet's first tab is read from as CSV, from the address a browser shows for it.
 * - throws `TypeError` for an address that isn't a Google Sheet's.
 */
function googleSheetCsvAddress(address: string): string {
  const id = GOOGLE_SHEET_ID.exec(address)?.[1]
  if (!id)
    throw new TypeError(`core.place():  "${address}" isn't a Google Sheet's address:  it has no /spreadsheets/d/<id>`)
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`
}

/** What an atmosphere account's lines call each collection. */
function atmosphereCollections({ collections = {} }: PlaceDetails): Record<string, string> {
  return Object.fromEntries(Object.entries(collections).flatMap(([name, { at }]) => (at ? [[name, at]] : [])))
}

/** A web server's mapping:  each collection's address, and its fields' names there. */
function restCollections({ collections = {} }: PlaceDetails) {
  return Object.fromEntries(
    Object.entries(collections).map(([name, { at, fields }]) => [
      name,
      { ...(at !== undefined && { path: at.includes("{") ? at : `${at}{/id}` }), ...(fields && { fields }) }
    ])
  )
}

/**
 * A graphql server's mapping, by convention:  a server that follows it needs no lines (epic `data` P11).
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
