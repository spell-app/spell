import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

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
