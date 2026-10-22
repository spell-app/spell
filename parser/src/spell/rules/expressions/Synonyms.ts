import { P } from "spell-lang/parser"

/**
 * A WORD RULE whose forms all mean the same to spell, e.g. `is_or_are`, `(is|are)` (epic `spanish` P3).
 * - The articles are these too:  `indefinite_article`, `(a|an)`;  `definite_article`, `the`.
 * - A plain keyword:  no meanings to read, just "is it one of these words?".
 * - For code that looks ahead at a person's own words:
 *   `Wording.reads(scope, "is_or_are", word)`, never `/^(is|are)$/`.
 *   Spanish registers `(es|son)` under the same name.
 * - Which form a person wrote is still there to ask, `formOf()`:  the articles' must agree with their noun,
 *   `an apple`, `la carta` (epic `spanish` P8, `SP.Language.agreement()`).
 * - Registered once per word list, `Synonyms.specialize({ ruleName: "is_or_are" })`.
 */
export class Synonyms extends P.Keyword {
  /**
   * The match of word rule `ruleName` at `tokens[start]`, e.g. `a` for `indefinite_article` in `a apple` --
   * `undefined` if it doesn't read there, or the scope's parser has no such rule.
   */
  static matchAt(scope: P.Scope, ruleName: string, tokens: P.Token[], start = 0): P.Match | undefined {
    const rule = scope.parser?.rules[ruleName]
    if (!rule || start >= tokens.length || rule.test(scope, tokens, start) === false) return undefined
    return rule.parse(scope, start ? tokens.slice(start) : tokens)
  }

  /** Which form `match` is, as written but lowercase, e.g. `an` for `indefinite_article`'s `An`. */
  static formOf(match: P.Match): string {
    return match.tokens
      .map((token) => `${token.value}`)
      .join(" ")
      .toLowerCase()
  }
}
