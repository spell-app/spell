import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `list_remove` rule:  remove all instances of something from a list.
 * - Compiles to `core.remove(list, thing)`, e.g. `remove thing from my-list` =>
 *   `core.remove(myList, thing)`.
 */
export class ListRemove extends SpellStatement<"thing|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { thing, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "remove",
      args: [P.matchAST(list), P.matchAST(thing)]
    })
  }
}
