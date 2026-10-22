import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { tests } from "./tests.parser"

/** `end_test` rule:  `end test` -- marks end of the current named test run started by `start_test`. */
export class EndTest extends SpellStatement {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "endTest"
    })
  }
}
tests.addRule(EndTest, {
  syntax: "end test"
})
