import { collectionNameFor } from "./places.shared"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `lists_under` rule:  a web server keeps a list under each thing of a type, at an address of its own (epic `data` P30).
 * - e.g. `- a post's comments live at "/posts/{id}/comments"`:  JSONPlaceholder's comments on each post
 * - The type's property names the list, `its "comments" is a list of comments`:  reading it reads that address,
 *   the thing's id in its braces, the first time something reads it.
 * - Whatever the braces say, it's the thing's id.
 */
export class ListsUnder extends PlaceDetail<"owner|property|path"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { owner, property, path } = match.groups
    const collection = collectionNameFor(`${owner.raw}`)
    const at = textIn(path).replace(/\{[^{}/]*\}/, "{id}")
    return { listsUnder: { [collection]: { [fieldNamed(textIn(property))]: at } } }
  }
}
