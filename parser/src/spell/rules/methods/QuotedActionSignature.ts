import { proto } from "spell/util"

import { QuotedMethodSignature } from "./QuotedMethodSignature"

/**
 * `quoted_action_signature` rule:  an action's QUOTED name, its blanks read as the unquoted name's are
 * (epic `language` I97).
 * - e.g. `to "count the points for a card on a pile"` ~== `to count the points for a card on a pile`:
 *   `a card` and `a pile` name known kinds, so they're its blanks;  the quotes only mark where its name ends.
 * - Words that aren't `a <kind>` stay its name:  `to "deal the stock"`;  `(a card)` in brackets is a blank, as ever.
 * - Spanish's `un` / `una <kind>` the same, by its own `bare_type_arg`.
 * - A quoted phrase on a TYPE (`it "is a number card" if`) still reads its words as words:
 *   `quoted_method_signature`.
 */
export class QuotedActionSignature extends QuotedMethodSignature {
  @proto static wordsRule = "method_signature"
}
