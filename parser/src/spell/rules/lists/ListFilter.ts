import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import {
  getWhereScope,
  getWhereMethod,
  itemsAcrossAST,
  itemsAcrossDatatype,
  itemsAcrossOf,
  type ItemsAcross
} from "./lists.shared"

/**
 * `list_filter` rule:  list filter, e.g. `words in "a word list" where word starts with "a"`.
 * - Trailing `where` expects an inline expression as filter body (`{inline_expression}?`),
 *   parsed in a nested `MethodScope` where singularized `{arg}` (e.g. `word`
 *   for `words`) and `it` both map to current item.
 * - Or `which`, `that`, `who`, the item its subject (epic `language` T133):
 *   `the cards in the deck which are face up` ~== `... where it is face up` -- see `SpellStatement.withWhichSubject()`.
 * - `Priority.specific` -- preferred over lower-priority expression rules when tokens are ambiguous.
 * - Compiles to `core.filter(list, (item) => { ... })`.
 * - Of lists of lists, their items together (epic `language` T130):
 *   `the cards in the foundations where ...` filters every foundation's cards -- see `itemsAcrossDatatype()`.
 */
export class ListFilter extends SpellExpression<"arg|list|where|body?", { across?: ItemsAcross }> {
  @proto static priority = Priority.specific
  /** `cards in the deck where ...`:  items -- see `SpellExpression.saysItems`. */
  @proto static saysItems = true

  /** Notes `across`, when its body didn't:  `the cards in the foundations where`, with no condition yet. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match && !match.data.across) match.data.across = itemsAcrossOf(scope, match.groups.arg, match.groups.list)
    return match
  }

  /** Nested scope for filter body -- singularized `{arg}` variable, also aliased from `it`. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { arg, list } = match.groups
    // noted now, while parsing:  the body parses in this scope, its item what the lists hold
    match.data.across = itemsAcrossOf(match.scope, arg, list)
    const across = itemsAcrossDatatype(match.data.across)
    return getWhereScope(match, arg, across ? { datatype: across } : list)
  }
  /** The items which pass:  the list's type, or its lists' items' (`across`). */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return itemsAcrossDatatype(match.data.across) ?? match.groups.list.datatype
  }
  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { arg, list } = match.groups
    const filter = getWhereMethod(match, arg, this.getBody(match))
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "filter",
      args: [itemsAcrossAST(match, list, match.data.across), filter]
    })
  }
}
