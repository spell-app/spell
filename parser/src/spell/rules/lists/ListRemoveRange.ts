import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `list_remove_range` rule:  remove range of items from list, e.g. `remove items 2 to 4 of my-list`.
 * - `{arg}` (e.g. `items`) captured for readability only, unused in output.
 * - NOTE: `start` is **1-based** in spell, and `end` is inclusive!
 *   Both compile to `slice()`'s indexes:  `core.removeRangeBetween(myList, 1, 4)`.
 */
export class ListRemoveRange extends SpellStatement<"arg|start|end|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { start, end, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "removeRangeBetween",
      args: [P.matchAST(list), P.matchAST(start), P.matchAST(end)]
    })
  }
}
