import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `random_number` rule:  a random whole number from one number to another, both included.
 * - e.g. `a random number between 1 and 6` => `core.randomNumber(1, 6)`:  1, 2, 3, 4, 5 or 6
 * - Its ends are any sums, `a random number between 1 and the sides of the die`,
 *   but stop before `and` and a comparison (`arithmetic_expression`).
 * - Ends the wrong way round still work:  `between 6 and 1` is the same as `between 1 and 6`.
 * - Compiles to `core.randomNumber(low, high)`;  Python's `core.random_number()`.
 */
export class RandomNumber extends SpellExpression<"low|high"> {
  @proto static datatype = "number"

  getAST(match: P.MatchFor<this>) {
    const { low, high } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      datatype: "number",
      methodName: "randomNumber",
      args: [P.asAST<P.ASTExpression>(low.AST), P.asAST<P.ASTExpression>(high.AST)]
    })
  }
}
