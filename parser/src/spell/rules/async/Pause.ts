import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `pause` rule:  delay for a certain amount of time, e.g. `pause for 2 seconds`.
 * - Compiles to `await core.pauseFor(number, 'units')`.
 * - TODO: "a second", "a little bit", "a while", "a noticeable amount".
 */
export class Pause extends SpellStatement<"number|units"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const { number, units } = match.groups
    return new P.ASTAwaitExpression(match, {
      expression: new P.ASTCoreMethodInvocation(match, {
        methodName: "pauseFor",
        args: [P.asAST<P.ASTExpression>(number.AST), new P.ASTQuotedExpression(units, units.value)]
      })
    })
  }
}
