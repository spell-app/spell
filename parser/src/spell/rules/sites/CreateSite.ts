import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { CreateOneOfAKind } from "spell/parser/spell/rules/classes"
import { plainValueAST, textIn } from "spell/parser/spell/rules/places"
import { SiteOverlay } from "./SiteOverlay"
import { SitePage } from "./SitePage"
import type { SiteOverlayEntry, SitePageEntry } from "./sites.shared"

/**
 * `create_site` rule:  a SITE, and its one instance (epic `mockup` P1).
 * - e.g. `star wars guide is a site:`, then its parts under it:
 *   `- it has a film page at "/films/:film", named "Film"`, `- it has a settings dialog`
 * - e.g. `spell ui is a site at "owen@spell/spell-ui":`, `galaxy guide is a site in the cloud:`:  where it lives
 * - A site is made from spell's built-in template `site`, an app (`Site`, in the core);  so it's one of a kind, as
 *   `solitaire is an app` is.
 * - Gathers what the lines under it say into its class, for whatever shows its pages:
 *   - `static pages`, nested as its lines nest (`site_page`)
 *   - `static dialogs` and `static sidebars` (`site_overlay`)
 *   - `static livesAt`, when its line says where it lives:  an address, or `"cloud"`
 * - Its own words win over `create_one_of_a_kind`'s for a site:  a line naming anything but a site isn't ours.
 */
export class CreateSite extends CreateOneOfAKind {
  @proto static priority = Priority.declaration + 1

  /** Only a site, or a kind of one. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    const superType = match?.groups.superType as P.Match<P.MatchGroups, { scopeType?: unknown }> | undefined
    const { scopeType } = superType?.data ?? {}
    return scopeType instanceof P.TypeScope && scopeType.isA("Site") ? match : undefined
  }

  /** Its class, with its pages, dialogs and sidebars, then its one instance -- see the class. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const group = super.getAST(match)
    const { pages, dialogs, sidebars } = CreateSite.partsOf(match)
    const groups = match.groups as P.MatchGroups & { address?: P.Match; cloud?: P.Match }
    const livesAt = groups.address ? textIn(groups.address) : groups.cloud ? CLOUD : undefined
    const type = P.matchAST<P.ASTTypeExpression>(match.groups.type)
    const statics: Array<[string, unknown]> = [
      ["pages", pages],
      ["dialogs", dialogs],
      ["sidebars", sidebars]
    ]
    if (livesAt) statics.push(["livesAt", livesAt])
    const members = statics
      .filter(([, value]) => !Array.isArray(value) || value.length)
      .map(([name, value]) => new P.ASTStaticDefinition(match, { type, name, value: plainValueAST(match, value) }))
    const statements = (group.statements ?? []).map((statement) =>
      statement instanceof P.ASTClassDeclaration && members.length ? statement.withMembers(members) : statement
    )
    return new P.ASTStatementGroup(match, { statements })
  }

  /** Everything the lines under `match` say:  its pages, nested as written, its dialogs and its sidebars. */
  static partsOf(match: P.Match): {
    pages: SitePageEntry[]
    dialogs: SiteOverlayEntry[]
    sidebars: SiteOverlayEntry[]
  } {
    const dialogs: SiteOverlayEntry[] = []
    const sidebars: SiteOverlayEntry[] = []
    const pagesUnder = (under: P.Match | undefined): SitePageEntry[] => {
      const pages: SitePageEntry[] = []
      const seen = new Set<P.Match>()
      const visit = (each: P.Match) => {
        if (seen.has(each)) return
        seen.add(each)
        if (each.rule instanceof SitePage) {
          const entry = (each.data as { entry?: SitePageEntry }).entry
          if (!entry) return
          const below = pagesUnder((each.rule as SitePage).getBody(each as never))
          pages.push(below.length ? { ...entry, pages: below } : entry)
          return
        }
        if (each.rule instanceof SiteOverlay) {
          const { kind, entry } = each.data as { kind?: string; entry?: SiteOverlayEntry }
          if (entry) (kind === "dialog" ? dialogs : sidebars).push(entry)
          return
        }
        for (const item of each.matched) if (item instanceof P.Match) visit(item)
        for (const value of Object.values(each.data)) {
          for (const item of [value].flat()) if (item instanceof P.Match) visit(item)
        }
      }
      if (under) visit(under)
      return pages
    }
    const pages = pagesUnder((match.rule as CreateSite).getBody(match as never))
    return { pages, dialogs, sidebars }
  }
}

/** Where a site lives that says `in the cloud`:  `static livesAt = "cloud"`. */
const CLOUD = "cloud"
