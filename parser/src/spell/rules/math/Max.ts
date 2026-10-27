import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `max` rule:  `the biggest`/`largest` [thing] `of`/`in` {expression}, e.g. `largest of the prices`.
 * - `Priority.specific` beats `the biggest of x` read as a property (`property_expression`).
 */
export class Max extends SpellExpression<"operator|argument?|expression"> {
  @proto static priority = Priority.specific
  @proto static datatype = "number"

  getAST(match: P.MatchFor<this>) {
    const { expression } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "number",
      methodName: "largestOf",
      args: [P.asAST<P.ASTExpression>(expression.AST)]
    })
  }
}
