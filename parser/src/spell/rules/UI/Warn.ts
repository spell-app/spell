import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { dialogArguments } from "./UI.shared"

/**
 * `warn` rule:  warning message -- like alert but more dire.
 * - e.g. `warn "Yo!"`, `warn "Careful!" titled "Deleting" in big text`
 * - The same clauses as `alert`'s (`dialogArguments()`).
 * - Waits until they click `ok`:  `await core.warn("Yo!")`, as `alert` does.
 */
export class Warn extends SpellStatement<"message|title?|size?|okButton?"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    return new P.ASTCoreMethodInvocation(match, { methodName: "warn", args: dialogArguments(match, match.groups) })
  }
}
