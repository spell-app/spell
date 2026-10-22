import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence } from "./expressions.shared"

/**
 * `and` rule:  `{lhs} and {rhs}`, e.g. `thing and other`.
 * - `Precedence.and`:  below `is` / `includes` etc, above `or`.
 */
export class And extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.and
  @proto static parenthesize = true

  getOperator(): P.ASTOperator {
    return "and"
  }
}
