import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { SpellType } from "spell/parser/spell/rules/types"

/**
 * `stop_process` rule:  stop a conceptual animation or process.
 * - e.g. `stop animation dealing` => `core.stopProcess('dealing')`
 */
export class StopProcess extends SpellStatement<"name"> {
  @proto static alias = "statement"

  /** Notes its old word, `animation`, now `process` (epic `language` P13). */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    return match && SpellType.noteRetiredLiterals(match)
  }

  getAST(match: P.MatchFor<this>) {
    const { name } = match.groups
    const args = [new P.ASTQuotedExpression(match, name.value)]
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "stopProcess",
      args
    })
  }
}
