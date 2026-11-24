import { collectionNameFor } from "./places.shared"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `lists_under` rule:  a web server keeps a list under each thing of a type, at an address of its own (epic `data` P30).
 * - e.g. `- a post's comments live at "/posts/{id}/comments"`:  JSONPlaceholder's comments on each post
 * - The type's property names the list, `its "comments" is a list of comments`:  reading it reads that address,
 *   the thing's id in its braces, the first time something reads it.
 * - Or ONE thing under each, `- a system's snapshot lives at "/instances/{id}/snapshot"`:
 *   its property is that one thing, `its "snapshot" is a snapshot`, read from there the same way.
 * - Each brace names one of the thing's own fields, in words or as compiled code names it:
 *   `- an order's receipt lives at "/orders/{id}/receipts/{current receipt id}"`.  `{id}` is its id.
 *   - A first brace naming no field of the thing is its id, as every line said before:  `"/posts/{postId}/comments"`.
 *   - A thing whose field holds no value has nothing there:  nothing is read.
 */
export class ListsUnder extends PlaceDetail<"owner|property|path"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { owner, property, path } = match.groups
    const collection = collectionNameFor(`${owner.raw}`)
    const at = textIn(path).replace(/\{([^{}/]*)\}/g, (_brace, name: string) => `{${fieldNamed(name)}}`)
    return { listsUnder: { [collection]: { [fieldNamed(textIn(property))]: at } } }
  }
}
