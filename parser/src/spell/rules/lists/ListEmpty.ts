import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `list_empty` rule:  empty a list in-place, e.g. `empty my-list` => `core.clear(myList)`.
 * TODO: make `empty` and/or `clear` a generic statement???
 */
export class ListEmpty extends SpellStatement<"list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "clear",
      args: [P.matchAST(list)]
    })
  }
}
