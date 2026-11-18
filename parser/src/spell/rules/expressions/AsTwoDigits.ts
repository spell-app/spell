import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `as_two_digits` rule:  a whole number in two digits, as text, for a clock or a countdown:
 * `the minute of now as two digits` is `05` (epic `language` P63).
 * - Also `with a leading zero`.
 * - Compiles to `core.twoDigits(lhs)`;  `12` stays `12`, and what isn't a number stays as it is.
 */
export class AsTwoDigits extends PostfixOperatorSuffix {
  @proto static precedence = Precedence.comparison
  @proto static datatype = "text"

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { datatype: "text", methodName: "twoDigits", args: [lhs!] })
  }
}
