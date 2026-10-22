import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Priority } from "spell-lang/spell/rules/rules.types"
import { SpellExpression, Wording } from "spell-lang/spell/rules/expressions"

/**
 * `round_number` rule:  `round {expression}`, optionally `off`/`up`/`down`, e.g. `round price up`.
 * - Which way, by what `operator` means (`rounding`):  `up`, `down`, or none, the nearest.
 * - TODO: precision:  to the nearest tenth ?
 * - `Priority.preferred`, lowest of the `expression` alternatives here.
 */
export class RoundNumber extends SpellExpression<"expression|operator?"> {
  @proto static priority = Priority.preferred
  @proto static datatype = "number"

  /**
   * Maps `operator`'s meaning, none / `up` / `down`, to `round`/`roundUp`/`roundDown`:  each writer says it as its platform does
   * (epic `python-target` P24, Owen on Q29):  `Math.round(price)`, `math.floor(price + 0.5)`.
   */
  getAST(match: P.MatchFor<this>) {
    const { expression, operator } = match.groups
    const rounding = Wording.meaningOf(operator)
    let methodName = "round"
    if (rounding === "up") methodName = "roundUp"
    else if (rounding === "down") methodName = "roundDown"
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "number",
      methodName,
      args: [P.asAST<P.ASTExpression>(expression.AST)]
    })
  }
}
