import { decimalMarkIn, NO_NUMBER, numberInText } from "spell/util/places/places.types"
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
  for (const each of look.collections) {
    const type = typeWordsFor(each.name, name)
    collections[collectionNameFor(type)] = describeCollection(each, type)
  }
  for (const collection of Object.values(collections)) findLinks(collection, collections, look.address)
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
    spellCantSay: [],
    ...(kind === "web server" || kind === "graphql server"
      ? { checkEverySeconds: checkSecondsWithin(look.headers, Object.keys(collections).length) }
      : {}),
    spell: []
  }
}

/**
 * How often a program may ask what changed, and keep within the rate limit its answers name:  `USUAL_CHECK_SECONDS`, or less often.
 * - A check asks each collection once, and takes at most a tenth of its limit, over the hour most limits are for:
 *   GitHub's 60 an hour with no key is a check every half hour, for three collections;  its 5000 with one, the usual.
 */
export function checkSecondsWithin(headers: Record<string, string>, collections: number): number {
  const limit = Number(headers["x-ratelimit-limit"] ?? headers["ratelimit-limit"])
  if (!(limit > 0)) return USUAL_CHECK_SECONDS
  const seconds = (HOUR_SECONDS * Math.max(collections, 1)) / (limit * SHARE_OF_LIMIT)
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
    fields
  }
}

/** How deep it reads objects inside objects:  `sprites`, its `other`, that's `official-artwork`. */
const DEEPEST_INSIDE = 3

/**
 * Each field of `rows`, and what it holds, from every row read.
 * - A `{ name, url }` is a link, by its address:  what PokéAPI's rows point at each other with (`core.linked()` reads both).
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
  return fields
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
      if (values.length && values.every(isObject)) {
        if (depth >= DEEPEST_INSIDE) return [name, { words, type: "inside", leftOut: TOO_DEEP }]
        if (values.every(isKeyedMap)) return [name, { words, type: "inside", leftOut: KEYED_MAP }]
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
      return [name, { words: yesOrNo ?? words, ...kind, ...exampleOf(values) }]
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

/** What `texts` hold:  an address, a date, a number written as text, or just text. */
function kindOfTexts(
  texts: readonly string[]
): Pick<FieldDescription, "type" | "writtenAsText" | "noNumberWords" | "decimalComma"> {
  const filled = texts.filter((text) => text.trim())
  if (filled.length && filled.every((text) => IS_LINK.test(text))) return { type: "link" }
  if (filled.length && filled.every((text) => IS_DATE.test(text))) return { type: "date" }
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
    // one of its rows' own addresses, not something under one:  `/pokemon/25/`, never `/pokemon/25/encounters`
    // its address with or without the slash it ends in, swapi's `/people/`
    const target = Object.entries(collections).find(([, { at }]) => {
      const under = `${address}${at.replace(/\/+$/, "")}/`
      return at && link.startsWith(under) && /^[^/]+\/?$/.test(link.slice(under.length))
    })
    if (target) field.linksTo = target[0]
  }
}

/** What a look shows the place can do. */
function canDoFrom({ headers, writesOffered }: PlaceLook, kind: string): PlaceDescription["canDo"] {
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
      : "It named none in its answers.",
    browsers: origin
      ? `Yes:  it says ${origin === "*" ? "any page" : `a page from ${origin}`} may read it.`
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
    const file = /([^/?#]+?)(?:\.csv)?(?:[?#].*)?$/i.exec(address)?.[1]
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
