import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellExpression } from "./SpellExpression"

/**
 * `measure_literal` rule:  a number with its unit, written as people write measures (epic `language` P23, Owen's C3):
 * `172 cm`, `77 kg`, `5 ft 8 in`, `2' 3 1/2"`, `100 °C`, `1/2 cup`.
 * - Each part a number (a whole one, a fraction, or both:  `3 1/2`), then a unit of a dimension the scope knows.
 * - Several parts are ONE measure, all of one dimension, largest first:  `5 ft 8 in`.
 * - Its value is a plain number in its LAST part's unit, worked out as it compiles:  `5 ft 8 in` is `68` (inches),
 *   `2' 3 1/2"` is `27.5`;  `match.data.measure` says which, so `5 ft 8 in in cm` converts it (`measure_in`).
 *   - Except a percent, kept as its fraction:  `18%` is `0.18` (`SP.measureKeptIn()`, epic `language` P34).
 * - A foot's `'` and an inch's `"` only straight after the number, with no space:  the tokenizer reads a `"` after a
 *   digit as a mark, not text (`SpellParser`), and `'` after a word is still a possessive.
 * - A unit that's also one of the language's own words (`in`, an inch) reads only after another part, `5 ft 8 in`:
 *   so `3 in the list` stays `3`, in the list.
 */
export class MeasureLiteral extends SpellExpression {
  // reads its amounts and units by hand
  @proto static startsWithItsSyntax = false
  @proto static datatype = "number"
  @proto static highlightAs: P.HighlightKind = "number"

  /** Quick test:  a number, then a number, a `/`, or the first word of a unit some dimension has. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const next = tokens[start + 1]
    if (!(tokens[start] instanceof P.NumberToken) || !next) return false
    return (
      next instanceof P.NumberToken || `${next.value}` === "/" || SP.UNIT_FIRST_WORDS.has(`${next.value}`.toLowerCase())
    )
  }

  /** Each part, while they're of one dimension -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (this.test(scope, tokens) === false) return undefined
    const dimensions = SP.dimensionsIn(scope)
    const { memberStopWords } = SP.Language.of(scope).words
    const parts: Array<{ amount: number; unit: P.DimensionUnit }> = []
    let dimension: P.TypeScope | undefined
    let at = 0
    while (at < tokens.length) {
      const amount = amountAt(tokens, at)
      if (!amount) break
      const found = SP.unitAt(dimension ? [dimension] : dimensions, tokens, amount.end)
      if (!found) break
      const words = tokens.slice(amount.end, amount.end + found.length)
      const said = words.map((token) => `${token.value}`).join("")
      // a foot's `'` and an inch's `"` touch their number
      if ((said === "'" || said === '"') && tokens[amount.end - 1]!.end < words[0]!.start) break
      // `in`:  only after another part
      if (memberStopWords.has(said.toLowerCase()) && !parts.length) break
      dimension = found.dimension
      parts.push({ amount: amount.value, unit: found.unit })
      at = amount.end + found.length
    }
    if (!parts.length || !dimension) return undefined
    const last = parts.at(-1)!.unit
    // each part in the last part's unit:  mixed measures are lengths and weights, so factors alone
    const value = parts.reduce(
      (sum, part) => sum + (parts.length === 1 ? part.amount : (part.amount * part.unit.factor) / last.factor),
      0
    )
    // a percent's kept as its fraction, `18%` as `0.18`:  `SP.measureKeptIn()`
    const measure = SP.measureKeptIn(dimension, last)
    const keptUnit = dimension.units!.find((unit) => unit.id === measure.unit)!
    const kept = keptUnit === last ? value : (value * last.factor) / keptUnit.factor
    const matched = tokens.slice(0, at)
    const match = new P.Match({
      rule: this,
      matched,
      raw: matched.map((token) => token.value).join(" "),
      value: Number(kept.toFixed(10)),
      tokens: matched,
      scope
    })
    ;(match.data as MeasureLiteralData).measure = measure
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTNumericLiteral {
    return new P.ASTNumericLiteral(match, { value: match.value as number, raw: `${match.value}` })
  }
}

/** What `measure_literal` worked out:  its dimension and the unit its number is in. */
export type MeasureLiteralData = { measure?: P.Measure }

/**
 * The amount at `tokens[at]`:  a whole number, a fraction, or both (`3 1/2`), and where it ends -- `undefined` if none.
 */
function amountAt(tokens: readonly P.Token[], at: number): { value: number; end: number } | undefined {
  const whole = tokens[at]
  if (!(whole instanceof P.NumberToken)) return undefined
  const fraction = fractionAt(tokens, at)
  if (fraction) return fraction
  const after = fractionAt(tokens, at + 1)
  if (after) return { value: whole.value + after.value, end: after.end }
  return { value: whole.value, end: at + 1 }
}

/** The fraction at `tokens[at]`, `1/2`, and where it ends -- `undefined` if none. */
function fractionAt(tokens: readonly P.Token[], at: number): { value: number; end: number } | undefined {
  const [top, slash, bottom] = [tokens[at], tokens[at + 1], tokens[at + 2]]
  if (!(top instanceof P.NumberToken) || `${slash?.value}` !== "/" || !(bottom instanceof P.NumberToken))
    return undefined
  return bottom.value ? { value: top.value / bottom.value, end: at + 3 } : undefined
}
