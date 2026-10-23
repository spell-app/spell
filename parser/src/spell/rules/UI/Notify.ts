import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `notify` rule:  notify user about `message` in a non-modal (popup?) interface.
 * - e.g. `notify "Yo!"`
 * - Returns a promise which `resolve()`s when notice is hidden (manually or otherwise).
 * - NOTE: we DO NOT actually `await` the promise!  ???
 */
export class Notify extends SpellStatement<"message|okButton?"> {
  @proto static alias = ["statement", "async"]

  getAST(match: P.MatchFor<this>) {
    const { message, okButton } = match.groups
    const args: P.ASTExpression[] = [P.asAST<P.ASTExpression>(message.AST)]
    if (okButton) args.push(P.asAST<P.ASTExpression>(okButton.AST))
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "notify",
      args
    })
  }
}
