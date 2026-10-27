import { proto } from "spell/util"
import { P } from "spell/parser/parser"
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
