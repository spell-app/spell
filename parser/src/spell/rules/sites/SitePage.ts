import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { Wording } from "spell/parser/spell/rules/expressions"
import { textIn } from "spell/parser/spell/rules/places"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import {
  cardDetailsOf,
  cardPlaceMessage,
  classFor,
  pageNamed,
  paramsIn,
  siteOf,
  tagsIn,
  type SitePageEntry
} from "./sites.shared"

/**
 * `site_page` rule:  one of a site's pages, and its address (epic `mockup` P1).
 * - e.g. `- it has a film page at "/films/:film", named "Film"`, in a site's body
 * - e.g. `- it has a film page at "/films/:film", named "Film", old, thumbnail "snapshots/film.png"`:
 *   how far along it is, and a thumbnail of it, a file of the project (epic `mockup` P13, T14)
 * - e.g. `- it has a film page at "/films/:film", in row 2 column 3, colored blue`:
 *   where its card sits in its section of the site editor's board, and its colour (epic `mockup` T31);
 *   any part's line may end so
 * - e.g. `- it has a button usage page at "/button", named "Button", tab "Usage"`:  what its tab says, when it has pages
 *   under it and shouldn't read as the navigation does (epic `notebook` P10, Q10)
 * - e.g. `- it has a button usage page at "/button", tagged "Forms, Inputs"`:  what it's filed under, to group and search
 *   the site's pages by, the tags split at their commas (epic `mockup` P15)
 * - e.g. `- it has a button usage page at "/button"`:  a page named for a notebook, `button usage`, its last word
 *   "page" read as a word, not the type's
 * - The SITE holds each page's address and name, never the page:  so a page moves, or is named in another language,
 *   without its own file changing.
 * - Lines indented under it are the pages under it, as the site's navigation nests them.
 * - e.g. `- it has a films page at "/films", live "https://example.com/films"`:  the real page it stands for
 *   (epic `mockup` P17), what its card's new-tab icon opens
 * - A name no file declares yet is a page WAITING for one (epic `mockup` P17):  listed, and drawn as its title;
 *   so a site's file can be its titles and addresses alone.
 * - Refused, saying why:
 *   - an address that doesn't start with `/`
 *   - a parameter, `:film`, a declared page has no property for:
 *     the page says `- it has a film`, and its type is the parameter's
 *   - an address another page already has
 * - Only in a site's body;  anywhere else, `it has a ...` is a property.
 * - Compiles to nothing by itself:  `create_site` lists every page in its class, `static pages = [...]`.
 */
export class SitePage extends SpellStatement<
  "type|part|address|title?|tab?|tags?|state?|thumbnail?|live?|row?|column?|color?|with_nested_statements?|body?",
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
    // none yet:  it's listed, waiting for a file to declare it (epic `mockup` P17)
    const page = pageNamed(scope, name)
    const address = textIn(match.groups.address)
    if (!address.startsWith("/")) {
      return SpellStatement.refuse(match, language.parserMessage("site-address-not-a-path", { address }))
    }
    const params = paramsIn(address)
    const missing = page && params.find((param) => !page.hasProperty(param))
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
    const tab = match.groups.tab ? textIn(match.groups.tab) : undefined
    const tags = match.groups.tags ? tagsIn(textIn(match.groups.tags)) : undefined
    const state = Wording.meaningOf(match.groups.state)
    const thumbnail = match.groups.thumbnail ? textIn(match.groups.thumbnail) : undefined
    const live = match.groups.live ? textIn(match.groups.live) : undefined
    const card = cardDetailsOf(match.groups)
    if (!card) return SpellStatement.refuse(match, cardPlaceMessage(language, match.groups))
    match.data.entry = {
      name,
      page: page?.name ?? classFor(name),
      address,
      ...(title && { title }),
      ...(tab && { tab }),
      ...(tags?.length && { tags }),
      ...(state && { state }),
      ...(thumbnail && { thumbnail }),
      ...(live && { live }),
      ...card,
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
