import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellExpression } from "./SpellExpression"

/**
 * `unicode_offset` rule:  `unicode 1F0A0 + n` -- the character `n` code points past one written in hex
 * (epic `spanish` P11).
 * - e.g. `unicode 1F0A0 + its picture column`:  a card's picture, from the start of its row.
 * - Compiles to `core.unicode(0x1F0A0 + n)`:  `""` for what's no code point.
 * - Adds a sum, but stops before a comparison (`arithmetic_expression`):  `unicode 1F0A0 + n is "🂡"`.
 * - Without it, `unicode 1F0A0 + 1` would be the character JOINED to `1`:  `"🂠1"`.
 */
export class UnicodeOffset extends SpellExpression<"code|offset"> {
  /** Beats `unicode_literal`'s `unicode 1F0A0`, which reads the same start as a whole character. */
  @proto static priority = Priority.mostSpecific
  @proto static datatype = "text"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { code, offset } = match.groups
    const start = new P.ASTHexLiteral(code, { value: code.value as number, raw: code.raw as string })
    const point = new P.ASTInfixExpression(match, { lhs: start, operator: "plus", rhs: P.matchAST(offset) })
    return new P.ASTCoreMethodInvocation(match, { methodName: "unicode", args: [point] })
  }
}
