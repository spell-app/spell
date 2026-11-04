import { P } from "spell/parser/parser"

import type { CollectionLook, ListUnderSeen } from "./ingest.types"
import { wordsFor } from "./PlaceShape"
import type { PoliteReader } from "./PoliteReader"

/** The most lists under a thing a look asks after:  one request each. */
const MOST_ASKS = 12

/** A path with a name in braces:  a collection found by name, with no list. */
const IS_FOUND_BY_NAME = /\{[^{}/]*\}/

/**
 * The lists a web server keeps under each thing of a collection (epic `data` P30):  JSONPlaceholder's `/posts/1/comments`.
 * - Asked only where one collection's rows name another's things by id, by its words:  a comment's `postId` is a post's.
 *   So a server with no such field is asked nothing more.
 * - Each is asked under the first thing read:  `<its address>/<id>/<the other's last part>`.
 * - It's real only when every row it gives names that same thing:  JSONPlaceholder answers any address under a thing
 *   (`/posts/1/users` gives every user), and only a real list is that thing's own.
 * - NEVER throws:  an answer that isn't one is no list.
 */
export async function listsFoundUnder(
  place: string,
  collections: readonly CollectionLook[],
  reader: PoliteReader
): Promise<ListUnderSeen[]> {
  const lists = collections.filter(
    ({ at, rows, searchedOnly, listsGive }) => rows.length && !searchedOnly && !listsGive && !IS_FOUND_BY_NAME.test(at)
  )
  const found: ListUnderSeen[] = []
  let asks = 0
  for (const owner of lists) {
    const id = owner.rows[0]!.id
    if (typeof id !== "number" && typeof id !== "string") continue
    const ownersId = `${P.singularize(wordsFor(owner.name))} id`
    for (const list of lists) {
      if (list === owner) continue
      const field = Object.keys(list.rows[0]!).find((name) => wordsFor(name) === ownersId)
      if (!field || asks >= MOST_ASKS || !reader.hasRoom) continue
      asks++
      const at = `${owner.at.replace(/\/+$/, "")}/{id}/${list.at.split("/").filter(Boolean).pop()}`
      if (await isListUnder(`${place}${at.replace("{id}", encodeURIComponent(`${id}`))}`, field, id, reader)) {
        found.push({ owner: owner.name, list: list.name, at })
      }
    }
  }
  return found
}

/** Does this address answer with a list of rows, each naming the thing `id` in `field`?  - NEVER throws */
async function isListUnder(url: string, field: string, id: unknown, reader: PoliteReader): Promise<boolean> {
  try {
    const { status, text } = await reader.read(url)
    if (status !== 200) return false
    const rows = JSON.parse(text) as unknown
    return (
      Array.isArray(rows) &&
      rows.length > 0 &&
      rows.every((row) => !!row && typeof row === "object" && `${(row as Record<string, unknown>)[field]}` === `${id}`)
    )
  } catch {
    return false
  }
}
