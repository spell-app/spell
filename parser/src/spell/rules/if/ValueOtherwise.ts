import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellConstant } from "spell/parser/spell/rules/constants"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { refuseOutsideMethod } from "./if.shared"

/**
 * `value_otherwise` rule:  `black otherwise` -- the value when no `value_if` line above was the answer:
 * `return 'black'`.
 * - e.g. `black otherwise`, the last line of a getter's body
 * - The word may come first too, as a sentence puts it:  `otherwise black` (epic `language` I110).
 *   - Then it competes with `else` (`otherwise b = 1`) at `else`'s own priority, so the longer reading wins:
 *     - a lone value `else` can't read as a statement (`otherwise black`, `otherwise the value of its last card`):
 *       `else` reads only its word, so we win
 *     - a statement (`otherwise b = 1`, `otherwise draw the card`):  as long as us, so the earlier rule,
 *       `else`, wins
 *   - SEE:  `parse()`.
 */
export class ValueOtherwise extends SpellStatement<"value"> {
  @proto static priority = Priority.overridable
  @proto static alias = "statement"

  /**
   * Only in a getter's or method's body:  anywhere else it's an error saying so -- see `refuseOutsideMethod()`.
   * - Word first (`otherwise black`):  `else`'s priority, not ours -- see the class docstring.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    if (match.groups.value.start !== match.start) match.priority = Priority.normal
    return refuseOutsideMethod(match)
  }

  /** SIDE EFFECT:  a bare word, e.g. `black`, becomes a known value -- see `SpellConstant.declareValue()`. */
  mutateScope(match: P.MatchFor<this>) {
    SpellConstant.declareValue(match, match.groups.value)
  }

  /** Only when it declared a value -- see `SpellConstant.valueScopeChanges()`. */
  getScopeChanges(match?: P.MatchFor<this>): P.ScopeChanges | undefined {
    return SpellConstant.valueScopeChanges(match)
  }

  getAST(match: P.MatchFor<this>): P.ASTReturnStatement {
    return new P.ASTReturnStatement(match, { value: match.groups.value.AST as P.ASTExpression })
  }

  /** What it returns -- see `SpellStatement.getReturnedDatatype()`. */
  getReturnValue(match: P.MatchFor<this>): { value: P.Match | undefined } {
    return { value: match.groups.value }
  }
}
