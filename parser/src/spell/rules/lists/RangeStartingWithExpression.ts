import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `range_starting_with_expression` rule:  range expression starting at some item in list, inclusive:
 * e.g. `items in my-list starting with thing`.
 * - `{arg}` (e.g. `items`) captured for readability only, unused in output.
 * - Returns a new list.
 * - Compiles to `core.rangeStartingAt(myList, positionOf(myList, thing))`:
 *   looks up `thing`'s position first, then takes range from there to end.
 * - If item is not found, returns an empty list. (???)
 */
export class RangeStartingWithExpression extends SpellExpression<"arg|list|thing"> {
  /** Some of the list's items:  the list's type. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return match.groups.list.datatype
  }
  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { thing, list } = match.groups
    const itemExpression = new P.ASTCoreMethodInvocation(match, {
      methodName: "positionOf",
      args: [P.matchAST(list), P.matchAST(thing)]
    })
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "rangeStartingAt",
      args: [P.matchAST(list), itemExpression]
    })
  }
}
