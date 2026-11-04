import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `scroll_to_top` rule:  bring the top of the app back into view, as a new page of it opens (epic `data` P19).
 * - e.g. `scroll to the top`
 * - Compiles to `core.scrollToTop()`.
 */
export class ScrollToTop extends SpellStatement {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, { methodName: "scrollToTop" })
  }
}
