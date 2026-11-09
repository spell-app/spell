import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/** What a question saying how many is usually called. */
export const COUNT_WORDS = /limit|count|size|take|top|rows|per.?page/i

/** What a question saying where from is usually called. */
const POSITION_WORDS = /offset|skip|start|from/i

/** What a question saying which page is usually called:  `page`, `pageNumber`, `p`;  not `per_page` or `pageSize`. */
export const PAGE_NUMBER_WORDS = /^(p|pg)$|(?<!per.?)page(?!.?(size|count|limit|offset|start|skip|token|cursor))/i

/** What a question sending back a cursor is usually called. */
const CURSOR_WORDS = /cursor|token/i

/**
 * `next_page_by_offset` rule:  a web server pages by a row's position, with no next link to follow (epic `data` I35).
 * - e.g. `- its next page is asked for with "limit" and "offset"`:  the Met's `?limit=100&offset=200`;
 *   whatever it calls them:  `"take" and "skip"`, `"$top" and "$skip"`, `"rows" and "start"`
 * - e.g. `- its next page is asked for with "start"`:  it's only asked where from, and gives its own page size
 * - The first name says how many, the second where from:  written the other way round, it won't compile.
 * - Names that count pages or send back a cursor won't compile either, saying what to write:
 *   this line works out each position by adding up rows, which would ask for the wrong page.
 * - Each list reads every page, as with `its next page is its "next"`.
 *   - Told how many, a page with fewer than it asked for was the last:
 *     a server that gives fewer than it's asked for needs `it gives up to 50 at a time`, or a read stops at its first page.
 *   - Told only where from, and not its size, a read goes on by what it got until a page comes back empty.
 * - For every collection of that place.
 */
export class NextPageByOffset extends PlaceDetail<"type|limit?|offset"> {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const first = textIn(match.groups.limit)
    const second = textIn(match.groups.offset)
    const language = SP.Language.of(scope)
    if (PAGE_NUMBER_WORDS.test(first) || PAGE_NUMBER_WORDS.test(second)) {
      return SpellStatement.refuse(match, language.parserMessage("next-page-counts-pages"))
    }
    if (CURSOR_WORDS.test(second)) return SpellStatement.refuse(match, language.parserMessage("next-page-is-a-cursor"))
    if (!POSITION_WORDS.test(first) || !COUNT_WORDS.test(second)) return match
    return SpellStatement.refuse(match, language.parserMessage("next-page-count-first", { first, second }))
  }

  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { limit, offset } = match.groups
    return { pagesByOffset: { ...(limit && { limit: textIn(limit) }), offset: textIn(offset) } }
  }
}
