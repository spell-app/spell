import { P } from "spell/parser/parser"
import { PossessiveMark } from "./PossessiveMark"

/**
 * `possessive_owner` rule:  what comes before a possessive's `'s`, e.g. `the character` in `the character's name`
 * (epic `language`, P16).
 * - Any operand, which must END at an `'s`:  so the possessive isn't its own first operand, forever.
 * - The LAST `'s` it can reach first, so a chain reads left to right:
 *   `the character's friend` owns `name` in `the character's friend's name`.
 *   - An operand that stops short of an `'s`, `the card` in `the card is the deck's top card`,
 *     leaves that `'s` to a later operand.
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
      if (owner?.length === at) return owner
    }
    return undefined
  }

  compile(match: P.MatchFor<this>) {
    return match.value
  }
}
