import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `range_count_expression` rule:  alternative form of range expression.
 * - `{arg}` (e.g. `items`) captured for readability only, unused in output.
 * - Returns a new list.
 * - e.g. `top 2 items of my-list` => `core.rangeStartingAt(myList, 0, 2)`.
 * - Counting from the end, the range ENDS at the ordinal:
 *   `last two cards of deck` starts at `-2`, the two last cards.
 *   - Before epic `python-target` P2 it started at `-1`, so it held one card.
 * TODO: restrict ordinals to `first`, `last`, `final`, `top`, etc
 */
export class RangeCountExpression extends SpellExpression<"ordinal|number|arg|list"> {
  /** Some of the list's items:  the list's type. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return match.groups.list.datatype
  }
  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { list, ordinal, number } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "rangeStartingAt",
      args: [P.matchAST(list), startOf(P.matchAST(ordinal), P.matchAST(number)), P.matchAST(number)]
    })
  }
}

/**
 * Where a range of `count` items said with `ordinal` starts:
 * - counting from the front (`top 2`):  the ordinal itself
 * - counting from the end:  `count - 1` before it, so the range ends there (`last 2` => `-2`)
 * - a count spell can't know while compiling:  the ordinal as is
 */
function startOf(ordinal: P.ASTExpression, count: P.ASTExpression): P.ASTExpression {
  if (!(ordinal instanceof P.ASTOrdinalLiteral) || ordinal.value >= 0) return ordinal
  if (!(count instanceof P.ASTNumericLiteral)) return ordinal
  const value = ordinal.value - (count.value - 1)
  return new P.ASTOrdinalLiteral(ordinal.match, { value, raw: String(value) })
}
