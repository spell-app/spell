import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { Negatable } from "spell-lang/spell/rules/expressions"

/**
 * `start_process` rule:  start a conceptual animation or process, e.g. `start animation dealing`.
 * - An `exclusive` process (`operator`, un-negated:  `exclusive_or_not`) guards against re-entry:
 *   it compiles to an early `return` if the process is already running, then starts it flagged `'EXCLUSIVE'`.
 * - `animation`/`process` are synonyms in the syntax -- purely for readability at the call site.
 */
export class StartProcess extends SpellStatement<"operator?|name"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const { operator, name } = match.groups
    return new P.ASTStartProcessInvocation(match, {
      name: name.value,
      exclusive: !!operator && !Negatable.isNegated(operator)
    })
  }
}
