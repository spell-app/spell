import { kindWordsOf, oneOfWords, verbBefore } from "spell/parser/core/schemaWords"
import { P } from "spell/parser/parser"
import { englishAgreement } from "spell/parser/spell/languages/en/agreement"
import { checkEveryInWords } from "spell/parser/spell/rules/places/CheckedEvery"
import { fieldNamed } from "spell/parser/spell/rules/places/PlaceDetail"
import { SpellType } from "spell/parser/spell/rules/types"
import { nameStyleLike, ourNameFor } from "spell/places/FieldNames"
import type { KeyGoes } from "spell/places/keyGoes"
import { BUILT_IN_DIMENSIONS } from "spell/util/measures/dimensions.generated"
import { PROPORTION } from "spell/util/measures/Dimension"

import type { CollectionDescription, FieldDescription, PagesWith, PlaceDescription, ServerTakes } from "./ingest.types"
import { isSpellsOwnType, oneNamedBy, wordsFor, yesOrNoWords } from "./PlaceShape"
import { PlaceWords } from "./PlaceWords"

/** What each thing a field can hold is, in a type's line. */
const SPELL_TYPES: Readonly<Partial<Record<FieldDescription["type"], string>>> = {
  text: "text",
  number: "a number",
  "yes or no": "yes or no",
  date: "a date",
  // what isn't one of the place's own types:  its address, as text
  link: "text",
  "list of links": "a list of text",
  "list of text": "a list of text",
  "list of numbers": "a list of numbers",
  // a free-form field, an API's `meta`:  held whole, whatever keys it has
  object: "an object",
  // a field every row read holds, empty each time:  kept, as text, till a value says more (`fieldsSeenIn()`)
  nothing: "text"
}

/** A one-file place, as a line says it:  the kind's `file` isn't a word Spell takes by itself (epic `language` P40). */
const JSON_FILE_WORDS = "json file"

/** A row's id, in a place that isn't told otherwise. */
const USUAL_ID = "id"

/** The line saying where a key goes. */
function keyGoesLine(goes: KeyGoes): string {
  return "header" in goes
    ? `its secret goes in its "${goes.header}" header`
    : `its secret goes in the address as "${goes.inAddress}"`
}

/** The most rows a list can say it has and still be read in one request, `it gives up to 2000 at a time`. */
const MOST_AT_A_TIME = 5000

/** The field a row usually says its version in. */
const VERSION_FIELD = "version"

/** One line the tool wrote, with what it's about:  so a later look can tell which line to change. */
export type SpellLine = {
  /** What it's about, the same from look to look:  `field:films:title`. */
  key: string
  /** The line, without its tab. */
  text: string
  /**
   * What a person should know of it, written as the first line inside it, `-- an address`:  the field's description
   * (epic `language` T166, never `// ...` after the line any more).
   */
  note?: string
}

/** A type's lines. */
export type TypeLines = {
  /** The collection it's for, by what Spell calls it. */
  collection: string
  /** Its first line. */
  header: string
  /** The lines under it. */
  lines: SpellLine[]
  /** A type for what's inside a row, nowhere of its own:  known by its header, as several share a collection. */
  isInside?: boolean
  /**
   * A type inside a row:  the fields it's written from, by the source's names,
   * so a line Spell can't read is left out there.
   */
  insideFields?: Record<string, FieldDescription>
  /**
   * A type inside a row:  each field holding it, and whose field it is, as several may share it (epic `data` I106),
   * so a header Spell can't read leaves out those fields, not their collection.
   */
  heldBy?: Array<{ owner: string; field: FieldDescription }>
}

/** A line of a place's Spell, `spellLinesOf()`'s:  what wrote it, known by where it is, as two lines may say the same. */
export type WrittenLine = {
  /** The line, with its tab. */
  text: string
  /** The key of the line under a header, `SpellLine.key`. */
  key?: string
  /** The type it's in:  its header, or a line under it. */
  type?: TypeLines
}

/** Is `after` the type `before` was:  a collection's own by its collection, one inside a row by its header. */
function isSameType(before: TypeLines, after: TypeLines): boolean {
  if (!!before.isInside !== !!after.isInside) return false
  return after.isInside ? before.header === after.header : before.collection === after.collection
}

/** The Spell for a place:  its line, what's under it, and each type. */
export type SpellParts = {
  /** The place's first line. */
  header: string
  /** The lines under it. */
  placeLines: SpellLine[]
  /** Each type. */
  types: TypeLines[]
}

/**
 * The Spell for a description, in the settled words (`agents/coherence/words.md`, "the details under a place").
 * - `withKey`:  `false`, no key line:  a read through it here sends the key by itself, as nothing holds one in a program.
 * - Only what's said differently from the usual needs a line, except each collection's address, which shows what's there.
 */
export function spellPartsFor(
  description: PlaceDescription,
  { withKey = true }: { withKey?: boolean } = {}
): SpellParts {
  const { header, placeLines, types } = allSpellPartsFor(description, { withKey })
  // a line Spell couldn't read stays out:  the rest of the place is written
  const { linesLeftOut = {} } = description
  const isKept = ({ key }: SpellLine) => !(key in linesLeftOut)
  return {
    header,
    placeLines: placeLines.filter(isKept),
    types: types.map((type) => ({ ...type, lines: type.lines.filter(isKept) }))
  }
}

/** `spellPartsFor()`, every line, those Spell couldn't read too. */
function allSpellPartsFor(
  { about, canDo, collections, checkEverySeconds, mostPerSecond, serverTakes }: PlaceDescription,
  { withKey }: { withKey: boolean }
): SpellParts {
  const { name, kind, address, keySecret, keyIfSet, keyGoes, tokenFrom, privateDataIn } = about
  const shown = Object.entries(collections).filter(([, collection]) => !collection.leftOut)
  const every = shown.map(([, collection]) => collection)
  const placeLines: SpellLine[] = []
  // a data folder's, a file's, a room's key is the server's run token:  no line of a program says it
  if (withKey && keySecret && tokenFrom !== undefined && KINDS_WITH_KEY_LINES.has(kind)) {
    placeLines.push({
      key: "key",
      text: `it is authenticated with a token from "${tokenFrom}", made with the secret "${keySecret}"`
    })
    if (keyGoes) placeLines.push({ key: "key goes", text: keyGoesLine(keyGoes) })
  } else if (withKey && keySecret && KINDS_WITH_KEY_LINES.has(kind)) {
    placeLines.push({
      key: "key",
      text: `it is ${keyIfSet ? "optionally " : ""}authenticated with the secret "${keySecret}"`
    })
    if (keyGoes) placeLines.push({ key: "key goes", text: keyGoesLine(keyGoes) })
  }
  // its real rows stay on this machine:  every later ingest, update and verify keeps to it
  if (privateDataIn !== undefined) {
    placeLines.push({ key: "private", text: `its data is private, located in "${privateDataIn}"` })
  }
  const sameId = sameOfEvery(every, ({ idField }) => idField)
  const isSheet = kind === "sheet" || kind === "google sheet"
  if (sameId && (isSheet || sameId !== USUAL_ID)) placeLines.push({ key: "id", text: `its id is its "${sameId}"` })
  // what's said of lists is said of those that list:  one found by name is read a thing at a time
  // a search answers its own way, its one list wherever it is (`RestPlace`):  FastAPI's `results`, beside its lists' `items`
  const lists = every.filter(({ at }) => !isFoundByNameAt(at))
  const notSearches = lists.filter(({ searchedOnly }) => !searchedOnly)
  const rowsAt = sameOfEvery(notSearches.length ? notSearches : lists, (collection) => collection.rowsAt)
  if (rowsAt) placeLines.push({ key: "rows", text: `its rows are ${fieldInWords(rowsAt)}` })
  const nextAt = kind === "web server" ? sameOfEvery(lists, (collection) => collection.nextAt) : undefined
  if (nextAt) placeLines.push({ key: "next", text: `its next page is ${fieldInWords(nextAt)}` })
  // every list that pages says its next page in its `Link` header, GitHub's way:  one with no pages asks nothing of it
  const paging = new Set(lists.map((collection) => collection.paging).filter((each) => each !== "none"))
  if (kind === "web server" && !nextAt && paging.size === 1 && paging.has("link header")) {
    placeLines.push({ key: "next", text: `its next page is in its "Link" header` })
  }
  // every list with more than a page can be asked for more at a time, and none is too big to read in one:
  // every name in one request
  const paged = every.filter(({ takesLimit }) => takesLimit !== undefined)
  const most = Math.max(...paged.map(({ rowsItSays }) => rowsItSays ?? Infinity))
  // how many a program asks for at a time, as it was told to (`--rows`)
  if (about.rows !== undefined) {
    placeLines.push({ key: "size", text: `it gives up to ${about.rows} at a time` })
  } else if (
    kind === "web server" &&
    paged.length &&
    paged.every(({ takesLimit }) => takesLimit) &&
    most <= MOST_AT_A_TIME
  ) {
    placeLines.push({ key: "size", text: `it gives up to ${Math.ceil(most / 1000) * 1000} at a time` })
  } else if (kind === "web server" && serverTakes?.pagesWith?.most !== undefined && !nextAt && !paging.size) {
    // its OpenAPI description says the most its lists give:  a read asking for more would be refused (epic `data` I140)
    placeLines.push({ key: "size", text: `it gives up to ${serverTakes.pagesWith.most} at a time` })
  }
  // every list gives only a little of each row:  what any of them gives, or its id when none gives more
  if (kind === "web server" && every.length && every.every(({ listsGive }) => listsGive)) {
    const given = [...new Set(every.flatMap(({ listsGive }) => listsGive!))]
    const fields = (given.length ? given : [sameId ?? USUAL_ID]).slice(0, 2).map((field) => `"${field}"`)
    placeLines.push({ key: "lists", text: `its lists give only each one's ${fields.join(" and ")}` })
  }
  if (every.length && every.every(({ fields }) => fields[VERSION_FIELD]?.type === "number")) {
    placeLines.push({ key: "version", text: `its version is its "${VERSION_FIELD}"` })
  }
  const checkEvery = about.checkEvery ?? checkEverySeconds
  if (checkEvery !== undefined) {
    placeLines.push({ key: "check", text: `check it ${checkEveryInWords(checkEvery)}` })
  }
  // the pace its docs ask for:  the Met Museum's 80 a second
  if (mostPerSecond !== undefined) {
    placeLines.push({ key: "pace", text: `it takes up to ${mostPerSecond} requests a second` })
  }
  // what it was seen to do when it was asked, and what it says of itself:  asked of it, not done here
  const hasPaging = !!nextAt || paging.size > 0
  if (kind === "web server") {
    // told it's read only (`--read-only`):  its writes stay in its description, off
    const write = about.readOnly ? "read only" : canDo.write
    placeLines.push(...linesOfWhatItTakes(serverTakes, every, write, hasPaging))
  }
  const placePages = kind === "web server" && !hasPaging ? serverTakes?.pagesWith : undefined
  // how many the place's own line says every list gives:  a list giving fewer says so under its own line
  const placeSize = Number(/up to (\d+)/.exec(placeLines.find(({ key }) => key === "size")?.text ?? "")?.[1] ?? NaN)
  // how it spells a name and writes a number, when that isn't ours:  for a save, or a field it hasn't sent yet
  const namesLike = kind === "web server" || kind === "graphql server" ? nameExampleOf(every) : undefined
  if (namesLike) placeLines.push({ key: "names", text: `it writes names like "${namesLike}"` })
  // each collection its own search, when they don't share one:  GitHub's users and repositories
  const searchedApart = isSearchedApart(every)
  const searches = searchedApart ? undefined : searchLineOf(every)
  if (searches) placeLines.push({ key: "search", text: searches })
  const fieldsShown = every.flatMap(({ fields }) => Object.values(fields))
  if (fieldsShown.some(({ decimalComma }) => decimalComma)) {
    placeLines.push({ key: "numbers", text: '- it writes numbers like "1.200,5"' })
  }
  // a list kept only under each thing says where it is on its owner's line, `a job's steps live at "..."`:  its own
  // address is that one.  One with an address of its own keeps its line too:  `comments live at "/comments"` (I6)
  const listedUnderAt = new Set(
    every.flatMap(({ listsUnder = {} }) =>
      Object.entries(listsUnder)
        .filter(([list]) => !collections[list]?.isOneUnder)
        .map(([list, at]) => `${list}\n${bracesUnnamed(at)}`)
    )
  )
  for (const [collection, description] of shown) {
    if (isSheet || !description.at || description.at === collection) continue
    if (listedUnderAt.has(`${collection}\n${bracesUnnamed(description.at)}`)) continue
    // found by name, with no list:  where its name goes, `wiki pages are found at "/page/summary/{name}"`
    // answering only a search:  `books are searched at "/search.json"`
    const where = isFoundByNameAt(description.at)
      ? "are found at"
      : description.searchedOnly
        ? "are searched at"
        : "live at"
    const searchedThere = searchedApart && description.searchedOnly && searchAddressOf(description) === description.at
    if (description.isOne) {
      // ONE thing, not a list:  `the server status lives at "/api/status"`
      placeLines.push({ key: `at:${collection}`, text: `the ${description.type} lives at "${description.at}"` })
    } else if (!searchedThere) {
      // given only to its own search, its search's line says where:  `repositories are searched with "q" at "/search/repositories"`
      placeLines.push({
        key: `at:${collection}`,
        text: `${collectionWords(description)} ${where} "${description.at}"`
      })
      // paging its own way, one step in under its line, wins for it (epic `data` P56)
      if (kind === "web server") {
        placeLines.push(...ownPagingLines(collection, description, placePages, placeSize))
        // what it filters, sorts and searches by, one step in under its line too
        placeLines.push(...ownTakesLines(collection, description))
      }
    }
    if (searchedApart && description.searchedBy) {
      const at = searchAddressOf(description)
      const line = `${collectionWords(description)} are searched with "${description.searchedBy.param}"${at ? ` at "${at}"` : ""}`
      placeLines.push({ key: `search:${collection}`, text: line })
    }
    if (!sameId && description.idField && description.idField !== USUAL_ID) {
      const line = `${articled(description.type)}'s id is its "${description.idField}"`
      placeLines.push({ key: `id:${collection}`, text: line })
    }
    // asked for by a query:  `forecasts are asked for by their latitude and longitude`
    const asked = Object.keys(description.askedBy ?? {}).map((field) => description.fields[field]?.words ?? field)
    if (asked.length) {
      const line = `${collectionWords(description)} are asked for by their ${fieldsInLine(asked)}`
      placeLines.push({ key: `asked:${collection}`, text: line })
    }
  }
  // a field holding a picture's id, on another server:  `a book's "cover i" is a picture at "https://..."`
  for (const [collection, description] of shown) {
    for (const [field, about] of Object.entries(description.fields)) {
      if (!about.pictureAt || about.leftOut) continue
      const line = `${articled(description.type)}'s "${about.words}" is a picture at "${about.pictureAt}"`
      placeLines.push({ key: `picture:${collection}:${field}`, text: line })
    }
  }
  // a list under each thing, at its own address:  `a post's comments live at "/posts/{id}/comments"`;
  // or one thing:  `a system's snapshot lives at "/instances/{id}/snapshot"`
  for (const [collection, description] of shown) {
    for (const [list, at] of listsUnderShown(description, collections)) {
      const { type, isOneUnder } = collections[list]!
      const what = isOneUnder ? `${type} lives` : `${collectionWords(collections[list]!)} live`
      placeLines.push({
        key: `under:${collection}:${list}`,
        text: `${articled(description.type)}'s ${what} at "${at}"`
      })
    }
  }
  // an action route under a thing, from its description:  `to sync a data source is at "/api/core/data-sources/{id}/sync/"`
  for (const [collection, description] of shown) {
    for (const [verb, { at }] of actionsOf(description)) {
      const text = `to ${verb} ${articled(description.type)} is at "${at}"`
      placeLines.push({ key: `action:${collection}:${verb}`, text })
    }
  }
  // a server's own time fields are Spell's two times, so a thing read from one isn't stamped twice (epic `data` T57)
  if (!isSheet) {
    for (const [collection, description] of shown) {
      for (const [time, field] of timeFieldsOf(description)) {
        const text = `${articled(description.type)}'s ${time} is its "${field}"`
        placeLines.push({ key: `time:${collection}:${time}`, text })
      }
    }
  }
  return {
    header: `${name} is ${articled(kind === "file" ? JSON_FILE_WORDS : kind)} at "${address}"`,
    placeLines,
    types: [
      ...shown.map(([collection, description]) => typeLines(collection, description, name, collections)),
      ...typesInside(shown, collections, name),
      ...namedLinkTypes(shown, collections, name)
    ]
  }
}

/** The kinds whose program holds a key's name:  each other's key is its server's run token. */
export const KINDS_WITH_KEY_LINES: ReadonlySet<string> = new Set(["web server", "graphql server", "airtable"])

/** What a server calls Spell's two times, by its words, the usual ones first (epic `data` T57). */
const TIME_WORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["created", ["created at", "created time", "created on", "date created", "creation date", "inserted at"]],
  [
    "modified",
    [
      "updated at",
      "updated time",
      "updated on",
      "updated",
      "modified at",
      "modified on",
      "date modified",
      "last modified",
      "last modified time",
      "last updated",
      "edited",
      "edited at"
    ]
  ]
]

/**
 * Each of Spell's two times `description` holds in a date field of its own by a usual name:  the time, and what a line calls that field.
 * - A field already called `created` or `modified` needs no line.
 * - Only a field that's really a date:  a `created` text says nothing of when.
 * - In its words, `"created at"`, which find `created_at` and `createdAt` alike (`FieldNames`, epic `data` J237).
 *   - One word, or words two of the row's fields share:  the server's spelling, the only thing that says which.
 */
function timeFieldsOf({ fields }: CollectionDescription): Array<[string, string]> {
  const dates = Object.entries(fields).filter(([, { type, leftOut }]) => type === "date" && !leftOut)
  const wordsOfEach = Object.keys(fields).map(wordsFor)
  return TIME_WORDS.flatMap(([time, words]) => {
    if (time in fields) return []
    const found = words.flatMap((each) => dates.filter(([name]) => wordsFor(name) === each)).at(0)
    if (!found) return []
    const inWords = wordsFor(found[0])
    const isOnlyOne = wordsOfEach.filter((each) => each === inWords).length === 1
    return [[time, isOnlyOne && inWords.includes(" ") ? inWords : found[0]] as [string, string]]
  })
}

/**
 * The lines saying what a web server was seen to do when it was asked (epic `data` T162), and that it's read only:
 * - `its next page is asked for with "limit" and "offset"`, for a list that says nothing of paging
 * - `it filters by cuisine and rating`, `it sorts by title with "_sort"`, `it gives only the fields named in "fields"`
 * - `it is read only`, for one that says it takes only `GET`s
 * - `hasPaging`:  it says its next page already, so a position would be asking twice
 */
function linesOfWhatItTakes(
  takes: ServerTakes | undefined,
  every: readonly CollectionDescription[],
  write: string,
  hasPaging: boolean
): SpellLine[] {
  const lines: SpellLine[] = []
  const { filters, sorts, sortedWith, fieldsNamedIn, pagesWith } = takes ?? {}
  const wordsOf = (names: readonly string[]) =>
    fieldsInLine(every.flatMap(({ fields }) => names.flatMap((name) => fields[name]?.words ?? [])))
  if (pagesWith && !hasPaging) {
    lines.push({
      key: "pages",
      text: `its next page is asked for with "${pagesWith.limit}" and "${pagesWith.offset}"`
    })
  }
  if (filters) lines.push({ key: "filters", text: `it filters by ${wordsOf(filters)}` })
  if (sorts) {
    lines.push({ key: "sorts", text: `it sorts by ${wordsOf(sorts)}${sortedWith ? ` with "${sortedWith}"` : ""}` })
  }
  if (fieldsNamedIn) lines.push({ key: "fields", text: `it gives only the fields named in "${fieldsNamedIn}"` })
  if (/read only/.test(write)) lines.push({ key: "read only", text: "it is read only" })
  return lines
}

/**
 * The lines one step in under a collection's `live at` line that say how it pages, when that isn't the place's way
 * (epic `data` P56):  `its next page is asked for with "take" and "skip"`, `it gives up to 100 at a time`.
 * - `place`:  how the place's own line says every list pages;  `undefined` when it says none by position.
 * - `placeSize`:  how many the place's own line says every list gives at a time;  `NaN` when it says none.
 * - Nothing for a list that pages as the place does, or by no position its description says,
 *   or whose answer says where its next page is.
 * - Paging as the place does but giving fewer than it says, only how many:  `it gives up to 10 at a time`,
 *   so a read never asks it for more.
 */
function ownPagingLines(
  collection: string,
  { pagesWith, nextAt }: CollectionDescription,
  place: PagesWith | undefined,
  placeSize: number
): SpellLine[] {
  // its answer says where its next page is:  NetBox's `next`, which it follows instead
  if (!pagesWith || nextAt !== undefined) return []
  if (place && place.limit === pagesWith.limit && place.offset === pagesWith.offset) {
    const most = pagesWith.most
    return most !== undefined && !(most >= placeSize)
      ? [{ key: `size:${collection}`, text: `\tit gives up to ${most} at a time` }]
      : []
  }
  return [
    {
      key: `pages:${collection}`,
      text: `\tits next page is asked for with "${pagesWith.limit}" and "${pagesWith.offset}"`
    },
    ...(pagesWith.most !== undefined
      ? [{ key: `size:${collection}`, text: `\tit gives up to ${pagesWith.most} at a time` }]
      : [])
  ]
}

/**
 * The lines one step in under a list's `live at` line saying what it takes besides paging (`ListTakes`):
 * - `it filters by job-id and session-id`
 * - `it sorts by title and cuisine with "_sort"`, the fields a try saw it sort by
 * - `it sorts newest first by created-at as "created_at", with "order_by"`, each order its sort question names, once
 *   it's known which way round (a verify tries it);  an order naming no field has no line
 * - `it searches names with "search"`, or `it searches everything with "search"` while no try found the field
 * - Never a field Spell leaves out, as no line could name it.
 */
function ownTakesLines(collection: string, { takes, fields }: CollectionDescription): SpellLine[] {
  if (!takes) return []
  const shown = (name: string) => (fields[name] && !fields[name]!.leftOut ? fields[name] : undefined)
  const wordsOf = (names: readonly string[]) => names.flatMap((name) => shown(name)?.words ?? [])
  const lines: SpellLine[] = []
  const { filters = [], sorts = [], sortedWith, orders = [], search } = takes
  const filtered = wordsOf(filters)
  if (filtered.length) {
    lines.push({ key: `takes:${collection}:filters`, text: `\tit filters by ${fieldsInLine(filtered)}` })
  }
  const sorted = wordsOf(sorts)
  if (sorted.length) {
    const asked = sortedWith && sortedWith !== "sort" ? ` with "${sortedWith}"` : ""
    lines.push({ key: `takes:${collection}:sorts`, text: `\tit sorts by ${fieldsInLine(sorted)}${asked}` })
  }
  for (const { as, field, descending } of orders) {
    const about = field === undefined ? undefined : shown(field)
    if (!about || descending === undefined) continue
    const isDate = about.type === "date"
    const way = descending ? (isDate ? "newest first" : "highest first") : isDate ? "oldest first" : "lowest first"
    const asked = sortedWith && sortedWith !== "sort" ? `, with "${sortedWith}"` : ""
    lines.push({
      key: `takes:${collection}:order:${as}`,
      text: `\tit sorts ${way} by ${fieldsInLine([about.words])} as "${as}"${asked}`
    })
  }
  if (search) {
    const about = search.field === undefined ? undefined : shown(search.field)
    const what = about ? pluralWords(about.words).replace(/ /g, "-") : "everything"
    lines.push({ key: `takes:${collection}:search`, text: `\tit searches ${what} with "${search.param}"` })
  }
  return lines
}

/**
 * Fields by their words, as a line that names several says them (`searched_fields`):  each one word, two words joined,
 * `cook-time`;  `it filters by cuisine and cook-time`, `runs are asked for by their instance-id`.
 */
function fieldsInLine(words: readonly string[]): string {
  return wordsJoined([...new Set(words)].map((each) => each.replace(/ /g, "-")))
}

/** `words` as a list in a line:  `latitude and longitude`, `a, b and c`. */
function wordsJoined(words: readonly string[]): string {
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`
}

/**
 * The measure a number in `unit` is, in a type's line (epic `data` P33):
 * `a temperature in °C`, by Spell's own dimensions.
 * - `undefined` for a unit Spell has no dimension for.
 * - And for a percent, `%`:  Spell keeps a percent as its fraction (`PROPORTION`, epic `language` P34),
 *   and a source's `65` means 65%, so it stays a plain number, its unit in a comment.
 */
function measureIn(unit: string): string | undefined {
  const dimension = BUILT_IN_DIMENSIONS.find(({ units }) => units.some(({ names }) => names.en?.includes(unit)))
  if (!dimension || dimension.name === PROPORTION) return undefined
  return `${articled(dimension.words.en!)} in ${unit}`
}

/** Is a collection at this address found by name, with no list:  `/page/summary/{name}`? */
function isFoundByNameAt(at: string): boolean {
  return /\{[^{}/]*\}/.test(at)
}

/**
 * Where a field is that's inside others, in words, never with a dot:  `links.next` => `the "next" of its "links"`.
 * - The grammar refuses a dot in a field's name, so it's never suggested here.
 */
function fieldInWords(path: string): string {
  const [own, ...outer] = path.split(".").reverse()
  if (!outer.length) return `its "${own}"`
  const last = outer.pop()!
  return [own, ...outer].map((name) => `the "${name}" of`).join(" ") + ` its "${last}"`
}

/** Words a type's name can't hold, as they end a name in a line:  `evolves to`. */
const NOT_IN_A_TYPE_NAME = new Set([
  "to",
  "is",
  "of",
  "in",
  "on",
  "at",
  "by",
  "for",
  "from",
  "with",
  "and",
  "or",
  "the",
  "a",
  "an"
])

/** A schema's name an API gives the short copy of a thing:  `BriefModuleBayType`, `NestedTag`. */
const SHORT_COPY_NAME = /^(?:Brief|Nested)(?=\p{Lu})/u

/** The word a schema's name may end in that only its server's code means:  `CircuitGroupAssignmentSerializer`. */
const CODE_WORD_AT_END = /(?<=\p{Ll})(?:Serializer|Schema)$/u

/**
 * What the type of a field's object is called by its schema's name, read as words (epic `data` I106):
 * `#/components/schemas/FrontPortTemplateMapping` => `front port template mapping`.
 * - A short copy of a thing is its summary:  `BriefModuleBayType` => `module bay type summary`.
 * - Without a word only its server's code means:  `BriefCircuitGroupAssignmentSerializer` => `circuit group assignment summary`.
 * - A place's own type's words, when they're its name:  `BriefIPSecProposal` => `ipsec proposal summary`, as its list is
 *   the `ipsec proposals`;  else a run of capitals is a word, `BriefMACAddress` => `mac address summary`.
 * - `undefined` for none, or a name with no word a type's name can hold.
 */
function typeOfSchema(schemaAt: string | undefined, own: ReadonlySet<string>): string | undefined {
  const name = schemaAt?.split("/").pop()?.replace(CODE_WORD_AT_END, "")
  if (!name) return undefined
  const isShortCopy = SHORT_COPY_NAME.test(name)
  const thing = name.replace(SHORT_COPY_NAME, "")
  const squashed = thing.toLowerCase()
  const ownWords = [...own].find((words) => words.replaceAll(" ", "") === squashed)
  const parts = (ownWords ?? wordsFor(thing.replace(CAPITALS_THEN_WORD, "$1 $2")))
    .split(" ")
    .filter((word) => word && !NOT_IN_A_TYPE_NAME.has(word))
  if (!parts.length) return undefined
  return isShortCopy ? `${parts.join(" ")} summary` : parts.join(" ")
}

/** A run of capitals, then a capitalised word:  `MACAddress`, so it reads as two. */
const CAPITALS_THEN_WORD = /(\p{Lu})(\p{Lu}\p{Ll})/gu

/**
 * What a type holding a field's object is called:  one of it, `parts` => `part`.
 * - Without a word a type's name can't hold:  `evolves to` => `evolves`.
 */
function typeInside(words: string): string {
  const parts = words.split(" ").filter((word) => !NOT_IN_A_TYPE_NAME.has(word))
  if (!parts.length) return "part"
  parts[parts.length - 1] = P.singularize(parts[parts.length - 1]!)
  return parts.join(" ")
}

/**
 * The type holding the objects a field of `owner` holds:  `thumbnail` for `thumbnail`, `stat` for a list of `stats`.
 * - What a person called it first, `insideType`, when it's free:  an asset's `meta` that they named `asset meta`.
 * - Its schema's name first, when its description gives it one (epic `data` I106):  NetBox's module bay's
 *   `module_bay_types`, each a `BriefModuleBayType`, are each a `module bay type summary`,
 *   one type for every list holding them, as the description has it.
 *   - Owner and field words, `module bay module bay type`, were five words:  more than Spell reads as a type's name.
 * - A name a place's own type has, or one of Spell's (`type`, `speed`), says whose it is:  PokéAPI's `types` of a
 *   `pokemon` are each a `pokemon type entry`, as its `type` collection is the `pokemon type`.
 * - Never more words than a type's name holds (`SpellType.MAX_NAME_WORDS`, 4):  `module bay module bay type` is five,
 *   so a module bay's `module bay types`, written in place, are each a `module bay type entry`.
 */
function insideTypeFor(
  { words, insideSchemaAt, insideType }: FieldDescription,
  owner: string,
  own: ReadonlySet<string>,
  collections: Readonly<Record<string, CollectionDescription>>
): string {
  const one = typeInside(words)
  const owned = `${owner} ${one}`
  const schema = singularTypeOf(typeOfSchema(insideSchemaAt, own), schemaTypesIn(collections, own))
  const names = [insideType, schema, one, owned, `${owned} entry`, `${one} entry`]
  // none free:  the line can't be read, and the field holding it is left out
  return names.find((name) => name !== undefined && isFreeTypeName(name, own)) ?? owned
}

/**
 * A schema's type, named as Spell reads ONE thing:  a name ending in a plural reads as many, so `a recipe options` and
 * `a step data` are lines Spell can't read.
 * - Its last word made singular, `step datum`;  or, when that's another schema's own name (`RecipeOption` beside
 *   `RecipeOptions`), the plural kept with `set` after it, `recipe options set`.
 */
function singularTypeOf(name: string | undefined, schemaTypes: ReadonlySet<string>): string | undefined {
  if (name === undefined) return undefined
  const one = oneNamedBy(name)
  if (one === name) return name
  return schemaTypes.has(one) ? `${name} set` : one
}

/** Each schema's own type name in `collections`' fields, and inside them:  see `singularTypeOf()`. */
function schemaTypesIn(
  collections: Readonly<Record<string, CollectionDescription>>,
  own: ReadonlySet<string>
): ReadonlySet<string> {
  const known = SCHEMA_TYPES.get(collections)
  if (known) return known
  const names = new Set<string>()
  const add = (fields: Readonly<Record<string, FieldDescription>>) => {
    for (const { insideSchemaAt, inside } of Object.values(fields)) {
      const name = typeOfSchema(insideSchemaAt, own)
      if (name !== undefined) names.add(name)
      if (inside) add(inside)
    }
  }
  for (const { fields } of Object.values(collections)) add(fields)
  SCHEMA_TYPES.set(collections, names)
  return names
}

/** `schemaTypesIn()`'s, once for each description's collections. */
const SCHEMA_TYPES = new WeakMap<object, ReadonlySet<string>>()

/** Can a type inside a row be called `words`:  no more words than a type's name holds, nor anyone's already? */
function isFreeTypeName(words: string, own: ReadonlySet<string>): boolean {
  return words.split(" ").length <= SpellType.MAX_NAME_WORDS && !own.has(words) && !isSpellsOwnType(words)
}

/**
 * A type for each object a field holds, its fields read in words:  `its "thumbnail" is a thumbnail`, `the source of its thumbnail`.
 * - Plain things, nowhere of their own:  each is inside the row it came in.
 * - The first with its name stands for all of them, and one inside it gets its own.
 * - A list of objects too:  `its "stats" is a list of stats`, each a `stat`.
 */
function typesInside(
  shown: ReadonlyArray<readonly [string, CollectionDescription]>,
  collections: Readonly<Record<string, CollectionDescription>>,
  place: string
): TypeLines[] {
  const types = new Map<string, TypeLines>()
  const own = new Set(shown.map(([, { type }]) => type))
  const add = (collection: string, owner: string, fields: Readonly<Record<string, FieldDescription>>) => {
    for (const field of Object.values(fields)) {
      const { inside, leftOut } = field
      if (!inside || leftOut) continue
      const words = insideTypeFor(field, owner, own, collections)
      const held = types.get(words)
      if (held) {
        held.heldBy!.push({ owner, field })
        if (field.keepsEveryKey) held.header = insideHeaderFor(words, true)
        continue
      }
      const lines = Object.entries(inside).flatMap(([name, about]) => {
        if (about.leftOut || (!about.inside && !about.isItsOwner && !SPELL_TYPES[about.type])) return []
        // what its schema says of it too, as a collection's own field:  `required text` (epic `data` I140);
        // NOT its choices:  one type inside stands for every field holding it, NetBox's `status` with each its own
        const what = schemaWordsFor(
          { ...about, choices: undefined },
          typeWordsFor(about, collections, words, own, place)
        )
        const line = fieldLineFor(name, about, what)
        return [{ key: `inside:${words}:${about.words}`, text: line, note: noteFor(about, collections) }]
      })
      const header = insideHeaderFor(words, !!field.keepsEveryKey)
      types.set(words, { collection, header, lines, isInside: true, insideFields: inside, heldBy: [{ owner, field }] })
      add(collection, words, inside)
    }
  }
  for (const [collection, { fields, type }] of shown) add(collection, type, fields)
  return [...types.values()]
}

/**
 * A type inside a row's first line:  `a "thumbnail" is a thing`;  an object type, keeping every key it's given (its
 * schema names some and lets it hold others), `an "asset meta" is an object`.
 */
function insideHeaderFor(words: string, keepsEveryKey: boolean): string {
  return `${articled(words).replace(words, `"${words}"`)} is ${keepsEveryKey ? "an object" : "a thing"}`
}

/**
 * What a place calls what it points at by its name and address, nowhere it was asked to read:  `poke api name`.
 * - ONE type for the whole place, however many fields hold one (epic `data` I47).
 */
function namedLinkType(place: string): string {
  return `${place} name`
}

/** Does a field of `fields`, or of what's inside them, hold a name and an address to nowhere asked for? */
function holdsNamedLinkToNowhere(
  fields: Readonly<Record<string, FieldDescription>>,
  collections: Readonly<Record<string, CollectionDescription>>
): boolean {
  return Object.values(fields).some(({ isNamedLink, linksTo, leftOut, inside }) => {
    if (leftOut) return false
    if (inside && holdsNamedLinkToNowhere(inside, collections)) return true
    const target = linksTo === undefined ? undefined : collections[linksTo]
    return !!isNamedLink && (!target || !!target.leftOut)
  })
}

/**
 * The place's name type, when any field holds one (epic `data` I47):
 * a name and an address, held inside the row, never read.
 * - `its "stat" is a poke api name`, so `the name of the stat of stat` is `hp`;  its address is still there to follow.
 * - Asking for that collection later (`spell place update`, with it in `--collections`) makes the field a real link.
 */
function namedLinkTypes(
  shown: ReadonlyArray<readonly [string, CollectionDescription]>,
  collections: Readonly<Record<string, CollectionDescription>>,
  place: string
): TypeLines[] {
  if (!shown.some(([, { fields }]) => holdsNamedLinkToNowhere(fields, collections))) return []
  const words = namedLinkType(place)
  const insideFields: Record<string, FieldDescription> = {
    name: { words: "name", type: "text" },
    url: { words: "address", type: "link" }
  }
  return [
    {
      collection: shown[0]![0],
      header: `${articled(words).replace(words, `"${words}"`)} is a thing`,
      lines: [
        { key: `inside:${words}:name`, text: `its "name" is text` },
        {
          key: `inside:${words}:address`,
          text: `its "address" is text, stored as "url"`,
          note: "never read:  its collection wasn't asked for"
        }
      ],
      isInside: true,
      insideFields
    }
  ]
}

/**
 * A field's line:  `its "zip one" is text, stored as "zip_1", with maximum length 10`.
 * - In the order Spell reads them (`DefinePropertyHas`'s `RULES`):  its words for none, its stored-as, then its length.
 */
function fieldLineFor(field: string, about: FieldDescription, what: string): string {
  const [, kind = what, length = ""] = /^(.*?)(, with (?:maximum|minimum) length \d+)?$/s.exec(what) ?? []
  return `its "${about.words}" ${verbBefore(what)} ${kind}${nothingWordsFor(about)}${storedAsFor(field, about)}${length}`
}

/**
 * SIDE EFFECT:  each field's words are ones its line can say, whoever gave them (the description, a read, the agent,
 * a look before):
 * - a yes or no's without a leading `is` or `has`:  `its "hidden" is yes or no, stored as "is_hidden"`, as Spell
 *   asks one `if it is hidden`;
 * - a choice's its source's own, needing no stored-as:  Spell reads `one of a, b or c, stored as "x"` as one more
 *   choice, so `its "state" as one of open, shipped or lost`, not `its "order state" ...`.
 * - Never words another field of its type has already:  that one keeps the words it had.
 */
export function wordsSpellReads(description: PlaceDescription): void {
  const sayIn = (fields: Record<string, FieldDescription>, choices: boolean) => {
    const taken = new Set(Object.values(fields).map(({ words }) => words))
    for (const [name, about] of Object.entries(fields)) {
      const said =
        about.type === "yes or no"
          ? yesOrNoWords(about.words)
          : choices && isChoiceStoredAs(name, about)
            ? wordsFor(name)
            : about.words
      if (said !== about.words && !taken.has(said)) {
        taken.delete(about.words)
        taken.add(said)
        about.words = said
      }
      if (about.inside) sayIn(about.inside, false)
    }
  }
  for (const collection of Object.values(description.collections)) sayIn(collection.fields, true)
}

/** Is `about` a choice its line would write with a stored-as:  see `wordsSpellReads()`. */
function isChoiceStoredAs(name: string, about: FieldDescription): boolean {
  return about.type === "text" && !!about.choices && !!oneOfWords(about.choices) && !!storedAsFor(name, about)
}

/**
 * What the source calls a field, when its words don't find it:  `, stored as "avg_ht"` on its own line.
 * - Its words finding it is the rule for a line's named field too:  `its "created at"` finds `created_at` (`FieldNames`).
 * - `hair_color`, `hairColor` and `Hair Color` all find `its "hair color"` by its words (`FieldNames`):  nothing to say.
 */
function storedAsFor(field: string, { words }: FieldDescription): string {
  return ourNameFor(field) === fieldNamed(words) ? "" : `, stored as "${field}"`
}

/**
 * One of the place's own field names of two words or more, if they're all spelled one way that isn't ours:  `hair_color`.
 * - What `it writes names like "hair_color"` says, so a save or a query names a field it hasn't sent yet the server's way.
 * - Spelled ours (`hairColor`), or several ways:  `undefined`.
 */
function nameExampleOf(collections: readonly CollectionDescription[]): string | undefined {
  const names = collections.flatMap(({ fields }) => Object.keys(fields)).filter((name) => nameStyleLike(name))
  const styles = new Set(names.map(nameStyleLike))
  return styles.size === 1 && !styles.has("camel") ? names[0] : undefined
}

/** A type's lines. */
function typeLines(
  collection: string,
  description: CollectionDescription,
  place: string,
  collections: Readonly<Record<string, CollectionDescription>>
): TypeLines {
  const lines: SpellLine[] = [{ key: `lives:${collection}`, text: `it lives in ${place}` }]
  // read from an API's description:  whether it was tried, and what its server lets be done (epic `data` P49)
  const state = stateWordFor(description)
  if (state) lines.push({ key: `state:${collection}`, text: `this type is ${state}` })
  const enabled = enabledOperationsOf(description)
  if (enabled) lines.push({ key: `enabled:${collection}`, text: `enabled operations are ${enabled.join(", ")}` })
  const own = new Set(Object.values(collections).map(({ type }) => type))
  for (const [field, about] of Object.entries(description.fields)) {
    if (isLeftOut(field, description, about.leftOut, about.type, about)) continue
    const what = schemaWordsFor(about, typeWordsFor(about, collections, description.type, own, place))
    const line = fieldLineFor(field, about, what)
    lines.push({ key: `field:${collection}:${field}`, text: line, note: noteFor(about, collections) })
  }
  // each list it keeps under this one, read from there:  `its "comments" is a list of comments`;
  // or one thing:  `its "snapshot" is a snapshot`
  for (const [list] of listsUnderShown(description, collections)) {
    const { type, isOneUnder } = collections[list]!
    const words = collectionWords(collections[list]!)
    const text = isOneUnder ? `its "${type}" is ${articled(type)}` : `its "${words}" is a list of ${words}`
    lines.push({ key: `under:${collection}:${list}`, text })
  }
  return {
    collection,
    header: `${articled(description.type).replace(description.type, `"${description.type}"`)} is a thing`,
    lines
  }
}

/** The writes Spell has words for, in the order a line names them. */
const WRITES = ["add", "change", "delete"] as const

/** A one-word action Spell can name in a list of enabled operations, not one of its own words:  `sync`, `enqueue`. */
const ACTION_VERB = /^\p{Ll}[\p{L}\d]*$/u

/**
 * The action routes `description`'s line can say, by verb, each with its address (epic `data` P49):
 * one word each, and none named like Spell's own operations (`read`, `all`, a write).
 */
function actionsOf({ operations = {} }: CollectionDescription): Array<[string, { at: string }]> {
  return Object.entries(operations).filter(
    ([verb, { state }]) =>
      ACTION_VERB.test(verb) && !["read", "all", ...WRITES].includes(verb) && state?.is !== "disabled"
  )
}

/**
 * What a type read from an API's description says of whether it was tried (Q56, Q62):  `unverified`, `verified`,
 * `failed`;  nothing for a type read from rows, which a read through the Spell has tried.
 */
function stateWordFor({ state, schemaAt, tag }: CollectionDescription): string | undefined {
  // a list no schema typed is still from the description, filed under its tag:  NetBox's background queues (P55)
  const isFromDescription =
    schemaAt !== undefined || tag !== undefined || state?.is === "unverified" || state?.is === "untyped"
  if (!state || state.readByTheLook || !isFromDescription) return undefined
  return state.is === "untyped" ? "unverified" : state.is === "disabled" ? undefined : state.is
}

/**
 * What its server lets be done to a type's things, when its description says less than everything (J264):
 * `read, add, change`;  `undefined` when it takes every write, as no line means every operation.
 */
function enabledOperationsOf(description: CollectionDescription): string[] | undefined {
  const { operations, schemaAt } = description
  // read from a description that offers nothing more:  read only
  if (!operations) return schemaAt === undefined ? undefined : ["read"]
  const writes = WRITES.filter((write) => operations[write] && operations[write]!.state?.is !== "disabled")
  if (writes.length === WRITES.length) return undefined
  return ["read", ...writes, ...actionsOf(description).map(([verb]) => verb)]
}

/** `address` with each brace's name taken out, so `/assets/{asset_id}/ips` is `/assets/{id}/ips`:  `/assets/{}/ips`. */
function bracesUnnamed(address: string): string {
  return address.replace(/\{[^}]*\}/g, "{}")
}

/**
 * The lists `description` keeps under each of its things that the Spell shows, by collection, with where each is.
 * - Not one whose words a field of its own already has:  that field says what it holds.
 */
function listsUnderShown(
  { listsUnder = {}, fields }: CollectionDescription,
  collections: Readonly<Record<string, CollectionDescription>>
): Array<[string, string]> {
  const taken = new Set(Object.values(fields).map(({ words }) => words))
  return Object.entries(listsUnder).filter(([list]) => {
    const other = collections[list]
    return other && !other.leftOut && !taken.has(other.isOneUnder ? other.type : collectionWords(other))
  })
}

/** Does the type leave this field out:  its id, which every thing has;  what Spell can't hold;  what a person or the compiler left out? */
function isLeftOut(
  field: string,
  { idField, samples }: CollectionDescription,
  leftOut: string | undefined,
  type: FieldDescription["type"],
  about: FieldDescription
): boolean {
  // a thing found by name keeps its name a field too:  Wikipedia's `title`, its id, is what a page shows
  const isItsId = field === idField && !samples
  return isItsId || !!leftOut || (!SPELL_TYPES[type] && !about.inside && !about.isItsOwner)
}

/**
 * What a field is, in a type's line.
 * - A link to one of the place's own types is that type:  `a planet`, `a list of films`, so reading it follows the address (`core.linked()`).
 *   Anywhere else, it's only an address:  text.
 */
function typeWordsFor(
  about: FieldDescription,
  collections: Readonly<Record<string, CollectionDescription>>,
  owner: string,
  own: ReadonlySet<string>,
  place: string
): string {
  const { type, linksTo, inside, isListInside, isItsOwner, isNamedLink, pictureAt, unit } = about
  // its picture's address, built as it's read
  if (pictureAt) return "text"
  // a number in a unit Spell knows:  a measure, shown in the reader's own units
  const measure = type === "number" && unit !== undefined ? measureIn(unit) : undefined
  if (measure) return measure
  if (isItsOwner) return isListInside ? `a list of ${P.pluralize(owner)}` : articled(owner)
  if (inside) {
    const held = insideTypeFor(about, owner, own, collections)
    return isListInside ? `a list of ${P.pluralize(held)}` : articled(held)
  }
  const target = linksTo === undefined ? undefined : collections[linksTo]
  if (!target || target.leftOut) {
    // a name and an address, to somewhere nobody asked for:  held whole, never read
    if (isNamedLink)
      return type === "list of links"
        ? `a list of ${P.pluralize(namedLinkType(place))}`
        : articled(namedLinkType(place))
    return SPELL_TYPES[type]!
  }
  // an address, or an id of one found by name:  Open Library's `author_key`
  if (type === "link" || type === "text") return articled(target.type)
  if (type === "list of links" || type === "list of text") return `a list of ${collectionWords(target)}`
  return SPELL_TYPES[type]!
}

/**
 * What a schema says of a field, on its line, in the lexicon reader's words (epic `data` P49, J252):
 * `required text, with maximum length 100`, `one of active, planned or retired`.
 * - Only on a plain kind:  a link, a list or a type of the place's own says what it is, and nothing more.
 */
function schemaWordsFor({ type, isRequired, choices, minLetters, maxLetters }: FieldDescription, what: string): string {
  if (!PLAIN_KINDS.has(what)) return what
  const isText = type === "text"
  const kind = (isText && choices && oneOfWords(choices)) || what
  return kindWordsOf({
    kind,
    ...(isRequired && { isRequired }),
    ...(isText && minLetters !== undefined && { minLetters }),
    ...(isText && maxLetters !== undefined && { maxLetters })
  }).said
}

/** The kinds a schema's words go on:  see `schemaWordsFor()`. */
const PLAIN_KINDS: ReadonlySet<string> = new Set(["text", "a number", "a date"])

/**
 * A number's words for none, as the source writes them:  ` or "unknown"`, ` or "n/a" or "unknown"`.
 * - Read as nothing, quietly, and what saving nothing writes back.  A number written as text needs nothing said:  it reads as one.
 */
function nothingWordsFor({ type, noNumberWords }: FieldDescription): string {
  const words = type === "number" ? (noNumberWords ?? []).filter((word) => word.trim()) : []
  return words.map((word) => ` or "${word}"`).join("")
}

/**
 * What a person should know of a field, its line's `note`:  what Spell reads differently from what's there.
 * - `undefined` for nothing to say.
 */
function noteFor(
  { type, linksTo, pictureAt, isNamedLink, unit }: FieldDescription,
  collections: Readonly<Record<string, CollectionDescription>>
): string | undefined {
  if (pictureAt) return "a picture's address"
  if (type === "number" && unit !== undefined && !measureIn(unit)) return `in ${unit}`
  const target = linksTo === undefined ? undefined : collections[linksTo]
  // a link to one of its own types, or a name type holding its address:  nothing reads as an address by surprise
  if ((isNamedLink || (target && !target.leftOut)) && (type === "link" || type === "list of links")) return undefined
  if (type === "link") return "an address"
  if (type === "list of links") return "each an address"
  return undefined
}

/** `line` as a file's lines under its header, at `indent`:  the line, then its note, one deeper, `-- an address`. */
function fileLinesOf({ text, note }: SpellLine, indent = "\t"): string[] {
  return note ? [`${indent}${text}`, `${indent}\t-- ${note}`] : [`${indent}${text}`]
}

/** The one value of `read` every collection has:  `undefined` when they differ, or any has none. */
function sameOfEvery<Value>(
  collections: readonly CollectionDescription[],
  read: (collection: CollectionDescription) => Value | undefined
): Value | undefined {
  const values = new Set(collections.map(read))
  return values.size === 1 ? [...values][0] : undefined
}

/**
 * What a program calls a collection:  its type, more than one, `characters` for a `character`.
 * - Not the source's own name for it, `people`:  a person may rename the type, and the collection goes with it.
 */
function collectionWords({ type }: CollectionDescription): string {
  return type
    .split(" ")
    .map((word, index, words) => (index === words.length - 1 ? P.pluralize(word) : word))
    .join(" ")
}

/** `word` with its article. */
export function articled(word: string): string {
  return `${englishAgreement.article("indefinite", word, undefined)} ${word}`
}

/** `parts` as text. */
export function spellTextOf(parts: SpellParts): string {
  return `${spellLinesOf(parts)
    .map(({ text }) => text)
    .join("\n")}\n`
}

/**
 * Each line of `spellTextOf()`, in order, with what wrote it (epic `data` I106):
 * line 12 of the text is `spellLinesOf(parts)[11]`.
 * - So a line Spell can't read is found by where it is:  the same words may be on a line of another type too.
 */
export function spellLinesOf({ header, placeLines, types }: SpellParts): WrittenLine[] {
  const written: WrittenLine[] = []
  const add = (text: string, about: Omit<WrittenLine, "text">) => {
    for (const line of text.split("\n")) written.push({ text: line, ...about })
  }
  add(header, {})
  for (const line of placeLines) add(fileLinesOf(line).join("\n"), { key: line.key })
  for (const type of types) {
    written.push({ text: "" })
    add(type.header, { type })
    for (const line of type.lines) add(fileLinesOf(line).join("\n"), { key: line.key, type })
  }
  return written
}

/** The place a line in `text` declares at this address, by name, English or Spanish:  `undefined` if it has none. */
export function placeLineAt(text: string, address: string): string | undefined {
  return placesIn(text).find((place) => sameAddress(place.address, address))?.name
}

/** Every place's line in `text`:  its name and address. */
export function placesIn(text: string): Array<{ name: string; address: string }> {
  return [...text.matchAll(PLACE_LINE)].map((match) => ({ name: match[1]!.trim(), address: match[2]! }))
}

/** A place's line, as far as saying which it is:  in either language. */
const PLACE_LINE = /^([^\s"/][^"\n]*?) (?:is|es) (?:an?|una?) [^"\n]+? (?:at|from|en|desde) "([^"\n]+)"/gm

/**
 * The same header line, a colon at its end or not:  an older look wrote `a "person" is a thing:`, today's
 * `a "person" is a thing` (epic `language` P48).
 */
function sameHeader(line: string, header: string): boolean {
  return line.replace(/:\s*$/, "") === header.replace(/:\s*$/, "")
}

/** The same address, whatever ends it. */
function sameAddress(a: string, b: string): boolean {
  return a.replace(/\/+$/, "") === b.replace(/\/+$/, "")
}

////////////////
// ## Looking again
////////////////

/** What merging a new look into a file did. */
export type SpellMerge = {
  /** The file now. */
  text: string
  /** What changed, in words for people. */
  changed: string[]
  /** What it couldn't change for them, in words for people. */
  couldnt: string[]
}

/**
 * The Spell file with what's changed since the last look, and everything else as it was.
 * - `before`:  what the tool wrote last time;  `after`:  what it would write now.
 * - A line differs only if the tool's own line differs:  every line a person wrote or changed is theirs, and stays.
 * - A line that's gone from the source:
 *   - still as the tool wrote it, and nothing uses it:  it goes
 *   - something uses it, by its words, here or in another file beside it:  it stays, and it says so
 * - A line a person changed, whose field has changed too:  theirs stays, and it says so.
 * - A type that's gone stays:  removing a program's type is a person's call.
 * - `usesOf`:  where these words are used, in lines the tool didn't write.
 * - `written`:  the lines it wrote last time, as the description keeps them (`PlaceDescription.spell`):
 *   one written by an older version of the tool, in words it no longer writes, is put in today's (`inTodaysWords()`).
 * - A person's words, the `--` lines right inside a line (`PlaceWords`;  epic `data` P53):
 *   - kept with their line, however it changes
 *   - dropped with it when it goes, saying so in a line (Q102)
 * - `marks`:  the day it looked, `2026-11-18`, and the file's language:  each field and type it finds new gets
 *   `-- NEW as of <date>`, each it can no longer find and keeps gets `-- APPARENTLY DELETED as of <date>` (Q102).
 *   Left out, no marks.
 */
export function mergedSpell(
  text: string,
  before: SpellParts,
  after: SpellParts,
  usesOf: (words: string, own: ReadonlySet<string>) => boolean,
  written: readonly string[] = [],
  marks?: MergeMarks
): SpellMerge {
  const merge: SpellMerge = { text, changed: [], couldnt: [] }
  const markOf = (is: "new" | "gone") => (marks ? PlaceWords.markFor(is, marks.date, marks.lang) : undefined)
  const lines = text.split("\n")
  const own = new Set(allLines(before).map((line) => line.text))
  // what it wrote last time, in an older version's words too:  never a person's line
  const wrote = new Set(written.map((line) => line.trim().replace(/^- /, "")))
  const placeAt = lines.findIndex((line) => sameHeader(line, before.header))
  if (placeAt < 0) {
    merge.couldnt.push(`The place's line isn't as it was written, so nothing under it was changed:  ${before.header}`)
    return merge
  }
  // it moved:  `spell place update --address`
  if (!sameHeader(after.header, before.header)) {
    lines[placeAt] = after.header
    merge.changed.push(`Moved:  ${after.header}`)
  }
  // the place's lines
  mergeBlock({
    lines,
    blockAt: placeAt,
    before: before.placeLines,
    after: after.placeLines,
    merge,
    own,
    usesOf,
    markOf,
    wrote
  })
  // each type, and a new one at the end
  for (const type of after.types) {
    const was = before.types.find((each) => isSameType(each, type))
    if (!was) {
      // one blank line before it, whatever the file ended with
      while (lines.at(-1) === "") lines.pop()
      const mark = markOf("new")
      lines.push("", type.header, ...(mark ? [`\t-- ${mark}`] : []), ...type.lines.flatMap((line) => fileLinesOf(line)))
      merge.changed.push(
        type.isInside
          ? `New type inside:  "${type.header}".`
          : `New collection:  ${type.collection}, as "${type.header}".`
      )
      continue
    }
    const blockAt = lines.findIndex((line) => sameHeader(line, was.header))
    if (blockAt < 0) {
      merge.couldnt.push(`"${was.header}" isn't in the file as it was written, so its lines weren't changed.`)
      continue
    }
    mergeBlock({ lines, blockAt, before: was.lines, after: type.lines, merge, own, usesOf, markOf, wrote })
  }
  for (const type of before.types) {
    if (type.isInside || after.types.some((each) => isSameType(each, type))) continue
    merge.couldnt.push(
      `The collection "${type.collection}" is gone from the source;  its type stays, for you to remove:  ${type.header}`
    )
    const blockAt = lines.findIndex((line) => sameHeader(line, type.header))
    const mark = markOf("gone")
    if (blockAt >= 0 && mark) markGone(lines, blockAt, "\t", mark)
  }
  inTodaysWords(lines, written, after, merge)
  merge.text = lines.join("\n")
  if (text.endsWith("\n") && !merge.text.endsWith("\n")) merge.text += "\n"
  return merge
}

/** A line under a place an older version wrote, naming a field the server spells differently:  `a person's hair color is its "hair_color"`. */
const OLD_FIELD_NAME_LINE = /^(?:- )?an? .+?'s "?.+?"? is its "[^"]+"$/

/**
 * SIDE EFFECT:  each line the tool wrote last time (`written`), in words it no longer writes, put in today's (epic `data` P23):
 * - a field's line, `its "height" is a number  // written as text there`:  today's line for those words, in its type
 * - a line under the place naming a field's spelling there, `a person's hair color is its "hair_color"`:  gone, as the
 *   field finds it by its words now, or says `stored as` on its own line
 * - A line a person changed isn't one it wrote, so it's never touched.
 */
function inTodaysWords(lines: string[], written: readonly string[], after: SpellParts, merge: SpellMerge): void {
  const wrote = new Set(written.map((line) => line.trim().replace(/^- /, "")))
  const today = new Set(allLines(after).map(({ text }) => text))
  const blocks = new Map<string, Map<string, SpellLine>>([[after.header, new Map()]])
  for (const type of after.types) {
    blocks.set(
      type.header,
      new Map(type.lines.flatMap((line) => (wordsIn(line.text) ? [[wordsIn(line.text)!, line]] : [])))
    )
  }
  let block: Map<string, SpellLine> | undefined
  for (let at = 0; at < lines.length; at++) {
    const line = lines[at]!
    if (!line.startsWith("\t")) {
      block = blocks.get(line)
      continue
    }
    const text = line.trim().replace(/^- /, "")
    if (!block || !wrote.has(text) || today.has(text)) continue
    const todays = block.get(wordsIn(text) ?? "")
    if (todays && /^(?:- )?its "/.test(text)) {
      const now = todays.text
      // today's line may be in already, added at the block's end as new:  it takes the old one's place, its note too
      const added = otherInBlock(lines, at, `\t${now}`)
      const addedNote = added !== undefined && todays.note && lines[added + 1] === `\t\t-- ${todays.note}` ? 1 : 0
      if (added !== undefined) lines.splice(added, 1 + addedNote)
      if (added !== undefined && added < at) at -= 1 + addedNote
      lines[at] = `\t${now}`
      // its note, written after the line once (`// an address`), now the first line inside it (epic `language` T166)
      if (todays.note && lines[at + 1] !== `\t\t-- ${todays.note}`) lines.splice(at + 1, 0, `\t\t-- ${todays.note}`)
      merge.changed.push(`In today's words:  ${now}`)
    } else if (OLD_FIELD_NAME_LINE.test(text)) {
      lines.splice(at--, 1)
      merge.changed.push(`Removed, as its field finds it by its words:  ${text}`)
    }
  }
}

/** Where else the block holding line `at` has `line`:  `undefined` if nowhere. */
function otherInBlock(lines: readonly string[], at: number, line: string): number | undefined {
  let start = at
  while (start > 0 && lines[start - 1]!.startsWith("\t")) start--
  for (let index = start; index < lines.length && lines[index]!.startsWith("\t"); index++) {
    if (index !== at && lines[index] === line) return index
  }
  return undefined
}

/** What `mergeBlock()` works on. */
type BlockMerge = {
  /** The file's lines:  changed. */
  lines: string[]
  /** Where the block's first line is. */
  blockAt: number
  /** The lines the tool wrote last time. */
  before: readonly SpellLine[]
  /** The lines it would write now. */
  after: readonly SpellLine[]
  /** What's being said. */
  merge: SpellMerge
  /** Every line the tool wrote. */
  own: ReadonlySet<string>
  /** See `mergedSpell()`. */
  usesOf: (words: string, own: ReadonlySet<string>) => boolean
  /** The mark for a line found new, or gone and kept:  `undefined`, none. */
  markOf: (is: "new" | "gone") => string | undefined
  /** The lines it wrote last time, as the description keeps them:  never a person's. */
  wrote: ReadonlySet<string>
}

/** The day a look was, and the file's language:  see `mergedSpell()`. */
export type MergeMarks = {
  /** When it looked:  `2026-11-18`. */
  date: string
  /** The file's language:  `en`, `es`. */
  lang: string
}

/** SIDE EFFECT:  one block's lines, added, changed and gone:  see `mergedSpell()`. */
function mergeBlock({ lines, blockAt, before, after, merge, own, usesOf, markOf, wrote }: BlockMerge): void {
  const wereBy = new Map(before.map((line) => [line.key, line.text]))
  for (const line of after) {
    const was = wereBy.get(line.key)
    if (was === line.text) continue
    if (was === undefined) {
      // a person wrote it already, word for word:  nothing to add
      if (ownLineAt(lines, blockAt, line, after) >= 0) continue
      // a person's line reads the same field already, in words of their own:  theirs wins, never a second beside it
      const theirs = isFieldLine(line.text) ? personsLineFor(lines, blockAt, line.text, before, wrote) : undefined
      if (theirs !== undefined) {
        merge.couldnt.push(
          `It would add "${line.text}", but your line reads that field already, so yours stays:  ${theirs}`
        )
        continue
      }
      const mark = isFieldLine(line.text) ? markOf("new") : undefined
      lines.splice(placeFor(lines, blockAt, line, after), 0, ...fileLinesOf(line), ...(mark ? [`\t\t-- ${mark}`] : []))
      merge.changed.push(`Added:  ${line.text}`)
      continue
    }
    const at = ownLineAt(lines, blockAt, { key: line.key, text: was }, before)
    if (at < 0) {
      merge.couldnt.push(`It would say "${line.text}", but you've changed that line, so it stays as you wrote it.`)
      continue
    }
    const words = wordsIn(was)
    if (words && usesOf(words, own)) {
      merge.couldnt.push(
        `It would say "${line.text}", but "${words}" is used, as it was:  it stays, for you to change.`
      )
      continue
    }
    lines[at] = `\t${line.text}`
    merge.changed.push(`Changed:  ${line.text}`)
  }
  const nowKeys = new Set(after.map((line) => line.key))
  for (const gone of before) {
    const { key, text } = gone
    if (nowKeys.has(key)) continue
    const at = ownLineAt(lines, blockAt, gone, before)
    if (at < 0) continue
    const words = wordsIn(text)
    if (words && usesOf(words, own)) {
      merge.couldnt.push(
        `The source no longer has what this line reads, and "${words}" is used, so it stays, for you to change:  ${text}`
      )
      const mark = markOf("gone")
      if (mark) markGone(lines, at, "\t\t", mark)
      continue
    }
    // its words go with it:  nothing's left for them to explain
    const under = linesUnder(lines, at)
    const dropped = under.filter((line) => !PlaceWords.isMark(line.trim()))
    lines.splice(at, 1 + under.length)
    merge.changed.push(`Removed:  ${text}`)
    if (dropped.length)
      merge.changed.push(
        `Dropped your words for "${words ?? text}", as it's gone:  ${dropped.map((line) => line.trim()).join(" ")}`
      )
  }
}

/**
 * The line a person wrote in the block at `blockAt` that reads the same field of the source as `text`, one the tool would
 * add:  `undefined` for none.
 * - The same field:  the same name in the source, by what it's `stored as`, else by its words, whatever their spacing
 *   or case:  `its "meta" is text` reads what `its "meta" is an object` would.
 * - A line the tool wrote there (`before`), or wrote last time (`written`, in an older version's words), is never a person's.
 */
function personsLineFor(
  lines: readonly string[],
  blockAt: number,
  text: string,
  before: readonly SpellLine[],
  written: ReadonlySet<string>
): string | undefined {
  const field = sourceFieldOf(text)
  if (field === undefined) return undefined
  const wrote = new Set([...written, ...before.map((line) => line.text)])
  const end = endOfBlock(lines, blockAt)
  for (let at = blockAt + 1; at < end; at++) {
    if (!/^\t[^\t]/.test(lines[at]!)) continue
    const theirs = lines[at]!.trim().replace(/^- /, "")
    if (isFieldLine(theirs) && !wrote.has(theirs) && sourceFieldOf(theirs) === field) return theirs
  }
  return undefined
}

/** The source's name for the field a field's line reads, in a form to compare:  its `stored as`, else its words. */
function sourceFieldOf(line: string): string | undefined {
  const name = /, (?:stored as|guardad[oa] como) "([^"]+)"/.exec(line)?.[1] ?? wordsIn(line)
  return name
    ?.replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[\s_-]+/g, " ")
    .trim()
    .toLowerCase()
}

/** Is `line` a field's line, `its "status" is ...`, in either language? */
function isFieldLine(line: string): boolean {
  return /^(?:- )?(?:its|su) "/.test(line)
}

/** The lines right under line `at`, indented further:  a person's words, and the ingest's marks. */
function linesUnder(lines: readonly string[], at: number): string[] {
  const indent = /^\t*/.exec(lines[at]!)![0]
  const under: string[] = []
  for (let next = at + 1; next < lines.length && lines[next]!.startsWith(`${indent}\t`); next++)
    under.push(lines[next]!)
  return under
}

/**
 * SIDE EFFECT:  `mark` (`APPARENTLY DELETED as of ...`) under line `at`, after any words a person wrote there,
 * unless it says it's gone already.
 */
function markGone(lines: string[], at: number, indent: string, mark: string): void {
  let end = at + 1
  while (end < lines.length && lines[end]!.startsWith(`${indent}--`)) {
    if (lines[end]!.includes(mark.slice(0, mark.lastIndexOf(" ")))) return
    end++
  }
  lines.splice(end, 0, `${indent}-- ${mark}`)
}

/** The words a line is about:  a property's, or what a source's name maps to. */
function wordsIn(line: string): string | undefined {
  return (
    /^(?:- )?(?:its|su) "([^"]+)" (?:is|es|as|como) /.exec(line)?.[1] ??
    /^(?:- )?an? .+?'s "?(.+?)"? is its "/.exec(line)?.[1]
  )
}

/** Where `text` is, in the block starting here:  `-1` when it isn't. */
function lineAt(lines: readonly string[], blockAt: number, text: string): number {
  const end = endOfBlock(lines, blockAt)
  // a line an older version bulleted, `- its "url" is text`, is the same line (epic `language` P46)
  for (let at = blockAt + 1; at < end; at++) if (lines[at]!.replace(/^\t- /, "\t") === `\t${text}`) return at
  return -1
}

/**
 * Where `line` is in the block at `blockAt`, as `lineAt()`;  one step in under another (`\tit filters by ...`), only
 * among the lines under its own (its list's `live at` line, the last line before it in `written` that isn't one step
 * in):  the same words under another list are that list's.
 */
function ownLineAt(lines: readonly string[], blockAt: number, line: SpellLine, written: readonly SpellLine[]): number {
  if (!line.text.startsWith("\t")) return lineAt(lines, blockAt, line.text)
  const index = written.findIndex((each) => each.key === line.key)
  const parent = written
    .slice(0, Math.max(index, 0))
    .reverse()
    .find((each) => !each.text.startsWith("\t"))
  const parentAt = parent ? lineAt(lines, blockAt, parent.text) : -1
  if (parentAt < 0) return -1
  for (let at = parentAt + 1; at < lines.length && lines[at]!.startsWith("\t\t"); at++) {
    if (lines[at] === `\t${line.text}`) return at
  }
  return -1
}

/**
 * Where a new line goes in the block at `blockAt`:  at its end;  one step in under another (`\tit filters by ...`),
 * right after the line it's under (its `live at` line) and the lines under that already, so it stays that list's.
 * - Its line not in the file:  at the block's end.
 */
function placeFor(lines: readonly string[], blockAt: number, line: SpellLine, after: readonly SpellLine[]): number {
  const end = endOfBlock(lines, blockAt)
  if (!line.text.startsWith("\t")) return end
  // after the line before it in what's written now, under the same line, when that's in the file:  else its line's last
  for (const before of after.slice(0, Math.max(after.indexOf(line), 0)).reverse()) {
    const at = ownLineAt(lines, blockAt, before, after)
    if (before.text.startsWith("\t") && at < 0) continue
    if (at < 0) return end
    let under = at + 1
    const step = before.text.startsWith("\t") ? "\t\t\t" : "\t\t"
    while (under < end && lines[under]!.startsWith(step)) under++
    // its line:  after a person's words right under it, its first
    if (!before.text.startsWith("\t")) while (under < end && /^\t\t(--|\/\/)/.test(lines[under]!)) under++
    return under
  }
  return end
}

/** Just past the block's last indented line. */
function endOfBlock(lines: readonly string[], blockAt: number): number {
  let end = blockAt + 1
  for (let at = end; at < lines.length; at++) {
    const line = lines[at]!
    if (line.startsWith("\t")) end = at + 1
    else if (line.trim()) break
  }
  return end
}

/** Every line, the headers too. */
function allLines({ header, placeLines, types }: SpellParts): SpellLine[] {
  return [
    { key: "place", text: header },
    ...placeLines,
    ...types.flatMap((type) => [
      { key: `type:${type.isInside ? type.header : type.collection}`, text: type.header },
      ...type.lines
    ])
  ]
}

/**
 * `it searches names and titles with "search"`:  what every collection that searches searches by, when they share a parameter.
 * - `undefined` when none does, or they don't agree on the parameter.
 * - One that searches all of each thing says so, and where (epic `data` P34):
 *   `it searches everything with "q" at "/v1.1/search"`.
 */
function searchLineOf(every: readonly CollectionDescription[]): string | undefined {
  // all of each thing, at its own address:  `it searches everything with "q" at "/v1.1/search"`
  const everything = every.find(({ searchedBy }) => searchedBy?.searchesEverything)?.searchedBy
  if (everything)
    return `it searches everything with "${everything.param}"${everything.at ? ` at "${everything.at}"` : ""}`
  const seen = every.flatMap(({ searchedBy, fields }) =>
    searchedBy ? [{ param: searchedBy.param, words: fields[searchedBy.field]?.words ?? searchedBy.field }] : []
  )
  const params = new Set(seen.map(({ param }) => param))
  if (!seen.length || params.size > 1) return undefined
  const words = [...new Set(seen.map(({ words }) => pluralWords(words)))]
  return `it searches ${words.join(" and ")} with "${[...params][0]}"`
}

/**
 * Do the collections that search each search their own way, at addresses of their own (epic `data` P41)?
 * - GitHub's:  its users at `/search/users`, its repositories at `/search/repositories`.
 * - Then each says its own:  `users are searched with "q" at "/search/users"`, searching all of each.
 * - One search, or several asking their lists with one parameter (SWAPI's `?search=`):  the place's line, as before.
 */
export function isSearchedApart(every: readonly CollectionDescription[]): boolean {
  const searching = every.filter(({ searchedBy }) => searchedBy)
  const addresses = new Set(searching.map(searchAddressOf).filter((at) => at !== undefined))
  const params = new Set(searching.map(({ searchedBy }) => searchedBy!.param))
  return addresses.size > 1 || params.size > 1
}

/** Where `description` is searched:  its search's own address, or its own when it's given only to a search. */
function searchAddressOf(description: CollectionDescription): string | undefined {
  return description.searchedBy?.at ?? (description.searchedOnly ? description.at : undefined)
}

/** `words`, more than one:  `name` => `names`, `class` => `classes`. */
function pluralWords(words: string): string {
  return /(?:s|x|z|ch|sh)$/.test(words) ? `${words}es` : `${words}s`
}
