import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_before_or_after` rule:  is one date earlier or later than another -- `if its due is before now`,
 * `if its start is after its end` (epic `language` P63).
 * - Compiles to `core.isBefore(lhs, rhs)` or `core.isAfter(lhs, rhs)`, negated for `is not`.
 * - Both must be dates, or it's no:  nothing is before anything.
 * - Same day, any time:  `is the same day as` (`is_same_day_as`).
 */
export class IsBeforeOrAfter extends InfixOperatorSuffix<"operator|before?|after?|expression"> {
  @proto static precedence = Precedence.comparison
  /** Over `is` and a property read:  Spanish's `es antes de ahora` isn't `es` the `antes` of now. */
  @proto static priority = Priority.specific

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: match.groups.after ? "isAfter" : "isBefore",
      args: [lhs!, rhs!]
    })
  }
}
