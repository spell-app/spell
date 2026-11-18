import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_meridiem` rule:  is a date's time before noon or after -- `if now is PM`, `if its start is AM` (epic `language` P63).
 * - Compiles to `core.isPM(lhs)` or `core.isAM(lhs)`, negated for `is not`.
 * - Any case:  `pm` too.  The text itself, `PM`, is `the AM or PM of now`.
 */
export class IsMeridiem extends PostfixOperatorSuffix<"operator|am?|pm?"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: match.groups.pm ? "isPM" : "isAM", args: [lhs!] })
  }
}
