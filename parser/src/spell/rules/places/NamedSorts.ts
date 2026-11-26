import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { MemberWords } from "spell/parser/spell/rules/properties/MemberWords"
import { collectionNameFor } from "./places.shared"
import { fieldNamed, PlaceDetail, textIn, type PlaceDetailValue, type SortOrderName } from "./PlaceDetail"

/** The scopes of a `named_sorts` block's lines:  where a `named_sort` reads. */
const NAMED_SORT_SCOPES = new WeakSet<P.Scope>()

/**
 * `named_sorts` rule:  the sorts a web server's list has names of its own for, each sent as its value.
 * - e.g., one step in under its `live at` line, beside `it sorts with "order_by"`:
 *
 *   ```text
 *   measurements can be sorted by:
 *     - "creation" as "created_at"
 *     - "completion" as "recency", by end time
 *   ```
 *
 * - Then `the first 20 measurements sorted by completion, newest first` asks `?order_by=recency&limit=20`.
 * - A read names one by its name alone, as it names a field (`sort_key_field`);  a name wins over a field of the same name.
 * - The server sorts each newest first only:  the other way round, Spell's server sorts what it read, by its field.
 * - Each line's field is its value's (`created_at`, the field `created at`), unless `, by` names another.
 * - Compiles to the list's `sortOrders`:  `[{ name: "creation", as: "created_at", field: "createdAt" }]`.
 */
export class NamedSorts extends PlaceDetail<"collection|body?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const name = collectionNameFor(`${match.groups.collection.raw}`.replace(/s$/, ""))
    const sortOrders = NamedSorts.ordersUnder(this.getBody(match))
    return sortOrders.length ? { collections: { [name]: { sortOrders } } } : {}
  }

  /** Its lines' scope:  only there does a `named_sort` read. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.Scope {
    const scope = new P.BlockScope({ name: "named sorts", parentScope: match.scope })
    NAMED_SORT_SCOPES.add(scope)
    return scope
  }

  /** The sorts the `named_sort` lines in `body` name, in order. */
  private static ordersUnder(body: P.Match | undefined): SortOrderName[] {
    const orders: SortOrderName[] = []
    const seen = new Set<P.Match>()
    const visit = (each: P.Match) => {
      if (seen.has(each)) return
      seen.add(each)
      if (each.rule instanceof NamedSort) {
        orders.push(NamedSort.orderOf(each as P.MatchFor<NamedSort>))
        return
      }
      for (const item of each.matched) if (item instanceof P.Match) visit(item)
    }
    if (body) visit(body)
    return orders
  }
}

/**
 * `named_sort` rule:  one line of a `named_sorts` block, `- "completion" as "recency", by end time`.
 * - Only there:  anywhere else it reads as nothing.
 * - Says nothing by itself:  its block gathers it.
 */
export class NamedSort extends PlaceDetail<"name|value|field?"> {
  /** Quick test:  only in a `named_sorts` block. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return NAMED_SORT_SCOPES.has(scope) && super.test(scope, tokens, start)
  }

  /** Only in a `named_sorts` block. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    return NAMED_SORT_SCOPES.has(scope) ? super.parse(scope, tokens) : undefined
  }

  /** Nothing:  its block says it. */
  detailOf(_match: P.MatchFor<this>): PlaceDetailValue {
    return {}
  }

  /** What one line says:  its name and value as written, its field as compiled code names it. */
  static orderOf(match: P.MatchFor<NamedSort>): SortOrderName {
    const { name, value, field } = match.groups
    const sent = textIn(value)
    return { name: fieldNamed(textIn(name)), as: sent, field: fieldNamed(field ? `${field.raw}` : sent) }
  }
}

/**
 * `named_sort_field` rule:  the field a `named_sort` line says, after its `, by`:  every word to the line's end.
 * - So `created at`, `hora de fin`:  a member's words (`member_words`) end at `at`, `de`, and the type naming the
 *   field may be declared further on.
 * - Its match is a member's:  `raw` the words as written.
 */
export class NamedSortField extends MemberWords {
  /** Every word to the end of the line, or nothing. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!tokens.length || !tokens.every((token) => token instanceof P.WordToken || token instanceof P.NumberToken))
      return undefined
    if (!(tokens[0] instanceof P.WordToken) || !tokens[0].matchesPattern(this.pattern)) return undefined
    return new P.Match({
      rule: this,
      matched: tokens,
      raw: tokens.map((token) => token.value).join(" "),
      value: tokens.map((token) => `${token.value}`.replace(/-/g, "_")).join("_"),
      tokens,
      scope
    })
  }
}
