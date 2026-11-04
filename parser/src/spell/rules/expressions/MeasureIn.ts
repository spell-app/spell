import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { Precedence, SuffixLeft, type OperatorOperands } from "./expressions.shared"
import { type UnitWordsData } from "./UnitWords"

/**
 * `measure_in` rule:  a measure in other units, e.g. `its height in feet`, `its height in feet and inches`
 * (epic `language` P23, Q26).
 * - Only after a MEASURE:  a property that says what it measures (`its "height" is a length in cm`), or a written one,
 *   `172 cm` -- see `SP.measureOf()`.  After anything else it's not ours, so `x in the list` reads as it always has.
 * - One unit gives the number:  `core.convertMeasure(this.height, "Length", "centimeter", "foot")`.
 * - Several, largest first, give the measure written for people:  `5 ft 8 in` --
 *   `core.measureText(this.height, "Length", "centimeter", ["foot", "inch"])`.
 * - A unit of another dimension is an error naming both:  `its height in kg`.
 */
export class MeasureIn extends PostfixOperatorSuffix<"units", MeasureInData> {
  @proto static precedence = Precedence.measure
  @proto static datatype: P.Datatype | undefined = "number"

  /** Only after a measure;  notes it, and refuses another dimension's unit. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const measure = SP.measureOf(SuffixLeft.current)
    if (!measure) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const units = MeasureIn.unitsOf(match)
    match.data.converts = measure
    match.data.units = units.map((unit) => `${unit.value}`)
    const other = units.find((unit) => (unit.data as UnitWordsData).dimension?.name !== measure.dimension)
    if (other) {
      const language = SP.Language.of(scope)
      const words = (name: string) =>
        language.withArticle("indefinite", `${scope.getType(name)?.aka ?? name}`.toLowerCase())
      const message = language.parserMessage("units-differ", {
        aDimension: words(measure.dimension),
        unit: `${other.raw}`,
        aOther: words((other.data as UnitWordsData).dimension!.name)
      })
      SP.SpellWarnings.refuseIf(match, message, () => true)
    }
    return match
  }

  /** Our units' matches, in order. */
  static unitsOf(match: P.Match): P.Match[] {
    const units = match.groups.units as P.Match
    return units.matched.filter(
      (item): item is P.Match => item instanceof P.Match && !!(item.data as UnitWordsData).unit
    )
  }

  /** A number for one unit, the measure written as text for several. */
  getResultDatatype(match: P.MatchFor<this>, _lhs?: P.Datatype, _rhs?: P.Datatype): P.Datatype | undefined {
    return (match.data.units?.length ?? 1) > 1 ? "text" : "number"
  }

  compileASTExpression(match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    const { converts: measure, units = [] } = match.data
    const text = (value: string) => new P.ASTStringLiteral(match, { value, quote: '"' })
    const to =
      units.length > 1 ? new P.ASTArrayLiteral(match, { items: units.map((unit) => text(unit)) }) : text(units[0] ?? "")
    return new P.ASTCoreMethodInvocation(match, {
      methodName: units.length > 1 ? "measureText" : "convertMeasure",
      args: [lhs!, text(measure!.dimension), text(measure!.unit), to]
    })
  }
}

/** What `measure_in` noted:  the measure it converts, and the units it converts to, by id. */
export type MeasureInData = { converts?: P.Measure; units?: string[] }
