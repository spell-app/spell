import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { PostfixOperatorSuffix, Precedence, type OperatorOperands } from "spell/parser/spell/rules/expressions"
import { isSortKeyScope } from "./lists.shared"

/**
 * `sort_key_order` rule:  which way a sort goes, after its key (epic `atmosphere` T48).
 * - e.g. `every message, sorted by its sent, newest first`:  the latest one first
 * - e.g. `the scores, sorted by its points, highest first`;  `..., oldest first` says the usual order out loud
 * - e.g. `recipes, sorted by title, reversed`:  any sort, backwards (Owen, 2026-11-07);  Spanish `al revés`
 * - Only right after a sort key's expression:  anything else reads as it always did.
 * - Its words come in two meanings, each a named group:  `descending` (`newest first`, `reversed` ...) and `ascending`.
 * - Compiles to `core.descending(key)`, which `core.sortedBy()` reads backwards;  `ascending` to the key itself.
 *   - A place sorting by a field is told `descending:  true` -- see `ListSortedBy`.
 * - Precedence `ternary`, the loosest:  `its wins - its losses, highest first` turns the whole key round.
 */
export class SortKeyOrder extends PostfixOperatorSuffix<"descending?|ascending?"> {
  @proto static precedence = Precedence.ternary

  /** Quick test:  only in a sort key. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return isSortKeyScope(scope) && super.test(scope, tokens, start)
  }

  /** The key's own type:  the order doesn't change what it is. */
  getResultDatatype(_match: P.MatchFor<this>, lhs: P.Datatype | undefined): P.Datatype | undefined {
    return lhs
  }

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTExpression {
    if (!SortKeyOrder.isDescending(match)) return lhs!
    return new P.ASTCoreMethodInvocation(match, { methodName: "descending", args: [lhs!] })
  }

  /** Does `match` turn its key round:  `newest first`, not `oldest first`? */
  static isDescending(match: P.Match): boolean {
    return !!(match as P.MatchFor<SortKeyOrder>).groups?.descending
  }
}
