import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import { Wording } from "spell/parser/spell/rules/expressions"
import type { P } from "spell/parser/parser"

/**
 * `writes_like` rule:  how a place writes its numbers or its fields' names, by an example (epic `data` P23).
 * - e.g. `- it writes numbers like "1.200,5"`:  a comma is the fraction's mark, a dot groups thousands
 * - e.g. `- it writes names like "hair_color"`:  a field it hasn't sent yet is written so, for a save or a query
 * - Neither is needed most of the time:  a number's text says which mark it uses, when it can, and a name read is matched by its words.
 *   The ingest writes one when what it read says so.
 */
export class WritesLike extends PlaceDetail<"type|what|example"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const example = textIn(match.groups.example)
    return Wording.meaningOf(match.groups.what) === "names" ? { namesLike: example } : { numbersLike: example }
  }
}
