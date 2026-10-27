import { assert, proto } from "spell/util"
import { P } from "spell-parser/parser"

/**
 * `indent` rule:  indent whitespace specifically, e.g. leading spaces/tabs at start of a line.
 */
export class Indent extends P.TokenType {
  @proto static datatype = "text"
  @proto static tokenType = P.IndentToken

  getAST(match: P.MatchFor<this>): P.ASTStringLiteral {
    const { value, raw } = match
    return new P.ASTStringLiteral(match, { value: assert.string(value), raw })
  }
}
