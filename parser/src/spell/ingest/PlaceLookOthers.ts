import { atmosphereNetwork, documentUrlFor, hostIn } from "spell/places/AtProtoPlace"
import { airtableBaseIn, isPlaceServerAddress } from "spell/places/places.types"

import { IngestStopped, type CollectionLook, type PlaceLook } from "./ingest.types"
import { jsonOf, keptNames, messageOf, refuseAnswer, type LookAsk } from "./PlaceLook"
import { keptHeaders, type ReadAnswer } from "./PoliteReader"

/** How many rows of each collection it asks for. */
const MOST_ROWS = 25

/** A file's address on a server side:  a scheme, or from the top of a server (the core's `IS_SERVER_ADDRESS`). */
const IS_ON_A_SERVER = /^(?:[a-z][a-z0-9+.-]*:|\/)/i

/** A Spell address:  `owen@spell/recipes`. */
const IS_SPELL_ADDRESS = /^[^/@\s]*@[^/\s]+/

/** Where Airtable's own API is. */
const AIRTABLE_API = "https://api.airtable.com/v0"

/** The Airtable field types whose cells only Airtable writes. */
const AIRTABLE_WORKED_OUT = new Set([
  "formula",
  "rollup",
  "multipleLookupValues",
  "count",
  "createdTime",
  "lastModifiedTime",
  "autoNumber"
])

/** One collection's rows, as a look keeps them:  one page, with no paging it can follow. */
function collectionOf(
  name: string,
  at: string,
  rows: Array<Record<string, unknown>>,
  hasMore: boolean,
  answer?: ReadAnswer
): CollectionLook {
  return {
    name,
    at,
    rows,
    paging: "none",
    pagesRead: 1,
    hasMore,
    ...(answer && { headers: keptHeaders(answer.headers) })
  }
}

/** What a look with several collections that couldn't all be read says. */
function lookFrom(address: string, read: CollectionLook[], notes: string[], version?: PlaceLook["version"]): PlaceLook {
  return { address, collections: read, headers: read[0]?.headers ?? {}, ...(version && { version }), notes }
}

////////////////
// ## A room
////////////////

/**
 * A room (epic `data` T71):  its referee hands over every row it holds, by collection.
 * - An address at a referee:  `wss://...`, or the page server's own, `http://.../api/rooms/recipes`.
 * - It only listens:  it says nothing but "what do you hold?", and leaves.
 * - throws `IngestStopped` for a room in a space, and for one that won't let it in
 */
export async function lookAtRoom({ address, reader, collections }: LookAsk): Promise<PlaceLook> {
  const url = address.replace(/^http/i, "ws")
  if (!/^wss?:/i.test(url)) {
    throw new IngestStopped(
      `${address} isn't a referee's address:  a room is looked at by its own, wss://...;  a room in a space takes a sign-in, so its lines are written by hand`
    )
  }
  const rows = await reader.roomRows(url)
  const held = keptNames(Object.keys(rows), collections)
  const read = held.filter((name) => rows[name]?.length).map((name) => collectionOf(name, name, rows[name]!, false))
  const notes = held.filter((name) => !rows[name]?.length).map((name) => `"${name}" holds no rows:  it's left out.`)
  return lookFrom(address, read, notes)
}

////////////////
// ## A data folder or a file
////////////////

/**
 * A data folder, or a file, behind a place server:  each collection asked for as a `RemotePlace` asks (epic `data` T71).
 * - Nothing lists what it holds, so `--collections` names them, or it stops and says so.
 * - A data folder at a plain path is a folder of `<collection>.list.json` files:  read as they are, and its own files say.
 * - throws `IngestStopped` for an address it can't reach, and for no collections named
 */
export async function lookAtFolder(ask: LookAsk): Promise<PlaceLook> {
  const { address } = ask
  if (IS_SPELL_ADDRESS.test(address)) {
    throw new IngestStopped(
      `${address} is a folder in a space, which takes a sign-in:  its lines are written by hand, or it's looked at by its server's own address`
    )
  }
  return IS_ON_A_SERVER.test(address) ? lookAtPlaceServer(ask) : lookAtFolderOfFiles(ask)
}

/** See `lookAtFolder()`.  - throws `IngestStopped` for an answer that's no use */
export async function lookAtPlaceServer({ address, reader, collections, kind }: LookAsk): Promise<PlaceLook> {
  reader.readPlaceServer()
  if (!collections?.length) {
    throw new IngestStopped(
      `a ${kind ?? "place"} doesn't list what it holds:  name its collections, --collections recipes,cooks`
    )
  }
  const read: CollectionLook[] = []
  const notes: string[] = []
  for (const name of collections) {
    const answer = await reader.askPlaceServer(address, name)
    refusePlaceServerAnswer(address, answer)
    const { rows = [], nextPage } =
      (jsonOf(answer.text) as { rows?: Array<Record<string, unknown>>; nextPage?: unknown }) ?? {}
    if (rows.length) read.push(collectionOf(name, name, rows, nextPage !== undefined, answer))
    else notes.push(`"${name}" holds no rows:  it's left out.`)
  }
  return lookFrom(address, read, notes)
}

/** Refuse an answer that's no use, from a place server:  saying how to go on.  - throws `IngestStopped` */
function refusePlaceServerAnswer(address: string, { status }: ReadAnswer): void {
  if (status === 401 || status === 403) {
    throw new IngestStopped(
      `${address} answered ${status}:  it takes its run's token, so name one, --key-secret NAME --key-header x-server-token, read from the environment`
    )
  }
  if (status >= 400) throw new IngestStopped(`${address} answered ${status}:  there's nothing here to read`)
}

/** A folder of `<collection>.list.json` files, each with its rows:  the files beside each other say what it holds. */
async function lookAtFolderOfFiles({ address, reader, collections, namesInFolder }: LookAsk): Promise<PlaceLook> {
  const folder = address.replace(/\/+$/, "")
  const onDisk = (await namesInFolder?.(folder)) ?? []
  const listed = onDisk.flatMap((name) => /^(.+)\.list\.json$/.exec(name)?.[1] ?? [])
  const names = keptNames(listed, collections)
  if (!names.length) {
    throw new IngestStopped(`${address} has no *.list.json files:  name its collections, --collections recipes,cooks`)
  }
  const read: CollectionLook[] = []
  const notes: string[] = []
  for (const name of names) {
    const answer = await reader.read(`${folder}/${name}.list.json`)
    refuseAnswer(address, answer)
    const { rows = [] } = (jsonOf(answer.text) as { rows?: Array<Record<string, unknown>> }) ?? {}
    if (rows.length) read.push(collectionOf(name, name, rows.slice(0, MOST_ROWS), rows.length > MOST_ROWS, answer))
    else notes.push(`"${name}" holds no rows:  it's left out.`)
  }
  return lookFrom(address, read, notes)
}

////////////////
// ## An Airtable
////////////////

/** An Airtable's answer to asking what's in it. */
type AirtableTables = {
  tables?: Array<{ name: string; fields?: Array<{ name: string; type?: string }> }>
}

/**
 * An Airtable (epic `data` T71):  its schema says its tables, a page of each says what's in it.
 * - Behind a place server, it's asked as any other is:  `lookAtPlaceServer()`.
 * - Its key is `--key-secret`, its usual `Authorization: Bearer`, which needs `schema.bases:read`.
 * - throws `IngestStopped` for an address naming no base, and a key that can't read its schema
 */
export async function lookAtAirtable(ask: LookAsk): Promise<PlaceLook> {
  const { address, reader, collections } = ask
  if (isPlaceServerAddress(address)) return lookAtPlaceServer(ask)
  const base = airtableBaseIn(address)
  if (!base)
    throw new IngestStopped(`${address} names no Airtable base:  appXXXXXXXXXXXXXX, or Airtable's address for one`)
  const schema = await reader.read(`${AIRTABLE_API}/meta/bases/${base}/tables`)
  if (schema.status === 401 || schema.status === 403) {
    throw new IngestStopped(
      `Airtable answered ${schema.status} about ${base}:  name a key that can read its schema (schema.bases:read), --key-secret NAME`
    )
  }
  refuseAnswer(address, schema)
  const { tables = [] } = (jsonOf(schema.text) as AirtableTables) ?? {}
  const read: CollectionLook[] = []
  const notes: string[] = []
  for (const name of keptNames(
    tables.map((table) => table.name),
    collections
  )) {
    const answer = await reader.read(`${AIRTABLE_API}/${base}/${encodeURIComponent(name)}?pageSize=${MOST_ROWS}`)
    refuseAnswer(address, answer)
    const { records = [], offset } =
      (jsonOf(answer.text) as { records?: Array<{ id: string; fields: object }>; offset?: string }) ?? {}
    if (!records.length) {
      notes.push(`"${name}" holds no rows:  it's left out.`)
      continue
    }
    const rows = records.map(({ id, fields }) => ({ id, ...fields }))
    read.push(collectionOf(name, name, rows, offset !== undefined, answer))
    const workedOut = tables
      .find((table) => table.name === name)
      ?.fields?.filter(({ type }) => type && AIRTABLE_WORKED_OUT.has(type))
      .map((field) => field.name)
    if (workedOut?.length) {
      notes.push(`"${name}" works out ${workedOut.join(", ")} itself:  a write to one is refused when it runs.`)
    }
  }
  return lookFrom(address, read, notes)
}

////////////////
// ## An atmosphere account
////////////////

/** A collection's address, its full name:  `com.example.recipe`, which goes by its last word. */
function shortNameOf(collection: string): string {
  return collection.slice(collection.lastIndexOf(".") + 1)
}

/**
 * An atmosphere account (epic `data` T71):  its document says which host holds it, the host says what it holds.
 * - Every collection it holds, or those `--collections` names, by their full names.
 * - Anyone may read one, so it takes no key.
 * - throws `IngestStopped` for an address that isn't a DID, and an account no host holds
 */
export async function lookAtAtmosphere({ address, reader, collections }: LookAsk): Promise<PlaceLook> {
  if (!/^did:(?:plc|web):/.test(address)) {
    throw new IngestStopped(`${address} isn't an account's DID:  did:plc:...`)
  }
  const documentAt = documentUrlFor(address, atmosphereNetwork().directory)
  const document = await reader.read(documentAt)
  refuseAnswer(address, document)
  const accountDocument = jsonOf(document.text) as Parameters<typeof hostIn>[1]
  let host: string
  try {
    host = hostIn(address, accountDocument)
  } catch (error) {
    throw new IngestStopped(messageOf(error))
  }
  // what its own document calls it:  `at://alice.test`
  const handle = /^at:\/\/([^./]+)/.exec(accountDocument.alsoKnownAs?.[0] ?? "")?.[1]
  const repo = encodeURIComponent(address)
  const described = await reader.read(`${host}/xrpc/com.atproto.repo.describeRepo?repo=${repo}`)
  refuseAnswer(address, described)
  const { collections: held = [] } = (jsonOf(described.text) as { collections?: string[] }) ?? {}
  const read: CollectionLook[] = []
  const notes: string[] = []
  for (const name of keptNames(held, collections)) {
    const search = `repo=${repo}&collection=${encodeURIComponent(name)}&limit=${MOST_ROWS}`
    const answer = await reader.read(`${host}/xrpc/com.atproto.repo.listRecords?${search}`)
    refuseAnswer(address, answer)
    const { records = [], cursor } =
      (jsonOf(answer.text) as {
        records?: Array<{ uri: string; value: Record<string, unknown> }>
        cursor?: string
      }) ?? {}
    if (!records.length) {
      notes.push(`"${name}" holds no records:  it's left out.`)
      continue
    }
    const rows = records.map(({ uri, value: { $type: _type, ...fields } }) => ({
      id: uri.slice(uri.lastIndexOf("/") + 1),
      ...fields
    }))
    read.push(collectionOf(shortNameOf(name), name, rows, cursor !== undefined, answer))
  }
  return { ...lookFrom(address, read, notes), ...(handle && { nameSuggested: handle }) }
}
