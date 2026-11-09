/**
 * What's behind each kind of place spell knows by itself, from what a program's line says (epic `data` P11).
 * - The ONE table of them:  `family cookbook is a web server at "..."` compiles to its word, `"web server"`.
 * - A word, the same one `PlaceCapabilities.kind` says, as the side bar shows it (J55).
 * - A kind a library adds isn't here:  it's a class of its own, with its own `makePlace()` (`classes/Place.ts`).
 * - Imports `spell/places` as a TYPE only:  `saved.ts` loads that folder when a program first names a place,
 *   and hands it in.
 */
import { schemaOf } from "spell/util"
import type { ClockTime } from "spell/util/polling"
import type * as PlacesFolder from "spell/places"
import {
  CLOUD_KIND,
  SPACE_PROJECTION_OPERATIONS,
  SPACE_SHEET_OPERATIONS,
  type ListQuery,
  type Place as PlaceBehind,
  type PlacePerson,
  type Projection,
  type SheetRules
} from "spell/places/places.types"

/** What a program's lines say about one place. */
export type PlaceDetails = {
  /** The place's name, as written:  `family cookbook`. */
  name: string
  /** Its kind's word:  `web server`.  A kind a library added:  nothing here, its class knows. */
  kind?: string
  /** Its address, as written. */
  at?: string
  /** Each collection's mapping, by the name it goes by:  its address there, and its fields' names there. */
  collections?: Record<
    string,
    {
      at?: string
      fields?: Record<string, string>
      /**
       * Given only to a search:  `books are searched at "/search.json"`.
       * - The compiler's, so a read always searches.
       */
      searchedOnly?: boolean
      /** Fields holding a picture's id, by ours, with where its pictures are:  see `RestCollection.pictures`. */
      pictures?: Record<string, string>
      /**
       * The fields it's asked for by, by ours:  `forecasts are asked for by their latitude and longitude`.
       * - SEE:  `RestCollection.askedBy`
       */
      askedBy?: string[]
      /** How this one is searched, at its own address:  `users are searched with "q" at "/search/users"`. */
      searches?: { param: string; fields: string[]; at?: string }
    }
  >
  /** The NAME of the key it needs:  never the key. */
  keyNamed?: string
  /** It goes without its key where nothing holds it, a browser:  `its key is the secret "GITHUB_TOKEN", if it's set`. */
  keyIfSet?: boolean
  /** How often it's asked what changed, in seconds. */
  checkedEvery?: number
  /** Once a day at this time, instead:  `check it once a day at 5am` (`pollWhileVisible()`'s `at`). */
  checkedAt?: ClockTime
  /** The field holding a row's version, on a web server that has one. */
  versionsIn?: string
  /** The field holding a row's id:  a sheet's or an airtable's column, or a web server's field, for every collection. */
  idColumn?: string
  /** Where a web server's list keeps its rows in its answer, for every collection. */
  rowsIn?: string
  /** Which field of a web server's answer says where its next page is, for every collection. */
  nextPageIn?: string
  /**
   * A web server says where its next page is in its `Link` header, for every collection:
   * `its next page is in its "Link" header`.
   */
  nextPageInLink?: boolean
  /**
   * What a web server calls how many and where from, when it pages by a position, for every collection:
   * `its next page is asked for with "limit" and "offset"`.
   * - No `limit`:  it's asked only where from, and gives its own page size.
   */
  pagesByOffset?: { limit?: string; offset: string }
  /**
   * What a web server calls how many and which page, when it counts pages, for every collection:
   * `its next page is asked for by number with "per_page" and "page"`.
   * - No `limit`:  it's asked only which page.
   * - `first`:  the first page's number;  left out, 1.
   */
  pagesByNumber?: { limit?: string; page: string; first?: number }
  /**
   * What a web server calls how many and the last row's id, when it's asked for what comes after a row, for every collection:
   * `its next page is asked for with "limit" and the last id as "starting_after", until its "has_more" is no`.
   * - No `limit`:  it's asked only what comes after, and gives its own page size.
   * - `moreIn`:  a dotted path in its answer that says whether there's more.
   */
  pagesByLastId?: { limit?: string; param: string; moreIn?: string }
  /** What a web server calls the cursor it's sent back, when that isn't `cursor`:  `its next page is its "nextPageToken", sent back as "pageToken"`. */
  nextPageSentAs?: string
  /** Each named operation's address, by its name. */
  operations?: Record<string, string>
  /** How it spells a field's name, by an example:  `hair_color` (`it writes names like "hair_color"`). */
  namesLike?: string
  /** How it writes a number, by an example:  `1.200,5` (`it writes numbers like "1.200,5"`). */
  numbersLike?: string
  /**
   * The only fields a web server's lists give of each row, its whole at the row's own address:
   * PokéAPI's `name` (`its lists give only each one's "name"`).
   * - Any other field is read from there when something reads it.
   */
  listsGive?: readonly string[]
  /** How many a web server gives at a time, when asked:  `it gives up to 2000 at a time`, every name in one request. */
  pageSize?: number
  /** Which fields a web server filters by itself:  `it filters by cuisine and rating`.  Left out:  none. */
  filters?: "every field" | readonly string[]
  /** Which fields a web server sorts by itself:  `it sorts by title and date`.  Left out:  none. */
  sorts?: "every field" | readonly string[]
  /** What a web server calls a sort, when that isn't `sort`:  `it sorts by date with "order"`. */
  sortedWith?: string
  /** What a web server calls the fields it's asked for:  `it gives only the fields named in "fields"`. */
  fieldsNamedIn?: string
  /** It takes no writes:  `it is read only`. */
  readOnly?: boolean
  /**
   * Which fields a web server searches, and the query parameter it takes (`it searches names with "search"`).
   * - No fields, all of each thing, and the search's own address:
   *   `it searches everything with "q" at "/v1.1/search"` (epic `data` P34, `RestSearch`).
   */
  searches?: { param: string; fields: string[]; at?: string }
  /** The most requests a web server takes a second:  `it takes up to 80 requests a second`, the Met Museum's pace. */
  mostPerSecond?: number
  /**
   * What it reads is kept on this device (epic `data` P36):
   * - `- keep a copy on this device`:  `true`
   * - with a limit, its bytes:  `up to 20 MB` is `20000000`
   * - Left out:  nothing is kept.
   */
  keptOnDevice?: boolean | number
  /**
   * The lists a web server keeps under each thing of a collection,
   * by the collection, then the property holding them (epic `data` P30):
   * `{ posts: { comments: "/posts/{id}/comments" } }`, `- a post's comments live at "/posts/{id}/comments"`.
   * - Reading a post's comments reads that address, the post's id in its braces (`core.linked()`).
   */
  listsUnder?: Record<string, Record<string, string>>
  /** How a number its text can't settle reads, `1,200`:  the program's language's way, a comma in Spanish. */
  unclearNumbers?: "." | ","
  /**
   * A projection (epic `atmosphere` P17):  this place is part of another space's data folder, `of`, written here.
   * - Its server keeps it;  opening it tells the source's server what it is (`setProjection`), for whoever may.
   */
  projection?: Projection & { of: string }
  /**
   * A sign-up sheet's rules (epic `atmosphere` P27):  who signs up, who's on its list, how many a shift takes.
   * - Its server keeps them;  opening it tells the server (`setSheet`), for a manager of the space.
   */
  sheet?: SheetRules
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
  /** `spell/places`, loaded. */
  folder: typeof PlacesFolder
  /** The collection first read from this place. */
  collection: string
  /** The class first read from this place:  what a sheet's numbers and a graphql server's fields are read from. */
  Class: Function
  /** Who's at this page, for a place that has people. */
  person: PlacePerson
  /**
   * Finds a key by its name, on a server side only:  `SpellRuntime.keyFrom`.
   * - Left out:  a place that needs one refuses.
   */
  keyFrom?: (name: string) => string | undefined
  /** The copy of what it reads, kept on this device, when its line says so:  made by the program, which follows it. */
  deviceCopy?: PlacesFolder.DeviceCopy
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

/**
 * SIDE EFFECT:  `behind`, made for the first class read from it, knows the collection `making` is about too:
 * a graphql server's mapping is worked out per class, and a program may save several in one place.
 * - An atmosphere account learns which of its fields are decimal numbers, which it keeps as text.
 */
export function knowCollection(behind: PlaceBehind, making: PlaceMaking): void {
  const { AtProtoPlace, GraphPlace, RestPlace } = making.folder
  const { collection, Class } = making
  if (behind instanceof RestPlace) behind.addFields(collection, storedAsIn(Class))
  // a record has no decimals:  a number field is kept as text, as its Lexicon says (epic `atmosphere` P10)
  if (behind instanceof AtProtoPlace) behind.addDecimals(collection, fieldsOfKind(Class, "number"))
  if (!(behind instanceof GraphPlace)) return
  behind.addCollection(collection, graphCollections(making)[collection]!)
}

/** Each kind's word, and how its place is made. */
const KINDS: Record<string, (making: PlaceMaking, folder: typeof PlacesFolder) => PlaceBehind> = {
  "web server": ({ details, collection, Class, keyFrom, deviceCopy }, { RestPlace, nameStyleLike }) =>
    new RestPlace({
      url: details.at!,
      collections: restCollections(details, collection, storedAsIn(Class)),
      ...(details.namesLike !== undefined && { namesLike: nameStyleLike(details.namesLike) }),
      ...(details.searches && { searches: details.searches }),
      ...restLinesForEveryCollection(details),
      ...restAbilitiesIn(details),
      ...(details.pageSize !== undefined && { pageSize: details.pageSize }),
      ...(details.mostPerSecond !== undefined && { mostPerSecond: details.mostPerSecond }),
      ...(deviceCopy && { deviceCopy }),
      ...(details.versionsIn !== undefined && { versions: { field: details.versionsIn } }),
      ...(details.operations && { operations: details.operations }),
      ...(details.keyNamed !== undefined && {
        keyNamed: details.keyNamed,
        ...(keyFrom && { keyFrom }),
        ...(details.keyIfSet && { keyIfSet: true })
      })
    }),
  "graphql server": (making, { GraphPlace }) =>
    new GraphPlace({
      url: making.details.at!,
      collections: graphCollections(making),
      ...(making.details.keyNamed !== undefined && {
        keyNamed: making.details.keyNamed,
        ...(making.keyFrom && { keyFrom: making.keyFrom }),
        ...(making.details.keyIfSet && { keyIfSet: true })
      })
    }),
  "data folder": ({ details, deviceCopy }, places) => {
    const {
      RemotePlace,
      ChunkedPlace,
      WebChunks,
      JsonChunks,
      SpellSignIn,
      isSpaceFolderAddress,
      spaceFolderCapabilities,
      spaceReadAddressFor
    } = places
    const at = details.at!
    // a project data folder, on the page server, its address made by the compiler (epic `atmosphere` P1):
    // - a person signs in to it with a Spell account, by email (P3)
    // - who may write it is its address's (P4)
    // - a space's own folder is read direct, with a credential for the whole space, and written through Spell (P5)
    if (isSpaceFolderAddress(at)) {
      const readsAt = spaceReadAddressFor(at)
      if (details.projection) {
        const { of, ...projection } = details.projection
        // its source keeps it, for a manager of both spaces:  anyone else is refused, which changes nothing
        const source = new RemotePlace({ url: of, can: spaceFolderCapabilities(of), signIn: SpellSignIn.for(of) })
        void source.call(SPACE_PROJECTION_OPERATIONS.set, { name: details.name, ...projection }, {}).catch(() => {})
      }
      // kept on this device, when its line says:  each whole list, its next read asking only what changed (T51)
      const folder = new RemotePlace({
        url: at,
        can: spaceFolderCapabilities(at),
        signIn: SpellSignIn.for(at),
        ...(readsAt !== undefined && { readsAt }),
        ...(deviceCopy && { deviceCopy })
      })
      // a sign-up sheet's rules are its space's to keep, for a manager:  anyone else is refused, which changes nothing
      if (details.sheet) void folder.call(SPACE_SHEET_OPERATIONS.set, details.sheet, {}).catch(() => {})
      return withThreadsMarked(folder, at, places)
    }
    if (IS_SERVER_ADDRESS.test(at)) return new RemotePlace({ url: at, can: { kind: "data folder" } })
    return new ChunkedPlace({ store: new WebChunks({ url: at }), format: new JsonChunks({}) })
  },
  // the cloud (epic `atmosphere` P8):  the signed-in person's own project data folder on Spell's server
  // - its address made by the compiler, from `personal "family-cookbook"`
  // - nobody signed in:  it's kept in this browser until someone is
  [CLOUD_KIND]: ({ details }, { RemotePlace, SpellSignIn, cloudCapabilities }) => {
    const at = details.at!
    return new RemotePlace({ url: at, can: cloudCapabilities(at), signIn: SpellSignIn.for(at) })
  },
  file: ({ details }, { RemotePlace }) => {
    const at = details.at!
    if (IS_SERVER_ADDRESS.test(at)) return new RemotePlace({ url: at, can: { kind: "file" } })
    throw new TypeError(
      `core.place():  "${details.name}" is a file, and a browser can't write one by itself:  give it a server side, at its address`
    )
  },
  // a room of a space on Spell's server (epic `atmosphere` P36):  signed in by a Spell account, as its data folder is
  // - a room at `"@rs/__thread"` is whichever thread the page's address names (P37, `roomForPage()`):  one Chat, every thread
  room: ({ details, person }, { LiveRoomPlace, SpellSignIn, SPACE_ROOMS_PREFIX, roomForPage }) => {
    const at = withLastThreads((page, remembered) => roomForPage(details.at!.replace(/^ws/, "http"), page, remembered))
    const isSpaces = at.startsWith(`${SPACE_ROOMS_PREFIX}/`)
    return new LiveRoomPlace({
      url: at,
      person,
      ...(isSpaces && { signIn: SpellSignIn.for(at), can: { identifiesBy: "this machine" } })
    })
  },
  // a CSV file, or an Excel workbook by its address's ending (`.xlsx`;  epic `data` P38)
  sheet: (making, folder) => sheetAt(making, folder),
  // an Excel workbook, whatever its address ends in (P38):  each sheet a collection
  "excel file": (making, folder) => sheetAt(making, folder, "excel"),
  "google sheet": (
    { details, collection, Class },
    { SheetPlace, RemotePlace, isPlaceServerAddress, googleSheetCsvAddress }
  ) => {
    const at = details.at!
    const { idColumn } = details
    const collections = columnLines(details, collection, Class)
    // a server in front:  `GoogleSheetPlace`, which holds the key, and takes writes
    if (isPlaceServerAddress(at)) {
      return new RemotePlace({
        url: at,
        can: { kind: "google sheet", atomic: true, ...(idColumn !== undefined && { idOf: idColumn }) },
        ...(collections && { lines: { collections } })
      })
    }
    // no key:  anyone with its link can read it, as its one tab's CSV, and nothing can write it
    return new SheetPlace({
      url: googleSheetCsvAddress(at),
      collection,
      numbers: fieldsOfKind(Class, "number"),
      ...(idColumn !== undefined && { idColumn }),
      ...(collections && { collections })
    })
  },
  // always through a server side, which holds the key:  a place server's address, or this page's own server, by the base's name
  airtable: ({ details }, { RemotePlace, isPlaceServerAddress, airtableBaseIn, PLACES_PREFIX }) => {
    const at = details.at!
    const { collections, idColumn, keyNamed, checkedEvery } = details
    return new RemotePlace({
      url: isPlaceServerAddress(at) ? at : `${PLACES_PREFIX}/${airtableBaseIn(at)}`,
      can: { kind: "airtable", versionCheck: false, ...(idColumn === undefined && { makesIds: true }) },
      lines: {
        ...(collections && { collections }),
        ...(idColumn !== undefined && { idColumn }),
        ...(keyNamed !== undefined && { keyNamed }),
        ...(checkedEvery !== undefined && { checkedEvery })
      }
    })
  },
  "atmosphere account": (making, { AtProtoPlace }) =>
    withDecimals(
      new AtProtoPlace({
        kind: "atmosphere account",
        accounts: [making.details.at!],
        collections: atmosphereCollections(making.details),
        person: making.person
      }),
      making
    ),
  "personal atmosphere account": (making, { AtProtoPlace }) => {
    const { details, person } = making
    return withDecimals(
      new AtProtoPlace({
        kind: "personal atmosphere account",
        ...(details.at !== undefined && { corner: details.at }),
        ...(details.accounts && { accounts: details.accounts }),
        collections: atmosphereCollections(details),
        person
      }),
      making
    )
  },
  "database on this device": (_making, { DevicePlace }) => new DevicePlace({ wholeRows: true }),
  "in memory database": (_making, { MemoryPlace }) => new MemoryPlace()
}

/**
 * A sheet's file:  read from a browser at its address, or, at a place server's address, through the server that writes it.
 * - `format` left out:  by the address's ending (`SheetPlace`).
 */
function sheetAt(
  { details, collection, Class }: PlaceMaking,
  { SheetPlace, RemotePlace, isPlaceServerAddress, isSpaceFolderAddress }: typeof PlacesFolder,
  format?: PlacesFolder.SheetFormat
): PlaceBehind {
  const at = details.at!
  const { idColumn } = details
  const collections = columnLines(details, collection, Class)
  // the program's own CSV file, in its project data folder (epic `language` T65):  its address made by the compiler,
  // `"tasks.csv"`;  an id column of `id` unless a line names another, which goes with each request
  if (isSpaceFolderAddress(at)) {
    return new RemotePlace({
      url: at,
      can: { kind: "sheet", atomic: true, idOf: idColumn ?? ID_FIELD },
      ...((idColumn !== undefined || collections) && {
        lines: { ...(idColumn !== undefined && { idColumn }), ...(collections && { collections }) }
      })
    })
  }
  // a server in front:  it knows the file's numbers, and it's what takes writes;  with no id column, rows share no identity
  if (isPlaceServerAddress(at)) {
    return new RemotePlace({
      url: at,
      can: { kind: "sheet", atomic: true, idOf: idColumn as string },
      ...(collections && { lines: { collections } })
    })
  }
  return new SheetPlace({
    url: new URL(at, globalThis.location?.href).href,
    collection,
    numbers: fieldsOfKind(Class, "number"),
    ...(idColumn !== undefined && { idColumn }),
    ...(collections && { collections }),
    ...(format && { format })
  })
}

/**
 * What a sheet's columns are called, where that isn't their words:  `a recipe's title is its "Dish Name"`, `stored as "avg_ht"`.
 * - `collection` is first read by `Class`:  its `stored as` names join its own.
 * - `undefined` when nothing names one.
 */
function columnLines({ collections = {} }: PlaceDetails, collection: string, Class: Function) {
  const named: Record<string, { fields: Record<string, string> }> = {}
  for (const [name, { fields }] of Object.entries(collections)) if (fields) named[name] = { fields }
  const storedAs = storedAsIn(Class)
  if (Object.keys(storedAs).length) named[collection] = { fields: { ...named[collection]?.fields, ...storedAs } }
  return Object.keys(named).length ? named : undefined
}

/** SIDE EFFECT:  atmosphere account `place` keeps the first class's decimal numbers as text -- see `knowCollection()`. */
function withDecimals(place: PlacesFolder.AtProtoPlace, { collection, Class }: PlaceMaking): PlaceBehind {
  place.addDecimals(collection, fieldsOfKind(Class, "number"))
  return place
}

/** What an atmosphere account's lines call each collection. */
function atmosphereCollections({ collections = {} }: PlaceDetails): Record<string, string> {
  return Object.fromEntries(Object.entries(collections).flatMap(([name, { at }]) => (at ? [[name, at]] : [])))
}

/**
 * A collection's address as a template (`Api.url()`):  `/people` => `/people{/id}`.
 * - Ending in a slash, as swapi's do (`/people/`), its things' do too:  `/people{/id}/`.
 * - With a name in braces already (`/page/summary/{id}`), as it is.
 * - With a query of its own, the id goes before it:  `/v1/forecast?hourly=rain` => `/v1/forecast{/id}?hourly=rain`.
 */
function pathTemplateOf(at: string): string {
  if (at.includes("{")) return at
  const cut = at.search(/[?#]/)
  const [path, query] = cut < 0 ? [at, ""] : [at.slice(0, cut), at.slice(cut)]
  return path.endsWith("/") ? `${path.slice(0, -1)}{/id}/${query}` : `${path}{/id}${query}`
}

/**
 * A web server's mapping:  each collection's address, and the names of its fields there that a program gave.
 * - `collection` is first read by `Class`:  its `stored as` names join its own.
 * - Every other field is matched by its words, as it's read (`FieldNames`).
 */
function restCollections({ collections = {} }: PlaceDetails, collection: string, storedAs: Record<string, string>) {
  const named = { ...collections, [collection]: { ...collections[collection] } }
  return Object.fromEntries(
    Object.entries(named).map(([name, { at, fields, pictures, askedBy, searches }]) => {
      const all = name === collection ? { ...fields, ...storedAs } : fields
      return [
        name,
        {
          ...(at !== undefined && { path: pathTemplateOf(at) }),
          ...(all && Object.keys(all).length && { fields: all }),
          ...(pictures && { pictures }),
          ...(askedBy && { askedBy }),
          ...(searches && { searches })
        }
      ]
    })
  )
}

/** What `Class` says each of its fields is called where it's kept, when that's not its words:  `stored as "avg_ht"`. */
function storedAsIn(Class: Function): Record<string, string> {
  const named: Record<string, string> = {}
  for (let schema = schemaOf(Class) as ReturnType<typeof schemaOf> | undefined; schema; schema = schema.parent) {
    for (const [name, info] of schema.declared) {
      const { storedAs } = info as { storedAs?: string }
      if (storedAs !== undefined && !(name in named)) named[name] = storedAs
    }
  }
  return named
}

/**
 * What a web server's lines say of every collection:  its id's field, where its rows are, where its next page is.
 */
function restLinesForEveryCollection({ idColumn, rowsIn, nextPageIn }: PlaceDetails) {
  if (idColumn === undefined && rowsIn === undefined && nextPageIn === undefined) return {}
  return {
    allCollections: {
      ...(idColumn !== undefined && idColumn !== ID_FIELD && { fields: { [ID_FIELD]: idColumn } }),
      ...(rowsIn !== undefined && { rowsAt: rowsIn }),
      ...(nextPageIn !== undefined && { nextAt: nextPageIn })
    }
  }
}

/**
 * What a web server's lines say it can do, and what it calls each question it's asked (epic `data` I35).
 * - Its next page in a field or its `Link` header:  it pages by cursor, as `RestPlace` reads that field or header then.
 */
function restAbilitiesIn({
  nextPageIn,
  nextPageInLink,
  nextPageSentAs,
  pagesByOffset,
  pagesByNumber,
  pagesByLastId,
  filters,
  sorts,
  sortedWith,
  fieldsNamedIn,
  readOnly
}: PlaceDetails) {
  const position = pagesByOffset ?? (pagesByNumber && { limit: pagesByNumber.limit, offset: pagesByNumber.page })
  const page = position ? "offset" : nextPageIn !== undefined || nextPageInLink || pagesByLastId ? "cursor" : undefined
  const count = position ?? pagesByLastId
  const can = {
    ...(page && { page: page as "offset" | "cursor" }),
    ...(filters && { filter: filters }),
    ...(sorts && { sort: sorts }),
    ...(fieldsNamedIn !== undefined && { select: "every field" as const }),
    ...(readOnly && { write: "none" as const })
  }
  const params = {
    ...(count?.limit !== undefined && { limit: count.limit }),
    ...(position && { offset: position.offset }),
    ...(nextPageSentAs !== undefined && { cursor: nextPageSentAs }),
    ...(pagesByLastId && { cursor: pagesByLastId.param }),
    ...(sortedWith !== undefined && { sort: sortedWith }),
    ...(fieldsNamedIn !== undefined && { select: fieldsNamedIn })
  }
  return {
    ...(Object.keys(can).length > 0 && { can }),
    ...(Object.keys(params).length > 0 && { params }),
    ...(pagesByNumber && { pageNumbers: { first: pagesByNumber.first ?? 1 } }),
    ...(count && count.limit === undefined && { sendsNoCount: true }),
    ...(pagesByLastId && {
      pagesByLastId: { ...(pagesByLastId.moreIn !== undefined && { moreAt: pagesByLastId.moreIn }) }
    })
  }
}

/**
 * A graphql server's mapping, by convention:  a server that follows it needs no lines (epic `data` P11).
 * - `recipes` lists, `recipe(id)` finds one;  pages by connection.
 * - `addRecipe`, `changeRecipe`, `removeRecipe` write, taking a `RecipeInput!` and a `RecipePatch!`.
 * - Its fields are what the class declares, by each one's name there:
 *   its `stored as`, else as the server spells names (`it writes names like "hair_color"`), else ours.
 */
function graphCollections({ details, collection, Class, folder }: PlaceMaking) {
  const { at, fields: named = {} } = details.collections?.[collection] ?? {}
  const style = details.namesLike === undefined ? undefined : folder.nameStyleLike(details.namesLike)
  const fields: Record<string, string> = { ...named, ...storedAsIn(Class) }
  if (style) {
    for (const field of declaredFields(Class)) fields[field] ??= folder.theirNameFor(field, style)
  }
  const list = at ?? collection
  const one = list.replace(/s$/, "")
  const typeName = one.charAt(0).toUpperCase() + one.slice(1)
  const selected = [ID_FIELD, ...declaredFields(Class).filter((field) => field !== ID_FIELD)]
  return {
    [collection]: {
      list,
      one,
      paging: "connection" as const,
      fields: selected.map((field) =>
        fields[field] && fields[field] !== field ? `${field}: ${fields[field]}` : field
      ),
      insert: { mutation: `add${typeName}`, input: `${typeName}Input!` },
      update: { mutation: `change${typeName}`, id: "ID!", input: `${typeName}Patch!` },
      delete: { mutation: `remove${typeName}`, id: "ID!" }
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

/** This browser's last thread per org, for a chat page (`pickedThreadFor()`, epic `atmosphere` P37):  kept under this key. */
const LAST_THREADS_KEY = "spell-last-threads"

/**
 * Pick the thread a chat page shows with `pick`, handed the page's address and this browser's last thread per org;
 * what it picks is remembered for next time.
 * - NEVER throws:  with no page or no storage (a test, a private window), nothing is remembered.
 */
function withLastThreads<T>(pick: (pageAddress: string, remembered: Map<string, string>) => T): T {
  const page = typeof location === "undefined" ? "/" : location.href
  let remembered = new Map<string, string>()
  try {
    remembered = new Map(
      Object.entries(JSON.parse(localStorage.getItem(LAST_THREADS_KEY) ?? "{}") as Record<string, string>)
    )
  } catch {
    // no storage here:  nothing remembered
  }
  const picked = pick(page, remembered)
  try {
    localStorage.setItem(LAST_THREADS_KEY, JSON.stringify(Object.fromEntries(remembered)))
  } catch {
    // no storage here:  nothing to remember with
  }
  return picked
}

/**
 * `folder`, unless it's a person's threads (`@rs/__threads`, epic `atmosphere` P37):  then each row it lists says
 * whether it's the thread this page shows (`current`), so the chat page marks it, and shows an ad-hoc thread's own.
 */
function withThreadsMarked(folder: PlaceBehind, at: string, tools: typeof PlacesFolder): PlaceBehind {
  const { PERSON_THREADS_ADDRESS, SPACE_FOLDERS_PREFIX, pickedThreadFor, withPickedThread } = tools
  const prefix = `${SPACE_FOLDERS_PREFIX}/`
  const name = decodeURIComponent(at.slice(at.indexOf(prefix) + prefix.length)).split(/[?#]/)[0] ?? ""
  const org = PERSON_THREADS_ADDRESS.exec(name)?.[1]
  if (org === undefined) return folder
  const marked: PlaceBehind = Object.create(folder)
  marked.list = async (collection, query, context) => {
    const answer = await folder.list(collection, query, context)
    const picked = withLastThreads((page, remembered) => pickedThreadFor(org, page, remembered))
    return { ...answer, rows: withPickedThread(answer.rows, picked) }
  }
  return marked
}
