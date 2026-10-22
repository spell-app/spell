import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"

/**
 * `quoted_member` rule:  a member's name in quotes, where it's being declared:
 *   `its "suit" is one of ...` in an outline-style type's body
 *   -- the outline style's "quotes teach a new word" (epic page `outline-spell`).
 * - The words inside are a `member_words` name, every one of them:  `value` and `raw` as `member_words`'s,
 *   e.g. `short_rank` / `short rank`.
 * - Stop words too, after the first (epic `spanish` P14):  `its "side of play" is a number`, `"what if"`.
 *   - Later reads find the name whole:  see `member_words`.
 *   - Not first:  `"is face up"` is a phrase, not a member.
 */
export class QuotedMember extends P.Rule {
  @proto static highlightAs: P.HighlightKind = "property"

  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return QuotedMember.wordsOf(tokens[start]) !== undefined
  }

  parse(scope: P.Scope, tokens: P.Token[]) {
    const [token] = tokens
    const words = QuotedMember.wordsOf(token)
    if (!token || !words) return undefined
    return new P.Match({
      rule: this,
      matched: [token],
      raw: words.join(" "),
      value: words.map((word) => word.replace(/-/g, "_")).join("_"),
      tokens: [token],
      scope
    })
  }

  compile(match: P.MatchFor<this>) {
    return match.value
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTPropertyLiteral(match)
  }

  /** A declaration names the member without its quotes, e.g. `short rank`. */
  declaredText(match: P.Match): string {
    return `${match.raw}`
  }

  /** The words inside `token`'s quotes, if it's a text token holding only a member's words -- else `undefined`. */
  private static wordsOf(token: P.Token | undefined): string[] | undefined {
    if (!(token instanceof P.TextToken)) return undefined
    const words = token.innerText.trim().split(/\s+/)
    const { memberStopWords, memberLeadingWords } = SP.Language.active.words
    const isMemberWord = (word: string, index: number) => {
      const lower = word.toLowerCase()
      return (
        QUOTED_MEMBER_WORD.test(word) && (index > 0 || !memberStopWords.has(lower) || memberLeadingWords.has(lower))
      )
    }
    return words[0] && words.every(isMemberWord) ? words : undefined
  }
}

/** A word `quoted_member` takes inside its quotes. */
const QUOTED_MEMBER_WORD = P.ALPHANUMERIC_WORD_WITH_DASHES
