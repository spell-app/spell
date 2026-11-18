import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

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
 */
export class ShowDrawn extends SpellStatement<"hide?|name"> {
  @proto static alias = ["statement", "async"]

  getAST(match: P.MatchFor<this>) {
    const { name, hide } = match.groups
    const call = new P.ASTCoreMethodInvocation(match, {
      methodName: hide ? "hideDrawn" : "showDrawn",
      args: [P.asAST<P.ASTExpression>(name.AST)]
    })
    return hide ? call : new P.ASTAwaitExpression(match, { expression: call })
  }
}
