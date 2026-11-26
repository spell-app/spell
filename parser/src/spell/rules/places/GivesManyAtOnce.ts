import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `gives_many_at_once` rule:  a web server's list takes many ids in one question, joined by commas (epic `data` P57).
 * - e.g. `- it gives many at once by "ids"`:  `/recipes?ids=r-1,r-2,r-3`
 * - So 40 links followed in one moment are one request, not 40:  `RestPlace`'s `manyAtOnceBy`.
 * - Said once, under a web server's line, for every collection of that place.
 */
export class GivesManyAtOnce extends PlaceDetail<"type|param"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { manyAtOnceBy: textIn(match.groups.param) }
  }
}
