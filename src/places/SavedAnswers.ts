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
 *   - A list inside an object (`{ "items": [...], "total": 3 }`) is paged in place, the rest kept.
 * - Scrubbed before it's written (`answerScrubber()`):  no token, key, password or cookie in a file, nor a person's
 *   email.
 * - Only its words here, no files:  it runs in a page too.  The page server and the ingest read and write the files.
 ****************/

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
 * A saved answer's text, as it answers `query`:  a list picked by the fields its rows hold, then paged;  else as saved.
 * - NEVER throws:  text that isn't JSON is answered as it is.
 */
export function answerFromSaved(text: string, query: URLSearchParams): string {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return text
  }
  const [rows, put] = listIn(value)
  if (!rows) return text
  const asks = [...query.keys()].filter((name) => !PAGING.has(name))
  const picks = asks.filter((name) => rows.some((row) => isRecord(row) && name in row))
  let answered = picks.length
    ? rows.filter((row) => isRecord(row) && picks.every((name) => asText(row[name]) === query.get(name)))
    : rows
  if (query.has("limit")) {
    const offset = Number(query.get("offset") ?? 0) || 0
    answered = answered.slice(offset, offset + (Number(query.get("limit")) || answered.length))
  }
  return answered === rows ? text : JSON.stringify(put(answered))
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
