import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { CanDo } from "./CanDo"
import {
  getWhereMethod,
  getWhereScope,
  itemOfItemsAcross,
  itemsAcrossAST,
  itemsAcrossDatatype,
  itemsAcrossOf,
  type ItemsAcross
} from "./lists.shared"

/**
 * `ordinal_where_expression` rule:  the first (second, last ...) item of a list that passes a test
 * (epic page `outline-spell`, P26).
 * - e.g. `the first pile in the piles where it can take the card`
 * - The same as `the first pile in (piles in the piles where it can take the card)`:
 *   `{arg}` and `it` are each item in the `where`, as `list_filter`'s are.
 * - Compiles to `core.getItemAt(core.filter(list, (pile) => ...), 0)`:  nothing if none passes.
 *   - Its test asking an action (`where it can play the card`, `CanDo`, epic `language` T146):
 *     `core.itemWhere(list, (card) => ..., 0)`, one item at a time, stopping at the first yes, so no card after it is
 *     played;  `await core.itemWhereInTurn(...)` when the action waits.
 * - Of lists of lists, its word naming THEIR items:  every list's items, together, in the lists' order
 *   (epic `language` I152) -- `the first card in the columns where it is face up` is a card, not a column;
 *   see `itemsAcrossDatatype()`.
 */
export class OrdinalWhereExpression extends SpellExpression<"ordinal|arg|list|where|body?", { across?: ItemsAcross }> {
  @proto static priority = Priority.specific

  /** Notes `across`, when its body didn't:  `the first card in the columns where`, with no condition yet. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match && !match.data.across) match.data.across = itemsAcrossOf(scope, match.groups.arg, match.groups.list)
    return match
  }

  /** Nested scope for the `where` -- each item, as `{arg}` and `it`. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { arg, list } = match.groups
    // noted now, while parsing:  the body parses in this scope, its item what the lists hold
    match.data.across = itemsAcrossOf(match.scope, arg, list)
    const across = itemsAcrossDatatype(match.data.across)
    return getWhereScope(match, arg, across ? { datatype: across } : list)
  }

  /** One of the list's items, or of its lists' items (`across`). */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return itemOfItemsAcross(match.scope, match.groups.list, match.data.across)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { ordinal, arg, list } = match.groups
    const body = this.getBody(match)
    const items = itemsAcrossAST(match, list, match.data.across)
    const condition = getWhereMethod(match, arg, body)
    // asks an action (`can play the card`, which plays it):  one item at a time, stopping at the answer
    if (body && CanDo.isIn(body)) {
      return new P.ASTCoreMethodInvocation(match, {
        methodName: "itemWhere",
        args: [items, condition, P.matchAST(ordinal)]
      })
    }
    const passing = new P.ASTCoreMethodInvocation(match, { methodName: "filter", args: [items, condition] })
    return new P.ASTCoreMethodInvocation(match, { methodName: "getItemAt", args: [passing, P.matchAST(ordinal)] })
  }
}
