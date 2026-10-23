import { lowerFirst, proto } from "spell/util"
import { P } from "spell-parser/parser"

import { Negatable } from "./Negatable"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, SuffixLeft, type OperatorOperands } from "./expressions.shared"

/** `is_equal` rule:  `{lhs} is [not] {rhs}`, e.g. `thing is other` -- compiles to `==`/`!=`. */
export class IsEqual extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.equality
  @proto static parenthesize = true

  /**
   * Match -- and when it compares a thing to one of the values its type lists, which property it means:
   * `it is clubs`, in a card, is `its suit is clubs` (see `listedPropertyFor()`).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return match
    const property = IsEqual.listedPropertyFor(scope, SuffixLeft.current, match.groups.expression)
    if (property) (match.data as IsEqualMatchData).property = property
    return match
  }

  /** `thing is clubs` => `thing.suit == "clubs"`, when it compares a thing to a value of its own -- see `parse()`. */
  compileASTExpression(match: P.MatchFor<this>, operands: OperatorOperands): P.ASTNode {
    const { property } = match.data as IsEqualMatchData
    if (!property || !operands.lhs) return super.compileASTExpression(match, operands)
    const lhs = new P.ASTPropertyExpression(match, { object: operands.lhs, property })
    return super.compileASTExpression(match, { ...operands, lhs })
  }

  /**
   * The ONE property of `left`'s type whose own list of values holds the word `right` is, e.g. `suit` for
   * `it is clubs` in a card, which says `its "suit" is one of clubs, diamonds, hearts or spades`.
   * - So a thing compared to one of its values compares the property that has it:  a card is never `clubs` itself.
   * - The word as listed, or its singular or plural:  `it is a club` is the `is a (suit)` phrase's, not ours.
   * - `undefined`:  `left`'s type is unknown or lists no such value, `right` is more than a word or a variable,
   *   or two of its properties list it.
   * - A lookup:  call it WHILE PARSING.
   */
  private static listedPropertyFor(
    scope: P.Scope,
    left: P.Match | undefined,
    right: P.Match | undefined
  ): string | undefined {
    const type = scope.getType(left?.datatype)
    const word = right?.inputText.trim()
    if (!type || !word || /\s/.test(word) || scope.variables?.get(word)) return undefined
    const singular = P.singularize(word)
    const found = new Set<string>()
    for (const owner of type.chain()) {
      for (const variable of owner.variables.get()) {
        const values = variable.enumeration
        // its own list is kept on its plural class variable, e.g. `Suits` for `suit`:  `define_property_has`
        if (!values) continue
        const listed = values.some(
          (value) => typeof value === "string" && P.singularize(value.replace(/^'(.*)'$/, "$1")) === singular
        )
        if (listed) found.add(P.singularize(lowerFirst(variable.name)))
      }
    }
    return found.size === 1 ? [...found][0] : undefined
  }

  getOperator(operator: P.Match): P.ASTOperator {
    return Negatable.isNegated(operator) ? "not equals" : "equals"
  }

  /** Negated as `!=`, by `getOperator()`:  never wrapped in a `!(...)` too. */
  shouldNegateOutput(): boolean {
    return false
  }
}

/** What `is_equal` stashes on its match. */
type IsEqualMatchData = {
  /** The property of the thing on its left it compares, e.g. `suit` for `it is clubs` -- see `listedPropertyFor()`. */
  property?: string
}
