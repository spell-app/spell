import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { ValueIf } from "spell/parser/spell/rules/if/ValueIf"
import { ValueOtherwise } from "spell/parser/spell/rules/if/ValueOtherwise"

/**
 * `return_statement` rule:  `(return|exit with?) {expression}? {nested_expression}?` -- return a value.
 * - `(return|exit with?)` accepts `return`, `exit`, or `exit with` as equivalent keywords.
 * - Accepts the returned expression inline (`return thing`) or as ONE line in a nested indented block
 *   (`return\n\t1 + 2`).
 * - Or a LADDER of values indented under it, the lines a property's value takes (epic `language` I96):
 *
 *   ```spell
 *   return
 *   	- 10 if the pile is a foundation
 *   	- 5 if the card is in the discard pile
 *   	- 0 otherwise
 *   ```
 *
 *   - Each line is `value_if`'s or `value_otherwise`'s, with or without its `- `.
 *   - Compiles to their `if (...) return 10` ... `return 0`, with no `return` of its own.
 */
export class ReturnStatement extends SpellStatement<"expression?|body?"> {
  @proto static alias = "statement"

  /**
   * We return what follows `return`, or what's indented under it -- see `SpellStatement.getReturnedDatatype()`.
   * - A ladder of values:  `undefined`, so its own lines say what they return.
   */
  getReturnValue(match: P.MatchFor<this>): { value: P.Match | undefined } | undefined {
    const body = this.getBody(match)
    if (body?.is(SP.Block)) return undefined
    return { value: match.groups.expression || body }
  }

  /** Our indented body:  ONE line, its value -- else a ladder of values, e.g. `- 10 if ...` / `- 0 otherwise`. */
  parseNestedBlock(statement: P.Match, nestedBlock: P.BlockToken): P.Match | undefined {
    const value = super.parseNestedBlock(statement, nestedBlock)
    if (value || (statement as P.MatchFor<this>).groups.expression) return value
    const { scope } = statement
    const ladder = scope.parser?.parse([nestedBlock], "block", scope)
    if (!ladder?.is(SP.Block) || !ReturnStatement.isValueLadder(ladder)) return undefined
    statement.addMatch(ladder, "body")
    statement.data.body = ladder
    return ladder
  }

  /** Is every line of `block` (comments aside) a value line, `10 if ...` or `0 otherwise`? */
  private static isValueLadder(block: P.Match): boolean {
    const statements = block.matched.flatMap((item) => {
      const { statement } = (item as P.Match).data ?? {}
      return statement instanceof P.Match ? [statement] : []
    })
    const isValueLine = (line: P.Match) => line.rule instanceof ValueIf || line.rule instanceof ValueOtherwise
    return statements.length > 0 && statements.every(isValueLine)
  }

  getAST(match: P.MatchFor<this>): P.ASTReturnStatement | P.ASTStatementGroup {
    const body = this.getBody(match)
    if (body?.is(SP.Block)) return body.AST as P.ASTStatementGroup
    const result = match.groups.expression || body
    return new P.ASTReturnStatement(match, { value: result?.AST as P.ASTExpression | undefined })
  }
}
