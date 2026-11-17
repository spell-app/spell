import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { dialogArguments } from "./UI.shared"

/**
 * `confirm` rule:  confirm message -- present a question with two answers.
 * - e.g. `confirm "Yo!"`, `confirm "Deal again?" titled "Solitaire" with "Deal" and "Not now"`
 * - The same clauses as `alert`'s (`dialogArguments()`), and a cancel button's words.
 * - Returns a promise which `resolve()`s when they `ok`, `reject()`s if they `cancel`.
 * - NOTE: we'll `await` the promise!
 * - TODO: `the result = await ...` ?
 */
export class Confirm extends SpellStatement<"message|title?|size?|okButton?|cancelButton?"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, { methodName: "confirm", args: dialogArguments(match, match.groups) })
  }
}
