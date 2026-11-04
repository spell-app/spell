import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `searches_with` rule:  which fields a web server searches, for text they hold, and the query parameter it takes (epic `data` P26, T70).
 * - e.g. `- it searches names with "search"`, `- it searches names and titles with "search"`
 * - Then `every character where its name includes the search` asks the server, `/people/?search=sky`,
 *   instead of reading every page and looking through them here.
 *   The program still checks what comes back:  a server may match more loosely.
 * - Each field by its words, as written, plural or not:  `names` is a thing's `name`, `nombres` its `nombre`
 *   (`isSearchedField()`;  no inflector guesses, which Spanish's `nombres` would trip).
 * - Compiles to `searches: { param: "search", fields: ["names", "titles"] }`, on the place's `core.place()`.
 */
export class SearchesWith extends PlaceDetail<"type|fields|param"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const fields = match.groups.fields.items.map((item: P.Match) => fieldNamed(textIn(item)))
    return { searches: { param: textIn(match.groups.param), fields } }
  }
}
