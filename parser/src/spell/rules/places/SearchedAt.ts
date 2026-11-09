import { CollectionAt } from "./CollectionAt"
import type { PlaceDetailValue } from "./PlaceDetail"
import type { P } from "spell/parser/parser"

/**
 * `searched_at` rule:  where a web server keeps a type's things that it gives only to a search,
 * with no list of them all (epic `data` P29).
 * - e.g. `- books are searched at "/search.json"`:  Open Library's, `/search.json?q=dune`
 * - The search is the place's:  `- it searches titles with "q"`.
 * - So `every book` won't compile, saying how to search instead (`EveryThing.refusedIfFoundByName()`):
 *   `every book where its title includes the search` asks the server.
 * - Compiles to `collections: { books: { at: "/search.json", searchedOnly: true } }`.
 */
export class SearchedAt extends CollectionAt {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { collections = {} } = super.detailOf(match)
    const [name, held] = Object.entries(collections)[0]!
    return { collections: { [name]: { ...held, searchedOnly: true } } }
  }
}
