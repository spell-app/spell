import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `as_title_case` rule:  the text itself with each word's first letter a capital, e.g. `"ace of spades" as title case`.
 * - The text, not only its look:  a drawing's `font="title-caps"` shows the same, but leaves the text as it was.
 * - Compiles to `core.titleCase(lhs)`.
 */
export class AsTitleCase extends PostfixOperatorSuffix {
  @proto static precedence = Precedence.comparison
  @proto static datatype = "text"

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "titleCase",
      args: [lhs!]
    })
  }
}
