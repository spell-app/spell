import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `as_a_type` rule:  `as a`/`an {type}`, e.g. `1 as a string`, `1.4 as an integer`
 *   -- casts value to `string`/`number`/`fraction`/`integer`/`text`.
 * - `string`/`text` wrap output in a template-literal `${...}` via `BackTickExpression`.
 * - `number`/`fraction` compile to `parseFloat()`, `integer` to `parseInt()`.
 */
export class AsAType extends PostfixOperatorSuffix<"type"> {
  @proto static precedence = Precedence.comparison
  @proto static description = "Convert a value to a specific type, e.g. an integer."

  /** The type it converts to, in spell's words, e.g. `text` for `as a string`. */
  getResultDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return SP.typeName(`${match.groups.type.value}`)
  }

  compileASTExpression(
    match: P.MatchFor<this>,
    { lhs }: OperatorOperands
  ): P.ASTBackTickExpression | P.ASTMethodInvocation {
    const type = match.groups.type.value
    if (type === "string" || type === "text") {
      // Wrap the expression in backticks to convert it to a string.
      // Output is something like: "`${EXPRESSION_VALUE}`"
      return new P.ASTBackTickExpression(match, {
        expression: new P.ASTBacktickSubstitution(match, { expression: lhs! })
      })
    } else {
      // Output will be e.g. `parseFloat(EXPRESSION_VALUE)`
      const methodName = type === "integer" ? "parseInt" : "parseFloat"
      return new P.ASTMethodInvocation(match, {
        methodName,
        args: [lhs!]
      })
    }
  }
}
