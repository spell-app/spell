import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { COUNT_WORDS, PAGE_NUMBER_WORDS } from "./NextPageByOffset"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `next_page_by_number` rule:  a web server pages by a page's number, not by a row's position (epic `data` I35).
 * - e.g. `- its next page is asked for by number with "per_page" and "page"`:  `?per_page=100&page=3`
 * - e.g. `- its next page is asked for by number with "page"`:  it's only asked which page, and gives its own page size
 * - e.g. `- its next page is asked for by number with "size" and "page", counting from 0`:  a first page of 0;  without it, 1
 * - The first name says how many, the second which page:  written the other way round, it won't compile.
 * - Each list reads every page.  Told how many, a page with fewer was the last, so a server that gives fewer than it's asked
 *   for needs `it gives up to 50 at a time`;  told only which page and not its size, a read goes on until a page comes back empty.
 * - For every collection of that place.
 */
export class NextPageByNumber extends PlaceDetail<"type|limit?|page|first?"> {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const first = textIn(match.groups.limit)
    const second = textIn(match.groups.page)
    if (!PAGE_NUMBER_WORDS.test(first) || !COUNT_WORDS.test(second)) return match
    const message = SP.Language.of(scope).parserMessage("next-page-number-count-first", { first, second })
    return SpellStatement.refuse(match, message)
  }

  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { limit, page, first } = match.groups
    return {
      pagesByNumber: {
        ...(limit && { limit: textIn(limit) }),
        page: textIn(page),
        ...(first && { first: Number(first.raw) })
      }
    }
  }
}
