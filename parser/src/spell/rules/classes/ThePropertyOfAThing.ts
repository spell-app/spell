import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"

/**
 * `the_property_of_a_thing` rule:  `the color of a card` -- one of two `type_property` spellings,
 * read by `property_value_either` and `property_value_getter`.
 * - No `getAST()`:  they read `match.groups.type` / `.property` directly.
 */
export class ThePropertyOfAThing extends P.Sequence<"property|type"> {
  @proto static alias = "type_property"
}
