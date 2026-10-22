import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { PostfixOperatorSuffix, Precedence } from "spell-lang/spell/rules/expressions"
import { getWhereScope, getWhereMethod } from "./lists.shared"

/**
 * `list_membership_test` rule:  set membership test, e.g. `my-list has items where the item is 1`.
 * - A postfix suffix:  the list is the expression before it, e.g. `the foo of the bar has items where ...`.
 * - Trailing `where` expects an inline expression as predicate (`{inline_expression}?`) -- see `getWhereScope()`.
 *   NOTE: so it eats the rest of the line, and is always the last suffix.
 * - Compiles to `core.any(list, (item) => { ... })`, negated (wrapped in `NotExpression`) by its word rule's
 *   `negated` forms, e.g. `has no` -- see `Negatable`, `has_or_has_no`.
 */
export class ListMembershipTest extends PostfixOperatorSuffix<"operator|arg|body?"> {
  @proto static precedence = Precedence.comparison

  /**
   * Nested scope for predicate body -- singularized `{arg}` variable, also aliased from `it`.
   * - NOTE: its item type is unknown:  the list is the expression BEFORE us, which a suffix can't see.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return getWhereScope(match, match.groups.arg, undefined)
  }
  compileASTExpression(match: P.MatchFor<this>, { lhs }: { lhs?: P.ASTExpression }): P.ASTCoreMethodInvocation {
    const filter = getWhereMethod(match, match.groups.arg, this.getBody(match))
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "any",
      args: [lhs!, filter],
      datatype: "choice"
    })
  }
}
