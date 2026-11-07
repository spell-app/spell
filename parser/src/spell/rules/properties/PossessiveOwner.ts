import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { ParseError } from "spell/parser/spell/rules/ParseError"
import { PossessiveMark } from "./PossessiveMark"

/**
 * `possessive_owner` rule:  what comes before a possessive's `'s`, e.g. `the character` in `the character's name`
 * (epic `language`, P16) -- or before a plural's apostrophe alone, `the cards` in `the cards' names` (T23).
 * - Any operand, which must END at an `'s`:  so the possessive isn't its own first operand, forever.
 * - The LAST `'s` it can reach first, so a chain reads left to right:
 *   `the character's friend` owns `name` in `the character's friend's name`.
 *   - An operand that stops short of an `'s`, `the card` in `the card is the deck's top card`,
 *     leaves that `'s` to a later operand.
 * - Never what can't have members, so the `'s` is the last name's inside it:
 *   - a phrase ending in a condition, `every film where its title includes the guide` (epic `language` T47):
 *     `the guide's search`
 *   - a statement that isn't an expression, `draw each hour in its forecast` (T48):
 *     `{draw each hour in its forecast's hours}`
 *   - a phrase refused, `draw each hour in its forecast` when a forecast isn't a list (T48)
 * - It parses the owner on tokens cut at the `'s`, recording nothing in expecting mode (`P.Expectations.paused()`):
 *   running out of those says nothing about what a person could type next.
 */
export class PossessiveOwner extends P.Rule {
  /** An `'s` after the first token -- cheap, as every operand asks. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return PossessiveMark.isIn(tokens, start)
  }

  /** The longest operand ending at an `'s` -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!PossessiveMark.isIn(tokens)) return undefined
    const operand = scope.getRuleOrDie("operand")
    for (let at = tokens.length - 2; at > 0; at--) {
      if (!PossessiveMark.isAt(tokens, at)) continue
      const owner = P.Expectations.paused(() => operand.parse(scope, tokens.slice(0, at)))
      if (owner?.length === at && !PossessiveOwner.hasNoMembers(owner)) return owner
    }
    return undefined
  }

  /** Is `owner` refused, a statement that isn't an expression, or does it end in its own condition, `... where its title includes the guide`?  See class docs. */
  private static hasNoMembers(owner: P.Match): boolean {
    if (owner.is(ParseError)) return true
    if (owner.rule instanceof SpellStatement && !(owner.rule instanceof SpellExpression)) return true
    // a `where {inline_expression}` clause is its `body`
    const condition = (owner.groups as P.MatchGroups | undefined)?.body as P.Match | undefined
    return !!condition && condition.tokens.at(-1) === owner.tokens.at(-1)
  }

  compile(match: P.MatchFor<this>) {
    return match.value
  }
}
