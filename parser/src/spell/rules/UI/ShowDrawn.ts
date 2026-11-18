import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Through the folder:  read only when parsing, once the folder has loaded
import { AssignmentStatement } from "spell/parser/spell/rules/assignment"

/**
 * `show_drawn` rule:  show, or hide, something the program drew and named, by its name (epic `language` P61).
 * - e.g. `show "you won"`, `hide "you won"`
 * - Its name is the quoted word on its tag, in a drawing:  `<modal "you won">` names that modal
 *   (its id, `you-won`, and its heading;  `SpellJSX`'s named tags:  a modal, a menu, a popup).
 * - A quoted name, nothing else:  `show the settings dialog` is a site's part (`show_site_part`).
 * - Compiles to `await core.showDrawn("you won")`, `core.hideDrawn("you won")`, which find it on the page by its id.
 *   - What a quoted word names:  a modal, a menu or a popup (`<menu "game menu">`), by its `visible`.
 * - `show` waits until a modal closes, as `alert` does (epic `language` T155):  the lines after it run once it has,
 *   and `the result` says which button closed it.  `show "you won" without waiting` carries on at once
 *   (`without_waiting`);  `hide` never waits.
 * - `show "edit card" with the card` (Spanish's `mostrar "editar carta" con la carta`;  epic `language` P64):
 *   - the modal draws the card ITSELF, not a copy, and edits it in place:  its Cancel doesn't undo what was changed
 *   - inside its drawing, `it` is the card (`SpellJSX`'s `shownIn`;  `core.drawShown()`)
 *   - after it closes, `it` is the card:  a NEW `it`, as `get` makes (`AssignmentStatement.declareIt()`)
 *   - compiles to `const it = this.card`, then `await core.showDrawn("edit card", it)`
 */
export class ShowDrawn extends SpellStatement<"hide?|name|thing?", ShowDrawnMatchData> {
  @proto static alias = ["statement", "async"]

  getAST(match: P.MatchFor<this>) {
    const { name, hide, thing } = match.groups
    const args = [P.asAST<P.ASTExpression>(name.AST)]
    // shown with a thing:  `it` first, so the modal is shown with what `it` is after (P64)
    const it = thing && new P.ASTVariableExpression(match, { name: match.data.itVar?.output ?? "it" })
    if (it) args.push(it)
    const call = new P.ASTCoreMethodInvocation(match, { methodName: hide ? "hideDrawn" : "showDrawn", args })
    if (hide) return call
    const shown = new P.ASTAwaitExpression(match, { expression: call })
    if (!it) return shown
    const declared = new P.ASTAssignmentStatement(match, {
      thing: new P.ASTVariableExpression(match, { name: match.data.itVar?.output ?? "it" }),
      value: P.asAST<P.ASTExpression>(thing!.AST),
      isNewVariable: true
    })
    return new P.ASTStatementGroup(match, { statements: [declared, shown] })
  }
}

/** What `show_drawn` stashes on its match. */
type ShowDrawnMatchData = {
  /** Shown with a thing:  the NEW `it` that holds it -- see `AssignmentStatement.declareIt()`. */
  itVar?: P.ScopeVariable
}

/**
 * `show_drawn_with` rule:  `show "edit card" with the card` -- `show_drawn`, shown with a thing (epic `language` P64).
 * - Its own rule, as it declares the new `it` the thing is in after it (`mutateScope()`):
 *   so plain `show "you won"` still goes `without waiting`, which takes only a call that declares nothing.
 */
export class ShowDrawnWith extends ShowDrawn {
  @proto static changesScope: P.ScopeChanges = "internal"

  /** The new `it` the thing is in from here on -- see `AssignmentStatement.declareIt()`. */
  mutateScope(match: P.MatchFor<this>) {
    const { thing } = match.groups
    if (!thing) return
    // `match.scope` is typed as `P.Scope`, whose `.variables` getter can be `undefined` -- we know it's a block.
    match.data.itVar = AssignmentStatement.declareIt(match.scope as P.BlockScope, match, thing.datatype)
  }
}
