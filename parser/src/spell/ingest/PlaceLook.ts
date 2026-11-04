import { parseCsv } from "spell/util/places/csv"
import { googleSheetCsvAddress } from "spell/util/places/places.types"

import {
  IngestStopped,
  type CollectionLook,
  type IngestAsk,
  type PagingSeen,
  type PlaceLook,
  type SearchSeen
} from "./ingest.types"
import { keptHeaders, PoliteReader, type ReadAnswer } from "./PoliteReader"

/** How many collections it reads:  a source with more says so, and `--collections` names the ones wanted. */
const MOST_COLLECTIONS = 12

/** How many pages of each it reads. */
const MOST_PAGES = 3

/** How much of a source's docs it keeps. */
const MOST_DOCS_CHARS = 8000

/** The fields a wrapped list usually keeps its rows in. */
const ROWS_FIELDS = ["results", "data", "items", "records", "rows"]

/** The fields an answer usually says its next page in. */
const NEXT_FIELDS = ["next", "next_url", "nextUrl", "nextPage", "next_page", "links.next", "paging.next"]

/** The query parameters a server usually searches with, tried in order. */
const SEARCH_PARAMS = ["search", "q"]

/** The fields a search usually looks in, tried in order. */
const SEARCHED_FIELDS = ["name", "title"]

/** The fields an answer usually says how many there are in. */
const COUNT_FIELDS = ["count", "total", "total_count", "totalCount"]

/** A `<...>; rel="next"` in a `Link` header. */
const NEXT_LINK = /<([^>]+)>\s*;[^,]*\brel="?next"?/

/** Where docs usually are, under the address and under the server. */
const DOCS_PATHS = ["/openapi.json", "/swagger.json", "/docs", "/documentation"]

/** A version in an address:  `/v2`, `/2.1/`. */
const VERSION_IN_ADDRESS = /\/(v\d+(?:\.\d+)*)(?:\/|$)/i

/** The headers that say a version. */
const VERSION_HEADER = /^(?:x-)?api-version$|^[a-z]+-version$/i

/** An address anyone can fetch. */
export const IS_WEB_ADDRESS = /^(?:https?|file):/i

/** What each kind's look needs. */
type LookAsk = Pick<IngestAsk, "address" | "docs" | "collections" | "samples"> & {
  /** Reads it. */
  reader: PoliteReader
  /** Looking again:  `collections`, and whatever else it now lists. */
  addListed?: boolean
}

/** The kinds it knows how to look at, and how:  a new kind adds a look here. */
const LOOKS: Readonly<Record<string, (ask: LookAsk) => Promise<PlaceLook>>> = {
  "web server": lookAtWebServer,
  "graphql server": lookAtGraphServer,
  sheet: lookAtSheet,
  "google sheet": ({ address, reader }) => lookAtSheet({ address: googleSheetCsvAddress(address), reader }, address)
}

/** The kinds it can look at. */
export const KINDS_IT_CAN_LOOK_AT: readonly string[] = Object.keys(LOOKS)

/**
 * Look at the place of `kind` at this address, for real:  bounded, polite, and it never writes (`PoliteReader`).
 * - throws `IngestStopped` for a kind it can't look at yet, and for a source that won't answer
 */
export function lookAtPlace(kind: string, ask: LookAsk): Promise<PlaceLook> {
  const look = LOOKS[kind]
  if (!look) {
    throw new IngestStopped(
      `can't look at a ${kind} yet:  only ${KINDS_IT_CAN_LOOK_AT.join(", ")};  write its lines by hand, from the "place" guide's words`
    )
  }
  return look(ask)
}

/**
 * The kind this address names by itself, with no request:  `undefined` for one that has to be asked.
 * - Each is plainly one kind's own address;  anything at a web address has to be looked at.
 */
export function kindReadFrom(address: string): string | undefined {
  if (/^wss?:/i.test(address)) return "room"
  if (/^did:/i.test(address)) return "atmosphere account"
  if (/^app[A-Za-z0-9]{14}$|airtable\.com\//i.test(address)) return "airtable"
  if (/docs\.google\.com\/spreadsheets\//i.test(address)) return "google sheet"
  if (/\.csv(?:[?#]|$)/i.test(address)) return "sheet"
  return undefined
}

/**
 * The kind a request to this address finds:  `undefined` if it can't tell.
 * - `tried` hears each kind it tried, for the question or the stop that follows.
 * - NEVER throws:  no answer tells it nothing.
 */
export async function kindFoundAt(address: string, reader: PoliteReader, tried: string[]): Promise<string | undefined> {
  if (!IS_WEB_ADDRESS.test(address)) return undefined
  tried.push("graphql server", "sheet", "web server")
  try {
    const saysGraph = /graphql|gql/i.test(address)
    if (saysGraph && (await answersGraphQL(address, reader))) return "graphql server"
    const answer = await reader.read(address)
    const contentType = answer.headers.get("content-type") ?? ""
    if (/csv/i.test(contentType)) return "sheet"
    if (answer.status < 400 && /json/i.test(contentType) && !isGraphErrors(answer.text)) return "web server"
    if (!saysGraph && (await answersGraphQL(address, reader))) return "graphql server"
    return answer.status < 400 && isJSON(answer.text) ? "web server" : undefined
  } catch {
    return undefined
  }
}

/** Does it answer a GraphQL query? */
async function answersGraphQL(address: string, reader: PoliteReader): Promise<boolean> {
  const answer = await reader.read(address, { query: "{ __typename }" })
  return answer.status < 400 && !!(jsonOf(answer.text) as { data?: unknown } | undefined)?.data
}

/** Is this the answer a GraphQL server gives a `GET`? */
function isGraphErrors(text: string): boolean {
  const body = jsonOf(text) as { errors?: unknown } | undefined
  return !!body?.errors
}

/** Is this JSON? */
function isJSON(text: string): boolean {
  return jsonOf(text) !== undefined
}

/** The JSON in `text`:  `undefined` if it isn't. */
function jsonOf(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

////////////////
// ## A web server
////////////////

/**
 * A web server:  what it lists, then each list, a few pages of each.
 * - It lists what it holds by answering with their addresses (swapi.info's `{ "films": "https://..." }`), or by its OpenAPI
 *   document;  an address that's a list itself is its one collection, and the place is the address above it.
 * - A source that does neither:  `--collections` names them, or it stops and says so.
 */
async function lookAtWebServer({
  address,
  docs,
  collections,
  samples,
  addListed,
  reader
}: LookAsk): Promise<PlaceLook> {
  const first = await reader.read(address)
  if (!collections?.length) refuseAnswer(address, first)
  const body = jsonOf(first.text)
  const notes: string[] = []
  const found = await docsOf({ address, docs, reader })
  const version = versionOf(address, first.headers) ?? found.version
  let place = address
  let wanted: Array<{ name: string; at: string }> | undefined = collections?.length
    ? collections.map(wantedAt)
    : undefined
  if (wanted && addListed) {
    const known = new Set(wanted.map(({ at }) => at))
    wanted.push(...(listedIn(body, address) ?? []).filter(({ at }) => !known.has(at)))
  }
  if (!wanted && (Array.isArray(body) || wrappedRows(body))) {
    const cut = address.lastIndexOf("/")
    place = address.slice(0, cut)
    wanted = [{ name: address.slice(cut + 1), at: address.slice(cut) }]
  }
  wanted ??= listedIn(body, address) ?? found.listed
  if (!wanted?.length) {
    throw new IngestStopped(
      `${address} doesn't list what it holds, and has no OpenAPI document:  name its collections, --collections recipes,cooks`
    )
  }
  if (wanted.length > MOST_COLLECTIONS) {
    const left = wanted.slice(MOST_COLLECTIONS).map(({ name }) => name)
    notes.push(
      `It holds more than the ${MOST_COLLECTIONS} read here;  --collections names others.  Not read:  ${left.join(", ")}.`
    )
    wanted = wanted.slice(0, MOST_COLLECTIONS)
  }
  const read: CollectionLook[] = []
  for (const { name, at } of wanted) {
    try {
      const look = IS_FOUND_BY_NAME.test(at)
        ? await readFoundByName(place, name, at, samples ?? [], reader)
        : await readCollection(place, name, at, reader)
      if (look.rows.length) read.push(look)
      else notes.push(`"${name}" answered with no rows, so nothing says what it holds:  it's left out.`)
    } catch (error) {
      if (error instanceof IngestStopped && !reader.hasRoom) notes.push(`Stopped before "${name}":  ${error.message}.`)
      else notes.push(`"${name}" couldn't be read:  ${messageOf(error)}.`)
    }
  }
  return {
    address: place,
    collections: read,
    headers: keptHeaders(first.headers),
    ...(found.text !== undefined && { docs: found.text, docsAt: found.at! }),
    ...(version && { version }),
    notes
  }
}

/**
 * A name from `--collections`:  `recipes`, a path, `/v1/recipes`, or a name and a path, `wiki pages=/page/summary/{name}`.
 * - A path with a name in braces, and no name of its own, is named for what's before them:  `/page/summary/{name}` => `summary`.
 */
function wantedAt(given: string): { name: string; at: string } {
  const [named, path = named] = given.includes("=") ? given.split("=", 2) : [undefined, given]
  const at = `/${path!.trim().replace(/^\/+/, "")}`
  const listed = at.replace(/\/\{[^{}]*\}.*$/, "")
  return { name: named?.trim() || listed.slice(listed.lastIndexOf("/") + 1), at }
}

/** A collection found by name, its address saying where the name goes:  `/page/summary/{name}`. */
const IS_FOUND_BY_NAME = /\{[^{}/]*\}/

/** How many names it reads a collection found by name by. */
const MOST_SAMPLES = 5

/**
 * A collection found by name, with no list:  each of `samples` read at its own address.
 * - throws `IngestStopped` with no samples to read it by:  `--samples` names some
 */
async function readFoundByName(
  place: string,
  name: string,
  at: string,
  samples: readonly string[],
  reader: PoliteReader
): Promise<CollectionLook> {
  if (!samples.length) {
    throw new IngestStopped(
      `"${name}" is found by name, with no list:  name a few to read it by, --samples "Tatooine,Hoth"`
    )
  }
  const look: CollectionLook = { name, at, rows: [], paging: "none", pagesRead: 0, hasMore: false, samples: [] }
  for (const sample of samples.slice(0, MOST_SAMPLES)) {
    const url = `${place}${at.replace(IS_FOUND_BY_NAME, encodeURIComponent(sample))}`
    const answer = await reader.read(url)
    const body = answer.status < 400 && !answer.isCut ? jsonOf(answer.text) : undefined
    if (!isRow(body)) continue
    look.rows.push(body)
    look.samples!.push(sample)
    look.pagesRead++
  }
  return look
}

/** Refuse an answer that's no use:  - throws `IngestStopped`, saying what would help */
function refuseAnswer(address: string, { status }: ReadAnswer): void {
  if (status === 401 || status === 403) {
    throw new IngestStopped(
      `${address} answered ${status}:  it wants a key, so name one, --key-secret NAME, read from the environment`
    )
  }
  if (status >= 400) throw new IngestStopped(`${address} answered ${status}:  there's nothing here to read`)
}

/** The collections an index names:  each string that's an address under this one.  `undefined` for anything else. */
function listedIn(body: unknown, address: string): Array<{ name: string; at: string }> | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined
  const listed = Object.entries(body).flatMap(([name, value]) => {
    if (typeof value !== "string" || !value.startsWith(`${address}/`)) return []
    return [{ name, at: value.slice(address.length).replace(/\/+$/, "") }]
  })
  return listed.length ? listed : undefined
}

/** The rows of a wrapped list, and where they are:  `undefined` for anything else. */
function wrappedRows(body: unknown): { rows: unknown[]; rowsAt: string } | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined
  const fields = body as Record<string, unknown>
  const named = ROWS_FIELDS.find((field) => Array.isArray(fields[field]))
  const only = Object.keys(fields).filter((field) => Array.isArray(fields[field]))
  const rowsAt = named ?? (only.length === 1 ? only[0] : undefined)
  return rowsAt === undefined ? undefined : { rows: fields[rowsAt] as unknown[], rowsAt }
}

/** A few pages of one collection. */
async function readCollection(place: string, name: string, at: string, reader: PoliteReader): Promise<CollectionLook> {
  const look: CollectionLook = { name, at, rows: [], paging: "none", pagesRead: 0, hasMore: false }
  let url: string | undefined = `${place}${at}`
  while (url && look.pagesRead < MOST_PAGES) {
    const answer = await reader.read(url)
    refuseAnswer(url, answer)
    if (answer.isCut) throw new TypeError(`its answer is too big to read`)
    const body = jsonOf(answer.text)
    const wrapped = wrappedRows(body)
    const rows = Array.isArray(body) ? body : wrapped?.rows
    if (!rows) throw new TypeError("its answer isn't a list")
    look.pagesRead++
    look.rows.push(...rows.filter(isRow))
    if (wrapped) look.rowsAt = wrapped.rowsAt
    if (look.pagesRead === 1) look.rowsItSays = countIn(body)
    const next = nextPageIn(body, answer.headers)
    if (next) {
      look.paging = next.paging
      if (next.field) look.nextAt = next.field
    }
    url = next?.url && isSameServer(next.url, place) ? next.url : undefined
    look.hasMore = !!url
    if (url && /[?&]limit=\d+/.test(url)) look.takesLimit = true
  }
  if (look.rowsItSays === undefined) delete look.rowsItSays
  if (look.hasMore && !look.takesLimit) look.takesLimit = false
  // searched by the names its list gives, before a summary's rows are read whole
  const searchedBy = await searchOf(`${place}${at}`, look, reader)
  if (searchedBy) look.searchedBy = searchedBy
  const summary = summaryOf(look.rows, place)
  if (summary) {
    const whole = await wholeRowsOf(look.rows, summary.addressField, reader)
    if (whole.length) {
      look.listsGive = summary.given
      look.idAt = summary.addressField
      look.rows = whole
    }
  }
  return look
}

/** How many rows of a list that gives only a little of each it reads whole. */
const MOST_WHOLE_ROWS = 2

/** The most fields a row can have and still be only a summary of its whole:  a name, its address, one more. */
const MOST_SUMMARY_FIELDS = 3

/**
 * Is this list only a summary of each row, its whole at the row's address?  PokéAPI's `{ "name", "url" }`.
 * - Every row has the same few fields, one an address on this server:  `undefined` for anything else.
 */
function summaryOf(
  rows: ReadonlyArray<Record<string, unknown>>,
  place: string
): { addressField: string; given: string[] } | undefined {
  const [first] = rows
  if (!first) return undefined
  const fields = Object.keys(first)
  if (fields.length > MOST_SUMMARY_FIELDS) return undefined
  const same = fields.join("\n")
  if (!rows.every((row) => Object.keys(row).join("\n") === same)) return undefined
  const addressField = fields.find((field) =>
    rows.every((row) => typeof row[field] === "string" && isSameServer(row[field] as string, place))
  )
  if (addressField === undefined) return undefined
  return { addressField, given: fields.filter((field) => field !== addressField) }
}

/**
 * A few of `rows`, each read whole from its address, with what the list gave kept:  what says which fields there are.
 * - NEVER throws:  a row that won't read is left out.
 */
async function wholeRowsOf(
  rows: ReadonlyArray<Record<string, unknown>>,
  addressField: string,
  reader: PoliteReader
): Promise<Array<Record<string, unknown>>> {
  const whole: Array<Record<string, unknown>> = []
  for (const row of rows.slice(0, MOST_WHOLE_ROWS)) {
    try {
      const answer = await reader.read(row[addressField] as string)
      const body = answer.status < 400 && !answer.isCut ? jsonOf(answer.text) : undefined
      if (isRow(body)) whole.push({ ...body, ...row })
    } catch {
      // the next one
    }
  }
  return whole
}

/**
 * How `collection` searches, by trying it:  a word from one row's name, `?search=<word>`, answering fewer rows, every one
 * holding it.  `undefined` when nothing tried narrowed it.
 * - Only reads, through `reader`, as every look does;  a refusal or an answer it can't read is no search.
 */
async function searchOf(url: string, look: CollectionLook, reader: PoliteReader): Promise<SearchSeen | undefined> {
  if (look.rows.length < 2) return undefined
  for (const field of SEARCHED_FIELDS) {
    const word = wordToSearchFor(look.rows, field)
    if (!word) continue
    for (const param of SEARCH_PARAMS) {
      try {
        const answer = await reader.read(`${url}${url.includes("?") ? "&" : "?"}${param}=${encodeURIComponent(word)}`)
        if (answer.status >= 400 || answer.isCut) continue
        const body = jsonOf(answer.text)
        const rows = (Array.isArray(body) ? body : wrappedRows(body)?.rows)?.filter(isRow)
        const found = rows?.length ?? 0
        const isNarrower = found < Math.max(look.rowsItSays ?? 0, look.rows.length)
        const holdsIt = (row: Record<string, unknown>) => textIn(row[field]).toLowerCase().includes(word)
        if (rows && found > 0 && isNarrower && rows.every(holdsIt)) return { param, field }
      } catch (error) {
        if (error instanceof IngestStopped) throw error
      }
    }
  }
  return undefined
}

/** A word of the first row's `field` that not every row read holds:  what a search for it should narrow to. */
function wordToSearchFor(rows: ReadonlyArray<Record<string, unknown>>, field: string): string | undefined {
  const value = rows.map((row) => row[field]).find((each) => typeof each === "string" && each.trim())
  if (typeof value !== "string") return undefined
  const words = value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3)
  return words.find((word) => !rows.every((row) => textIn(row[field]).toLowerCase().includes(word)))
}

/** A field's value as text a search looks in:  anything but text holds none. */
function textIn(value: unknown): string {
  return typeof value === "string" ? value : ""
}

/** Is this a row:  plain fields by name? */
function isRow(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/** How many it says it has. */
function countIn(body: unknown): number | undefined {
  if (!isRow(body)) return undefined
  const count = COUNT_FIELDS.map((field) => body[field]).find((value) => typeof value === "number")
  return count as number | undefined
}

/** Where the next page is:  its field, even empty, says it pages;  else the `Link` header. */
function nextPageIn(body: unknown, headers: Headers): { paging: PagingSeen; field?: string; url?: string } | undefined {
  if (isRow(body)) {
    for (const field of NEXT_FIELDS) {
      const value = valueAtPath(body, field)
      if (value === null || typeof value === "string") {
        return { paging: "next field", field, ...(value && { url: value }) }
      }
    }
  }
  const link = NEXT_LINK.exec(headers.get("link") ?? "")?.[1]
  return link ? { paging: "link header", url: link } : undefined
}

/** What's at a dotted path:  `undefined` when nothing is. */
function valueAtPath(value: unknown, path: string): unknown {
  let at = value
  for (const name of path.split(".")) at = (at as Record<string, unknown> | null | undefined)?.[name]
  return at
}

/** Is `url` on the same server as `place`?  It's never led off to another. */
function isSameServer(url: string, place: string): boolean {
  try {
    return new URL(url).origin === new URL(place).origin
  } catch {
    return false
  }
}

/** The version in an address, or a header. */
function versionOf(address: string, headers: Headers): PlaceLook["version"] {
  const inAddress = VERSION_IN_ADDRESS.exec(address)?.[1]
  if (inAddress) return { says: inAddress, where: "its address" }
  for (const [name, value] of headers.entries()) {
    if (VERSION_HEADER.test(name)) return { says: value, where: `the ${name} header` }
  }
  return undefined
}

/**
 * Its docs, as text, cut short:  an address given, or the usual places.
 * - An OpenAPI document also says its version, and what it holds.
 * - NEVER throws:  docs are a help, not a need.
 */
async function docsOf({ address, docs, reader }: Pick<LookAsk, "address" | "docs" | "reader">): Promise<{
  text?: string
  at?: string
  version?: PlaceLook["version"]
  listed?: Array<{ name: string; at: string }>
}> {
  const origin = new URL(address.replace(/^file:/, "http:")).origin
  const places = docs
    ? [docs]
    : [...DOCS_PATHS.map((path) => `${address}${path}`), ...DOCS_PATHS.map((path) => `${origin}${path}`)]
  for (const at of new Set(places)) {
    try {
      const answer = await reader.read(at)
      if (answer.status >= 400) continue
      const open = jsonOf(answer.text) as OpenApiDocument | undefined
      if (open?.openapi || open?.swagger) {
        const listed = Object.keys(open.paths ?? {})
          .filter((path) => !path.includes("{") && open.paths?.[path]?.get)
          .map(wantedAt)
        return {
          text: answer.text.slice(0, MOST_DOCS_CHARS),
          at,
          ...(open.info?.version && { version: { says: open.info.version, where: "its OpenAPI document" } }),
          listed
        }
      }
      if (/html|text\/plain|markdown/i.test(answer.headers.get("content-type") ?? "")) {
        return { text: plainTextOf(answer.text).slice(0, MOST_DOCS_CHARS), at }
      }
    } catch {
      // no docs there:  the next place
    }
  }
  return {}
}

/** An OpenAPI document, as far as it's read. */
type OpenApiDocument = {
  openapi?: string
  swagger?: string
  info?: { version?: string }
  paths?: Record<string, { get?: unknown }>
}

/** A page's words, without its tags. */
function plainTextOf(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

////////////////
// ## A GraphQL server
////////////////

/** A GraphQL type's reference, as its schema says it. */
type GraphType = { kind?: string; name?: string | null; ofType?: GraphType | null }

/** What its schema says. */
type GraphSchema = {
  queryType?: { fields?: Array<{ name: string; type: GraphType }> | null } | null
  mutationType?: { fields?: Array<{ name: string }> | null } | null
  types?: Array<{ name?: string; kind?: string; fields?: Array<{ name: string; type: GraphType }> | null }> | null
}

/** The schema question:  no fragments, and only what it reads. */
const SCHEMA_QUERY = `{ __schema {
  queryType { fields { name type { kind name ofType { kind name ofType { kind name } } } } }
  mutationType { fields { name } }
  types { name kind fields { name type { kind name ofType { kind name ofType { kind name } } } } }
} }`

/** How many rows of each it asks for. */
const GRAPH_SAMPLE = 25

/**
 * A GraphQL server:  its schema says what it holds and what's in each.
 * - Each root field that's a list, or a connection of edges, is a collection, read for its plain fields only.
 * - Its mutations are listed, and never sent.
 * - throws `IngestStopped` if it won't say its schema
 */
async function lookAtGraphServer({ address, reader }: LookAsk): Promise<PlaceLook> {
  const answer = await reader.read(address, { query: SCHEMA_QUERY })
  refuseAnswer(address, answer)
  const schema = (jsonOf(answer.text) as { data?: { __schema?: GraphSchema } } | undefined)?.data?.__schema
  if (!schema) throw new IngestStopped(`${address} won't say its schema, so nothing says what it holds`)
  const typeNamed = (name: string | null | undefined) => schema.types?.find((type) => type.name === name)
  const notes: string[] = []
  const collections: CollectionLook[] = []
  for (const { name, type } of schema.queryType?.fields ?? []) {
    if (name.startsWith("__")) continue
    const list = unwrapped(type)
    const connection =
      list.kind === "OBJECT" ? typeNamed(list.name)?.fields?.find((field) => field.name === "edges") : undefined
    const isList = isListType(type)
    if (!isList && !connection) continue
    const nodeType = connection
      ? unwrapped(typeNamed(unwrapped(connection.type).name)?.fields?.find((field) => field.name === "node")?.type)
      : list
    const plain = (typeNamed(nodeType.name)?.fields ?? []).filter(
      ({ type: each }) => unwrapped(each).kind === "SCALAR" || unwrapped(each).kind === "ENUM"
    )
    const fields = plain.map((field) => field.name).join(" ")
    if (!fields) continue
    const query = connection
      ? `{ ${name}(first: ${GRAPH_SAMPLE}) { edges { node { ${fields} } } } }`
      : `{ ${name} { ${fields} } }`
    const read = await reader.read(address, { query })
    const body = (jsonOf(read.text) as { data?: Record<string, unknown>; errors?: unknown } | undefined) ?? {}
    const value = body.data?.[name]
    const rows = connection
      ? ((value as { edges?: Array<{ node: Record<string, unknown> }> } | undefined)?.edges ?? []).map(
          ({ node }) => node
        )
      : ((value as Array<Record<string, unknown>> | undefined) ?? [])
    if (!rows.length) {
      notes.push(
        `"${name}" answered with no rows${body.errors ? `, and errors:  ${JSON.stringify(body.errors)}` : ""}:  it's left out.`
      )
      continue
    }
    if (!connection)
      notes.push(`"${name}" is a plain list, and Spell reads a graphql server's lists as connections of edges.`)
    collections.push({ name, at: name, rows, paging: connection ? "next field" : "none", pagesRead: 1, hasMore: false })
  }
  const writesOffered = (schema.mutationType?.fields ?? []).map(({ name }) => name)
  const version = versionOf(address, answer.headers)
  return {
    address,
    collections,
    headers: keptHeaders(answer.headers),
    ...(version && { version }),
    writesOffered,
    notes
  }
}

/** Is this a list, however it's wrapped? */
function isListType(type: GraphType | null | undefined): boolean {
  for (let each = type; each; each = each.ofType) if (each.kind === "LIST") return true
  return false
}

/** The named type inside lists and non-nulls. */
function unwrapped(type: GraphType | null | undefined): GraphType {
  let each = type ?? {}
  while (each.ofType) each = each.ofType
  return each
}

////////////////
// ## A sheet
////////////////

/**
 * A CSV file:  its header row names its fields, and it holds one collection, named after the file.
 * - `shownAs`:  the address a person gave, when it's read from another
 * - throws `IngestStopped` if there's nothing there
 */
async function lookAtSheet({ address, reader }: LookAsk, shownAs = address): Promise<PlaceLook> {
  const answer = await reader.read(address, { accept: "text/csv" })
  refuseAnswer(address, answer)
  const [header, ...lines] = parseCsv(answer.text)
  if (!header?.length) throw new IngestStopped(`${shownAs} has no rows, so nothing says what it holds`)
  const rows = lines.map((cells) => Object.fromEntries(header.map((column, at) => [column, cells[at] ?? ""])))
  const name = /([^/?#]+?)(?:\.csv)?(?:[?#].*)?$/i.exec(shownAs)?.[1] ?? "row"
  return {
    address: shownAs,
    collections: [{ name, at: "", rows, paging: "none", pagesRead: 1, hasMore: answer.isCut }],
    headers: keptHeaders(answer.headers),
    notes: answer.isCut ? ["It's bigger than it reads:  only its first part was read."] : []
  }
}

/** `error`'s message. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
