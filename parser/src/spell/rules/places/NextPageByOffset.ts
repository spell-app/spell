import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/** What a question saying how many is usually called. */
const COUNT_WORDS = /limit|count|size|take|per.?page/i

/** What a question saying where from is usually called. */
const POSITION_WORDS = /offset|skip|start|from/i

/**
 * `next_page_by_offset` rule:  a web server pages by a count and a position, with no next link to follow (epic `data` I35).
 * - e.g. `- its next page is asked for with "limit" and "offset"`:  the Met's `?limit=100&offset=200`
 * - The first name says how many, the second where from:  written the other way round, it won't compile.
 * - Each list reads every page, as with `its next page is its "next"`:  a page with fewer than it asked for was the last.
 *   So a server that gives fewer than it's asked for needs `it gives up to 50 at a time`, or a read stops at its first page.
 * - For every collection of that place.
 */
export class NextPageByOffset extends PlaceDetail<"type|limit|offset"> {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const first = textIn(match.groups.limit)
    const second = textIn(match.groups.offset)
    if (!POSITION_WORDS.test(first) || !COUNT_WORDS.test(second)) return match
    const message = SP.Language.of(scope).parserMessage("next-page-count-first", { first, second })
    return SpellStatement.refuse(match, message)
  }

  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { pagesByOffset: { limit: textIn(match.groups.limit), offset: textIn(match.groups.offset) } }
  }
}
