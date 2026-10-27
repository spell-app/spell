import { assert, proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `newline` rule:  single newline.
 * - e.g. `\n`
 */
export class Newline extends P.TokenType {
  @proto static datatype = "text"
  @proto static tokenType = P.NewlineToken

  getAST(match: P.MatchFor<this>): P.ASTStringLiteral {
    const { value, raw } = match
    return new P.ASTStringLiteral(match, { value: assert.string(value), raw })
  }
}
