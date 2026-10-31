import { P } from "spell/parser/parser"
import { Negatable, SpellExpression } from "spell/parser/spell/rules/expressions"
import { SpellType } from "spell/parser/spell/rules/types"

/**
 * `check_process` rule:  check whether a conceptual animation or process is currently running.
 * - e.g. `animation dealing is running`
 * - `is not`/`isn't`/`isnt` negate the check via `P.ASTNotExpression`.
 */
export class CheckProcess extends SpellExpression<"name|operator"> {
  /** Notes its old word, `animation`, now `process` (epic `language` P13). */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    return match && SpellType.noteRetiredLiterals(match)
  }
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
