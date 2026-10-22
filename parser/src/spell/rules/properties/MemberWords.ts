import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { longestNameIn, namesWithGrammarWords } from "spell-lang/spell/rules/rules.types"
import { SpellType } from "spell-lang/spell/rules/types"

/**
 * `member_words` rule:  1..N words naming a member, e.g. `short rank`, `short-rank`, `rank`.
 * - Every word up to the first STRUCTURAL one (the language's `memberStopWords`, `SP.LanguageWords`),
 *   e.g. `of` in `the short rank of a card is:`.  No other bound.
 * - NOT the identifier blacklist:  `short` and `long` are fine.  Safe, as:
 *   - a READ takes these words only if the type it reads from declares them (`property_expression`)
 *   - a declaration's words sit between fixed ones, e.g. `the ... of a card is`
 * - `value` is its name as it compiles:  its words joined by `_`, dashes too,
 *   e.g. `short_rank` for `short rank` or `short-rank` -- so either spelling finds the same member.
 * - `raw` is its words as written, e.g. `short rank`.
 * - A member someone declared with a stop word in its name is read whole, longest first (epic `spanish` P14):
 *   `the side of play of the card`, after `its "side of play" is a number`.
 *   - Any type's, as what's read comes after:  `declaredWithStopWords()`.
 * - Greedy:  a rule wanting FEWER, e.g. the longest run a type declares (`its short rank + 1`),
 *   re-parses with fewer tokens -- see `declaredPrefix()`.
 */
export class MemberWords extends P.Pattern {
  /** Any case, unlike `property`:  a class variable is PascalCase, e.g. `Card Suits`. */
  @proto static pattern = P.ALPHANUMERIC_WORD_WITH_DASHES
  @proto static highlightAs: P.HighlightKind = "property"

  /** Does a member's word start at `start`:  a word, not a structural one -- or one which may lead a name? */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return start < tokens.length && MemberWords.isMemberWord(tokens[start]!, this.pattern, true)
  }

  /** Every member word from the first token on -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    let count = 0
    while (count < tokens.length && MemberWords.isMemberWord(tokens[count]!, this.pattern, count === 0)) count++
    if (!count) return undefined
    if (tokens[count] instanceof P.WordToken) count = Math.max(count, MemberWords.declaredWithStopWords(scope, tokens))
    const words = tokens.slice(0, count)
    return new P.Match({
      rule: this,
      matched: words,
      raw: words.map((token) => token.value).join(" "),
      value: words.map((token) => `${token.value}`.replace(/-/g, "_")).join("_"),
      tokens: words,
      scope
    })
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTPropertyLiteral(match)
  }

  /**
   * How many of `tokens` name a member some type in `scope` declares with a stop word in its name, the longest
   * -- 0 for none, e.g. 3 for `side of play of the card`.
   * - Any type's:  `the X of Y` takes its words before what it reads is known.
   *   It then reads only a member Y's type declares (`property_expression`).
   */
  static declaredWithStopWords(scope: P.Scope, tokens: P.Token[]): number {
    const { memberStopWords } = SP.Language.active.words
    const isStopWord = (word: string) => memberStopWords.has(word)
    const names: string[] = []
    for (let types = scope.types; types; types = types.parent) {
      for (const type of types.get()) {
        names.push(...namesWithGrammarWords(type.variables, "member", wordsOfMember, isStopWord, "LOCAL_ONLY"))
      }
    }
    if (!names.length) return 0
    return longestNameIn(SpellType.lowerWords(tokens, tokens.length), names)
  }

  /**
   * Is `token` one of a member's words:  matches `pattern`, and isn't one of the language's stop words?
   * - The language in play's (`SP.LanguageWords.memberStopWords`).
   * - `first`:  the name's first word, which may also be one of its leading words (`memberLeadingWords`),
   *   e.g. `with` in `with jokers`.
   */
  private static isMemberWord(token: P.Token, pattern: RegExp, first = false): boolean {
    if (!(token instanceof P.WordToken) || !token.matchesPattern(pattern)) return false
    const word = `${token.value}`.toLowerCase()
    const { memberStopWords, memberLeadingWords } = SP.Language.active.words
    return !memberStopWords.has(word) || (first && memberLeadingWords.has(word))
  }
}

/** A member's words, from its name, e.g. `side_of_play` => `["side", "of", "play"]`. */
function wordsOfMember(member: P.ScopeVariable): string[] {
  return `${member.name}`.split("_")
}
