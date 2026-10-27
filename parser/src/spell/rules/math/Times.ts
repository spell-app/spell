import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix, Precedence } from "spell/parser/spell/rules/expressions"

/**
 * `times` rule:  `*` / `times`, e.g. `price * taxRate` -- `Precedence.product`, tightest, alongside `/`.
 */
export class Times extends InfixOperatorSuffix {
  @proto static precedence = Precedence.product
  @proto static parenthesize = true
  @proto static datatype = "number"

  getOperator(): P.ASTOperator {
    return "times"
  }
}
