import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { type OperatorOperands } from "./expressions.shared"

/**
 * Base class for expression-suffix rules with no `rhs`, e.g. `is empty`, `is defined`, `exists`.
 * - Same shunting-yard machinery as `InfixOperatorSuffix`, just without a right-hand side.
 */
export class PostfixOperatorSuffix<
  Groups extends string | P.AnyGroups = P.AnyGroups,
  MatchData extends P.AnyMatchData = P.AnyMatchData
> extends InfixOperatorSuffix<Groups, MatchData> {
  /**
   * Is what we make what we follow, only done another way, e.g. `, checked here`?  Then a suffix after us follows
   * what we followed, its items known:  `every job where ..., checked here, sorted by its created at`
   * (`CompoundExpression.suffixLeft()`).
   */
  declare handsOnItsLeft: boolean
  @proto static handsOnItsLeft = false

  /**
   * Must be implemented by subclasses -- no default postfix behavior makes sense to fall back to.
   * - `lhs` is left-hand-side match.
   * - `operator` is raw full input operator string.
   */
  compileASTExpression(match: P.MatchFor<this>, { lhs, operator }: OperatorOperands): P.ASTNode {
    throw new TypeError("Must implement compileASTExpression()")
  }
}
