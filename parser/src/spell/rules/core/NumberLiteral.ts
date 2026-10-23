import { assert, proto } from "spell/util"
import { P } from "spell-parser/parser"

/**
 * `number` rule:  `number` as a float or integer token.
 * - e.g. `1`
 * - Class named `NumberLiteral`, not `Number`, which would hide javascript's `Number`.
 * - TODO:  `integer` and `decimal`?  too techy?
 */
export class NumberLiteral extends P.TokenType {
  static ruleName = "number"
  @proto static highlightAs: P.HighlightKind = "number"
  @proto static alias = "expression"
  @proto static datatype = "number"
  @proto static tokenType = P.NumberToken

  getAST(match: P.MatchFor<this>): P.ASTNumericLiteral {
    const { value, raw } = match
    return new P.ASTNumericLiteral(match, { value: assert.number(value), raw })
  }
}
