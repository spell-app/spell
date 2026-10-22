import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Priority } from "spell-lang/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `else_if` rule:  `(else|otherwise) if {condition} (then|:)?` -- else-if branch, chained after `if`.
 * - e.g. `else if a`
 * - NOTE: this MUST be before `else` or that will eat `else if` statements... :-(
 * - `Priority.preferred` also biases resolution toward this rule over `else` when ambiguous.
 *   TODO: is `priority` load-bearing here, or does rule-definition order (see NOTE above) suffice?
 * - Compiles body in a nested `BlockScope` (named `"elseif"`) via `getNestedScopeForMatch()`.
 * - Prefers nested block over inline statement when (invalidly) given both -- see `getBody()`.
 * - Compiles to `else if (condition) { ...statements }`.
 */
export class ElseIf extends SpellStatement<"condition|body?"> {
  @proto static alias = "statement"
  @proto static priority = Priority.preferred

  getNestedScopeForMatch(match: P.MatchFor<this>): P.Scope {
    return new P.BlockScope({ name: "elseif", parentScope: match.scope })
  }
  getAST(match: P.MatchFor<this>): P.ASTElseIfStatement {
    const { condition } = match.groups
    return new P.ASTElseIfStatement(match, {
      condition: condition.AST as P.ASTExpression,
      statements: this.getBody(match)?.AST as P.ASTStatement | P.ASTStatementBlock | undefined
    })
  }
}
