import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/** The one header a next page is said in:  `Link: <...>; rel="next"`. */
const LINK_HEADER = /^link$/i

/**
 * `next_page_in_link` rule:  a web server says where its next page is in its `Link` header, not in its answer (epic `data` P28).
 * - e.g. `- its next page is in its "Link" header`:  GitHub's `Link: <https://api.github.com/...&page=2>; rel="next"`
 * - Each list reads every page, as with `its next page is its "next"`;  no `next` there means that was the last.
 * - For every collection of that place.
 * - Any other header won't compile:  nothing else says a next page the same way.
 */
export class NextPageInLink extends PlaceDetail<"type|header"> {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const header = textIn(match.groups.header)
    if (LINK_HEADER.test(header)) return match
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("next-page-header-not-link", { header }))
  }

  detailOf(_match: P.MatchFor<this>): PlaceDetailValue {
    return { nextPageInLink: true }
  }
}
