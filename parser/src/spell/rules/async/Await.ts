import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `await` rule:  `await`/`wait for` an expression, with the expression itself optional (bare `await`).
 * - `:?` in `syntax` is an optional literal colon in the source text (e.g. `await:`), matched but discarded:
 *   NOT the `name:rule` named-group colon.
 *   The `(await|wait for)` keyword itself stays required.
 * - Bare `await` (no expression) compiles to `await undefined`.
 * - As a statement it waits for a whole expression;  inside an expression, an operand.
 *   See `operandInExpressions`.
 * - TODO: add test to make sure parents are made async properly,
 *   especially for `await` inside an if block, etc.
 */
export class Await extends SpellStatement<"expression?"> {
  @proto static alias = ["expression", "statement"]
  /** `wait for x is 1` => `await (x == 1)`, but `if wait for x is 1` => `(await x) == 1` (epic page D33). */
  @proto static operandInExpressions = true

  /** Not in a drawing, which must answer at once. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    return SpellStatement.refuseWaitInDraw(super.parse(scope, tokens))
  }

  getAST(match: P.MatchFor<this>) {
    const { expression } = match.groups
    return new P.ASTAwaitExpression(match, {
      expression: (expression && P.asAST<P.ASTExpression>(expression.AST)) || new P.ASTNothingLiteral(match)
    })
  }
}
