import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * `unit_words` rule:  the words of one UNIT of a dimension the scope knows, e.g. `cm`, `feet`, `°F`, `fl oz`
 * (epic `language` P23).
 * - The LONGEST unit name the tokens start with, of any dimension in scope:  see `SP.unitAt()`.
 * - Notes which, `match.data.dimension` and `match.data.unit`:  what reads it checks the dimension is the one it wants,
 *   e.g. `its height in kg` (`measure_in`).
 * - No match where no dimension has such a unit.
 */
export class UnitWords extends P.Pattern {
  @proto static pattern = /^.+$/
  @proto static highlightAs: P.HighlightKind = "keyword"

  /** Quick test:  a word or a mark some dimension's unit is named by. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const token = tokens[start]
    if (!token || token instanceof P.NumberToken || token instanceof P.TextToken) return false
    return SP.UNIT_FIRST_WORDS.has(`${token.value}`.toLowerCase())
  }

  /** The longest unit name at the start of `tokens` -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    if (this.test(scope, tokens) === false) return undefined
    const found = SP.unitAt(SP.dimensionsIn(scope), tokens)
    if (!found) return undefined
    const words = tokens.slice(0, found.length)
    const match = new P.Match({
      rule: this,
      matched: words,
      raw: words.map((token) => token.value).join(" "),
      value: found.unit.id,
      tokens: words,
      scope
    })
    const data = match.data as UnitWordsData
    data.dimension = found.dimension
    data.unit = found.unit
    return match
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTStringLiteral(match, { value: `${match.value}`, quote: '"' })
  }
}

/** What `unit_words` found:  the dimension, and its unit. */
export type UnitWordsData = { dimension?: P.TypeScope; unit?: P.DimensionUnit }
