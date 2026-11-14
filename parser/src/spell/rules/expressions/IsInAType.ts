import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, ownerMemberFor, type OperatorOperands } from "./expressions.shared"

/**
 * `is_in_a_type` rule:  `{lhs} is [not] in a {list type}` -- is it in any list of that type?
 * - e.g. `the card is in a column`, `the card isn't in a foundation` (epic `language` P55)
 * - Spanish:  `la carta está en una columna`.
 * - Any of the program's lists of that type, or of a sub-type:  as `every column` finds them.
 * - Compiles to `core.isInA(card, Column)`;  Python's `core.is_in_a(card, Column)`.
 * - A thing that belongs to ONE of the type's family (`a card belongs to one pile`, `a column is a pile`):
 *   its own pile says, no search (epic `language` J148).
 *   - `core.isOfType(card.pile, 'Column')`:  javascript's `card.pile instanceof Column`, Python's `isinstance()`.
 *   - Only when the left side's type is KNOWN:  else the search.
 * - `is in the stock`, one list, is `is_in`'s.
 */
export class IsInAType extends InfixOperatorSuffix<"operator|expression", IsInATypeMatchData> {
  @proto static precedence = Precedence.comparison

  /** Match -- and which member of the left side's thing names its list, if one does:  see `ownerMemberFor()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return match
    const { scopeType } = match.groups.expression.data as { scopeType?: unknown }
    const listType = scopeType instanceof P.TypeScope ? scopeType : undefined
    match.data.ownerMember = ownerMemberFor(scope, listType)
    return match
  }

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    const { ownerMember } = match.data
    if (ownerMember && rhs instanceof P.ASTTypeExpression) {
      const owner = new P.ASTPropertyExpression(match, { object: lhs!, property: ownerMember })
      const type = new P.ASTTypeNameLiteral(match, { value: rhs.runtimeName, quote: "'" })
      return new P.ASTCoreMethodInvocation(match, { methodName: "isOfType", args: [owner, type] })
    }
    return new P.ASTCoreMethodInvocation(match, { methodName: "isInA", args: [lhs!, rhs!] })
  }
}

/** What `is_in_a_type` keeps from `parse()`. */
export type IsInATypeMatchData = {
  /** The left side's member naming the list holding it, e.g. `pile`:  see `ownerMemberFor()`. */
  ownerMember?: string
}
