import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `lists_give_only` rule:  a web server whose lists hold only a little of each row, its whole at the row's own address
 *   (epic `data` P27).
 * - e.g. `- its lists give only each one's "name"`:  PokéAPI's `{ "name": "pikachu", "url": "https://..." }`
 * - e.g. `- its lists give only each one's "name" and "title"`
 * - Its id needn't be named:  it's the address the rest is read from (`its id is its "url"`).
 * - A field the list didn't give is read from that address the first time something reads it, once for each thing.
 */
export class ListsGiveOnly extends PlaceDetail<"type|field|more?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { field, more } = match.groups
    return { listsGive: [textIn(field), ...(more ? [textIn(more)] : [])] }
  }
}
