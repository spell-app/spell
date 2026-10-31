import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `try_again` rule:  every read asks its place again:  what a failed read's button does (epic `data` P11).
 * - e.g. `<ui-button onClick={try again}>Try again</ui-button>`
 * - `Priority.overridable`:  a program's own `to try again:` wins.
 * - Compiles to `core.refreshSaved()`.
 */
export class TryAgain extends SpellStatement {
  @proto static alias = ["statement", "expression"]
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "refreshSaved", args: [] })
  }
}
