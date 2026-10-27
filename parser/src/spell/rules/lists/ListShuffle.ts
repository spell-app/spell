import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `list_shuffle` rule:  shuffle (randomize) list in-place:
 * e.g. `shuffle my-list` => `core.randomize(myList)`.
 */
export class ListShuffle extends SpellStatement<"arg?|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "randomize",
      args: [P.matchAST(list)]
    })
  }
}
