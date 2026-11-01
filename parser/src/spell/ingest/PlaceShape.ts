import { NO_NUMBER, NUMBER_AS_TEXT } from "spell/util/places/places.types"
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
    ...(kind === "web server" || kind === "graphql server" ? { checkEverySeconds: USUAL_CHECK_SECONDS } : {}),
    spell: []
  }
}

/** One collection's description. */
function describeCollection(look: CollectionLook, type: string): CollectionDescription {
  const fields = fieldsOf(look.rows)
  const id = idFieldOf(look.rows, fields)
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
    fields
  }
}

/** Each field of `rows`, and what it holds, from every row read. */
export function fieldsOf(rows: ReadonlyArray<Record<string, unknown>>): Record<string, FieldDescription> {
  const names = new Set(rows.flatMap((row) => Object.keys(row)))
  return Object.fromEntries(
    [...names].map((name) => {
      const values = rows.map((row) => row[name]).filter((value) => value !== null && value !== undefined)
      return [name, { words: wordsFor(name), ...kindOf(values), ...exampleOf(values) }]
    })
  )
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
function kindOf(values: readonly unknown[]): Pick<FieldDescription, "type" | "writtenAsText" | "noNumberWords"> {
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
function kindOfTexts(texts: readonly string[]): Pick<FieldDescription, "type" | "writtenAsText" | "noNumberWords"> {
  const filled = texts.filter((text) => text.trim())
  if (filled.length && filled.every((text) => IS_LINK.test(text))) return { type: "link" }
  if (filled.length && filled.every((text) => IS_DATE.test(text))) return { type: "date" }
  const noNumberWords = [...new Set(filled.filter((text) => NO_NUMBER.test(text)))]
  const numbers = filled.filter((text) => NUMBER_AS_TEXT.test(text))
  if (numbers.length && numbers.length + filled.filter((text) => NO_NUMBER.test(text)).length === filled.length) {
    return { type: "number", writtenAsText: true, ...(noNumberWords.length && { noNumberWords }) }
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

/** SIDE EFFECT:  each link of `collection` says which collection it goes to, where it's under one's address. */
function findLinks(
  collection: CollectionDescription,
  collections: Readonly<Record<string, CollectionDescription>>,
  address: string
): void {
  for (const field of Object.values(collection.fields)) {
    if (field.type !== "link" && field.type !== "list of links") continue
    const link = [field.example].flat()[0]
    if (typeof link !== "string") continue
    const target = Object.entries(collections).find(([, { at }]) => at && link.startsWith(`${address}${at}/`))
    if (target) field.linksTo = target[0]
  }
}

/** What a look shows the place can do. */
function canDoFrom({ headers, writesOffered }: PlaceLook, kind: string): PlaceDescription["canDo"] {
  const methods = headers["access-control-allow-methods"] ?? headers.allow
  const origin = headers["access-control-allow-origin"]
  const limits = Object.entries(headers).filter(([name]) => /rate-?limit|retry-after/i.test(name))
  return {
    read: "Yes:  it's been read.",
    write: writeWords(kind, methods, writesOffered),
    live: "It doesn't say what changed:  a program asks again, as often as its line says.",
    limits: limits.length
      ? limits.map(([name, value]) => `${name}:  ${value}`).join(";  ")
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
 * - Where that's one of Spell's own types, it says whose:  `characters` of `swapi` => `swapi character`, as `character` is a letter.
 */
export function typeWordsFor(name: string, placeName: string): string {
  const words = wordsFor(name).split(" ")
  words[words.length - 1] = P.singularize(words[words.length - 1]!)
  const type = words.join(" ")
  return isSpellsOwnType(type) ? `${placeName} ${type}` : type
}

/** Is this one of the types Spell has by itself, which a program can't declare:  `character`, `date`, `view`? */
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
