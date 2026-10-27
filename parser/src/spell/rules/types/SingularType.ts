import { P } from "spell/parser/parser"
import { SpellType } from "./SpellType"

/**
 * `singular_type` rule:  possibly-unknown type identifier which MUST be singular -- fails on plural input.
 * - e.g. `thing`, not `things`
 */
export class SingularType extends SpellType {
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (!match || typeof match.raw !== "string") return undefined
    const word = SpellType.numberWordOf(match)
    if (word === SpellType.inflectingAsRead(match, () => P.singularize(word))) return match
    return undefined
  }
  getAST(match: P.MatchFor<this>): P.ASTTypeExpression {
    const type = super.getAST(match)
    type.plurality = "singular"
    return type
  }
}
