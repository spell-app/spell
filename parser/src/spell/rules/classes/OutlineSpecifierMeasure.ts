import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { type UnitWordsData } from "spell/parser/spell/rules/expressions"

/**
 * `outline_specifier_measure` rule:  a property that MEASURES something, in a unit (epic `language` P23, Q26):
 * `its "height" is a length in cm`, `its "mass" is a weight in kg`.
 * - The dimension a type the scope knows as one (`length`, a program's own `data size`), the unit one of its units.
 * - Its value stays a plain number in that unit:  the property holds `number`, and notes what it measures
 *   (`P.ScopeVariable.measure`), so `its height in feet` converts it.
 */
export class OutlineSpecifierMeasure extends P.Sequence<"datatype|unit", { measure?: P.Measure }> {
  @proto static alias = "outline_specifier"

  /** Only a dimension's own unit. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const type = scope.getType(`${match.groups.datatype.value}`)
    const { dimension, unit } = match.groups.unit.data as UnitWordsData
    if (!type?.units || !unit || dimension !== type) return undefined
    match.data.measure = { dimension: type.name, unit: unit.id }
    return match
  }

  /** A plain number. */
  getDatatype(_match: P.MatchFor<this>): P.Datatype | undefined {
    return "number"
  }

  getAST(match: P.MatchFor<this>): P.ASTTypeExpression {
    return new P.ASTTypeExpression(match, { name: "number" })
  }
}
