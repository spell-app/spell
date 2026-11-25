import { P } from "spell/parser/parser"
import { collectionNameFor } from "./places.shared"
import { PlaceDetail, textIn, type ListAsks, type PlaceDetailValue, type PagingDetails } from "./PlaceDetail"
import { EnabledOperations } from "./EnabledOperations"

/** What a place's lines say of paging, which a collection's own may say for it alone:  see `CollectionAt`. */
const PAGING_DETAILS: ReadonlySet<string> = new Set<keyof PagingDetails>([
  "pagesByOffset",
  "pagesByNumber",
  "pagesByLastId",
  "nextPageIn",
  "nextPageInLink",
  "nextPageSentAs",
  "pageSize",
  "pageSizeAskedWith"
])

/** What a place's lines say of what it's asked, which a collection's own may say for it alone:  see `CollectionAt`. */
const ASK_DETAILS: ReadonlySet<string> = new Set<keyof ListAsks>([
  "filters",
  "sorts",
  "sortedWith",
  "sortOrders",
  "searches"
])

/**
 * `collection_at` rule:  where a place keeps a type's things, when it's not where anyone would look.
 * - e.g. `- recipes live at "/dishes"`:  a web server's address for them
 * - On any other kind of place, the name they go by there.
 * - e.g. `- wiki pages are found at "/page/summary/{name}"`:  each found by a name in its address, with no list of
 *   them all (epic `data` P27).  Whatever the braces say, it's the thing's id:  `the wiki page whose id is its name`.
 * - One step in under it, the switch for every one of them (epic `data` P49, Q60, Q63):
 *   `enabled operations are read, add`, or `all operations are disabled`;  a thing's own line can only narrow it.
 * - And, in the same place, how they page, when it isn't the place's way (epic `data` P56):  the place's own paging
 *   lines, `its next page is asked for with "take" and "skip"`, `it gives up to 100 at a time`, which win for them.
 * - And what that list is asked, when the place's lines don't say it for every list:  `it filters by job id`,
 *   `it sorts by created at with "order_by"`, `it sorts newest first by created at as "recency"`,
 *   `it searches names with "search"`.  The list's own win for it;  the place's still hold for the rest.
 *   Every other kind of line there still speaks for the whole place.
 */
export class CollectionAt extends PlaceDetail<"collection|path"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const name = collectionNameFor(`${match.groups.collection.raw}`.replace(/s$/, ""))
    const body = this.getBody(match)
    const operations = operationsUnder(body)
    const { paging, asks } = listLinesUnder(body)
    const at = textIn(match.groups.path).replace(/\{[^{}/]*\}/, "{id}")
    return {
      collections: {
        [name]: { at, ...(operations && { operations: [...operations] }), ...(paging && { paging }), ...asks }
      }
    }
  }

  /**
   * Does `detail`, a line one step in under a collection's line, say only how it pages, or what it's asked:
   * so it's that collection's?
   */
  static isListsOwn(detail: PlaceDetailValue): boolean {
    const keys = Object.keys(detail)
    return (
      keys.length > 0 && (keys.every((key) => PAGING_DETAILS.has(key)) || keys.every((key) => ASK_DETAILS.has(key)))
    )
  }
}

/** What the paging lines, and the lines saying what it's asked, under a collection's line say:  each `undefined` for none. */
function listLinesUnder(body: P.Match | undefined): { paging: PagingDetails | undefined; asks: ListAsks } {
  const paging: PagingDetails = {}
  const asks: ListAsks = {}
  const seen = new Set<P.Match>()
  const visit = (each: P.Match) => {
    if (seen.has(each)) return
    seen.add(each)
    if (each.rule instanceof PlaceDetail) {
      const detail = each.rule.detailOf(each as never)
      if (!CollectionAt.isListsOwn(detail)) return
      const { sortOrders, ...rest } = detail as ListAsks & PagingDetails
      if (Object.keys(rest).every((key) => PAGING_DETAILS.has(key))) Object.assign(paging, rest)
      else Object.assign(asks, rest)
      if (sortOrders) asks.sortOrders = [...(asks.sortOrders ?? []), ...sortOrders]
      return
    }
    for (const item of each.matched) if (item instanceof P.Match) visit(item)
  }
  if (body) visit(body)
  return { paging: Object.keys(paging).length ? paging : undefined, asks }
}

/** What an `enabled operations are ...` line under a collection's line says:  `undefined` for none there. */
function operationsUnder(body: P.Match | undefined): readonly string[] | undefined {
  if (!body) return undefined
  const seen = new Set<P.Match>()
  const visit = (each: P.Match): readonly string[] | undefined => {
    if (seen.has(each)) return undefined
    seen.add(each)
    const said = EnabledOperations.operationsOf(each)
    if (said) return said
    for (const item of each.matched) {
      const found = item instanceof P.Match ? visit(item) : undefined
      if (found) return found
    }
    return undefined
  }
  return visit(body)
}
