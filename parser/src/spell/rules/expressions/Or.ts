import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence } from "./expressions.shared"

/**
 * `or` rule:  `{lhs} or {rhs}`, e.g. `thing or other`
 *   -- `Precedence.or`:  lowest of the boolean / comparison suffixes.
 */
export class Or extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.or
  @proto static parenthesize = true

  getOperator(): P.ASTOperator {
    return "or"
  }
}
