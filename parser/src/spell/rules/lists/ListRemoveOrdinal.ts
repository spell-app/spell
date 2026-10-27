import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `list_remove_ordinal` rule:  remove one item from list by ordinal position,
 * e.g. `remove last card of deck` => `core.removeItemAt(deck, -1)`.
 * - `{arg}` (e.g. `card`) captured for readability only, unused in output.
 */
export class ListRemoveOrdinal extends SpellStatement<"position|arg|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { position, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "removeItemAt",
      args: [P.matchAST(list), P.matchAST(position)]
    })
  }
}
