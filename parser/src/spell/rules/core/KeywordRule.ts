import { assert, proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `keyword` rule:  single alphanumeric word used as a keyword, e.g. in a method definition.
 * - e.g. `abc`
 * - Case is not a factor, but it must start with a letter.
 * - Class named `KeywordRule`, not `Keyword`, which would read as the parser's `P.Keyword`.
 */
export class KeywordRule extends P.Pattern {
  static ruleName = "keyword"
  @proto static pattern = P.ALPHANUMERIC_WORD_WITH_DASHES

  /** Converts dashes to underscores when compiling, so `abc-def` outputs as valid JS identifier `abc_def`. */
  mapValue<T = string>(value: string): T {
    return `${value}`.replace(/-/g, "_") as T
  }

  getAST(match: P.MatchFor<this>): P.ASTKeywordLiteral {
    const { value, raw } = match
    return new P.ASTKeywordLiteral(match, { value: assert.string(value), raw })
  }
}
