import { fieldPathOf, PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `next_page_in` rule:  which field of a web server's answer says where its next page is.
 * - e.g. `- its next page is its "next"`, with the second `its` or without
 * - Further in, in words:  `- its next page is the "next" of its "links"`.
 * - It holds a whole address, or a cursor to send back;  nothing there means that was the last page.
 * - A cursor goes back as `cursor`, unless the server calls that something else:
 *   `- its next page is its "nextPageToken", sent back as "pageToken"` (epic `data` I35).
 * - For every collection of that place.  Without it, a web server's answer counts as the whole list.
 */
export class NextPageIn extends PlaceDetail<"type|field|inner?|outer?|param?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { param } = match.groups
    return { nextPageIn: fieldPathOf(match.groups), ...(param && { nextPageSentAs: textIn(param) }) }
  }
}
