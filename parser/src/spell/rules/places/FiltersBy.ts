import { fieldsOrEvery, PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `filters_by` rule:  which fields a web server filters by itself (epic `data` I35).
 * - e.g. `- it filters by cuisine and rating`, `- it filters by every field`
 * - Then `every recipe where its cuisine is "thai"` asks the server, `?cuisine=thai`,
 *   instead of loading its rows and looking through them here.
 * - A filter on a field not named here, or on several with one not named, stays here.
 * - Each field is one word, as with `it searches names with "search"`:  two words are joined, `cook-time`.
 * - For every collection of that place.
 */
export class FiltersBy extends PlaceDetail<"type|fields?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { filters: fieldsOrEvery(match.groups.fields) }
  }
}
