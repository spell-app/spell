import { P } from "spell/parser/parser"
import { collectionNameFor } from "./places.shared"
import { PlaceDetail, textIn, type PlaceDetailValue, type SortDirections } from "./PlaceDetail"

/** The scopes of a `sorts_by_any_field` line's lines:  where a `sort_direction` reads. */
const DIRECTION_SCOPES = new WeakSet<P.Scope>()

/**
 * `sorts_by_any_field` rule:  a web server's list sorts by any field, named in one question.
 * - e.g., one step in under its `live at` line, `jobs can be sorted by any field, with "sort"`:
 *   `the first 20 jobs sorted by its name` asks `?sort=name&limit=20`;  newest first, `?sort=-created_at`.
 * - Its lines, one step in, say how the server is asked which way round (`sort_direction`):
 *
 *   ```text
 *   jobs can be sorted by any field, with "sort"
 *     - newest first with "order" as "desc"
 *     - oldest first with "order" as "asc"
 *   ```
 *
 *   Then the field goes as it is, and the way round in its own question:  `?sort=created_at&order=desc`.
 *   A way round no line names isn't the server's:  Spell's server sorts what it read.
 * - Beside `jobs can be sorted by:` (`NamedSorts`), the same list's named sorts, sent in the same question.
 * - `it sorts by every field with "sort"` still reads, the same without its lines.
 * - Compiles to the list's `sorts: "every field"`, `sortedWith` and `sortDirections`.
 */
export class SortsByAnyField extends PlaceDetail<"collection|param|body?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const name = collectionNameFor(`${match.groups.collection.raw}`.replace(/s$/, ""))
    const sortDirections = SortsByAnyField.directionsUnder(this.getBody(match))
    return {
      collections: {
        [name]: { sorts: "every field", sortedWith: textIn(match.groups.param), ...(sortDirections && { sortDirections }) }
      }
    }
  }

  /** Its lines' scope:  only there does a `sort_direction` read. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.Scope {
    const scope = new P.BlockScope({ name: "sort directions", parentScope: match.scope })
    DIRECTION_SCOPES.add(scope)
    return scope
  }

  /** What the `sort_direction` lines in `body` say:  `undefined` for none. */
  private static directionsUnder(body: P.Match | undefined): SortDirections | undefined {
    let directions: SortDirections | undefined
    const seen = new Set<P.Match>()
    const visit = (each: P.Match) => {
      if (seen.has(each)) return
      seen.add(each)
      if (each.rule instanceof SortDirection) {
        const { descending, param, value } = (each as P.MatchFor<SortDirection>).groups
        directions = { ...directions, param: textIn(param), [descending ? "descending" : "ascending"]: textIn(value) }
        return
      }
      for (const item of each.matched) if (item instanceof P.Match) visit(item)
    }
    if (body) visit(body)
    return directions
  }
}

/**
 * `sort_direction` rule:  one line under `jobs can be sorted by any field, with "sort"`, `- newest first with "order" as "desc"`.
 * - Only there:  anywhere else it reads as nothing.
 * - Says nothing by itself:  its line gathers it.
 */
export class SortDirection extends PlaceDetail<"descending?|ascending?|param|value"> {
  /** Quick test:  only under a `sorts_by_any_field` line. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return DIRECTION_SCOPES.has(scope) && super.test(scope, tokens, start)
  }

  /** Only under a `sorts_by_any_field` line. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    return DIRECTION_SCOPES.has(scope) ? super.parse(scope, tokens) : undefined
  }

  /** Nothing:  its line says it. */
  detailOf(_match: P.MatchFor<this>): PlaceDetailValue {
    return {}
  }
}
