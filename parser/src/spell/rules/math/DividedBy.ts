import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { InfixOperatorSuffix, Precedence } from "spell-lang/spell/rules/expressions"

/**
 * `divided_by` rule:  `/` / `divided by`, e.g. `price / taxRate` -- `Precedence.product`, same as `*`.
 */
export class DividedBy extends InfixOperatorSuffix {
  @proto static precedence = Precedence.product
  @proto static parenthesize = true
  @proto static datatype = "number"

  getOperator(): P.ASTOperator {
    return "divided by"
  }
}
