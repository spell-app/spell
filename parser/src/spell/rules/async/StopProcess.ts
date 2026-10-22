import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `stop_process` rule:  stop a conceptual animation or process.
 * - e.g. `stop animation dealing` => `core.stopProcess('dealing')`
 */
export class StopProcess extends SpellStatement<"name"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const { name } = match.groups
    const args = [new P.ASTQuotedExpression(match, name.value)]
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "stopProcess",
      args
    })
  }
}
