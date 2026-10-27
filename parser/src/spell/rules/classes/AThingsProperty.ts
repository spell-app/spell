import { proto } from "spell/util"
import { P } from "spell-parser/parser"

/**
 * `a_things_property` rule:  `a cards color` -- the other `type_property` spelling, see `the_property_of_a_thing`.
 */
export class AThingsProperty extends P.Sequence<"type|property"> {
  @proto static alias = "type_property"
}
