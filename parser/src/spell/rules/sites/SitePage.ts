import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { textIn } from "spell/parser/spell/rules/places"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { pageNamed, paramsIn, siteOf, type SitePageEntry } from "./sites.shared"

/**
 * `site_page` rule:  one of a site's pages, and its address (epic `mockup` P1).
 * - e.g. `- it has a film page at "/films/:film", named "Film"`, in a site's body
 * - e.g. `- it has a button usage page at "/button"`:  a page named for a notebook, `button usage`, its last word
 *   "page" read as a word, not the type's
 * - The SITE holds each page's address and name, never the page:  so a page moves, or is named in another language,
 *   without its own file changing.
 * - Lines indented under it are the pages under it, as the site's navigation nests them.
 * - Refused, saying why:
 *   - a name that isn't one of the program's pages
 *   - an address that doesn't start with `/`
 *   - a parameter, `:film`, the page has no property for:
 *     the page says `- it has a film`, and its type is the parameter's
 *   - an address another page already has
 * - Only in a site's body;  anywhere else, `it has a ...` is a property.
 * - Compiles to nothing by itself:  `create_site` lists every page in its class, `static pages = [...]`.
 */
export class SitePage extends SpellStatement<
  "type|part|address|title?|with_nested_statements?|body?",
  { entry?: SitePageEntry }
> {
  @proto static priority = Priority.declaration + 1
  @proto static alias = "statement"

  /** The lines indented under us are our pages, with or without a colon after us. */
  takesNestedBody(_match: P.Match): boolean {
    return !!this.bodySpec
  }

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const site = siteOf(scope)
    if (!site) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const language = SP.Language.of(scope)
    const name = textIn(match.groups.part)
    const page = pageNamed(scope, name)
    if (!page) return SpellStatement.refuse(match, language.parserMessage("site-part-not-a-page", { part: name }))
    const address = textIn(match.groups.address)
    if (!address.startsWith("/")) {
      return SpellStatement.refuse(match, language.parserMessage("site-address-not-a-path", { address }))
    }
    const params = paramsIn(address)
    const missing = params.find((param) => !page.hasProperty(param))
    if (missing) {
      return SpellStatement.refuse(
        match,
        language.parserMessage("site-param-not-on-page", { param: missing, page: name })
      )
    }
    const taken = site.sitePages?.[address]
    if (taken && taken !== name) {
      return SpellStatement.refuse(match, language.parserMessage("site-address-taken", { address, page: taken }))
    }
    const title = match.groups.title ? textIn(match.groups.title) : undefined
    match.data.entry = {
      name,
      page: page.name,
      address,
      ...(title && { title }),
      ...(params.length && { params })
    }
    return match
  }

  /** SIDE EFFECT:  our address is taken, in our site -- see `P.TypeScope.declareSitePage()`. */
  mutateScope(match: P.MatchFor<this>) {
    const { entry } = match.data
    if (entry) siteOf(match.scope)?.declareSitePage(entry.address, entry.name, match)
  }

  /** Nothing:  see the class. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
