import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, ownerMemberFor, type OperatorOperands } from "./expressions.shared"

/**
 * `is_in` rule:  `{lhs} is [not] in`/`one of`/`either`/`neither ... nor {list}`.
 * - e.g. `thing is in theList`, `thing is neither red nor green`
 * - `expression` group accepts either an `operand` (a list variable)
 *   or an inline `identifier_list`, e.g. `either red or green`.
 * - Negated by its word rules' `negated` forms, e.g. `is not in`, `is neither` -- see `Negatable`.
 * - Compiles to `core.includes(list, lhs)` -- NOTE argument order is reversed from `lhs`/`rhs`.
 * - A thing that belongs to ONE list of the list's family (`a card belongs to one pile`):
 *   its own pile says, no search, `card.pile === stock` (epic `language` J148).
 *   - `is not in`:  `card.pile !== stock`.
 *   - Only when both sides' types are KNOWN:  else the search.
 */
export class IsIn extends InfixOperatorSuffix<"operator|expression", IsInMatchData> {
  @proto static precedence = Precedence.comparison

  /** Match -- and which member of the left side's thing names its list, if one does:  see `ownerMemberFor()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return match
    const list = match.groups.expression as P.Match | undefined
    match.data.ownerMember = ownerMemberFor(scope, scope.getType(list?.datatype))
    return match
  }

  /** `card.pile === stock` / `!==` when the card's own pile says (see class docs), else `core.includes()`'s search. */
  compileAST(match: P.MatchFor<this>, operands: OperatorOperands): P.ASTNode {
    const { ownerMember } = match.data
    if (!ownerMember) return super.compileAST(match, operands)
    const { lhs, operator, rhs } = operands
    const owner = new P.ASTPropertyExpression(match, { object: lhs!, property: ownerMember })
    // as `is` writes it:  `(card.pile !== stock)`, not `!(...)`
    return new P.ASTParenthesizedExpression(match, {
      expression: new P.ASTInfixExpression(match, {
        lhs: owner,
        operator: this.shouldNegateOutput(operator) ? "not equals" : "equals",
        rhs: rhs!
      })
    })
  }

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "includes",
      args: [rhs!, lhs!]
    })
  }
}

/** What `is_in` keeps from `parse()`. */
export type IsInMatchData = {
  /** The left side's member naming the list holding it, e.g. `pile`:  see `ownerMemberFor()`. */
  ownerMember?: string
}
