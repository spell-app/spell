import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Priority } from "spell-lang/spell/rules/rules.types"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_defined` rule:  `{lhs} is defined`/`undefined`/`not defined` postfix, e.g. `thing is defined`.
 * - Negates for anything other than exactly `is defined`.
 * - Compiles to `core.isDefined(lhs)`, negated as needed.
 */
export class IsDefined extends PostfixOperatorSuffix {
  /** Beats `is_equal` + `undefined`, which matches `is undefined` in as many words. */
  @proto static priority = Priority.preferred
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "isDefined",
      args: [lhs!]
    })
  }
}
