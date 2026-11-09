import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `next_page_by_last_id` rule:  a web server is asked what comes after a row, by that row's id (epic `data` I35).
 * - e.g. `- its next page is asked for with "limit" and the last id as "starting_after", until its "has_more" is no`:
 *   Stripe's `?limit=100&starting_after=cus_123`
 * - e.g. `- its next page is asked for with the last id as "after"`:  it isn't told how many
 * - e.g. `..., until the "more" of its "paging" is no`:  what says there's more, further in
 * - Each list reads every page, and an empty page is always the last.
 *   - With `until ...`, its answer says when to stop.
 *   - Without, a short page was the last when `it gives up to 50 at a time` says its size;  when nothing does, an empty one.
 * - The id is what the place's id is:  `its id is its "key"`.
 * - For every collection of that place.
 */
export class NextPageByLastId extends PlaceDetail<"type|limit?|param|inner?|field?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { limit, param, inner, field } = match.groups
    const moreIn = field && [textIn(field), ...(inner ? [textIn(inner)] : [])].join(".")
    return {
      pagesByLastId: {
        ...(limit && { limit: textIn(limit) }),
        param: textIn(param),
        ...(moreIn && { moreIn })
      }
    }
  }
}
