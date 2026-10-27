import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `list_remove_range_ordinal` rule:  remove range of items from list using ordinal words for both ends,
 * e.g. `remove first to third cards of the deck` => `core.removeRangeBetween(deck, 0, 3)`.
 * - `{arg}` (e.g. `cards`) captured for readability only, unused in output.
 */
export class ListRemoveRangeOrdinal extends SpellStatement<"start|end|arg|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { start, end, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "removeRangeBetween",
      args: [P.matchAST(list), P.matchAST(start), P.matchAST(end)]
    })
  }
}

// TODO: `remove last card from the deck`
// TODO: `remove last two cards from the deck`
