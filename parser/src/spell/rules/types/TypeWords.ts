import { NONE } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { Wording } from "spell-lang/spell/rules/expressions"
import { SpellType } from "./SpellType"

/**
 * `type_words` rule:  the name a declaration gives a type, one word or several,
 * e.g. `bank account` in `a bank account is a thing`.
 * - Every word up to the first which can't be in a name:  a blacklisted one (`is`), or `aka`.
 *   At most `SpellType.MAX_NAME_WORDS`.
 * - A name may hold a blacklisted word when the whole of it runs up to `is` or `aka` (epic `spanish` P14):
 *   `a card in play is a thing`, `una carta de juego es una cosa`.
 *   - Its last word is never a blacklisted one, and nor is its first.
 *   - Later lines find it whole, as any name of several words:  see `SpellType.declaredWithGrammarWords()`.
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
    count = this.withGrammarWords(scope, tokens, count)
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

  /**
   * How many words the name takes, when it holds blacklisted words up to `is` or `aka`, e.g. 3 for `card in play is`
   * -- else `count`, the words before the first blacklisted one.  See class docs.
   */
  private withGrammarWords(scope: P.Scope, tokens: P.Token[], count: number): number {
    const { blacklist, typeNameStopWords } = SP.Language.of(scope).words
    const isBlacklisted = (index: number) =>
      tokens[index] instanceof P.WordToken && !!blacklist[`${tokens[index].value}`.toLowerCase()]
    const endsName = (index: number) =>
      typeNameStopWords.has(`${tokens[index]!.value}`.toLowerCase()) ||
      Wording.lengthAt(scope, "is_or_are", tokens, index) > 0
    if (count >= tokens.length || !isBlacklisted(count) || endsName(count)) return count
    for (let index = count + 1; index <= SpellType.MAX_NAME_WORDS && index < tokens.length; index++) {
      if (endsName(index)) return isBlacklisted(index - 1) ? count : index
      if (!this.test(scope, tokens, index) && !isBlacklisted(index)) return count
    }
    return count
  }

  /** Can the token at `index` be one of a name's words? */
  private isNameWord(scope: P.Scope, tokens: P.Token[], index: number): boolean {
    const { typeNameStopWords } = SP.Language.of(scope).words
    return this.test(scope, tokens, index) && !typeNameStopWords.has(`${tokens[index]!.value}`.toLowerCase())
  }
}
