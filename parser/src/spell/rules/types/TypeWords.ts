import { NONE } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { SpellType } from "./SpellType"

/**
 * `type_words` rule:  the name a declaration gives a type, one word or several,
 * e.g. `bank account` in `a bank account is a thing`.
 * - Every word up to the first which can't be in a name:  a blacklisted one (`is`), or `aka`.
 *   At most `SpellType.MAX_NAME_WORDS`.
 * - So it's ONLY for a declaration's name, between fixed words:  `(a|an) {type:type_words} ... is`.
 *   A MENTION of a type is `type`, which takes several words only if someone declared them.
 * - `value`, `raw` and `data.scopeType` as `type`'s, e.g. `BankAccount` and `bank account`.
 */
export class TypeWords extends SpellType {
  /** Every name word from the first token on -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    let count = 0
    while (count < SpellType.MAX_NAME_WORDS && this.isNameWord(scope, tokens, count)) count++
    if (!count) return undefined
    const words = tokens.slice(0, count)
    const value = this.mapValue(SpellType.joined(words))
    const match = new P.Match({
      rule: this,
      matched: words,
      raw: words.map((token) => token.value).join(" "),
      value,
      tokens: words,
      scope
    }) as P.MatchFor<this>
    match.data.scopeType = scope.types?.get(value) ?? NONE
    return match
  }

  /** Can the token at `index` be one of a name's words? */
  private isNameWord(scope: P.Scope, tokens: P.Token[], index: number): boolean {
    const { typeNameStopWords } = SP.Language.of(scope).words
    return this.test(scope, tokens, index) && !typeNameStopWords.has(`${tokens[index]!.value}`.toLowerCase())
  }
}
