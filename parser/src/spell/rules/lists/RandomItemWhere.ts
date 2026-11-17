import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { ListFilter } from "./ListFilter"

/**
 * `random_item_where` rule:  one item of a list that passes a test, at random (epic `language` I152) --
 * `a random card in the columns where it is face down`.
 * - The test is the item's, as `list_filter`'s is:  `{arg}` and `it` are each item.
 * - Of lists of lists, its word naming THEIR items:  every list's items, together -- see `list_filter`.
 * - Compiles to `core.randomItemOf(core.filter(...))`:  nothing if none passes.
 * - Without it, `a random card in the columns where ...` read the `where` as the columns' own:
 *   a random COLUMN whose cards ... (`the columns where it is face down`), each column tested as a card.
 */
export class RandomItemWhere extends ListFilter {
  /** One of the items which pass. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return match.scope.getItemType(super.getDatatype(match))
  }
  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "randomItemOf", args: [super.getAST(match)] })
  }
}
