import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `start_test` rule:  `start test {message}` or `start quiet test {message}` -- marks beginning of a named test run.
 * - `quiet` suppresses normal test output (e.g. for tests nested inside other tests).
 */
export class StartTest extends SpellStatement<"quiet?|message"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const { quiet, message } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "startTest",
      args: [P.matchAST<P.ASTStringLiteral>(message), new P.ASTBooleanLiteral(match, !!quiet)]
    })
  }
}
