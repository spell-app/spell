import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"

/**
 * `unicode_literal` rule:  `unicode 1F0A0` -- the character with that code point, written in hex
 * (epic page `outline-spell`, P26).
 * - e.g. `unicode 1F0A0` is `"🂠"`, `unicode 2665` is `"♥"`:  hex, as `U+2665` is.
 * - Compiles straight to the character, the same in every target.
 * - A number worked out as the program runs is `unicode_expression`'s:  `unicode the code`.
 */
export class UnicodeLiteral extends SpellExpression<"code"> {
  @proto static priority = Priority.specific
  @proto static datatype = "text"

  getAST(match: P.MatchFor<this>): P.ASTStringLiteral {
    return new P.ASTStringLiteral(match, { value: String.fromCodePoint(match.groups.code.value as number), quote: '"' })
  }
}
