import { P } from "spell/parser/parser"
import { collectionNameFor } from "./places.shared"
import { PlaceDetail, textIn, type PlaceDetailValue, type PagingDetails } from "./PlaceDetail"
import { EnabledOperations } from "./EnabledOperations"

/** What a place's lines say of paging, which a collection's own may say for it alone:  see `CollectionAt`. */
export const PAGING_DETAILS: ReadonlySet<string> = new Set<keyof PagingDetails>([
  "pagesByOffset",
  "pagesByNumber",
  "pagesByLastId",
  "nextPageIn",
  "nextPageInLink",
  "nextPageSentAs",
  "pageSize",
  "pageSizeAskedWith"
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
 *   Every other kind of line there still speaks for the whole place.
 */
export class CollectionAt extends PlaceDetail<"collection|path"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const name = collectionNameFor(`${match.groups.collection.raw}`.replace(/s$/, ""))
    const body = this.getBody(match)
    const operations = operationsUnder(body)
    const paging = pagingUnder(body)
    const at = textIn(match.groups.path).replace(/\{[^{}/]*\}/, "{id}")
    return {
      collections: {
        [name]: { at, ...(operations && { operations: [...operations] }), ...(paging && { paging }) }
      }
    }
  }

  /** Does `detail`, a line one step in under a collection's line, say only how it pages:  so it's that collection's? */
  static isPagingOnly(detail: PlaceDetailValue): boolean {
    const keys = Object.keys(detail)
    return keys.length > 0 && keys.every((key) => PAGING_DETAILS.has(key))
  }
}

/** What the paging lines under a collection's line say, together:  `undefined` for none there. */
function pagingUnder(body: P.Match | undefined): PagingDetails | undefined {
  if (!body) return undefined
  const paging: PagingDetails = {}
  const seen = new Set<P.Match>()
  const visit = (each: P.Match) => {
    if (seen.has(each)) return
    seen.add(each)
    if (each.rule instanceof PlaceDetail) {
      const detail = each.rule.detailOf(each as never)
      if (CollectionAt.isPagingOnly(detail)) Object.assign(paging, detail)
      return
    }
    for (const item of each.matched) if (item instanceof P.Match) visit(item)
  }
  visit(body)
  return Object.keys(paging).length ? paging : undefined
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
