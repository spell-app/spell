import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SpellExpression } from "./SpellExpression"

/**
 * `hex_literal` rule:  `hex 1F0A0` -- a number written in hex (epic `spanish` P11).
 * - e.g. `hex 1F0A0` is `127136`, `hex ff` is `255`.
 * - Compiles to the same hex in every target:  `0x1F0A0`.
 * - Spanish says it the same way:  `hex 1F0A0`.
 * - NOT `1F0A0 as hex`:  the tokenizer reads `1F0A0` as the number `1` then the word `F0A0`,
 *   and `as` already converts a value to a type (`as_a_type`);  so the word `hex` comes first.
 */
export class HexLiteral extends SpellExpression<"digits"> {
  @proto static datatype = "number"

  getAST(match: P.MatchFor<this>): P.ASTHexLiteral {
    const { digits } = match.groups
    return new P.ASTHexLiteral(match, { value: digits.value as number, raw: digits.raw as string })
  }
}
