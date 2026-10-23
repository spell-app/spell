import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `if` rule:  `if {condition} (then|:)?` statement, with an inline statement or an indented nested block as body.
 * - e.g. `if a`
 * - The module's parser is `_if_`, since `if` is a reserved word.
 * - `{statement_body}?`: doesn't parse its own body -- `SpellStatement` parses a trailing inline statement,
 *   or `commitStatement()` a following indented block, into `getBody(match)`.
 * - Compiles body in a nested `BlockScope` (named `"if"`) via `getNestedScopeForMatch()`.
 * - Prefers nested block over inline statement when (invalidly) given both -- see `getBody()`.
 * - Compiles to `if (condition) { ...statements }`.
 */
export class If extends SpellStatement<"condition|body?"> {
  @proto static alias = "statement"

  getNestedScopeForMatch(match: P.MatchFor<this>): P.Scope {
    return new P.BlockScope({ name: "if", parentScope: match.scope })
  }
  getAST(match: P.MatchFor<this>): P.ASTIfStatement {
    const { condition } = match.groups
    return new P.ASTIfStatement(match, {
      condition: condition.AST as P.ASTExpression,
      statements: this.getBody(match)?.AST as P.ASTStatement | P.ASTStatementBlock | undefined
    })
  }
}
