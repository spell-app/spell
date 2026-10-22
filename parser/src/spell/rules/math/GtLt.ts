import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { InfixOperatorSuffix, Precedence } from "spell-lang/spell/rules/expressions"

/**
 * `gt_lt` rule:  `<`, `>`, `<=`, `>=` comparison, e.g. `salary > expenses`.
 * - NOTE: output of `operator` will NOT have space between `>=`.
 * - `getAST()` below looks unreachable in practice:
 *   - `InfixOperatorSuffix.getAST()` deliberately throws
 *   - `CompoundExpression`'s shunting-yard calls `compileAST()` / `compileASTExpression()`
 *     directly on matched suffix rules, never `getAST()`
 *   TODO: confirm this is genuinely dead code, and if so remove it.
 */
export class GtLt extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison
  @proto static parenthesize = true

  /** `<` / `>` / `<=` / `>=` => `less than` / `greater than` / `at most` / `at least`. */
  getOperator({ value }: P.Match): P.ASTOperator {
    const greater = String(value).startsWith(">")
    if (String(value).endsWith("=")) return greater ? "at least" : "at most"
    return greater ? "greater than" : "less than"
  }

  getAST(match: P.MatchFor<this>) {
    const { operator, expression } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: operator.value,
      args: [P.asAST<P.ASTExpression>(expression.AST)]
    })
  }
}
