import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `with_commas` rule:  a number for people to read, e.g. `its population with commas`, `1,000,000` (epic `data` P19).
 * - Compiles to `core.withCommas(lhs)`:  text, so nothing's a number any more.
 * - Nothing stays nothing:  `its height with commas or "unknown"`.
 */
export class WithCommas extends PostfixOperatorSuffix {
  @proto static precedence = Precedence.comparison
  @proto static datatype = "text"

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "withCommas", args: [lhs!] })
  }
}
