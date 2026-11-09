import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { ReturnStatement } from "spell/parser/spell/rules/assignment/ReturnStatement"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { Meanwhile } from "./Meanwhile"

/**
 * `without_waiting` rule:  starts a call and carries on, its words at the end of the line:
 * `deal the cards without waiting`.
 * - Means exactly `meanwhile deal the cards`, and compiles the same:  `Meanwhile.getAST()`.
 * - Not for a line that sets, declares or returns something:  `set x to deal the cards without waiting` says why not,
 *   since a value that's only on its way has nothing to set.
 * - Not for a line with a body:  `if x then deal the cards without waiting` is the `if`'s, its inline body going off.
 * - `Priority.specific`:  the call alone also matches, as the start of the line, and one with no blanks is `specific`:
 *   the same priority, and our longer match wins.
 * - An action whose own name ends in those words wins, whole:  `to deal without waiting`.
 * - Reads its statement by hand, not as `{call:statement} without waiting` would:
 *   a slot given the whole line would read this rule again, for ever.
 */
export class WithoutWaiting extends Meanwhile {
  @proto static alias = ["statement", "async"]
  @proto static priority = Priority.specific

  /** How many words the rule's own end has:  `without waiting`, `sin esperar`. */
  private static readonly WORDS = 2

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (this.test(scope, tokens) === false) return undefined
    const cut = tokens.length - WithoutWaiting.WORDS
    if (cut < 1 || !this.endsWithOurWords(scope, tokens.slice(cut))) return undefined
    if (this.isOwnWords(scope, tokens)) return undefined
    const call = scope.parser?.parse(tokens.slice(0, cut), "statement", scope)
    if (call?.length !== cut || (call.rule as SpellStatement).bodySpec) return undefined
    const match = new P.Match({ rule: this, matched: [...tokens], tokens: [...tokens], scope })
    match.addMatch(call, "call")
    match.data.body = call
    if (WithoutWaiting.isCall(call)) return match
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("cant-go-without-waiting"))
  }

  /** Are `tail`'s words the ones our syntax ends in? */
  private endsWithOurWords(scope: P.Scope, tail: P.Token[]): boolean {
    let at = 0
    for (const word of this.rules.slice(1)) {
      const said = word.parse(scope, tail.slice(at))
      if (!said) return false
      at += said.length
    }
    return at === tail.length
  }

  /**
   * Is the whole line an action named in those words, `to deal without waiting`?
   * - It says them itself, as its last words:  a blank taking them as its argument doesn't count (`frenar {thisArg}?`).
   */
  private isOwnWords(scope: P.Scope, tokens: P.Token[]): boolean {
    const whole = scope.parser?.parse(tokens, "expression", scope)
    return whole?.length === tokens.length && !(whole.matched.at(-1) instanceof P.Match)
  }

  /** Can `statement` go off by itself?  Not one that changes its scope, or returns from what holds it. */
  private static isCall({ rule }: P.Match): boolean {
    return rule.mutateScope === P.Rule.prototype.mutateScope && !(rule instanceof ReturnStatement)
  }
}
