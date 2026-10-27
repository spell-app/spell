import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `absolute_value` rule:  `the absolute value of {expression}`.
 * - e.g. `the absolute value of the difference`
 * - Takes a sum, like `|x + 1|`, but stops before a comparison (`arithmetic_expression`):
 *   `the absolute value of x + 1 is 3` => `absoluteValue(x + 1) == 3`.
 */
export class AbsoluteValue extends SpellExpression<"operator|expression"> {
  @proto static datatype = "number"

  getAST(match: P.MatchFor<this>) {
    const { expression } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "number",
      methodName: "absoluteValue",
      args: [P.asAST<P.ASTExpression>(expression.AST)]
    })
  }
}
