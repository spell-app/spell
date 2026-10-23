import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/** `end_test` rule:  `end test` -- marks end of the current named test run started by `start_test`. */
export class EndTest extends SpellStatement {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "endTest"
    })
  }
}
