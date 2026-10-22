import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"

/**
 * `type_specifier_yes_or_no` rule:  `as yes or no` / `as either true or false` --
 * specifies a property's datatype as a boolean.
 * - Compiles to a fixed `TypeExpression` with `name: "choice"` rather than a real `boolean` datatype --
 *   matches spell's `choice` vocabulary (see `type_specifier_enum`'s "either" wording too).
 */
export class TypeSpecifierYesOrNo extends P.Sequence {
  @proto static alias = "type_specifier"
  @proto static datatype = "choice"

  getAST(match: P.MatchFor<this>): P.ASTTypeExpression {
    return new P.ASTTypeExpression(match, { raw: "yes or no", name: "choice" })
  }
}
