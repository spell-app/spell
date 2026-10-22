import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

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
