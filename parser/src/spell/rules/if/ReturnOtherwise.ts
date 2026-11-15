import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { ReturnStatement } from "spell/parser/spell/rules/assignment/ReturnStatement"
import { StatementIf } from "./StatementIf"

/**
 * `return_otherwise` rule:  `return 0 otherwise` -- the last of a run of `return ... if ...` lines (epic `language` I96):
 *
 * ```spell
 * to count the points for a card on a pile
 * 	return 10 if the pile is a foundation
 * 	return 5 if the card is in the discard pile
 * 	return 0 otherwise
 * ```
 *
 * - Compiles to a plain `return 0`:  each line above already returned, if its condition held.
 * - Spanish:  `devolver 0 de lo contrario`.
 * - Only right under a `return ... if ...` line, comments between them aside:
 *   anywhere else it's refused, saying so, so a stray `otherwise` is never quietly dropped.
 *   - Worked out when the errors are gathered, as the line above is known only once the block has parsed
 *     (`data.statementAbove()`, set by `Block.assembleBlock()`).
 * - Only `return`:  `print "lost" otherwise` under `print "won" if ...` would need an `else`,
 *   and nothing else asked for it yet.
 */
export class ReturnOtherwise extends SpellStatement<"value"> {
  @proto static alias = "statement"

  /** SIDE EFFECT:  refused, when the errors are gathered, unless the line above is a `return ... if ...`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const refusal = SP.Language.of(scope).parserMessage("otherwise-needs-return-if")
    SP.SpellWarnings.refuseIf(match, refusal, () => {
      const { statementAbove } = match.data as { statementAbove?: () => P.Match | undefined }
      return !ReturnOtherwise.isReturnIf(statementAbove?.())
    })
    return match
  }

  /** Is `statement` a `return ... if ...` line's, e.g. `return 10 if the pile is a foundation`? */
  private static isReturnIf(statement: unknown): boolean {
    if (!(statement instanceof P.Match) || !(statement.rule instanceof StatementIf)) return false
    return (statement.groups as { statement?: P.Match }).statement?.rule instanceof ReturnStatement
  }

  getAST(match: P.MatchFor<this>): P.ASTReturnStatement {
    return new P.ASTReturnStatement(match, { value: match.groups.value.AST as P.ASTExpression })
  }

  /** What it returns -- see `SpellStatement.getReturnedDatatype()`. */
  getReturnValue(match: P.MatchFor<this>): { value: P.Match | undefined } {
    return { value: match.groups.value }
  }
}
