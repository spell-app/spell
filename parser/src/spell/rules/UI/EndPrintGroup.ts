import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `end_print_group` rule:  stop a previous `print group...`
 * - e.g. `end print group`
 */
export class EndPrintGroup extends SpellStatement {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    return new P.ASTConsoleMethodInvocation(match, { methodName: "groupEnd" })
  }
}
