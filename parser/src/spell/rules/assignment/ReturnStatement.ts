import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `return_statement` rule:  `(return|exit with?) {expression}? {nested_expression}?` -- return a value.
 * - `(return|exit with?)` accepts `return`, `exit`, or `exit with` as equivalent keywords.
 * - Accepts the returned expression inline (`return thing`) or as ONE line in a nested indented block
 *   (`return\n\t1 + 2`).
 */
export class ReturnStatement extends SpellStatement<"expression?|body?"> {
  @proto static alias = "statement"

  /** We return what follows `return`, or what's indented under it -- see `SpellStatement.getReturnedDatatype()`. */
  getReturnValue(match: P.MatchFor<this>): { value: P.Match | undefined } {
    return { value: match.groups.expression || this.getBody(match) }
  }

  getAST(match: P.MatchFor<this>): P.ASTReturnStatement {
    const result = match.groups.expression || this.getBody(match)
    return new P.ASTReturnStatement(match, { value: result?.AST as P.ASTExpression | undefined })
  }
}
