import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `gives_fields_named_in` rule:  a web server answers with only the fields it's asked for (epic `data` I35).
 * - e.g. `- it gives only the fields named in "response_fields"`:  REST Countries' `?response_fields=name,region`
 * - A read then asks for what the program uses, and a thing's id, and nothing more.
 * - Not `its lists give only each one's "name"`, a server that gives only that, however it's asked.
 * - For every collection of that place.
 */
export class GivesFieldsNamedIn extends PlaceDetail<"type|param"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { fieldsNamedIn: textIn(match.groups.param) }
  }
}
