import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/** `echo` rule:  `echo {expression}` -- print `expression`'s value, e.g. for debugging. */
export class Echo extends SpellStatement<"expression"> {
  @proto static alias = ["statement"]

  getAST(match: P.MatchFor<this>) {
    const { expression } = match.groups
    return new P.ASTEchoInvocation(match, {
      expression: P.asAST<P.ASTExpression>(expression.AST)
    })
  }
}
