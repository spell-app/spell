import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { type UnitWordsData } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { declareUnit, defineUnitAST, dimensionOf, refuseNotADimension, unitId } from "./DimensionBase"
import { UnitNames } from "./UnitNames"

/**
 * `dimension_unit` rule:  one more unit of a dimension, and its size in a unit named before it (epic `language` P23):
 * `- one "inch", aka "in", aka "\"", is 2.54 cm`, `- one "centimeter", aka "cm", is 1/100 m`.
 * - A unit that doesn't start where the base starts says where it does (Q39):
 *   `- one "fahrenheit", aka "°F", is 5/9 °C, starting at 32`, as 32 °F is 0 °C.
 * - Under a dimension's line only (`define_dimension`):  anywhere else it's an error saying so.
 * - SIDE EFFECT:  its type's unit, its size worked out in base units -- see `P.TypeScope.declareUnit()`.
 * - Compiles to `core.defineUnit("Length", { id: "inch", names: ["inch", "in", "\""], factor: 0.0254 })`.
 */
export class DimensionUnit extends SpellStatement<
  "unit|top|bottom?|of|start?",
  { unit?: P.DimensionUnit; dimension?: string }
> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** Works out the unit's size in base units;  refuses a type that isn't a dimension. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const dimension = dimensionOf(match)
    if (!dimension) return refuseNotADimension(match)
    const { unit, top, bottom, of, start } = match.groups
    const of_ = (of.data as UnitWordsData).unit
    if (!of_) return undefined
    const amount = Number(top.value) / (bottom ? Number(bottom.value) : 1)
    const factor = amount * of_.factor
    // `starting at 32`:  32 of this unit is the other unit's 0
    const offset = (of_.offset ?? 0) - (start ? Number(start.value) * factor : 0)
    const names = UnitNames.namesOf(unit)
    match.data.dimension = dimension.name
    match.data.unit = {
      id: unitId(names[0]!),
      names,
      factor: round(factor),
      ...(offset ? { offset: round(offset) } : {})
    }
    return match
  }

  /** SIDE EFFECT:  the unit, on its dimension. */
  mutateScope(match: P.MatchFor<this>) {
    declareUnit(match, match.data.unit)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return defineUnitAST(match, match.data.dimension!, match.data.unit!)
  }
}

/** `value`, without the float noise of working it out:  `0.0254`, not `0.025400000000000002`. */
function round(value: number): number {
  return Number(value.toPrecision(12))
}
