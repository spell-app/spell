import { proto } from "spell/util"
// Import directly to avoid circular import
import { ListFilter } from "./ListFilter"

/**
 * `each_item_where` rule:  a loop's item, its list and the condition it must meet (epic `language` T133),
 * e.g. `card in the deck which is not in the stock`, in `for each card in the deck which is not in the stock`.
 * - The list filtered, as `list_filter`:  `core.filter(deck, (card) => !core.includes(stock, card))`.
 *   Its item and `it` are each card, in the condition.
 * - Its item said once, as a loop says it:  `card`, not `cards`.
 * - Only a loop's (`list_iteration`):  never an expression of its own, so `card in the deck where ...` alone is nothing.
 */
export class EachItemWhere extends ListFilter {
  @proto static alias: string | string[] = []
}
