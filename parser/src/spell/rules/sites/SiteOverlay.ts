import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { textIn } from "spell/parser/spell/rules/places"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import {
  cardDetailsOf,
  cardPlaceMessage,
  overlayKindOf,
  overlayViewNamed,
  siteOf,
  specialPageOf,
  type SiteOverlayEntry
} from "./sites.shared"

/**
 * `site_overlay` rule:  one of a site's dialogs or sidebars (epic `mockup` P1).
 * - e.g. `- it has a settings dialog`, `- it has a syntax sidebar`, in a site's body
 * - Named once, opened from any of its pages, with no address of its own:  drawn as a modal and a slide-out panel.
 * - What it shows:  the view of its name, when the program declares one (`a "settings dialog" is a view`),
 *   its kind's word left out or not (`System Notices sidebar`, the view `System Notices`);
 *   else it's a name, waiting for one.
 * - Its last word says which, in the language's own words:  `site_dialog`, `site_sidebar`.
 * - Its NOT FOUND and ERROR pages too (epic `mockup` P2):
 *   `- it has a not found page`, `- it has an error page` (`site_not_found_page`, `site_error_page`).
 *   - pages with no address, shown in place of one
 *   - the program's own when it declares a page of that name, else a plain built-in one
 *   - every new site lists them;  one deleted still shows the built-in one
 * - Under a page, one line in from it, it belongs to that page's section of the site editor's board;
 *   it's opened from any page all the same.
 * - Its line may end with where its card sits in its section, and its colour (epic `mockup` T31):
 *   `- it has a settings dialog, in row 1 column 3, colored blue`.
 * - Only in a site's body;  anywhere else, `it has a ...` is a property.
 * - Compiles to nothing by itself:  `create_site` lists them in its class, `static dialogs = [...]`.
 */
export class SiteOverlay extends SpellStatement<
  "type|part|row?|column?|color?",
  { kind?: SiteOverlayKind; entry?: SiteOverlayEntry }
> {
  @proto static priority = Priority.declaration + 1
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (!siteOf(scope)) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    // a wording's match (`not found page`) keeps no `raw`:  its words as read
    const name = textIn(match.groups.part) || match.groups.part.inputText.trim()
    // its kind's word:  last in English (`settings dialog`), first in Spanish (`diálogo de ajustes`)
    const words = name.split(/\s+/)
    const kind = specialPageOf(scope, name) ?? overlayKindOf(scope, words.at(-1)) ?? overlayKindOf(scope, words[0])
    if (!kind) return undefined
    const view = overlayViewNamed(scope, name)
    const card = cardDetailsOf(match.groups)
    if (!card) return SpellStatement.refuse(match, cardPlaceMessage(SP.Language.of(scope), match.groups))
    match.data.kind = kind
    match.data.entry = { name, ...(view && { view: view.name }), ...card }
    return match
  }

  /** SIDE EFFECT:  our site lists us, for `go to the ...` to be checked against -- see `P.TypeScope.siteOverlays`. */
  mutateScope(match: P.MatchFor<this>) {
    const { entry } = match.data
    if (entry) siteOf(match.scope)?.declareSiteOverlay(entry.name, match)
  }

  /** Nothing:  see the class. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}

/** Which of a site's parts with no address a `site_overlay` line names. */
export type SiteOverlayKind = "dialog" | "sidebar" | "notFound" | "error"
