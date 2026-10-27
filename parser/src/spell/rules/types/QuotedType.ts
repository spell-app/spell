import { NONE } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { SpellType } from "./SpellType"

/**
 * `quoted_type` rule:  a type's name in quotes, where it's being declared,
 * e.g. `a "card" is a thing where:` -- the outline style's "quotes teach a new word" (epic page `outline-spell`).
 * - e.g. `"card"` in `a "card" is a thing where:`
 * - One word (dashes OK) inside straight quotes, not blacklisted;  a `SpellType` match like `card` would be.
 * - Or several, up to `SpellType.MAX_NAME_WORDS`, blacklisted ones too, but not first or last (epic `spanish` P14):
 *   `a "card in play" is a thing`, `una "carta de juego" es una cosa`.
 *   - Compiled as `bank account` would be:  `CardInPlay`.
 * - `raw` is the name without its quotes, e.g. `card`, `card in play`.
 */
export class QuotedType extends SpellType {
  /** A text token whose inside is one type word. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return QuotedType.nameOf(tokens[start], SP.Language.of(scope).words.blacklist) !== undefined
  }

  parse(scope: P.Scope, tokens: P.Token[]) {
    const [token] = tokens
    const raw = QuotedType.nameOf(token, SP.Language.of(scope).words.blacklist)
    if (!token || raw === undefined) return undefined
    const match: P.MatchFor<this> = new P.Match({
      rule: this,
      matched: [token],
      raw,
      value: this.mapValue(raw.replace(/\s+/g, "-")),
      tokens: [token],
      scope
    })
    match.data.scopeType = scope.types?.get(match.value) ?? NONE
    return match
  }

  /** A declaration names the type without its quotes, e.g. `card`. */
  declaredText(match: P.Match): string {
    return `${match.raw}`
  }

  /**
   * The name inside `token`'s quotes, its words a space apart,
   * if it's a text token holding just that -- else `undefined`.
   * - Its first and last word not on `blacklist`:  see class docs.
   */
  private static nameOf(token: P.Token | undefined, blacklist: P.IdentifierBlacklist | undefined): string | undefined {
    if (!(token instanceof P.TextToken)) return undefined
    const words = token.innerText.trim().split(/\s+/)
    const isBlacklisted = (word: string | undefined) => !!blacklist?.[`${word}`.toLowerCase()]
    if (words.length > SpellType.MAX_NAME_WORDS || !words.every((word) => QUOTED_TYPE_NAME.test(word))) return undefined
    if (isBlacklisted(words[0]) || isBlacklisted(words.at(-1))) return undefined
    return words.join(" ")
  }
}

/** What `quoted_type` takes inside its quotes:  each word, dashes OK. */
const QUOTED_TYPE_NAME = P.ALPHANUMERIC_WORD_WITH_DASHES
