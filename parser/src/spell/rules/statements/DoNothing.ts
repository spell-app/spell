import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/** `do_nothing` rule:  a no-op statement -- compiles to `core.doNothing()`. */
export class DoNothing extends SpellStatement {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "doNothing" })
  }
}
