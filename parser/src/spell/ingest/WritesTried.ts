import type { CollectionLook, WritesSeen } from "./ingest.types"
import type { PoliteReader } from "./PoliteReader"

/** An answer that took a write. */
const TOOK_IT = /^2\d\d$/

/** A path with a name in braces:  a collection found by name, with no list. */
const IS_FOUND_BY_NAME = /\{[^{}/]*\}/

/**
 * One write of each kind, tried on the first collection that lists its rows, only because the person said it may
 * (`--try-writes`;  epic `data` P30).
 * - Adding:  a copy of its first row, without its id, `POST`ed to the collection.
 * - Read again:  what was added, at its own address, to see whether the server keeps what it's sent.
 * - Changing:  its first row's first field, to what it already holds, `PATCH`ed:  so it changes nothing.
 * - Deleting:  what was added, so a server that keeps it is left as it was;  else, with nothing added, nothing is.
 * - `undefined` when no collection lists rows with ids.
 * - NEVER throws for an answer, whatever its status;  as `PoliteReader.read()` otherwise
 */
export async function writesTried(
  place: string,
  collections: readonly CollectionLook[],
  reader: PoliteReader
): Promise<WritesSeen | undefined> {
  const tried = collections.find(
    ({ at, rows, searchedOnly, listsGive }) =>
      !searchedOnly && !listsGive && !IS_FOUND_BY_NAME.test(at) && rows[0]?.id !== undefined
  )
  if (!tried) return undefined
  const address = `${place}${tried.at.replace(/\/+$/, "")}`
  const { id, ...row } = tried.rows[0]!
  const added = await reader.tryWrite(address, "POST", row)
  const addedId = idIn(added.text)
  const keeps = addedId === undefined ? undefined : (await reader.read(`${address}/${addedId}`)).status === 200
  const [field] = Object.keys(row)
  const changed = await reader.tryWrite(`${address}/${id}`, "PATCH", field ? { [field]: row[field] } : {})
  const deleted = addedId === undefined ? undefined : await reader.tryWrite(`${address}/${addedId}`, "DELETE")
  return {
    collection: tried.name,
    adding: added.status,
    changing: changed.status,
    ...(deleted && { deleting: deleted.status }),
    ...(addedId !== undefined && { addedId }),
    ...(keeps !== undefined && { keeps })
  }
}

/** What `canDo.write` says of the writes it tried:  each answer, and whether it keeps them. */
export function writeWordsFor({ collection, adding, changing, deleting, addedId, keeps }: WritesSeen): string {
  const all = [adding, changing, ...(deleting === undefined ? [] : [deleting])]
  const took = all.every((status) => TOOK_IT.test(`${status}`))
  const answers = `adding ${adding}, changing ${changing}${deleting === undefined ? "" : `, deleting ${deleting}`}`
  if (!took) return `It refused some writes, tried on ${collection}:  ${answers}.`
  const kept =
    keeps === false
      ? `  It answers as if saved, and keeps nothing:  what was added, as ${addedId}, wasn't there when read again.`
      : keeps
        ? "  It keeps what it's sent:  what was added was there when read again, and was deleted after."
        : ""
  return `Yes:  it took a write of each kind, tried on ${collection} (${answers}).${kept}`
}

/** The id an answer to adding gives, if any. */
function idIn(text: string): string | undefined {
  try {
    const { id } = JSON.parse(text) as { id?: unknown }
    return typeof id === "number" || typeof id === "string" ? `${id}` : undefined
  } catch {
    return undefined
  }
}
