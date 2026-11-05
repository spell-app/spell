import { PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `requests_a_second` rule:  the most requests a web server takes a second, its pace (epic `data` P34).
 * - e.g. `- it takes up to 80 requests a second`:  the Met Museum's
 * - A program keeps to it:  each request waits its turn (`WebPlace`'s `mostPerSecond`), so a page drawing a hundred
 *   things, each read from its own address, never asks faster than that.
 */
export class RequestsASecond extends PlaceDetail<"type|most"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { mostPerSecond: Number(match.groups.most.raw) }
  }
}
