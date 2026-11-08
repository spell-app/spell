import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix, type OperatorOperands, Precedence } from "spell/parser/spell/rules/expressions"

/**
 * `plus` rule:  `plus` / `+`, e.g. `price + tax` -- `Precedence.sum`:  tighter than comparisons, looser than `*` `/`.
 */
export class Plus extends InfixOperatorSuffix {
  @proto static precedence = Precedence.sum
  @proto static parenthesize = true

  /**
   * What `+` makes of its sides:
   * - `text` if either side is text:  javascript joins them
   * - `number` if both are numbers
   * - else unknown:  `x + y` might be either
   */
  getResultDatatype(
    match: P.MatchFor<this>,
    lhs: P.Datatype | undefined,
    rhs: P.Datatype | undefined
  ): P.Datatype | undefined {
    if (Plus.isTextual(lhs) || Plus.isTextual(rhs)) return "text"
    if (Plus.isNumeric(lhs) && Plus.isNumeric(rhs)) return "number"
    return undefined
  }

  getOperator(): P.ASTOperator {
    return "plus"
  }

  /**
   * `lhs + rhs`, a date on either side said as a drawing says it (`core.dateShown()`):
   * `"at " + its time` => `at November 7, 2026`, never a `Date`'s own text.
   * - Its parts say it other ways:  `"at " + the short time of its time`.
   */
  compileASTExpression(match: P.MatchFor<this>, { lhs, operator, rhs }: OperatorOperands): P.ASTNode {
    return super.compileASTExpression(match, { lhs: Plus.dateShown(lhs), operator, rhs: Plus.dateShown(rhs) })
  }

  /** `side`, through `core.dateShown()` if it's a date. */
  private static dateShown(side: P.ASTExpression | undefined): P.ASTExpression | undefined {
    if (side?.match.datatype !== "date") return side
    return new P.ASTCoreMethodInvocation(side.match, { methodName: "dateShown", args: [side] })
  }

  /** Is `datatype` text, or one letter of it? */
  private static isTextual(datatype: P.Datatype | undefined): boolean {
    return datatype === "text" || datatype === "letter"
  }

  /** Is `datatype` a number, or an integer? */
  private static isNumeric(datatype: P.Datatype | undefined): boolean {
    return datatype === "number" || datatype === "integer"
  }
}
