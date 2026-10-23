import { P } from "spell-parser/parser"
import { SpellExpression } from "./SpellExpression"

/**
 * `parenthesized_expression` rule:  `(expression)` -- parenthesized sub-expression.
 * - `getAST()` relies on `ParenthesizedExpression`'s own constructor to collapse nested parens,
 *   e.g. `((thing))` compiles down to `(thing)`.
 */
export class ParenthesizedExpression extends SpellExpression<"expression"> {
  /** Parens don't change what it is. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return match.groups.expression.datatype
  }
  getAST(match: P.MatchFor<this>): P.ASTParenthesizedExpression {
    const { expression } = match.groups
    return new P.ASTParenthesizedExpression(match, {
      expression: expression.AST as P.ASTExpression
    })
  }
}
