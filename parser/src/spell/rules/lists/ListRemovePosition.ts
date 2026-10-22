import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `list_remove_position` rule:  remove one item from list by numeric position.
 * - `{arg}` (e.g. `item`) captured for readability only, unused in output.
 * - Compiles to `core.removeItemAt(list, index)`, its index from 0:
 *   `remove item 4 of my-list` => `core.removeItemAt(myList, 3)`.
 */
export class ListRemovePosition extends SpellStatement<"arg|number|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { number, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "removeItemAt",
      args: [P.matchAST(list), P.matchAST(number)]
    })
  }
}
