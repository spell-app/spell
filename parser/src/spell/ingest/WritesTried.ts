import type {
  CollectionDescription,
  CollectionLook,
  OperationDescription,
  PlaceDescription,
  PlaceState
} from "./ingest.types"
import type { PoliteReader } from "./PoliteReader"

/****************
 * ### Writes tried
 * One write of each kind, tried on a collection, only because the person said it may (`--try-writes`;  epic `data` P30).
 * - Each write's `state` says how it went (epic `data` P54, I108, I111):  the ONE record of what was tried, on the
 *   collection's `operations`.
 * - What `canDo.write` says of them is worked out from those states (`writeWordsFor()`), never kept apart.
 * - PURE but for the reader:  no node, no parser.
 ****************/

/** The writes Spell has words for, in the order they're tried. */
export const WRITE_KINDS = ["add", "change", "delete"] as const

/** One of them. */
export type WriteKind = (typeof WRITE_KINDS)[number]

/** When and where a try was:  as a read's state says. */
export type WriteTry = { at: string; deployment?: string }

/** An answer that took a write. */
const TOOK_IT = /^2\d\d$/

/** A path with a name in braces:  a collection found by name, with no list. */
const IS_FOUND_BY_NAME = /\{[^{}/]*\}/

/** Each kind's word in what's said:  `adding 201`. */
const SAID_AS: Readonly<Record<WriteKind, string>> = { add: "adding", change: "changing", delete: "deleting" }

/**
 * Can writes be tried on `collection`, as `look` read it?
 * - It lists rows with ids:  not a search, nor a list that gives a little of each, nor one found by name.
 * - From a description:  it offers adding or changing, not turned off.
 */
export function canTryWrites(look: CollectionLook | undefined, collection: CollectionDescription): boolean {
  if (!look || look.searchedOnly || look.listsGive || IS_FOUND_BY_NAME.test(look.at)) return false
  if (look.rows[0]?.[collection.idField ?? "id"] === undefined) return false
  // deleting is tried only on what adding made:  so one of those two
  const { operations } = collection
  return !operations || isOffered(operations.add) || isOffered(operations.change)
}

/**
 * SIDE EFFECT:  one write of each kind tried on `collection`, its first row as `look` read it;  each write's `state`
 * says how it went:  `verified` with its status, or `failed` with its status and the server's reason.
 * - From a description (`operations`):  each write it offers, at its own route, with its own method;  the row added
 *   holds only the fields its write takes (`params`, its schema's), so what the server makes itself isn't sent.
 * - Else:  adding at the list's address, changing and deleting at a thing's, each made its `operations`.
 * - Adding:  a copy of its first row, without its id;  each thing inside it sent as its id alone, as NetBox takes them
 *   (epic `data` P55).  Read again, to see whether the server keeps what it's sent (`keeps`).
 * - Changing:  its first row's first field it takes, to what it already holds:  so it changes nothing.
 * - Deleting:  what was added, so a server that keeps it is left as it was;  nothing added, nothing is.
 * - NEVER throws for an answer, whatever its status;  as `PoliteReader.read()` otherwise
 */
export async function writesTriedOn(
  place: string,
  look: CollectionLook,
  collection: CollectionDescription,
  reader: PoliteReader,
  tried: WriteTry
): Promise<void> {
  const operations = (collection.operations ??= routesGuessedFor(look.at))
  const idField = collection.idField ?? "id"
  const { [idField]: id, ...whole } = look.rows[0]!
  const takes = (kind: WriteKind) => Object.keys(operations[kind]?.params ?? {})
  const row = Object.fromEntries(
    Object.entries(whole)
      .filter(([field]) => !takes("add").length || takes("add").includes(field))
      .map(([field, value]) => [field, byIdOnly(value)])
  )
  const said = (kind: WriteKind, status: number, text: string, more: Partial<PlaceState> = {}) => {
    const took = TOOK_IT.test(`${status}`)
    const reason = took ? undefined : reasonIn(text)
    operations[kind]!.state = {
      is: took ? "verified" : "failed",
      ...tried,
      status,
      ...(reason !== undefined && { reason }),
      ...more
    }
  }
  let addedId: string | undefined
  const add = operations.add
  if (isOffered(add)) {
    const added = await reader.tryWrite(`${place}${add.at}`, methodOf(add, "POST"), row)
    addedId = idIn(added.text, idField)
    const keeps =
      addedId === undefined ? undefined : (await reader.read(thingAt(place, operations, addedId))).status === 200
    said("add", added.status, added.text, keeps === undefined ? {} : { keeps })
  }
  const change = operations.change
  if (isOffered(change)) {
    const [field] = Object.keys(row).filter((each) => !takes("change").length || takes("change").includes(each))
    const answer = await reader.tryWrite(
      filled(`${place}${change.at}`, id),
      methodOf(change, "PATCH"),
      field ? { [field]: row[field] } : {}
    )
    said("change", answer.status, answer.text)
  }
  const remove = operations.delete
  if (isOffered(remove) && addedId !== undefined) {
    const answer = await reader.tryWrite(filled(`${place}${remove.at}`, addedId), "DELETE")
    said("delete", answer.status, answer.text)
  }
}

/**
 * What `canDo.write` says of the writes tried on `description`'s collections:  each answer, and whether it keeps them;
 * `undefined` when none was tried.
 * - Worked out from each write's `state`, the one record of them.
 */
export function writeWordsFor({ collections }: PlaceDescription): string | undefined {
  const each = Object.entries(collections).flatMap(([name, collection]) => {
    const tries = triesOn(collection)
    return tries.length ? [{ name, tries }] : []
  })
  if (!each.length) return undefined
  const took = each.every(({ tries }) => tries.every(({ is }) => is === "verified"))
  const answers = each.map(({ name, tries }) => `${name} (${saidOf(tries)})`)
  if (!took) return `It refused some writes, tried on ${answers.join(";  ")}.`
  const keeps = each.flatMap(({ tries }) => tries.flatMap(({ keeps: kept }) => (kept === undefined ? [] : [kept])))
  const kept = keeps.includes(false)
    ? "  It answers as if saved, and keeps nothing:  what was added wasn't there when read again."
    : keeps.includes(true)
      ? "  It keeps what it's sent:  what was added was there when read again, and was deleted after."
      : ""
  return `Yes:  it took a write of each kind, tried on ${answers.join(";  ")}.${kept}`
}

/** What each write tried on `collection` answered, for the person:  `adding 400:  "... already exists", changing 200`. */
export function writesSaid(collection: CollectionDescription): string {
  return saidOf(triesOn(collection))
}

/** Each write tried on `collection`, with its state:  one with no status was never tried. */
function triesOn({ operations = {} }: CollectionDescription): Array<PlaceState & { kind: WriteKind; status: number }> {
  return WRITE_KINDS.flatMap((kind) => {
    const state = operations[kind]?.state
    return state?.at && state.status !== undefined ? [{ ...state, kind, status: state.status }] : []
  })
}

/** `tries` said:  each kind, its status, and the server's reason for a refusal. */
function saidOf(tries: ReturnType<typeof triesOn>): string {
  return tries
    .map(({ kind, status, reason }) => `${SAID_AS[kind]} ${status}${reason ? `:  "${reason}"` : ""}`)
    .join(", ")
}

/** The collections `description` tried writes on before, by name:  a later look tries them again. */
export function writesTriedBefore({ collections }: PlaceDescription): string[] {
  return Object.entries(collections)
    .filter(([, { operations = {} }]) => WRITE_KINDS.some((kind) => operations[kind]?.state?.at))
    .map(([name]) => name)
}

/** Is `operation` there to try:  offered, and not turned off? */
function isOffered(operation: OperationDescription | undefined): operation is OperationDescription {
  return !!operation && operation.state?.is !== "disabled"
}

/** The routes a place with no description takes, guessed from its list's address:  its own slash kept (NetBox's). */
function routesGuessedFor(at: string): Record<string, OperationDescription> {
  const slash = at.endsWith("/") ? "/" : ""
  const thing = `${at.replace(/\/+$/, "")}/{id}${slash}`
  return {
    add: { method: "POST", at },
    change: { method: "PATCH", at: thing },
    delete: { method: "DELETE", at: thing }
  }
}

/** Where what was added is read again:  where it's changed, else deleted, else under the list. */
function thingAt(place: string, operations: Record<string, OperationDescription>, thingId: string): string {
  const route = operations.change?.at ?? operations.delete?.at ?? routesGuessedFor(operations.add!.at).change!.at
  return filled(`${place}${route}`, thingId)
}

/** `url`'s first brace filled with `thingId`. */
function filled(url: string, thingId: unknown): string {
  return url.replace(/\{[^{}/]*\}/, encodeURIComponent(`${thingId}`))
}

/** `operation`'s own method, as the reader sends a write:  else `fallback`. */
function methodOf(operation: OperationDescription, fallback: "POST" | "PATCH"): "POST" | "PATCH" | "PUT" {
  const method = operation.method.toUpperCase()
  return method === "POST" || method === "PATCH" || method === "PUT" ? method : fallback
}

/** The id an answer to adding gives, if any. */
function idIn(text: string, idField: string): string | undefined {
  try {
    const { [idField]: id } = JSON.parse(text) as Record<string, unknown>
    return typeof id === "number" || typeof id === "string" ? `${id}` : undefined
  } catch {
    return undefined
  }
}

/**
 * Why a server refused a write, in its own words, short:  `undefined` when it says nothing readable.
 * - `{ "detail": "..." }`, `{ "error": "..." }`, `{ "message": "..." }`
 * - a field's own complaint, NetBox's and Django's:  `{ "non_field_errors": ["... already exists."] }`,
 *   `{ "name": ["This field is required."] }`, as `name:  This field is required`
 */
function reasonIn(text: string): string | undefined {
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return undefined
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined
  const { detail, error, message } = body as Record<string, unknown>
  const said = [detail, error, message].find((each) => typeof each === "string") as string | undefined
  if (said) return short(said)
  for (const [field, complaints] of Object.entries(body)) {
    const [first] = [complaints].flat()
    if (typeof first !== "string") continue
    return short(/^(non_field_errors|__all__)$/.test(field) ? first : `${field}:  ${first}`)
  }
  return undefined
}

/** `words` cut to 200 characters, without their last period. */
function short(words: string): string {
  return words.slice(0, 200).replace(/\.+$/, "")
}

/** A thing inside a row, `{ id, url, display ... }`, as `{ id }`;  a list of them, each so;  anything else as it is. */
function byIdOnly(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(byIdOnly)
  if (value && typeof value === "object" && "id" in value) return { id: (value as { id: unknown }).id }
  return value
}
