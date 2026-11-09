import { collectionNameFor } from "./places.shared"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `picture_at` rule:  a field holding a picture's id, on another server, and where its pictures are (epic `data` P29).
 * - e.g. `- a book's "cover i" is a picture at "https://covers.openlibrary.org/b/id/{id}-M.jpg"`
 * - Its value is then the picture's address, built as each row is read:
 *   `11481354` => `https://covers.openlibrary.org/b/id/11481354-M.jpg`.
 *   So `<image src={its cover i} />` shows it.
 * - Whatever the braces say, the field's value goes there.
 * - Compiles to `collections: { books: { pictures: { coverI: "https://..." } } }`, which `RestPlace` reads.
 */
export class PictureAt extends PlaceDetail<"owner|property|path"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { owner, property, path } = match.groups
    const collection = collectionNameFor(`${owner.raw}`)
    return { collections: { [collection]: { pictures: { [fieldNamed(textIn(property))]: textIn(path) } } } }
  }
}
