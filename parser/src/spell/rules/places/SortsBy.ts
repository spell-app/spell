import { fieldsOrEvery, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `sorts_by` rule:  which fields a web server sorts by itself, and what it calls that (epic `data` I35).
 * - e.g. `- it sorts by title and date`, `- it sorts by every field`, `- it sorts by date with "order"`
 * - Then `every recipe sorted by its title` asks the server, `?sort=title`;  highest first is `?sort=-title`.
 * - Left without `with`, the question is called `sort`.
 * - A sort on a field not named here stays here.
 * - For every collection of that place.
 */
export class SortsBy extends PlaceDetail<"type|fields?|param?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { fields, param } = match.groups
    return { sorts: fieldsOrEvery(fields), ...(param && { sortedWith: textIn(param) }) }
  }
}
