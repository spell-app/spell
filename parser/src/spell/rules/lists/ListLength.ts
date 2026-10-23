import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellExpression } from "spell-parser/spell/rules/expressions"
import { getWhereScope, getWhereMethod } from "./lists.shared"

/**
 * `list_length` rule:  return length of a list, e.g. `number of items in my-list` => `core.itemCountOf(myList)`.
 * - `{arg}` (e.g. `items`) captured for readability only, unless there's a `where`.
 * - With `where`, counts the items which pass, as `list_filter` does,
 *   e.g. `the number of cards in the deck where its color is red`
 *   => `core.itemCountOf(core.filter(deck, ...))`
 *   - Its own syntax, as `cards in the deck where ...` can't be a `list_filter` here:
 *     we've read `cards in` already.
 * - `Priority.mostSpecific` -- preferred over lower-priority expression rules when tokens are ambiguous.
 * - Rejects the match when `{list}` is KNOWN to be one thing, not a list, e.g. a `Card`:
 *   Spanish's `el número de palos de card` is then `list_count` of the card's values, `Card.Palos`.
 */
export class ListLength extends SpellExpression<"arg|list|body?"> {
  @proto static priority = Priority.mostSpecific
  @proto static datatype = "number"

  /** Not a thing known to be no list -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const listType = scope.getType(match.groups.list.datatype)
    if (listType && !listType.isA("list") && listType.isA("thing")) return undefined
    return match
  }

  /** Nested scope for a `where` body -- singularized `{arg}` variable, also aliased from `it`. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return getWhereScope(match, match.groups.arg, match.groups.list)
  }
  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { arg, list } = match.groups
    const body = this.getBody(match)
    const items = body
      ? new P.ASTCoreMethodInvocation(match, {
          methodName: "filter",
          args: [P.matchAST(list), getWhereMethod(match, arg, body)]
        })
      : P.matchAST(list)
    return new P.ASTCoreMethodInvocation(match, { methodName: "itemCountOf", args: [items] })
  }
}
