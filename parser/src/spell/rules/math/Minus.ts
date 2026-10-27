import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix, Precedence } from "spell/parser/spell/rules/expressions"

/**
 * `minus` rule:  `minus` / `-`, e.g. `price - tax`.
 * - NOTE: bare `-` requires surrounding spaces -- otherwise it'd clash with negative-number literals:
 *   see the commented-out test in `math.en.ts`.
 */
export class Minus extends InfixOperatorSuffix {
  @proto static precedence = Precedence.sum
  @proto static parenthesize = true
  @proto static datatype = "number"

  getOperator(): P.ASTOperator {
    return "minus"
  }
}
