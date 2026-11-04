/**
 * Types for `spell place ingest`:  looking at one data source for real, and writing what it found (epic `data` P18).
 * - See `PlaceIngest`, which runs the steps.
 * - No values but the error:  every step's other half is handed in, so the editor can run the same steps.
 */
import type { ClaudeRunner } from "spell/parser/spell/translate/translate.types"

/** Thrown when it can't go on, and only a person can say what to do:  its message says what's wrong, and how to go on. */
export class IngestStopped extends Error {}
IngestStopped.prototype.name = "IngestStopped"

////////////////
// ## What's handed in
////////////////

/** What it needs to ask someone. */
export type IngestQuestion = {
  /** What it's asking for:  a kind of place, or a file to put the Spell in. */
  asks: "kind" | "file"
  /** The question, in words for people. */
  text: string
  /** The answers there are, if it's one of a few. */
  choices?: readonly string[]
}

/**
 * Ask someone:  the answer, or `undefined` when there's no one to ask, or they gave none.
 * - The command asks at the terminal;  the editor will ask its own way.
 */
export type AskSomeone = (question: IngestQuestion) => Promise<string | undefined>

/** Its files:  a command's disk, or whatever the editor keeps a project in. */
export type IngestFiles = {
  /** A file's text;  `undefined` when there's none. */
  read(path: string): Promise<string | undefined>
  /** Write a Spell file. */
  write(path: string, text: string): Promise<void>
  /** The description there, as it's kept on disk;  `undefined` when there's none. */
  readDescription(path: string): Promise<PlaceDescriptionOnDisk | undefined>
  /** Write a description, keeping any comments a person put in it. */
  writeDescription(path: string, description: PlaceDescriptionOnDisk): Promise<void>
  /**
   * Name the description at `path` in the project's file of the Spell file `file`, `development.apis`, if it isn't there.
   * - Left out, or no project's file:  nothing's named.
   */
  listInProject?(file: string, path: string): Promise<void>
  /** The text of every other Spell file beside this one:  what else may use what it declares. */
  otherSpellBeside(path: string): Promise<string[]>
}

/** What a read through the Spell needs:  see `ReadThrough`. */
export type ReadThroughAsk = {
  /** The Spell:  a place and its types, with no key line. */
  spell: string
  /** The class each type compiles to, by its words. */
  types: Readonly<Record<string, string>>
  /** A type found by name, with no list, by its words:  a name to read one by. */
  byName?: Readonly<Record<string, string>>
  /**
   * A type that answers only a search, by its words:  the field to search, by Spell's name for it, and the text.
   * - `{ book: { field: "title", text: "dune" } }`
   */
  bySearch?: Readonly<Record<string, { field: string; text: string }>>
  /** Every request the program makes goes through this:  it can't write, and it stops at a size. */
  fetch: typeof globalThis.fetch
}

/** What one type's read found. */
export type ReadOfType = {
  /** How many rows came back. */
  rows: number
  /** Why it couldn't be read. */
  problem?: string
}

/**
 * Compile `spell` and really read each type through it:  what each type found, and whatever the program complained of.
 * - Handed in because it runs `core`, which only a runner may load.
 * - NEVER throws for a read that fails:  it says so in that type's `problem`.
 */
export type ReadThrough = (
  ask: ReadThroughAsk
) => Promise<{ byType: Record<string, ReadOfType>; complaints: readonly string[] }>

/** Everything it's handed. */
export type IngestSettings = {
  /** Reaches the source.  A command's also reads a local file, by its `file:` address. */
  fetch: typeof globalThis.fetch
  /** Asks someone.  See `AskSomeone`. */
  ask: AskSomeone
  /** Its files. */
  files: IngestFiles
  /** Reads through the Spell. */
  readThrough: ReadThrough
  /** Asks the agent.  Left out:  only what can be worked out with no agent. */
  claude?: ClaudeRunner
  /** What the description says asked:  `Claude API`, `claude -p`. */
  claudeVia?: string
  /** A key's value by its name:  `undefined` when it isn't there.  Never written anywhere. */
  keyNamed?: (name: string) => string | undefined
  /** What time it is:  a test's clock. */
  now?: () => Date
  /** Waits:  a test's. */
  sleep?: (msec: number) => Promise<void>
  /** Says how it's going, a line at a time. */
  say?: (line: string) => void
}

/** What `PlaceIngest.add()` is asked. */
export type IngestAsk = {
  /** The source's address. */
  address: string
  /** Its kind, in `core.place()`'s words:  left out, it's worked out from the address. */
  kind?: string
  /** The Spell file:  left out, it asks. */
  into?: string
  /** What the program calls the place:  left out, the agent's word, or the address's. */
  name?: string
  /** The NAME of the key it needs. */
  keySecret?: string
  /** An address to read its docs at, over those it finds by itself. */
  docs?: string
  /**
   * Its collections' paths under the address, for a source that doesn't list them.
   * - `name=path` names one:  `wiki pages=/page/summary/{name}`.
   * - A path with a name in braces is a collection found by name, with no list:  read by `samples`.
   */
  collections?: readonly string[]
  /**
   * Names to read a collection found by name by:  `Luke Skywalker`, `Tatooine`.
   * - `name=sample` is one collection's own:  `authors=OL79034A`.
   */
  samples?: readonly string[]
  /**
   * Fields holding a picture's id on another server, each `field=address`, the braces where the id goes (epic `data` P29):
   * `cover_i=https://covers.openlibrary.org/b/id/{id}-M.jpg`.  Each is tried on a row's value before it's written.
   */
  pictures?: readonly string[]
}

/** What one run did. */
export type IngestResult = {
  /** The Spell file. */
  file: string
  /** The description. */
  descriptionPath: string
  /** The description, as written. */
  description: PlaceDescription
  /** Did anything change:  `false` for a place the file already has. */
  wrote: boolean
  /** The Spell added or as it now stands. */
  spell: string
  /** What's different from the last look, in words for people. */
  changes: string[]
  /** What it couldn't change for them, in words for people:  a person has to. */
  couldntChange: string[]
  /** What compiling it said. */
  warnings: string[]
}

////////////////
// ## What it looked at
////////////////

/** How a source pages through a list, as far as it could see. */
export type PagingSeen = "none" | "next field" | "link header"

/**
 * A query parameter that searches a collection, found by trying it:  `?search=sky` answered fewer rows, each holding "sky".
 * - Only ever a read, as every look is.
 */
export type SearchSeen = {
  /** The parameter:  `search`. */
  param: string
  /** The field it searched, by the source's name:  `name`. */
  field: string
}

/** One collection, as it came back. */
export type CollectionLook = {
  /** Its name there:  the last part of its path, or a GraphQL field's. */
  name: string
  /** Its address under the place's, or a GraphQL field's name. */
  at: string
  /** Every row it read. */
  rows: Array<Record<string, unknown>>
  /** Where its rows are in an answer:  left out, the answer is the list. */
  rowsAt?: string
  /** Which field says where the next page is. */
  nextAt?: string
  /** How it searches, when trying it narrowed the rows:  see `SearchSeen`. */
  searchedBy?: SearchSeen
  /** How it pages. */
  paging: PagingSeen
  /** How many pages it read. */
  pagesRead: number
  /** How many rows it says it has in all. */
  rowsItSays?: number
  /** It has more than it read. */
  hasMore: boolean
  /**
   * The only fields its list gives of each row, besides the row's address:  PokéAPI's `name`.
   * - Its `rows` are then a few rows read whole from their addresses, each with what the list gave.
   */
  listsGive?: string[]
  /** The field holding each row's address, for a list that gives only a little of each:  its id, whatever the whole holds. */
  idAt?: string
  /** Its next link asks for a `limit`, so it can be asked for more at a time;  `false`, it pages without one.  Left out:  one page. */
  takesLimit?: boolean
  /** Found by name, with no list:  the names its rows were read by. */
  samples?: string[]
  /** The address it was asked at, when it answered from another (its `at`):  swapi's `/people`, answering from `/people/`. */
  movedFrom?: string
  /** Interesting headers of its first answer, as `PlaceLook.headers`. */
  headers?: Record<string, string>
  /** It answers only a search, with no list of them all:  Open Library's books, at `/search.json?q=...`. */
  searchedOnly?: boolean
  /** The word it was searched for, when `--collections` asked with one:  `dune`. */
  searchedFor?: string
}

/** Everything a look at a place found. */
export type PlaceLook = {
  /** The place's address, which may be above what was asked for. */
  address: string
  /** Its collections. */
  collections: CollectionLook[]
  /** Interesting headers of its first answer:  limits, versions, who may read it.  Never a cookie. */
  headers: Record<string, string>
  /** Its docs, as text, cut short. */
  docs?: string
  /** Where they were. */
  docsAt?: string
  /** The version it says it is, and where it said so. */
  version?: PlaceVersion
  /** The writes it offers, by name, for a place that lists them:  never tried. */
  writesOffered?: readonly string[]
  /** What the look had to say. */
  notes: string[]
}

/** A source's own word for its version, and where it said so. */
export type PlaceVersion = {
  /** Its version. */
  says: string
  /** Where it said so:  `its address`, `the api-version header`, `its docs`. */
  where: string
}

////////////////
// ## The description
////////////////

/** What a field holds, as far as the samples show. */
export type FieldKind =
  | "text"
  | "number"
  | "yes or no"
  | "date"
  | "link"
  | "list of links"
  | "list of text"
  | "list of numbers"
  | "inside"
  | "nothing"

/** One field of a collection. */
export type FieldDescription = {
  /** What Spell calls it. */
  words: string
  /** What it holds. */
  type: FieldKind
  /** A real value. */
  example?: unknown
  /** What it means, from the agent's reading. */
  means?: string
  /** It's a number, written as text:  `"172"`. */
  writtenAsText?: boolean
  /** What it writes for no number:  `"unknown"`. */
  noNumberWords?: string[]
  /** It writes a comma between a number's whole part and its fraction, as its values show:  `"1,5"`, `"1.200,5"`. */
  decimalComma?: boolean
  /** The collection it links to, by address. */
  linksTo?: string
  /** Why the Spell leaves it out. */
  leftOut?: string
  /** The line naming it needs its words in quotes:  they hold one the plain form stops at, like `in`. */
  wordsInQuotes?: boolean
  /** A field holding one object each:  the fields inside it, a type of their own in the Spell, never a path with dots. */
  inside?: Record<string, FieldDescription>
  /** Its `inside` is each item of a list:  PokéAPI's `types`, `[{ "slot": 1, "type": ... }]`. */
  isListInside?: boolean
  /** It holds what holds it, the same fields:  PokéAPI's chain's `evolves_to`, a list of chains. */
  isItsOwner?: boolean
  /**
   * It holds a picture's id, and this is where its pictures are, the braces where the id goes (epic `data` P29):
   * `https://covers.openlibrary.org/b/id/{id}-M.jpg`.  Tried on a value, which answered a picture.
   */
  pictureAt?: string
}

/** One collection of a place. */
export type CollectionDescription = {
  /** Its type's words:  `film`. */
  type: string
  /** Its address under the place's. */
  at: string
  /** What it holds, from the agent's reading. */
  about?: string
  /** How many rows were read, and whether there are more. */
  rowsSeen: number
  /** How many it says it has. */
  rowsItSays?: number
  /** Which field says which row is which.  Left out:  rows share no identity. */
  idField?: string
  /** The id is a whole address. */
  idIsAnAddress?: boolean
  /** How it pages. */
  paging: PagingSeen
  /** Where its rows are in an answer. */
  rowsAt?: string
  /** Which field says where the next page is. */
  nextAt?: string
  /** The only fields its list gives of each row, besides its address:  the rest is read from there. */
  listsGive?: string[]
  /** It can be asked for more at a time:  its next link asks for a `limit`.  `false`, it pages without one;  left out, one page. */
  takesLimit?: boolean
  /** Found by name, with no list (its `at` says where the name goes, `{name}`):  the names it was read by. */
  samples?: string[]
  /** How it searches, when trying it narrowed the rows:  `it searches names with "search"`. */
  searchedBy?: SearchSeen
  /** It answers only a search, with no list of them all:  `books are searched at "/search.json"`. */
  searchedOnly?: boolean
  /** The word it was searched for, which a read through the Spell searches for again:  `dune`. */
  searchedFor?: string
  /** Why the Spell leaves it out. */
  leftOut?: string
  /** What a read through the Spell found. */
  readThrough?: ReadOfType
  /** Each field, by the source's name for it. */
  fields: Record<string, FieldDescription>
}

/** A place's description:  `<Name>.api.json5`, beside its Spell file, `<Name>.api.spell`. */
export type PlaceDescription = {
  /** What and where it is, and when it was looked at. */
  about: {
    /** What the program calls it. */
    name: string
    /** Its kind, in `core.place()`'s words. */
    kind: string
    /** Its address. */
    address: string
    /** When it was looked at, in ISO. */
    lookedAt: string
    /** A short hash of the collections, fields and their types it saw:  what says the shape changed. */
    fingerprint: string
    /** The source's own word for its version.  Many name none:  then only the date and the fingerprint say. */
    version?: PlaceVersion
    /** The NAME of the key it needs, never the key. */
    keySecret?: string
    /** It answered without the key too, so it takes it only when it's set:  GitHub's, 60 requests an hour without. */
    keyIfSet?: boolean
    /** Who read the samples:  `Claude API`, `claude -p`, or nobody. */
    readBy: string
    /** Where its docs were. */
    docsAt?: string
    /** The collections it was asked to look at, `--collections` as given:  looking again looks at only these. */
    collectionsAsked?: string[]
    /** The fields it was told hold a picture's id, `--pictures` as given:  looking again tries them again. */
    picturesAsked?: string[]
  }
  /** What it can do, in plain words. */
  canDo: {
    /** Read:  always, as it's been read. */
    read: string
    /** Write:  what it seems to offer.  Never tried. */
    write: string
    /** Telling what changed. */
    live: string
    /** How it limits who asks. */
    limits: string
    /** Whether a page in a browser can reach it. */
    browsers: string
  }
  /** Each collection, by what Spell calls it:  `films`. */
  collections: Record<string, CollectionDescription>
  /** What a person should know. */
  notes: string[]
  /** What Spell has no words for yet. */
  spellCantSay: string[]
  /** How often to ask it what changed, in seconds. */
  checkEverySeconds?: number
  /** The Spell, a line at a time, as it was last written:  a person's copy may differ. */
  spell: string[]
}

/**
 * A description as it's written:  what every collection agrees on, once, in `allCollections`;
 * each collection only what differs.  `descriptionOnDisk()` and `descriptionFromDisk()` turn one into the other.
 */
export type PlaceDescriptionOnDisk = Omit<PlaceDescription, "collections"> & {
  /** Each collection's settings, when every one has the same:  its id's field, how it pages, where its rows are ... */
  allCollections?: Partial<CollectionDescription>
  /** Each collection, by what Spell calls it, without what `allCollections` says. */
  collections: Record<string, Partial<CollectionDescription>>
}
