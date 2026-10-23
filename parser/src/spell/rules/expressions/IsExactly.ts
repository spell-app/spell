import { proto } from "spell/util"
import { P } from "spell-parser/parser"

import { Negatable } from "./Negatable"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence } from "./expressions.shared"

/** `is_exactly` rule:  `{lhs} is [not] exactly {rhs}`, e.g. `thing is exactly other` -- compiles to `===`/`!==`. */
export class IsExactly extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.equality
  @proto static parenthesize = true

  getOperator(operator: P.Match): P.ASTOperator {
    return Negatable.isNegated(operator) ? "not exactly equals" : "exactly equals"
  }

  /** Negated as `!==`, by `getOperator()`:  never wrapped in a `!(...)` too. */
  shouldNegateOutput(): boolean {
    return false
  }
}
