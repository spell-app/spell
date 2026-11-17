import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import {
  itemsAcrossAST,
  itemsAcrossDatatype,
  itemsAcrossOf,
  refuseIfNamesNoItems,
  type ItemsAcross
} from "./lists.shared"

/**
 * `list_items_in` rule:  a list's items, by their word -- `the cards in the discard pile`, `cards in the columns`
 * (epic `language` I152).
 * - A list of things:  the list itself, `the cards in the discard pile` => `this.discardPile`.
 * - A list of lists, its word naming THEIR items:  every list's items, together, in the lists' order --
 *   `cards in the columns` => `core.mergeLists(core.everyThing(Column))` (see `itemsAcrossAST()`).
 *   - Its word naming the lists themselves, `the piles in the columns`:  the columns.
 * - A word naming neither, when both are known, is refused, saying what the list holds:  `the columns in the deck`.
 * - Only `in`:  `the cards of the deck` is the deck's `cards`, a property.
 * - Not of one thing known to be no list:  `cards in the card's pile` is `cards in (the card's pile)`.
 * - With a `where`, it's `list_filter`'s:  `cards in the columns where it is face up`.
 */
export class ListItemsIn extends SpellExpression<"arg|list", { across?: ItemsAcross }> {
  /** `cards in the deck`:  items -- see `SpellExpression.saysItems`. */
  @proto static saysItems = true

  /** Notes what its lists hold, while it can look:  read again when compiling, see `isAcross()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { arg, list } = match.groups
    // not one thing, known to be no list:  `cards in the card's pile` is the card's pile's
    const listType = scope.getType(list.datatype)
    if (listType && !listType.isA("list") && listType.isA("thing")) return undefined
    match.data.across = itemsAcrossOf(scope, arg, list)
    refuseIfNamesNoItems(match, arg, list)
    return match
  }
  /** Its items:  the list's own type, or its lists' items' (`across`). */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return itemsAcrossDatatype(match.data.across) ?? match.groups.list.datatype
  }
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    return itemsAcrossAST(match, match.groups.list, match.data.across)
  }
}
