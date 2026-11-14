import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `statement_if` rule:  a statement, then when it runs -- `return yes if the card is a king`.
 * - Any statement with no body of its own:  `print "won" if home is 52`, `turn the card face up if it is a king`.
 * - Spanish:  `devolver sí si la carta es un rey`.
 * - Compiles to an `if` around the statement:  `if (card.rank === "king") { return true }`;
 *   Python's `if ...:  return True`.
 * - With an `otherwise` it's `backwards_if`'s, a value either way:  `print 1 if bar otherwise 2`.
 *   Our condition must read to the end of the line, and `bar otherwise 2` doesn't.
 * - A statement with an inline body stays its own:  `if x then print 1 if y` is the `if`'s, its inline body this rule.
 * - A getter's value line is `value_if`'s (`red if it is a heart`):  a bare value isn't a statement.
 * - Reads its statement by hand, as `without_waiting` does:  a slot given the whole line would read this rule
 *   again, for ever.  Each `if` in the line is tried in turn, the first whose two sides read whole wins.
 */
export class StatementIf extends SpellStatement<"statement|condition"> {
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const [, ifWord, conditionRule] = this.rules
    if (!ifWord || !conditionRule) return undefined
    for (let cut = 1; cut < tokens.length - 1; cut++) {
      const said = ifWord.parse(scope, tokens.slice(cut))
      if (!said) continue
      const match = this.matchAt(scope, tokens, cut, said, conditionRule)
      if (match) return match
    }
    return undefined
  }

  /** Our match, with `tokens` cut at `cut`, the `if` there -- `undefined` unless both sides read whole. */
  private matchAt(scope: P.Scope, tokens: P.Token[], cut: number, ifWord: P.Match, conditionRule: P.Rule) {
    const rest = cut + ifWord.length
    const condition = conditionRule.parse(scope, tokens.slice(rest))
    if (condition?.length !== tokens.length - rest) return undefined
    const statement = scope.parser?.parse(tokens.slice(0, cut), "statement", scope)
    if (statement?.length !== cut || StatementIf.hasBody(statement)) return undefined
    const match = new P.Match({ rule: this, matched: [...tokens], tokens: [...tokens], scope })
    match.addMatch(statement, "statement")
    match.addMatch(condition, "condition")
    return match
  }

  /** Did `statement` read a body of its own, inline (`if x then print 1`)?  Then a trailing `if` is its body's. */
  private static hasBody(statement: P.Match): boolean {
    const rule = statement.rule as SpellStatement
    return !!rule.bodySpec && !!rule.getBody?.(statement)
  }

  getAST(match: P.MatchFor<this>): P.ASTIfStatement {
    const { statement, condition } = match.groups
    return new P.ASTIfStatement(match, {
      condition: condition.AST as P.ASTExpression,
      statements: statement.AST as P.ASTStatement
    })
  }
}
