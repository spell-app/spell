import { proto } from "spell/util"
import { P } from "spell-parser/parser"

import { Negatable } from "./Negatable"
import { SpellExpression } from "./SpellExpression"

/**
 * `there_is_a` rule:  `there is [not] a`/`an {operand}` or `there is no such {operand}`, e.g. `there is a thing`.
 * - Unlike other rules here this is a plain `expression`, not an `expression_suffix`:
 *   it has no `lhs` to attach to, it stands on its own at the front of an expression.
 * - Takes an `operand`, like a test,
 *   e.g. `there is a winner and the game is over` => `winner !== undefined && ...`
 * - Negates when `operator` contains `no`, covering both `is not a` and `is no such`.
 * - Builds `core.isDefined(expression)`, negated as needed.
 *   Javascript writes it as a test:  `thing !== undefined`, or `thing === undefined` negated.
 */
export class ThereIsA extends SpellExpression<"operator|expression"> {
  @proto static datatype = "choice"

  getAST(match: P.MatchFor<this>): P.ASTNode {
    const { operator } = match.groups
    const expression = new P.ASTCoreMethodInvocation(match, {
      methodName: "isDefined",
      args: [match.groups.expression.AST as P.ASTExpression]
    })
    if (Negatable.isNegated(operator)) {
      return new P.ASTNotExpression(match, { expression })
    }
    return expression
  }
}
