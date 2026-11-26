import { proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `outline_specifier_yes_no_or_nothing` rule:  `yes, no or nothing` (Spanish `sí, no o nada`) -- a yes or no that can
 * be nothing:  `its "passed" is yes, no or nothing`, for a field a server leaves `null` until it's decided.
 * - Unset, or `null` or left out of a place's row, it reads as nothing, not no (`PropInfo.orNothing`).
 * - `its passed is no` is true only for a no;  `is nothing` while it's unset;  `is yes` as for any yes or no.
 * - Plain `yes or no` is as it was:  unset, it reads as no.
 * - A yes or no, `choice`, as `outline_specifier_yes_or_no` is:  `DefinePropertyHas` adds `orNothing`.
 */
export class OutlineSpecifierYesNoOrNothing extends P.Sequence {
  @proto static alias = "outline_specifier"
  @proto static datatype = "choice"

  getAST(match: P.MatchFor<this>): P.ASTTypeExpression {
    return new P.ASTTypeExpression(match, { raw: "yes, no or nothing", name: "choice" })
  }
}
