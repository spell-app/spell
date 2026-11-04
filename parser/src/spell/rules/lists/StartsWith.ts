import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { InfixOperatorSuffix, Precedence } from "spell/parser/spell/rules/expressions"

/**
 * `starts_with` rule:  does list start with some value,
 * e.g. `my-list starts with thing` => `core.startsWith(myList, thing)`.
 * - `Precedence.comparison`, like the other comparisons.
 * - Negated by its word rule's `negated` forms, e.g. `does not start with` -- see `Negatable`, `starts_with_or_not`.
 */
export class StartsWith extends InfixOperatorSuffix<"operator|exactly?|expression"> {
  @proto static precedence = Precedence.comparison
  compileASTExpression(
    match: P.MatchFor<this>,
    { lhs, rhs }: { lhs?: P.ASTExpression; rhs?: P.ASTExpression }
  ): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: match.groups.exactly ? "startsWithExactly" : "startsWith",
      args: [lhs!, rhs!]
    })
  }
}
