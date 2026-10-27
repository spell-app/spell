import { P } from "spell/parser/parser"
import { Negatable, SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `check_process` rule:  check whether a conceptual animation or process is currently running.
 * - e.g. `animation dealing is running`
 * - `is not`/`isn't`/`isnt` negate the check via `P.ASTNotExpression`.
 */
export class CheckProcess extends SpellExpression<"name|operator"> {
  getAST(match: P.MatchFor<this>) {
    const { operator, name } = match.groups
    const expression = new P.ASTCoreMethodInvocation(match, {
      methodName: "processIsRunning",
      args: [new P.ASTQuotedExpression(match, name.value)]
    })
    if (!Negatable.isNegated(operator)) return expression
    return new P.ASTNotExpression(match, { expression })
  }
}
