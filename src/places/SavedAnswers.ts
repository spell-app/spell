/****************
 * ### Saved answers
 * A web server's answers, saved as files, for when it can't be reached:  a deployment's `fixtures` folder, read by the
 * page server (`AuthenticatedPlaces`) and `spell place verify`, and written by `spell place verify --fixtures`.
 *
 * ```text
 * GET /api/jobs?limit=20&offset=40   =>   <folder>/api/jobs.json, its rows 41 to 60
 * GET /api/jobs/j-1                  =>   <folder>/api/jobs/j-1.json
 * ```
 *
 * - One file an address, by its path under the place's own:  its question is only how it was asked.
 * - A saved list is paged as the server pages it (`limit` and `offset`), so a read reads each row once and stops,
 *   and picked by a question naming a field its rows hold (`?status=open`).
 *   - Searched and sorted by the place's own question names (`SavedAsks`), with the page's own matching and order
 *     (`rowsHolding()`, `rowsInOrder()`):  so a saved answer says what the server would, as near as it can.
 *   - A list inside an object (`{ "items": [...], "total": 3 }`) is paged in place, the rest kept.
 * - Scrubbed before it's written (`answerScrubber()`):  no token, key, password or cookie in a file, nor a person's
 *   email.
 * - Only its words here, no files:  it runs in a page too.  The page server and the ingest read and write the files.
 ****************/

import { rowsHolding, rowsInOrder } from "./PlaceQuery"
import { ANY_FIELD, type PlaceRow, type SortField } from "./places.types"

/** The header a saved answer carries, so a person can tell:  its value `saved`. */
export const SAVED_ANSWER_HEADER = "x-spell-saved-answer"

/** A question that pages a saved list, never a field it's picked by. */
const PAGING = new Set(["limit", "offset"])

/** A field named like a secret:  its value is never kept. */
const SECRET_NAME =
  /(^|[_-])(token|tokens|secret|secrets|password|passwd|hash|hashed_key|private_key|api_key|apikey|key_value|raw_key|authorization|cookie|cookies|set-cookie|credential|credentials)($|[_-])/i

/** A JWT, wherever it's seen. */
const JWT = /eyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]*/g

/** A `Bearer ...` or `Basic ...` sign-in. */
const SIGN_IN = /\b(Bearer|Basic)\s+[\w.~+/=-]{8,}/gi

/** An email. */
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g

/**
 * A whole value that's 40 or more letters and digits, mixed, with nothing in it to read as a name, and not plain hex
 * (an id, a git hash):  a key, most likely.
 */
const KEY_LIKE = /^(?=[A-Za-z0-9+/=]*\d)(?=[A-Za-z0-9+/=]*[A-Za-z])(?![0-9a-f]+$)[A-Za-z0-9+/=]{40,}$/i

/** What a scrubbed value says. */
const SCRUBBED = "[scrubbed]"

/**
 * The file an address's answer is saved in, under the folder:  `/api/jobs/j-1?x=1` => `api/jobs/j-1.json`.
 * - `undefined` for one that can't be a file:  empty, or a part that's `.` or `..`, or won't decode.
 */
export function savedAnswerPath(path: string): string | undefined {
  let relative: string
  try {
    relative = decodeURIComponent(path.replace(/[?#].*$/s, "")).replace(/^\/+|\/+$/g, "")
  } catch {
    return undefined
  }
  if (!relative || relative.split("/").some((part) => !part || part === "." || part === ".." || part.includes("\\")))
    return undefined
  return `${relative}.json`
}

/**
 * Is `path` (under the place's own address) read only from saved answers, by its deployment's `offline`:
 * `true`, every path;  a list, each path and what's under it.
 */
export function isOffline(path: string, offline: boolean | readonly string[] | undefined): boolean {
  if (offline === true) return true
  if (!Array.isArray(offline)) return false
  const bare = `/${path.replace(/[?#].*$/s, "").replace(/^\/+|\/+$/g, "")}`
  return offline.some((each) => {
    const under = `/${each.replace(/^\/+|\/+$/g, "")}`
    return bare === under || bare.startsWith(`${under}/`)
  })
}

/**
 * What a place's lines call the questions a saved answer is searched and sorted by (`answerFromSaved()`):
 * what the page server's served place says (`SP.ServedPlace.asks`).
 */
export type SavedAsks = {
  /** Its search's question names:  `search`.  Left out:  `search` and `q`. */
  search?: readonly string[]
  /** Its sort's question names:  `sort`, `order_by`.  Left out:  `sort`. */
  sort?: readonly string[]
  /** The orders it has a name of its own for:  `recency`, newest first by created at (`RestSortOrder`). */
  orders?: readonly { as: string; field: string; descending: boolean }[]
}

/**
 * A saved answer's text, as it answers `query`:  a list picked by the fields its rows hold, searched, sorted, then
 * paged;  else as saved.
 * - A search's text in any of a row's fields, capitals aside, as the page checks it (`rowsHolding()`).
 * - A sort as `title`, `-title` (highest first), or an order's own name (`asks.orders`), in the page's text order.
 * - NEVER throws:  text that isn't JSON is answered as it is.
 */
export function answerFromSaved(text: string, query: URLSearchParams, asks: SavedAsks = {}): string {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return text
  }
  const [rows, put] = listIn(value)
  if (!rows) return text
  const searches = new Set(asks.search ?? DEFAULT_SEARCHES)
  const sorts = new Set(asks.sort ?? DEFAULT_SORTS)
  const asked = [...query.keys()].filter((name) => !PAGING.has(name) && !searches.has(name) && !sorts.has(name))
  const picks = asked.filter((name) => rows.some((row) => isRecord(row) && name in row))
  let answered = picks.length
    ? rows.filter((row) => isRecord(row) && picks.every((name) => asText(row[name]) === query.get(name)))
    : rows
  const records = () => answered.filter(isRecord)
  for (const name of searches) {
    const words = query.get(name)?.trim()
    if (words) answered = rowsHolding(records(), { [ANY_FIELD]: words })
  }
  const sort = [...sorts].map((name) => query.get(name)).find((each) => !!each)
  const order = !sort ? [] : sortFieldsOf(sort, records(), asks.orders ?? [])
  if (order.length) answered = rowsInOrder(records(), order)
  if (query.has("limit")) {
    const offset = Number(query.get("offset") ?? 0) || 0
    answered = answered.slice(offset, offset + (Number(query.get("limit")) || answered.length))
  }
  return answered === rows ? text : JSON.stringify(put(answered))
}

/** A search's question names, when a place's lines don't say. */
const DEFAULT_SEARCHES = ["search", "q"]

/** A sort's question name, when a place's lines don't say. */
const DEFAULT_SORTS = ["sort"]

/**
 * The fields a sort's text names, in order:  `title,-date`, or an order's own name.
 * - A field no row holds is only how it was asked:  left out.
 * - An order's field by its words (`createdAt` is a row's `created_at`):  a saved row has the server's names.
 */
function sortFieldsOf(sort: string, rows: readonly PlaceRow[], orders: NonNullable<SavedAsks["orders"]>): SortField[] {
  const named = orders.find((order) => order.as === sort)
  if (named) {
    const words = lettersOf(named.field)
    const field = Object.keys(rows[0] ?? {}).find((key) => lettersOf(key) === words) ?? named.field
    return [{ field, descending: named.descending }]
  }
  return sort
    .split(",")
    .map((each) => each.trim())
    .filter((each) => each && each !== "-")
    .map((each) => (each.startsWith("-") ? { field: each.slice(1), descending: true } : { field: each }))
    .filter(({ field }) => rows.some((row) => field in row))
}

/** A name's letters and digits alone, small:  `created_at` and `createdAt` are both `createdat`. */
function lettersOf(name: string): string {
  return name.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()
}

/** The list a saved answer holds, and how to put another in its place:  the answer, or its one list field. */
function listIn(value: unknown): [unknown[] | undefined, (rows: unknown[]) => unknown] {
  if (Array.isArray(value)) return [value, (rows) => rows]
  if (!isRecord(value)) return [undefined, () => value]
  const lists = Object.keys(value).filter((key) => Array.isArray(value[key]))
  if (lists.length !== 1) return [undefined, () => value]
  const [key] = lists as [string]
  return [value[key] as unknown[], (rows) => ({ ...value, [key]: rows })]
}

/** A field's value as a question says it:  `12`, `open`, `true`;  `""` for none, JSON for an object. */
function asText(value: unknown): string {
  if (value === undefined || value === null) return ""
  return typeof value === "object" ? JSON.stringify(value) : String(value as string | number | boolean)
}

/** Is `value` an object, not a list? */
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/**
 * A scrubber for one run of saving:  `text(...)` and `value(...)`, never a secret out.
 * - `secrets`:  each one sent (a key, a token), replaced wherever it's seen.
 * - A field named like a secret (`token`, `api_key`, `password`, `cookie` ...) is `"[scrubbed]"`;
 *   so is a JWT, a `Bearer ...`, and a whole value that looks like a key.
 * - Each email is a stand-in, the same one for the run:  `person-1@example.invalid`.
 * - Keys sorted, so the same answer writes the same file.
 */
export function answerScrubber(secrets: Iterable<string> = []): AnswerScrubber {
  const known = [...secrets].filter((secret) => secret.length >= 8)
  const emails = new Map<string, string>()
  const text = (said: string): string => {
    let clean = said
    for (const secret of known) clean = clean.replaceAll(secret, SCRUBBED)
    clean = clean.replace(JWT, SCRUBBED).replace(SIGN_IN, `$1 ${SCRUBBED}`)
    clean = clean.replace(EMAIL, (email) => {
      const key = email.toLowerCase()
      if (!emails.has(key)) emails.set(key, `person-${emails.size + 1}@example.invalid`)
      return emails.get(key)!
    })
    return KEY_LIKE.test(clean) ? SCRUBBED : clean
  }
  const value = (held: unknown, name = ""): unknown => {
    if (typeof held === "string") return SECRET_NAME.test(name) && held ? SCRUBBED : text(held)
    if (Array.isArray(held)) return held.map((each) => value(each, name))
    if (!isRecord(held)) return held
    return Object.fromEntries(
      Object.keys(held)
        .sort()
        .map((key) => [
          text(key),
          SECRET_NAME.test(key) && typeof held[key] === "string" ? SCRUBBED : value(held[key], key)
        ])
    )
  }
  return { text, value }
}

/** What `answerScrubber()` makes. */
export type AnswerScrubber = {
  /** `said`, each secret and email in it scrubbed. */
  text(said: string): string
  /** `held`, scrubbed through and through, its keys sorted;  `name`, the field it's in. */
  value(held: unknown, name?: string): unknown
}
