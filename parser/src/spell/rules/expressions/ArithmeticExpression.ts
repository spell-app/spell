import { proto } from "spell/util"
import { CompoundExpression } from "./CompoundExpression"
import { Precedence } from "./expressions.shared"

/**
 * `arithmetic_expression` rule:  an `expression` taking only arithmetic suffixes, `+ - * /`:
 *   stops before a comparison.
 * - e.g. `x + 1` in `the absolute value of x + 1 is 3` => `absoluteValue(x + 1) == 3`
 * - For math prefixes which take a sum (D3):  `absolute_value`, `round_number`.
 */
export class ArithmeticExpression extends CompoundExpression {
  @proto static bound = Precedence.takesSum
}
