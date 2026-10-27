import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `min` rule:  `the smallest` [thing] `of`/`in` {expression}, e.g. `smallest of prices`.
 * - `Priority.specific`, same reasoning as `max`.
 */
export class Min extends SpellExpression<"operator|argument?|expression"> {
  @proto static priority = Priority.specific
  @proto static datatype = "number"

  getAST(match: P.MatchFor<this>) {
    const { expression } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "number",
      methodName: "smallestOf",
      args: [P.asAST<P.ASTExpression>(expression.AST)]
    })
  }
}
