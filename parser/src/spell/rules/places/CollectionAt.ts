import { P } from "spell/parser/parser"
import { collectionNameFor } from "./places.shared"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import { EnabledOperations } from "./EnabledOperations"

/**
 * `collection_at` rule:  where a place keeps a type's things, when it's not where anyone would look.
 * - e.g. `- recipes live at "/dishes"`:  a web server's address for them
 * - On any other kind of place, the name they go by there.
 * - e.g. `- wiki pages are found at "/page/summary/{name}"`:  each found by a name in its address, with no list of
 *   them all (epic `data` P27).  Whatever the braces say, it's the thing's id:  `the wiki page whose id is its name`.
 * - One step in under it, the switch for every one of them (epic `data` P49, Q60, Q63):
 *   `enabled operations are read, add`, or `all operations are disabled`;  a thing's own line can only narrow it.
 */
export class CollectionAt extends PlaceDetail<"collection|path"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const name = collectionNameFor(`${match.groups.collection.raw}`.replace(/s$/, ""))
    const operations = operationsUnder(this.getBody(match))
    const at = textIn(match.groups.path).replace(/\{[^{}/]*\}/, "{id}")
    return { collections: { [name]: { at, ...(operations && { operations: [...operations] }) } } }
  }
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
