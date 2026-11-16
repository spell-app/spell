import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Precedence } from "./expressions.shared"
import { IsEqual } from "./IsEqual"
import { NumberLiteral } from "spell/parser/spell/rules/core"

/**
 * `is_listed_value` rule:  `{lhs} is [not] a`/`an {value}`, comparing the property that lists the value
 * (epic `language` P39, C4).
 * - e.g. `if it is a queen` ~== `if its rank is queen`, `if it is a club` ~== `if its suit is clubs`.
 * - A number too (epic `language` P55):  `if it is a 2` ~== `if its rank is 2`, with no `it "is a (rank)"`.
 * - The article means nothing:  nobody has to decide whether a value is a verb or a noun.
 * - Only when the word names no type:  a known type's `is_a`, so `is a queen` with a type named `queen` tests the type.
 * - Registered after `is_a`, and tried only on what `is_a` couldn't read:  no line that parses today gets slower.
 * - Compiles as `is_equal` does.
 */
export class IsListedValue extends IsEqual {
  // as tightly as `is_a`, whose words it reads
  @proto static precedence = Precedence.comparison

  /** Only a value of `left`'s thing's own list, and no type. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return match
    const { expression } = match.groups
    if (scope.getType(SP.typeName(`${expression.raw}`))) return undefined
    return (match.data as { property?: string }).property ? match : undefined
  }

  /**
   * The property listing `right`'s value:  a word (`queen`), or a number (`2`, epic `language` P55);
   * a thing of a type not known yet where it's read, by the ONE property name any type lists it under.
   */
  protected listedFor(scope: P.Scope, left: P.Match | undefined, right: P.Match | undefined) {
    if (right?.is(NumberLiteral)) return IsListedValue.listingNumber(scope, left, Number(right.value))
    return IsEqual.listedPropertyFor(scope, left, right, { anywhere: true })
  }

  /** The ONE property of `left`'s thing whose list holds the number `value`:  a card's `rank`, for `it is a 2`. */
  private static listingNumber(scope: P.Scope, left: P.Match | undefined, value: number) {
    const type = scope.getType(left?.datatype)
    const found = new Map<string, { property: P.ScopeVariable; value: string }>()
    for (const owner of type?.chain() ?? []) {
      // only a property listing the number matters (`P.Outline`)
      for (const property of owner.variables.scan((it) => !!it.listedValues?.includes(value))) {
        if (property.listedValues?.includes(value) && !found.has(`${property.name}`)) {
          found.set(`${property.name}`, { property, value: `${value}` })
        }
      }
    }
    return found.size === 1 ? [...found.values()][0] : undefined
  }
}
