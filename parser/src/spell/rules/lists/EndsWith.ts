import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { InfixOperatorSuffix, Precedence } from "spell/parser/spell/rules/expressions"

/**
 * `ends_with` rule:  does list end with some value,
 * e.g. `my-list ends with thing` => `core.endsWith(myList, thing)`.
 * - Negated by its word rule's `negated` forms, e.g. `does not end with` -- see `Negatable`, `ends_with_or_not`.
 */
export class EndsWith extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison
  compileASTExpression(
    match: P.Match,
    { lhs, rhs }: { lhs?: P.ASTExpression; rhs?: P.ASTExpression }
  ): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "endsWith",
      args: [lhs!, rhs!]
    })
  }
}
