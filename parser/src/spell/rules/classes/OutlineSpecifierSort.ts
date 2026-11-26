import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { MemberWords } from "spell/parser/spell/rules/properties/MemberWords"

/** What a sort a page holds is, as a datatype:  `core.sort()`'s value. */
export const SORT_DATATYPE = "sort"

/**
 * `outline_specifier_sort` rule:  a property that's a SORT, and where it starts --
 * `its "order" is a sort:  completion, newest first`;  Spanish `su "orden" es un orden:  finalización, de más reciente
 * a más antiguo`.
 * - A sort is a sort name or a field, and a direction (`core.sort()`):  what a read sorted by it asks for,
 *   `the first 50 measurements sorted by the order`, and what a table's header click sets (`<ui-table sort="the order">`).
 * - Its name or field is words, as written:  which it is, and of what, is found when a read uses it (`core.sortRead()`).
 * - Its direction in the words a sort's key ends with (`SORT_ORDER_WORDS`);  left out, smallest first.
 * - Compiles to its starting value, `core.sort("completion", true)`:  `DefinePropertyHas` makes it with its thing.
 * - Before the plain `a {type}` rules:  else `a sort` would read as a type of its own, `Sort`.
 */
export class OutlineSpecifierSort extends P.Sequence<"by|descending?|ascending?"> {
  @proto static alias = "outline_specifier"

  /** A sort. */
  getDatatype(_match: P.MatchFor<this>): P.Datatype | undefined {
    return SORT_DATATYPE
  }

  /** Its starting value, `core.sort("completion", true)`. */
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const by = `${match.groups.by.raw ?? match.groups.by.value}`.trim().replace(/\s+/g, " ")
    const args: P.ASTExpression[] = [new P.ASTStringLiteral(match, { value: JSON.stringify(by) })]
    if (match.groups.descending) args.push(new P.ASTBooleanLiteral(match, { value: true }))
    return new P.ASTCoreMethodInvocation(match, { methodName: "sort", args })
  }

  /**
   * Does `value`, an expression, hold a sort a page holds (`the order`)?
   * - Its own datatype, else, for a property declared further down (a stub as it was read), what its owner's type
   *   says of it by now:  call it once the file is read, as it compiles.
   */
  static holdsASort(value: P.Match): boolean {
    if (value.datatype !== undefined) return value.datatype === SORT_DATATYPE
    const { ownerType } = value.data as { ownerType?: P.TypeScope }
    const words = (value.groups as { property?: P.Match }).property?.raw
    const member = words === undefined ? undefined : ownerType?.getMember(`${words}`)
    return member instanceof P.ScopeVariable && member.datatype === SORT_DATATYPE
  }
}

/**
 * `page_sort_by` rule:  the name or field a sort a page holds starts as, every word up to its comma or the line's end:
 * `completion`, `created at`, `hora de fin`.
 * - A member's words (`member_words`) end at `at`, `de`;  and what it names isn't known until a read uses it.
 * - Its match is a member's:  `raw` the words as written.
 */
export class PageSortBy extends MemberWords {
  /** Every word up to the first token that isn't one. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!(tokens[0] instanceof P.WordToken) || !tokens[0].matchesPattern(this.pattern)) return undefined
    let count = 0
    while (count < tokens.length && (tokens[count] instanceof P.WordToken || tokens[count] instanceof P.NumberToken))
      count++
    const words = tokens.slice(0, count)
    return new P.Match({
      rule: this,
      matched: words,
      raw: words.map((token) => token.value).join(" "),
      value: words.map((token) => `${token.value}`.replace(/-/g, "_")).join("_"),
      tokens: words,
      scope
    })
  }
}
