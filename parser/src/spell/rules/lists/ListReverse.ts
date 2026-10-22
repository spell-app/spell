import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/** `list_reverse` rule:  reverse list in-place, e.g. `reverse my-list` => `core.reverse(myList)`. */
export class ListReverse extends SpellStatement<"arg?|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "reverse",
      args: [P.matchAST(list)]
    })
  }
}
