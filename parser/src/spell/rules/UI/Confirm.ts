import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `confirm` rule:  confirm message -- present a question with two answers.
 * - e.g. `confirm "Yo!"`
 * - Returns a promise which `resolve()`s when they `ok`, `reject()`s if they `cancel`.
 * - NOTE: we'll `await` the promise!
 * - TODO: `the result = await ...` ?
 */
export class Confirm extends SpellStatement<"message|okButton?|cancelButton?"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const { message, okButton, cancelButton } = match.groups
    const args: P.ASTExpression[] = [P.asAST<P.ASTExpression>(message.AST)]
    if (okButton) args.push(P.asAST<P.ASTExpression>(okButton.AST))
    if (cancelButton) args.push(P.asAST<P.ASTExpression>(cancelButton.AST))
    return new P.ASTAwaitExpression(match, {
      expression: new P.ASTCoreMethodInvocation(match, {
        methodName: "confirm",
        args
      })
    })
  }
}
