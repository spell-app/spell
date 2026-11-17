import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { PossessiveProperty } from "spell/parser/spell/rules/properties"
import { itemOfItemsAcross, itemsAcrossAST, itemsAcrossOf, type ItemsAcross } from "./lists.shared"

/**
 * Base for rules which pick ONE item out of a list, e.g. `the first card of the deck`:  what we are is an item of it.
 * - Notes what the list holds WHILE PARSING, into `data.itemType`, e.g. `Card` for `the deck`.
 * - Why then:  it's a scope lookup -- a `Deck`'s item type is on its `TypeScope` -- and `getDatatype()` mustn't look.
 * - Of a list of lists, its word naming THEIR items:  one of every list's items, together (epic `language` I152) --
 *   `the first card in the columns` is the first column's first card, not the first column.
 *   - Only a rule whose syntax names the item (`{arg}`);  its `getAST()` reads the list through `itemsList()`.
 */
export class ListItemExpression<Groups extends string | P.AnyGroups = P.AnyGroups> extends SpellExpression<
  Groups,
  ListItemData
> {
  /** Group holding the list, e.g. `list` in `a random {arg} of {list}`. */
  declare listGroup: string
  @proto static listGroup = "list"

  /** Note what the list holds, while we can look it up -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    const list = match?.groups[this.listGroup] as P.Match | undefined
    if (match && list) (match.data as ListItemData).itemType = scope.getItemType(list.datatype)
    const arg = match?.groups.arg
    if (match && list && arg instanceof P.Match) (match.data as ListItemData).across = itemsAcrossOf(scope, arg, list)
    // `the first card of the deck's top card`, when the first card of the deck has a top card too
    if (match) PossessiveProperty.warnIfEitherReading(scope, tokens, match)
    return match
  }
  /** The list, what follows our `of`. */
  ofObject(match: P.Match) {
    return match.groups[this.listGroup] as P.Match | undefined
  }
  /** An item of the list, e.g. `Card` for `the first card of the deck`, or of its lists (`across`). */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    const list = (match as P.Match).groups[this.listGroup] as P.Match | undefined
    const across = list && match.data.across ? itemOfItemsAcross(match.scope, list, match.data.across) : undefined
    return across ?? match.data.itemType
  }
  /** The list our item is one of:  its lists' items merged, when its word names those -- see class docs. */
  itemsList(match: P.MatchFor<this>): P.ASTExpression {
    const list = (match as P.Match).groups[this.listGroup] as P.Match
    return itemsAcrossAST(match as P.Match, list, match.data.across)
  }
}

/** What a `ListItemExpression` stashes on its match. */
type ListItemData = {
  /** What the list holds, e.g. `Card`, looked up while parsing -- `undefined` if unknown. */
  itemType?: P.Datatype
  /** What its lists hold, when its word may name their items -- see `itemsAcrossOf()` */
  across?: ItemsAcross
}
