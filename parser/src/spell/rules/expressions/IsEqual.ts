import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"

import { Negatable } from "./Negatable"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence } from "./expressions.shared"

/** `is_equal` rule:  `{lhs} is [not] {rhs}`, e.g. `thing is other` -- compiles to `==`/`!=`. */
export class IsEqual extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.equality
  @proto static parenthesize = true

  getOperator(operator: P.Match): P.ASTOperator {
    return Negatable.isNegated(operator) ? "not equals" : "equals"
  }

  /** Negated as `!=`, by `getOperator()`:  never wrapped in a `!(...)` too. */
  shouldNegateOutput(): boolean {
    return false
  }
}
