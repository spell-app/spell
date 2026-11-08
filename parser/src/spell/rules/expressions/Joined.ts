import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Wording } from "./Wording"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `joined` rule:  joins two things into one text, as HyperTalk's `&` and `&&` do.
 * - e.g. `"Total:" && its price` => `core.joined("Total:", price, " ")`:  `Total: 12`
 *   - `&` joins them as they are, `&&` with a space between
 * - Text whatever the sides are:  `1 & 2` is `"12"`, never `3`.
 * - Each side said as a drawing says it:  a date `November 7, 2026`, nothing as nothing at all (`core.joined()`).
 * - `Precedence.join`:  looser than `+`, so `"Total:" && its price + tax` joins the sum.
 */
export class Joined extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.join
  @proto static datatype = "text"

  compileASTExpression(match: P.MatchFor<this>, { lhs, operator, rhs }: OperatorOperands): P.ASTNode {
    const spaced = Wording.meaningOf(operator) === "spaced"
    const args: P.ASTExpression[] = [lhs!, rhs!]
    if (spaced) args.push(new P.ASTStringLiteral(match, { value: " ", quote: '"' }))
    return new P.ASTCoreMethodInvocation(match, { datatype: "text", methodName: "joined", args })
  }
}
