import { decimalMarkIn, NO_NUMBER, numberInText } from "spell/places/places.types"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { collectionNameFor } from "spell/parser/spell/rules/places/places.shared"

import type {
  CollectionDescription,
  CollectionLook,
  FieldDescription,
  FieldKind,
  PlaceDescription,
  PlaceLook
} from "./ingest.types"
import { READER_ORIGIN } from "./PoliteReader"

/** An address, as a link holds it. */
const IS_LINK = /^https?:\/\/\S+$/

/** A date and time, or a date, in ISO. */
const IS_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

/** The fields that usually say which row is which, best first. */
const ID_FIELDS = ["id", "_id", "uuid", "key", "slug"]

/** The fields that usually say where a row is:  on a server with no `id`, that's what tells rows apart. */
const ADDRESS_FIELDS = ["url", "uri", "href", "self", "link"]

/** The longest text kept as an example. */
const LONGEST_EXAMPLE = 80

/** How often to ask a place that can't say what changed, unless something says otherwise. */
export const USUAL_CHECK_SECONDS = 30

/** The share of a rate limit a program's checks may take. */
const SHARE_OF_LIMIT = 0.1

/** An hour, in seconds:  what most rate limits are for, GitHub's among them. */
const HOUR_SECONDS = 3600

/**
 * What the rows of each collection show, with no agent:  what `--no-ai` gets, and what an agent's reading goes on top of.
 * - `name`:  what the program calls the place.
 */
export function describeLook(look: PlaceLook, { kind, name }: { kind: string; name: string }): PlaceDescription {
  const collections: Record<string, CollectionDescription> = {}
  // each look with its own description:  two looks can share a name, so places in the two lists needn't match
  const described = look.collections.map((each) => {
    const type = typeWordsFor(each.name, name)
    const collection = describeCollection(each, type)
    collections[collectionNameFor(type)] = collection
    return { rows: each.rows, collection }
  })
  for (const collection of Object.values(collections)) findLinks(collection, collections, look.address)
  for (const { rows, collection } of described) findIdLinks(rows, collection, collections)
  noteListsUnder(look, collections, name)
  return {
    about: {
      name,
      kind,
      address: look.address,
      lookedAt: "",
      fingerprint: "",
      ...(look.version && { version: look.version }),
      readBy: "nobody:  worked out from what came back",
      ...(look.docsAt && { docsAt: look.docsAt })
    },
    canDo: canDoFrom(look, kind),
    collections,
    notes: [...look.notes],
    agentNotes: [],
    spellCantSay: [],
    ...(kind === "web server" || kind === "graphql server"
      ? { checkEverySeconds: checkSecondsWithin(look.headers, Object.keys(collections).length) }
      : {}),
    ...(kind === "web server" && paceIn(look.docs) !== undefined && { mostPerSecond: paceIn(look.docs)! }),
    spell: []
  }
}

/** A pace its docs ask for, in requests a second:  the Met Museum's "Please limit request rate to 80 requests per second". */
const PACE_IN_DOCS = /\b(\d+) requests? (?:per|a|each) second\b/i

/** The most requests a second its docs ask for (epic `data` P34):  `undefined` when they name none, or there are none. */
export function paceIn(docs: string | undefined): number | undefined {
  const most = Number(PACE_IN_DOCS.exec(docs ?? "")?.[1])
  return most > 0 ? most : undefined
}

/**
 * How often a program may ask what changed, and keep within the rate limit its answers name:
 * `USUAL_CHECK_SECONDS`, or less often.
 * - A check asks each collection once, and takes at most a tenth of its limit, over the hour most limits are for,
 *   or the window its answers name:
 *   GitHub's 60 an hour with no key is a check every half hour, for three collections;  its 5000 with one, the usual.
 */
export function checkSecondsWithin(headers: Record<string, string>, collections: number): number {
  const limit = Number(headers["x-ratelimit-limit"] ?? headers["ratelimit-limit"])
  if (!(limit > 0)) return USUAL_CHECK_SECONDS
  // a limit for a window it names, Open-Meteo's 600 a minute (`x-ratelimit-window: 60`), else for an hour
  const window = Number(headers["x-ratelimit-window"])
  const seconds = ((window > 0 ? window : HOUR_SECONDS) * Math.max(collections, 1)) / (limit * SHARE_OF_LIMIT)
  return seconds <= USUAL_CHECK_SECONDS ? USUAL_CHECK_SECONDS : Math.ceil(seconds / 60) * 60
}

/** One collection's description. */
function describeCollection(look: CollectionLook, type: string): CollectionDescription {
  const fields = fieldsOf(look.rows)
  const id = look.idAt ?? (look.samples && nameFieldOf(look.rows, look.samples)) ?? idFieldOf(look.rows, fields)
  // an `id` that isn't its id (it's known by its address) is a number it has, as every thing has an id already:
  // PokéAPI's pikachu is number 25
  const own = fields[ID_FIELDS[0]!]
  if (own && id !== ID_FIELDS[0] && !Object.values(fields).some(({ words }) => words === "number")) own.words = "number"
  return {
    type,
    at: look.at,
    rowsSeen: look.rows.length,
    ...(look.rowsItSays !== undefined && { rowsItSays: look.rowsItSays }),
    ...(id !== undefined && { idField: id }),
    ...(id !== undefined && fields[id]?.type === "link" && { idIsAnAddress: true }),
    paging: look.paging,
    ...(look.rowsAt !== undefined && { rowsAt: look.rowsAt }),
    ...(look.nextAt !== undefined && { nextAt: look.nextAt }),
    ...(look.listsGive && { listsGive: look.listsGive }),
    ...(look.takesLimit !== undefined && { takesLimit: look.takesLimit }),
    ...(look.samples && { samples: look.samples }),
    ...(look.searchedBy && { searchedBy: look.searchedBy }),
    ...(look.searchedOnly && { searchedOnly: true }),
    ...(look.searchedFor !== undefined && { searchedFor: look.searchedFor }),
    ...(look.askedBy && { askedBy: look.askedBy }),
    fields
  }
}

/** How deep it reads objects inside objects:  `sprites`, its `other`, that's `official-artwork`. */
const DEEPEST_INSIDE = 3

/**
 * Each field of `rows`, and what it holds, from every row read.
 * - A `{ name, url }` is a link, by its address:  what PokéAPI's rows point at each other with (`core.linked()` reads both).
 *   Marked `isNamedLink`:  one to a collection nobody asked for is held whole, its name and address (epic `data` I47).
 * - A field holding an object, or a list of them, is the fields inside it:  a type of its own in the Spell.
 *   No deeper than `DEEPEST_INSIDE`:  past that it's left out.
 */
export function fieldsOf(rows: ReadonlyArray<Record<string, unknown>>, depth = 0): Record<string, FieldDescription> {
  const fields = fieldsOfRows(rows, depth)
  const taken = (words: string) => Object.values(fields).some((field) => field.words === words)
  // inside another, an `id` is a number it has:  every thing has an id of its own already, Wikipedia's `namespace`
  const own = fields[ID_FIELDS[0]!]
  if (depth && own && !taken("number")) own.words = "number"
  // every thing has a type already:  Wikipedia's `"type": "standard"` is a kind
  const type = fields[TYPE_FIELD]
  if (type && !taken("kind")) type.words = "kind"
  noteUnits(rows, fields)
  return fields
}

/** A field naming the units of another's fields:  Open-Meteo's `hourly_units`, of its `hourly`. */
const UNITS_FIELD = /^(.+?)[_ ]?units$/i

/** The words that end a measure's name, saying how high it's measured:  `temperature 2m`, `wind speed 10m`. */
const MEASURED_AT = / \d+ ?m$/

/**
 * SIDE EFFECT:  each field inside another that a field of units names has its unit,
 * and the units field is left out (epic `data` P33):
 * Open-Meteo's `"hourly_units": { "temperature_2m": "°C" }`, of its `hourly`.
 * - A measure's words lose how high it's measured, when nothing else has the same:  `temperature 2m` is `temperature`.
 */
function noteUnits(rows: ReadonlyArray<Record<string, unknown>>, fields: Record<string, FieldDescription>): void {
  for (const [name, field] of Object.entries(fields)) {
    const of = UNITS_FIELD.exec(name)?.[1]
    const inside = of === undefined ? undefined : fields[of]?.inside
    if (!inside) continue
    const units = rows.map((row) => row[name]).find(isObject) as Record<string, unknown> | undefined
    let named = 0
    for (const [inner, unit] of Object.entries(units ?? {})) {
      const measured = inside[inner]
      if (!measured || measured.type !== "number" || typeof unit !== "string" || !unit.trim()) continue
      measured.unit = unit
      named++
      const words = measured.words.replace(MEASURED_AT, "")
      if (words !== measured.words && !Object.values(inside).some((other) => other.words === words)) {
        measured.words = words
      }
    }
    if (!named) continue
    delete field.inside
    field.unitsOf = of
    field.leftOut = `Its units are each on the field it names, in "${of}":  \`its "temperature" is a temperature in °C\`.`
  }
}

/**
 * What a program calls lists side by side by the time each is for:  `hourly` => `hours`, as the things they make are hours.
 * - Anything else keeps its words.
 */
const SIDE_BY_SIDE_WORDS: Readonly<Record<string, string>> = {
  hourly: "hours",
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years"
}

/** Is this an object of lists side by side:  every field a list, all the same length, two fields or more? */
function isListsSideBySide(value: unknown): boolean {
  if (!isObject(value)) return false
  const lists = Object.values(value as Record<string, unknown>)
  if (lists.length < 2 || !lists.every(Array.isArray)) return false
  const length = (lists[0] as unknown[]).length
  return length > 0 && lists.every((list) => (list as unknown[]).length === length)
}

/** Lists side by side as the rows they make, each the items at one place in all of them:  as the core reads them. */
function rowsSideBySide(value: unknown): Array<Record<string, unknown>> {
  const lists = Object.entries(value as Record<string, unknown[]>)
  return lists[0]![1].map((_, at) => Object.fromEntries(lists.map(([field, list]) => [field, list[at]])))
}

/** A field every thing has already, whatever a place says:  its type. */
const TYPE_FIELD = "type"

/** Each field of `rows`:  see `fieldsOf()`. */
function fieldsOfRows(rows: ReadonlyArray<Record<string, unknown>>, depth: number): Record<string, FieldDescription> {
  const names = new Set(rows.flatMap((row) => Object.keys(row)))
  return Object.fromEntries(
    [...names].map((name) => {
      const values = rows.map((row) => linkIn(row[name])).filter((value) => value !== null && value !== undefined)
      const words = wordsFor(name)
      // lists side by side, each item one place in all of them:  Open-Meteo's hours
      if (values.length && values.every(isListsSideBySide)) {
        if (depth >= DEEPEST_INSIDE) return [name, { words, type: "inside", leftOut: TOO_DEEP }]
        const inside = fieldsOf(values.flatMap(rowsSideBySide), depth + 1)
        return [
          name,
          {
            words: SIDE_BY_SIDE_WORDS[words] ?? words,
            type: "inside",
            ...exampleOf(values),
            inside,
            isListInside: true,
            isSideBySide: true
          }
        ]
      }
      if (values.length && values.every(isObject)) {
        if (depth >= DEEPEST_INSIDE) return [name, { words, type: "inside", leftOut: TOO_DEEP }]
        if (values.every(isKeyedMap)) return [name, { words, type: "inside", leftOut: KEYED_MAP }]
        // a map by a code, REST Countries' `"currencies": { "EUR": { ... } }`:  a list of things, each with its code
        if (isMapByCode(values as Record<string, unknown>[])) {
          const inside = fieldsOf(values.flatMap(rowsOfMapByCode), depth + 1)
          return [name, { words, type: "inside", ...exampleOf(values), inside, isListInside: true, isByCode: true }]
        }
        const inside = fieldsOf(values as Record<string, unknown>[], depth + 1)
        return [name, { words, ...kindOf(values), ...exampleOf(values), inside: withItselfInside(inside) }]
      }
      const items = values.every(Array.isArray) ? (values as unknown[][]).flat() : []
      if (items.length && items.every(isObject)) {
        if (depth >= DEEPEST_INSIDE) return [name, { words, type: "inside", leftOut: TOO_DEEP }]
        const inside = fieldsOf(items as Record<string, unknown>[], depth + 1)
        return [
          name,
          { words, ...kindOf(values), ...exampleOf(values), inside: withItselfInside(inside), isListInside: true }
        ]
      }
      const kind = kindOf(values)
      // a yes or no named `is_hidden` is `its "hidden"`:  what's read as `if it is hidden`
      const yesOrNo = kind.type === "yes or no" ? /^(?:is|has) (.+)$/.exec(words)?.[1] : undefined
      const named = isLinkKind(kind.type) && holdsNamedLinks(rows.map((row) => row[name]))
      return [name, { words: yesOrNo ?? words, ...kind, ...exampleOf(values), ...(named && { isNamedLink: true }) }]
    })
  )
}

/** Why an object that's a map by key is left out. */
const KEYED_MAP = "It's a map by name, each key its own:  read it by hand, a type of its own."

/** The fewest keys that make an object a map by name, not a thing of fields. */
const FEWEST_MAP_KEYS = 4

/**
 * Is this object a map by name, its keys all one word and another, each holding a thing:
 *   PokéAPI's `versions`, `generation-i` ... `generation-ix`.
 * - Each would be a type of its own in the Spell, which says nothing a person needs.
 */
function isKeyedMap(value: unknown): boolean {
  const keys = Object.keys(value as object)
  if (keys.length < FEWEST_MAP_KEYS) return false
  // a map holds things by name;  a thing's fields hold values, `front default`, `front shiny`
  if (!Object.values(value as object).every(isObject)) return false
  const firsts = new Set(keys.map((key) => wordsFor(key).split(" ")[0]))
  return firsts.size === 1 && keys.every((key) => wordsFor(key).includes(" "))
}

/** A key that's a code:  two to four letters, all one case, `EUR` or `fra`. */
const IS_CODE = /^(?:[A-Z]{2,4}|[a-z]{2,4})$/

/** The fewest codes a map holds in a row, keys the same in each, that make it a map by code:  a thing of two fields isn't. */
const FEWEST_CODES = 4

/** What a map by code's plain value is, beside its code:  REST Countries' `"languages": { "fra": "French" }`. */
const BY_CODE_VALUE = "name"

/**
 * Is each of `values`, one field of every row, a map by a code (epic `data` P35)?
 * REST Countries' currencies by their code, `{ "EUR": { "name": "Euro", "symbol": "€" } }`,
 * its languages, `{ "fra": "French" }`, its names in each, `{ "fra": { ... } }`.
 * - Every key a code (`IS_CODE`), every value text, or a thing of the same fields.
 * - The codes differ from row to row, or there are `FEWEST_CODES` or more:
 *   a thing's few fields, `{ "lat": ..., "lng": ... }`, are the same in every row, and hold numbers.
 * - Each would be a type of its own in the Spell, one per code:  it's a list of things, each with its `code`.
 */
function isMapByCode(values: ReadonlyArray<Record<string, unknown>>): boolean {
  const codes = new Set(values.flatMap((value) => Object.keys(value)))
  if (!codes.size || ![...codes].every((code) => IS_CODE.test(code))) return false
  const held = values.flatMap((value) => Object.values(value))
  const shapes = new Set(held.map(shapeOf))
  if (shapes.size !== 1 || shapes.has("number") || shapes.has("boolean")) return false
  const most = Math.max(...values.map((value) => Object.keys(value).length))
  return codes.size > most || codes.size >= FEWEST_CODES
}

/** What a value is, to tell a map's values apart:  the fields it has, or its kind. */
function shapeOf(value: unknown): string {
  return isObject(value)
    ? Object.keys(value as object)
        .sort()
        .join("\n")
    : typeof value
}

/** A map by code's things, each its code and what it holds:  as the core reads them, `rowsOfMapByCode()` in its places. */
function rowsOfMapByCode(value: unknown): Array<Record<string, unknown>> {
  return Object.entries(value as Record<string, unknown>).map(([code, held]) =>
    isObject(held) ? { code, ...(held as object) } : { code, [BY_CODE_VALUE]: held }
  )
}

/**
 * `inside`, each field in it that holds what holds it marked so:  PokéAPI's chain, whose `evolves_to` is a list of chains.
 * - Its fields are its owner's, so it's its owner's type, not one of its own.
 */
function withItselfInside(inside: Record<string, FieldDescription>): Record<string, FieldDescription> {
  const shape = Object.keys(inside).sort().join("\n")
  for (const field of Object.values(inside)) {
    if (!field.inside || Object.keys(field.inside).sort().join("\n") !== shape) continue
    delete field.inside
    field.isItsOwner = true
  }
  return inside
}

/** Why a field past `DEEPEST_INSIDE` is left out. */
const TOO_DEEP = "It's too far inside others:  read it by hand, a type of its own."

/** Is this one object, of fields? */
function isObject(value: unknown): boolean {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/** A `{ name, url }`, or a list of them, as its address:  anything else as it is. */
function linkIn(value: unknown): unknown {
  if (Array.isArray(value)) return value.every(isNamedLink) ? value.map((each) => (each as { url: string }).url) : value
  return isNamedLink(value) ? (value as { url: string }).url : value
}

/** Is this kind an address, or a list of them? */
function isLinkKind(type: FieldKind): boolean {
  return type === "link" || type === "list of links"
}

/**
 * Do `values`, a field of each row, hold links with their names, PokéAPI's `{ name, url }`, or lists of them:
 * not only addresses, swapi's `"https://..."`?
 */
function holdsNamedLinks(values: readonly unknown[]): boolean {
  const held = values.flat().filter((value) => value !== null && value !== undefined)
  return held.length > 0 && held.every(isNamedLink)
}

/** Is this a link with its name, PokéAPI's way:  `{ "name": "pikachu", "url": "https://..." }`? */
function isNamedLink(value: unknown): boolean {
  if (!isObject(value)) return false
  const { url, ...rest } = value as Record<string, unknown>
  return typeof url === "string" && IS_LINK.test(url) && Object.keys(rest).every((key) => key === "name")
}

/** A real value, kept short. */
function exampleOf(values: readonly unknown[]): { example?: unknown } {
  const value = values.find((each) => each !== "" && !(Array.isArray(each) && !each.length))
  if (value === undefined) return {}
  if (typeof value === "string") return { example: value.slice(0, LONGEST_EXAMPLE) }
  if (Array.isArray(value)) return { example: value.slice(0, 2) }
  if (typeof value === "object") return { example: JSON.stringify(value).slice(0, LONGEST_EXAMPLE) }
  return { example: value }
}

/** What `values`, none of them empty, hold:  all of them have to agree, or it's text. */
function kindOf(
  values: readonly unknown[]
): Pick<FieldDescription, "type" | "writtenAsText" | "noNumberWords" | "decimalComma"> {
  if (!values.length) return { type: "nothing" }
  if (values.every((value) => typeof value === "number")) return { type: "number" }
  if (values.every((value) => typeof value === "boolean")) return { type: "yes or no" }
  if (values.every(Array.isArray)) {
    const items = (values as unknown[][]).flat()
    if (items.some((item) => item && typeof item === "object")) return { type: "inside" }
    if (items.length && items.every((item) => typeof item === "string" && IS_LINK.test(item))) {
      return { type: "list of links" }
    }
    return {
      type: items.length && items.every((item) => typeof item === "number") ? "list of numbers" : "list of text"
    }
  }
  if (values.some((value) => value && typeof value === "object")) return { type: "inside" }
  if (!values.every((value) => typeof value === "string")) return { type: "text" }
  return kindOfTexts(values as string[])
}

/** A code written in digits, which a number would change:  a leading zero, `004`, or a plus, `+1`. */
const IS_DIGIT_CODE = /^(?:0\d+|\+\d+)$/

/** What `texts` hold:  an address, a date, a number written as text, or just text. */
function kindOfTexts(
  texts: readonly string[]
): Pick<FieldDescription, "type" | "writtenAsText" | "noNumberWords" | "decimalComma"> {
  const filled = texts.filter((text) => text.trim())
  if (filled.length && filled.every((text) => IS_LINK.test(text))) return { type: "link" }
  if (filled.length && filled.every((text) => IS_DATE.test(text))) return { type: "date" }
  // a code in digits keeps what a number would lose (epic `data` P35):  REST Countries' `"ccn3": "004"`, `"root": "+1"`
  if (filled.some((text) => IS_DIGIT_CODE.test(text))) return { type: "text" }
  const noNumberWords = [...new Set(filled.filter((text) => NO_NUMBER.test(text)))]
  const numbers = filled.filter((text) => numberInText(text) !== undefined)
  if (numbers.length && numbers.length + filled.filter((text) => NO_NUMBER.test(text)).length === filled.length) {
    return {
      type: "number",
      writtenAsText: true,
      ...(noNumberWords.length && { noNumberWords }),
      ...(decimalMarkIn(numbers) === "," && { decimalComma: true })
    }
  }
  return { type: "text" }
}

/**
 * The field that says which row is which:  every row has one, and no two the same.
 * - The usual names first, then an address, as swapi.info's rows have only `url`.
 * - `undefined` when no field does:  rows share no identity.
 */
export function idFieldOf(
  rows: ReadonlyArray<Record<string, unknown>>,
  fields: Readonly<Record<string, FieldDescription>>
): string | undefined {
  const isUnique = (name: string) => {
    const values = rows.map((row) => row[name])
    return (
      values.every((value) => (typeof value === "string" && value !== "") || typeof value === "number") &&
      new Set(values).size === values.length
    )
  }
  const usual = ID_FIELDS.find((name) => name in fields && isUnique(name))
  return (
    usual ??
    ADDRESS_FIELDS.find((name) => fields[name]?.type === "link" && isUnique(name)) ??
    Object.keys(fields).find((name) => fields[name]?.type === "link" && isUnique(name))
  )
}

/**
 * The field holding the name each row was found by, for a collection found by name:  Wikipedia's `title`.
 * - It's the row's id:  a thing found by its name is the same thing as the one with that name.
 * - Matched by its words, `Luke_Skywalker` as `Luke Skywalker`;  `undefined` when no field holds them all.
 */
function nameFieldOf(rows: ReadonlyArray<Record<string, unknown>>, samples: readonly string[]): string | undefined {
  const words = (value: unknown) => `${value}`.replace(/_/g, " ").toLowerCase()
  const fields = Object.keys(rows[0] ?? {})
  return fields.find((field) => rows.every((row, at) => words(row[field]) === words(samples[at])))
}

/** SIDE EFFECT:  each link of `collection` says which collection it goes to, where it's under one's address. */
function findLinks(
  collection: Pick<CollectionDescription, "fields">,
  collections: Readonly<Record<string, CollectionDescription>>,
  address: string
): void {
  for (const field of Object.values(collection.fields)) {
    if (field.inside) findLinks({ fields: field.inside }, collections, address)
    if (field.type !== "link" && field.type !== "list of links") continue
    const link = [field.example].flat()[0]
    if (typeof link !== "string") continue
    // one of its rows' own addresses, not something under one:
    // `/pokemon/25/`, never `/pokemon/25/encounters`;
    // its address with or without the slash it ends in, swapi's `/people/`
    const target = Object.entries(collections).find(([, { at }]) => {
      const under = `${address}${at.replace(/\/+$/, "")}/`
      return at && link.startsWith(under) && /^[^/]+\/?$/.test(link.slice(under.length))
    })
    if (target) field.linksTo = target[0]
  }
}

/** A field's name that says it holds another's id:  `author_key`, `cover_edition_key`, `owner_id`. */
const ID_WORDS = / (?:keys?|ids?)$/

/**
 * SIDE EFFECT:  each field of `collection` holding the id of a thing found by name, or a list of them, links to it:
 * Open Library's book's `author_key`, `["OL79034A"]`, the authors found at `/authors/{name}.json` (epic `data` P29).
 * - Known by the names that collection was read by:  some row here holds one of them.
 * - Named for what it links to, as its name only says it's an id:  `author key` is the book's `authors`,
 *   `cover edition key` its `cover edition`, when nothing else has those words.
 */
function findIdLinks(
  rows: ReadonlyArray<Record<string, unknown>>,
  collection: CollectionDescription,
  collections: Readonly<Record<string, CollectionDescription>>
): void {
  const named = Object.entries(collections).filter(([, { samples }]) => samples?.length)
  for (const [name, field] of Object.entries(collection.fields)) {
    if ((field.type !== "text" && field.type !== "list of text") || field.linksTo) continue
    const values = new Set(rows.flatMap((row) => [row[name]].flat()).filter((value) => typeof value === "string"))
    const target = named.find(
      ([, { samples, type }]) => type !== collection.type && samples!.some((one) => values.has(one))
    )
    if (!target) continue
    field.linksTo = target[0]
    const base = field.words.replace(ID_WORDS, "")
    if (base === field.words) continue
    const words = field.type === "list of text" ? P.pluralize(base) : base
    if (!Object.values(collection.fields).some((each) => each.words === words)) field.words = words
  }
}

/**
 * SIDE EFFECT:  each collection says the lists it keeps under each of its things,
 * by the collection each is of (epic `data` P30):  a post's comments, `{ comments: "/posts/{id}/comments" }`.
 */
function noteListsUnder(
  { collections: looks, listsUnder = [] }: PlaceLook,
  collections: Record<string, CollectionDescription>,
  placeName: string
): void {
  const named = (lookName: string) => collectionNameFor(typeWordsFor(lookName, placeName))
  const known = new Set(looks.map(({ name }) => name))
  for (const { owner, list, at } of listsUnder) {
    const description = collections[named(owner)]
    if (!description || !known.has(list) || !collections[named(list)]) continue
    description.listsUnder = { ...description.listsUnder, [named(list)]: at }
  }
}

/** What a look shows the place can do. */
function canDoFrom({ headers, writesOffered, docs }: PlaceLook, kind: string): PlaceDescription["canDo"] {
  const methods = headers["access-control-allow-methods"] ?? headers.allow
  const origin = headers["access-control-allow-origin"]
  const limits = Object.entries(headers).filter(([name]) => /rate-?limit|retry-after/i.test(name))
  const limit = headers["x-ratelimit-limit"] ?? headers["ratelimit-limit"]
  return {
    read: "Yes:  it's been read.",
    write: writeWords(kind, methods, writesOffered),
    live: "It doesn't say what changed:  a program asks again, as often as its line says.",
    limits: limits.length
      ? `${limit ? `It allows ${limit} requests until its limit resets, and its answers say how many are left and when:  a look minds it, and a program checks for changes within a tenth of it.  ` : ""}${limits.map(([name, value]) => `${name}:  ${value}`).join(";  ")}`
      : paceIn(docs) !== undefined
        ? `Its docs ask for at most ${paceIn(docs)} requests a second, and a program keeps to that;  its answers name none.`
        : "It named none in its answers.",
    browsers: origin
      ? `Yes:  it says ${origin === "*" || origin === READER_ORIGIN ? "any page" : `a page from ${origin}`} may read it.`
      : "Not from a page on another address, as far as it says:  it sends no access-control header, so a page needs a server side in front."
  }
}

/** What it seems to say about writes, never having tried one. */
function writeWords(kind: string, methods: string | undefined, offered: readonly string[] | undefined): string {
  if (offered) return offered.length ? `It offers ${offered.join(", ")}.  Never tried.` : "It offers none."
  if (kind === "sheet") return "No:  a CSV file at an address is read only, unless a place server's in front."
  if (!methods) return "Nothing says:  never tried."
  return /POST|PUT|PATCH|DELETE/i.test(methods)
    ? `It says it takes ${methods}.  Never tried.`
    : `It says it takes only ${methods}, so it seems read only.  Never tried.`
}

/**
 * What the program calls this place, from its address:  `https://swapi.info/api` => `swapi`.
 * - The name a person gives, or the agent's, goes over it.
 */
export function plainNameFor(address: string, kind: string): string {
  if (kind === "sheet" || kind === "google sheet") {
    const file = /([^/?#]+?)(?:\.csv|\.xlsx)?(?:[?#].*)?$/i.exec(address)?.[1]
    return `${wordsFor(file ?? "recipes")} sheet`
  }
  try {
    const labels = new URL(address).hostname.split(".").filter((label) => !/^(?:www|api|docs|graphql)$/i.test(label))
    const name = labels.length > 1 ? labels.slice(0, -1).join(" ") : (labels[0] ?? "")
    if (/^(?:localhost|127|\d+)/.test(name) || !name) return "local server"
    return wordsFor(name)
  } catch {
    return `${wordsFor(address.replace(/\W+/g, " ").trim())} place`
  }
}

/** A source's name for a field, as words a person writes:  `hair_color`, `hairColor` => `hair color`. */
export function wordsFor(name: string): string {
  return name
    .replace(/(\p{Ll}|\d)(\p{Lu})/gu, "$1 $2")
    .replace(/[_\-.\s]+/g, " ")
    .trim()
    .toLowerCase()
}

/**
 * A collection's name, as a type's words:  `life_forms` => `life form`, `people` => `person`.
 * - Where that's one of Spell's own types, it says whose:  `dates` of `swapi` => `swapi date`, as `date` is Spell's.
 */
export function typeWordsFor(name: string, placeName: string): string {
  const words = wordsFor(name).split(" ")
  words[words.length - 1] = P.singularize(words[words.length - 1]!)
  const type = words.join(" ")
  return isSpellsOwnType(type) ? `${placeName} ${type}` : type
}

/** Is this one of the types Spell has by itself, which a program can't declare:  `letter`, `date`, `view`? */
export function isSpellsOwnType(words: string): boolean {
  return /^\p{Ll}/u.test(`${SP.typeName(words)}`)
}

/**
 * A short hash of the shape of what it saw:  each collection, field and what it holds.
 * - Two looks that saw the same shape say the same, whatever rows came back:  what says a source changed, as many name no version.
 * - Asynchronous:  it's the browser's own hashing, and node's.
 */
export async function fingerprintOf({ collections }: Pick<PlaceDescription, "collections">): Promise<string> {
  const lines = Object.entries(collections).flatMap(([name, { fields }]) =>
    Object.entries(fields).map(([field, { type }]) => `${name}.${field}:${type satisfies FieldKind}`)
  )
  const bytes = new TextEncoder().encode(lines.sort().join("\n"))
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(hash)]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
