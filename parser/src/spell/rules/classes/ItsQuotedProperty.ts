import { proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `its_quoted_property` rule:  `its "color"` in an outline body -- the third `type_property` spelling.
 * - For `property_value_either`:  `- its "color" is red if its suit is either diamonds or hearts otherwise it is black`
 * - The quotes are optional (epic page Q4):  `- its color is red if ...`.
 */
export class ItsQuotedProperty extends P.Sequence<"type|property"> {
  @proto static alias = "type_property"
}
