import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellConstant } from "spell/parser/spell/rules/constants"

import { Negatable } from "./Negatable"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, SuffixLeft, type OperatorOperands } from "./expressions.shared"

/**
 * `is_equal` rule:  `{lhs} is [not] {rhs}`, e.g. `thing is other` -- compiles to `===`/`!==`.
 * - e.g. `its cook is them`:  to `core.isCurrentPerson()`, as what's saved of a person comes back a new object each time it's read.
 */
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
    const listed = IsEqual.listedPropertyFor(scope, SuffixLeft.current, match.groups.expression)
    if (listed) {
      const { property, value } = listed
      ;(match.data as IsEqualMatchData).property = property.output ?? property.name
      // the value as its list says it, and what that compiles to:  `it is a club` is `clubs`, `bloqueada` is `locked`
      SpellConstant.compileAs(match.groups.expression, property.valueOutputs?.[value] ?? value)
    }
    // a value said for a built-in template's property, in its own language:  `arriba` is `up` (epic `language` T74)
    SpellConstant.sayFor(SuffixLeft.current, match.groups.expression)
    // a quoted value that isn't one of its values:  `if its lock is "banana"` (epic `language` P39)
    const wrongValue = SpellConstant.wrongValueOf(scope, SuffixLeft.current, match.groups.expression)
    if (wrongValue) SP.SpellWarnings.note(match, wrongValue)
    return match
  }

  /** `thing is clubs` => `thing.suit == "clubs"`, when it compares a thing to a value of its own -- see `parse()`. */
  compileASTExpression(match: P.MatchFor<this>, operands: OperatorOperands): P.ASTNode {
    const other = isCurrentPerson(operands.rhs)
      ? operands.lhs
      : isCurrentPerson(operands.lhs)
        ? operands.rhs
        : undefined
    if (other) {
      const call = new P.ASTCoreMethodInvocation(match, { methodName: "isCurrentPerson", args: [other] })
      return Negatable.isNegated(operands.operator) ? new P.ASTNotExpression(match, { expression: call }) : call
    }
    const { property } = match.data as IsEqualMatchData
    if (!property || !operands.lhs) return super.compileASTExpression(match, operands)
    const lhs = new P.ASTPropertyExpression(match, { object: operands.lhs, property })
    return super.compileASTExpression(match, { ...operands, lhs })
  }

  /**
   * The ONE property of `left`'s type whose own list of values holds the word `right` is, e.g. `suit` for
   * `it is clubs` in a card, which says `its "suit" is one of clubs, diamonds, hearts or spades`.
   * - So a thing compared to one of its values compares the property that has it:  a card is never `clubs` itself.
   * - `undefined`:  `left`'s type is unknown or lists no such value, `right` is more than a word or a variable,
   *   or two of its properties list it.
   * - SEE:  `P.TypeScope.propertiesListing()`.
   * - A lookup:  call it WHILE PARSING.
   */
  static listedPropertyFor(
    scope: P.Scope,
    left: P.Match | undefined,
    right: P.Match | undefined
  ): { property: P.ScopeVariable; value: string } | undefined {
    const type = scope.getType(left?.datatype)
    const word = right?.inputText.trim()
    if (!type || !word || /\s/.test(word) || scope.variables?.get(word)) return undefined
    const found = type.propertiesListing(word)
    return found.length === 1 ? found[0] : undefined
  }

  getOperator(operator: P.Match): P.ASTOperator {
    return Negatable.isNegated(operator) ? "not equals" : "equals"
  }

  /** Negated as `!=`, by `getOperator()`:  never wrapped in a `!(...)` too. */
  shouldNegateOutput(): boolean {
    return false
  }
}

/** Is `operand` what `them` compiles to?  Asked of the AST, as this rule's module can't see the `places` rules. */
function isCurrentPerson(operand: P.ASTExpression | undefined): boolean {
  return operand instanceof P.ASTCoreMethodInvocation && operand.methodName === "currentPerson"
}

/** What `is_equal` stashes on its match. */
type IsEqualMatchData = {
  /** The property of the thing on its left it compares, e.g. `suit` for `it is clubs` -- see `listedPropertyFor()`. */
  property?: string
}
