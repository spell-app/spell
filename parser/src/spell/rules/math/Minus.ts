import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { InfixOperatorSuffix, type OperatorOperands, Precedence } from "spell/parser/spell/rules/expressions"
import { dateMathAST, dateMathDatatype } from "./dateMath"

/**
 * `minus` rule:  `minus` / `-`, e.g. `price - tax`.
 * - NOTE: bare `-` requires surrounding spaces -- otherwise it'd clash with negative-number literals:
 *   see the commented-out test in `math.en.ts`.
 * - With dates (epic `language` P63, `dateMathAST()`):  a date minus a duration is an earlier date, `its due - 1 hour`;
 *   a date minus a date is the duration between them, in seconds, `the next weekend - now`.
 */
export class Minus extends InfixOperatorSuffix {
  @proto static precedence = Precedence.sum
  @proto static parenthesize = true
  @proto static datatype = "number"

  /** A number, but a date for a date minus a duration. */
  getResultDatatype(
    match: P.MatchFor<this>,
    lhs: P.Datatype | undefined,
    rhs: P.Datatype | undefined
  ): P.Datatype | undefined {
    return dateMathDatatype("minus", lhs, rhs) ?? "number"
  }

  /** A date minus a date measures a duration, in seconds -- see `SP.measureOf()`. */
  resultMeasure(lhs?: P.Datatype, rhs?: P.Datatype): P.Measure | undefined {
    return lhs === "date" && rhs === "date" ? SP.SECONDS : undefined
  }

  getOperator(): P.ASTOperator {
    return "minus"
  }

  compileASTExpression(match: P.MatchFor<this>, operands: OperatorOperands): P.ASTNode {
    return dateMathAST(match, "minus", operands.lhs, operands.rhs) ?? super.compileASTExpression(match, operands)
  }
}
