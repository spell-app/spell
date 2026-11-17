import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `open_printing` rule:  open the browser's Print dialog for the running app alone, HyperTalk's words (epic `mockup` P21).
 * - e.g. `open printing`
 * - e.g. `<ui-button onClick={open printing}>Print</ui-button>`
 * - What prints is the program's own drawing, styled by its CSS's `@media print`:  this only opens the dialog.
 * - `Priority.overridable`:  a program's own `to open printing:` wins.
 * - Compiles to `core.openPrinting()`.
 */
export class OpenPrinting extends SpellStatement {
  @proto static alias = ["statement", "expression"]
  @proto static priority = Priority.overridable

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "openPrinting", args: [] })
  }
}
