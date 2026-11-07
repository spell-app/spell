import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { textIn } from "spell/parser/spell/rules/places"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { overlayKindOf, siteOf, typeNamed, type SiteOverlayEntry } from "./sites.shared"

/**
 * `site_overlay` rule:  one of a site's dialogs or sidebars (epic `mockup` P1).
 * - e.g. `- it has a settings dialog`, `- it has a syntax sidebar`, in a site's body
 * - Named once, opened from any of its pages, with no address of its own:  drawn as a modal and a slide-out panel.
 * - What it shows:  the view of its name, when the program declares one (`a "settings dialog" is a view`);
 *   else it's a name, waiting for one.
 * - Its last word says which, in the language's own words:  `site_dialog`, `site_sidebar`.
 * - Only in a site's body;  anywhere else, `it has a ...` is a property.
 * - Compiles to nothing by itself:  `create_site` lists them in its class, `static dialogs = [...]`.
 */
export class SiteOverlay extends SpellStatement<
  "type|part",
  { kind?: "dialog" | "sidebar"; entry?: SiteOverlayEntry }
> {
  @proto static priority = Priority.declaration + 1
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (!siteOf(scope)) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const name = textIn(match.groups.part)
    // its kind's word:  last in English (`settings dialog`), first in Spanish (`diálogo de ajustes`)
    const words = name.split(/\s+/)
    const kind = overlayKindOf(scope, words.at(-1)) ?? overlayKindOf(scope, words[0])
    if (!kind) return undefined
    const view = typeNamed(scope, name)
    match.data.kind = kind
    match.data.entry = { name, ...(view?.isA("View") && { view: view.name }) }
    return match
  }

  /** Nothing:  see the class. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
