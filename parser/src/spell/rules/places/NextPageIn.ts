import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `next_page_in` rule:  which field of a web server's answer says where its next page is.
 * - e.g. `- its next page is its "next"`, with the second `its` or without;  a dotted path reaches further in
 * - It holds a whole address, or a cursor to send back;  nothing there means that was the last page.
 * - For every collection of that place.  Without it, a web server's answer counts as the whole list.
 */
export class NextPageIn extends PlaceDetail<"type|field"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { nextPageIn: textIn(match.groups.field) }
  }
}
