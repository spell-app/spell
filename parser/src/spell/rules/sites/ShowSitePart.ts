import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { plainValueAST, textIn } from "spell/parser/spell/rules/places"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { namesSitePart, refuseUnlistedPart } from "./sites.shared"

/**
 * `show_site_part` rule:  go to one of the site's pages, or open one of its dialogs or sidebars (epic `mockup` P2).
 * - e.g. `go to the films page`, `go to the film page for this film`, `show the film page with this film`
 * - e.g. `show the settings dialog`, `show the person sidebar for this person`
 * - It names the PAGE, never its address:  the site says where each page is, so a page moves without this line
 *   changing.
 * - What comes after `for` / `with` fills the page's parameter:  the one whose property is of its type, else the first.
 *   For a dialog or sidebar, its view's property of that type.
 * - A name no site of the program lists won't compile, once the whole project has parsed (`refuseUnlistedPart()`):
 *   so a page declared further down the file is fine.
 * - Not read at all for a name that's none of a site's parts:  a page the program declares, a dialog, a sidebar, or the
 *   not found or error page.  Anything else reading `show the ...` (a method of the program's own) is tried instead.
 * - A statement, and an expression for a handler:  `<ui-button onClick={go to the about page}>`.
 * - Compiles to `core.showSitePart("film page", film)`, which the running site carries out (`SiteBase.show()`).
 */
export class ShowSitePart extends SpellStatement<"part|thing?"> {
  // an expression too, for a handler:  `<ui-button onClick={go to the about page}>`
  @proto static alias = ["statement", "expression"]
  @proto static priority = Priority.preferred

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !namesSitePart(scope, textIn(match.groups.part))) return undefined
    refuseUnlistedPart(match, textIn(match.groups.part))
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { part, thing } = match.groups
    const args = [plainValueAST(match, textIn(part))]
    if (thing) args.push(P.asAST<P.ASTExpression>(thing.AST))
    return new P.ASTCoreMethodInvocation(match, { methodName: "showSitePart", args })
  }
}
