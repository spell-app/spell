import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `list_count` rule:  length of something KNOWN to be a list, without naming its items,
 * e.g. `the number of card suits` => `core.itemCountOf(Card.Suits)`.
 * - Rejects the match unless its datatype says it's a list, or a list type, e.g. `Deck`:
 *   else `the number of x` stays a property read, `x.number`.
 * - `Priority.mostSpecific`, as `list_length`, which wins when it names the items:  it's longer.
 */
export class ListCount extends SpellExpression<"list"> {
  @proto static priority = Priority.mostSpecific
  @proto static datatype = "number"

  /** Only a list -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !scope.getType(match.groups.list.datatype)?.isA("list")) return undefined
    return match
  }
  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "itemCountOf", args: [P.matchAST(match.groups.list)] })
  }
}
