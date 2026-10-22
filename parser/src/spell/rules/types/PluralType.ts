import { P } from "spell-lang/parser"
import { SpellType } from "./SpellType"

/**
 * `plural_type` rule:  possibly-unknown type identifier which MUST be plural -- fails on singular input.
 * - e.g. `things`, not `thing`
 * - NOTE: the output type name will be SINGULAR, e.g. `things` => `Thing`.
 */
export class PluralType extends SpellType {
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (match && typeof match.raw === "string" && match.raw === P.pluralize(match.raw)) return match
    return undefined
  }
  getAST(match: P.MatchFor<this>): P.ASTTypeExpression {
    const type = super.getAST(match)
    type.plurality = "plural"
    return type
  }
}
