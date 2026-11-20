import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { textIn } from "spell/parser/spell/rules/places"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { siteOf, type SiteLinkEntry } from "./sites.shared"

/**
 * `site_link` rule:  a link out of a site, in its navigation among its pages.
 * - e.g. `- it has a link to "https://docs.example.com", named "Help", icon "book"`, in a site's body
 * - For what the site isn't:  a docs site, a monitoring app, anything at an address of its own.
 * - Written as a page's line is, its title and icon too, but with no page and no address of the site's:
 *   the navigation lists it where its line is, under the `<group>` above it, and picking it opens the address in a
 *   new tab;  nothing else of the site sees it (no route, no card on the site editor's board).
 * - No title:  the navigation shows its address.
 * - Refused, saying why:  an address from the site's root (`/help`), which is a page's.
 * - Only in a site's body;  anywhere else, `it has a ...` is a property.
 * - Compiles to nothing by itself:  `create_site` lists every link in its class, `static links = [...]`.
 */
export class SiteLink extends SpellStatement<"type|address|title?|icon?", { entry?: Omit<SiteLinkEntry, "at"> }> {
  @proto static priority = Priority.declaration + 1
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (!siteOf(scope)) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const link = textIn(match.groups.address)
    if (link.startsWith("/") && !link.startsWith("//")) {
      return SpellStatement.refuse(
        match,
        SP.Language.of(scope).parserMessage("site-link-not-outside", { address: link })
      )
    }
    const title = match.groups.title ? textIn(match.groups.title) : undefined
    const icon = match.groups.icon ? textIn(match.groups.icon) : undefined
    match.data.entry = { link, ...(title && { title }), ...(icon && { icon }) }
    return match
  }

  /** Nothing:  see the class. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
