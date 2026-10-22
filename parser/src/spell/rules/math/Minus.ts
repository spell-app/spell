import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { InfixOperatorSuffix, Precedence } from "spell-lang/spell/rules/expressions"

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
