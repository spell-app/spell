import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/** `do_nothing` rule:  a no-op statement -- compiles to `core.doNothing()`. */
export class DoNothing extends SpellStatement {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "doNothing" })
  }
}
