import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { plainValueAST, textIn } from "spell/parser/spell/rules/places"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { namesSitePage, refuseUnlistedPart } from "./sites.shared"

/**
 * `site_address_of` rule:  the address of one of the site's pages, for a link (epic `mockup` P2).
 * - e.g. `the address of the films page`, `the address of the film page for this film`
 * - e.g. in a drawing:  `<a href={the address of the film page for its film}>`
 * - Text:  the page's address with its parameter filled in, `/films/4`;  a link to it is followed by the site
 *   without leaving the page.
 * - Over a read of a thing's own `address` (`Priority.mostSpecific`), so it reads the whole phrase.
 * - Only for a page:  one the program declares, or (declared further down the file) words ending in `page`, checked
 *   against the site's own list once the whole project has parsed (`refuseUnlistedPart()`, epic `mockup` P8).
 *   Anything else reading `the address of ...` (a thing's own `address`) is tried instead.
 * - Compiles to `core.siteAddressOf("film page", film)`.
 */
export class SiteAddressOf extends SpellExpression<"part|thing?"> {
  // over a read of a thing's own `address`:  it names a page, which `parse()` checks
  @proto static priority = Priority.mostSpecific

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !namesSitePage(scope, textIn(match.groups.part))) return undefined
    refuseUnlistedPart(match, textIn(match.groups.part))
    return match
  }

  getDatatype(): P.Datatype {
    return "text"
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { part, thing } = match.groups
    const args = [plainValueAST(match, textIn(part))]
    if (thing) args.push(P.asAST<P.ASTExpression>(thing.AST))
    return new P.ASTCoreMethodInvocation(match, { methodName: "siteAddressOf", args })
  }

  /**
   * The part `match` names, and the words naming it, if it's one of this rule's:  `films page` in
   * `go to the films page`.  For an editor renaming a page (epic `mockup` P6, T13).
   */
  static partNamedBy(match: P.Match): { name: string; words: P.Match } | undefined {
    if (!match.is(SiteAddressOf)) return undefined
    const { part } = match.groups
    return part ? { name: textIn(part), words: part } : undefined
  }
}
