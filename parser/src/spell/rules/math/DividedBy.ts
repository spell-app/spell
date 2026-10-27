import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix, Precedence } from "spell/parser/spell/rules/expressions"

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
