import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"

/**
 * `a_things_property` rule:  `a cards color` -- the other `type_property` spelling, see `the_property_of_a_thing`
 * above.
 */
export class AThingsProperty extends P.Sequence<"type|property"> {
  @proto static alias = "type_property"
}
