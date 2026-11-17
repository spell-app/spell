import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { dialogArguments } from "./UI.shared"

/**
 * `alert` rule:  show user a `message` in a modal alert.
 * - e.g. `alert "Yo!"`, `alert "You won!" titled "Solitaire" in big text with "New game"`
 * - `titled ...`:  its heading;  `in small text`, `in big text`, `in huge text`:  its message's size;
 *   `with ...`:  its button's words (`dialogArguments()`)
 * - The message is read as Markdown where it has some (`# You won!`, `**42**`):  the core asks for it.
 * - Returns a promise which resolves when they click `ok`.
 * - NOTE: we'll `await` the promise!
 * - TODO: `the result = await ...` ?
 */
export class Alert extends SpellStatement<"message|title?|size?|okButton?"> {
  @proto static alias = ["statement", "async"]

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, { methodName: "alert", args: dialogArguments(match, match.groups) })
  }
}
