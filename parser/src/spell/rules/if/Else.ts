import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `else` rule:  `(else|otherwise) :?` -- else branch.
 * - Must be tried after `else_if` (see NOTE there),
 *   so this rule's bare `(else|otherwise)` prefix doesn't eat an `else if` statement.
 * - Compiles body in a nested `BlockScope` (named `"else"`) via `getNestedScopeForMatch()`.
 * - Compiles to `else { ...statements }`.
 */
export class Else extends SpellStatement<"body?"> {
  @proto static alias = "statement"

  getNestedScopeForMatch(match: P.MatchFor<this>): P.Scope {
    return new P.BlockScope({ name: "else", parentScope: match.scope })
  }
  getAST(match: P.MatchFor<this>): P.ASTElseStatement {
    return new P.ASTElseStatement(match, {
      statements: this.getBody(match)?.AST as P.ASTStatement | P.ASTStatementBlock | undefined
    })
  }
}
