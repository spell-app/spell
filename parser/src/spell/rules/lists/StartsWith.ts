import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { InfixOperatorSuffix, Precedence } from "spell-lang/spell/rules/expressions"

/**
 * `starts_with` rule:  does list start with some value,
 * e.g. `my-list starts with thing` => `core.startsWith(myList, thing)`.
 * - `Precedence.comparison`, like the other comparisons.
 * - Negated by its word rule's `negated` forms, e.g. `does not start with` -- see `Negatable`, `starts_with_or_not`.
 */
export class StartsWith extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison
  compileASTExpression(
    match: P.Match,
    { lhs, rhs }: { lhs?: P.ASTExpression; rhs?: P.ASTExpression }
  ): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "startsWith",
      args: [lhs!, rhs!]
    })
  }
}
