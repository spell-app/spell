import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Precedence, SuffixLeft } from "./expressions.shared"
import { IsEqual } from "./IsEqual"

/**
 * `is_listed_value` rule:  `{lhs} is [not] a`/`an {value}`, comparing the property that lists the value
 * (epic `language` P39, C4).
 * - e.g. `if it is a queen` ~== `if its rank is queen`, `if it is a club` ~== `if its suit is clubs`.
 * - The article means nothing:  nobody has to decide whether a value is a verb or a noun.
 * - Only when the word names no type:  a known type's `is_a`, so `is a queen` with a type named `queen` tests the type.
 * - Registered after `is_a`, and tried only on what `is_a` couldn't read:  no line that parses today gets slower.
 * - Compiles as `is_equal` does.
 */
export class IsListedValue extends IsEqual {
  // as tightly as `is_a`, whose words it reads
  @proto static precedence = Precedence.comparison

  /** Only a word naming a value of `left`'s type, and no type. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return match
    const { expression } = match.groups
    if (scope.getType(SP.typeName(`${expression.raw}`))) return undefined
    return IsEqual.listedPropertyFor(scope, SuffixLeft.current, expression) ? match : undefined
  }
}
