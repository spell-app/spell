import { proto, upperFirst, withoutAccents } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { UnitNames } from "./UnitNames"

/**
 * `dimension_base` rule:  the unit a dimension converts through, `- its base is "meter", aka "m"`
 * (epic `language` P23).
 * - Under a dimension's line only (`define_dimension`):  anywhere else it's an error saying so.
 * - SIDE EFFECT:  its type's unit, one of it a base unit -- see `P.TypeScope.declareUnit()`.
 * - Compiles to `core.defineUnit("Length", { id: "meter", names: ["meter", "m"], factor: 1 })`.
 */
export class DimensionBase extends SpellStatement<"type|unit", { unit?: P.DimensionUnit; dimension?: string }> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** Notes the unit;  refuses a type that isn't a dimension. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const dimension = dimensionOf(match)
    if (!dimension) return refuseNotADimension(match)
    const names = UnitNames.namesOf(match.groups.unit)
    match.data.dimension = dimension.name
    match.data.unit = { id: unitId(names[0]!), names, factor: 1 }
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

/** The dimension `match` is a line of:  its body's subject, if that's a dimension. */
export function dimensionOf(match: P.Match): P.TypeScope | undefined {
  const type = P.SubjectScope.of(match.scope)?.subjectType
  return type?.superType === "Dimension" ? type : undefined
}

/** A unit's id, from its name:  `centimeter`, `fluidOunce`, `meterPerSecond`;  accents dropped, `kilometro`. */
export function unitId(name: string): string {
  const words = withoutAccents(name)
    .split(/[^\p{L}\d]+/u)
    .filter(Boolean)
  return words.map((word, index) => (index ? upperFirst(word.toLowerCase()) : word.toLowerCase())).join("")
}

/** `match`, refused:  a unit line under a type that isn't a dimension. */
export function refuseNotADimension(match: P.Match): P.Match {
  const type = P.SubjectScope.of(match.scope)?.subjectType
  const words = type ? SP.SpellWarnings.exampleNoun(match.scope, type) : "it"
  return SpellStatement.refuse(
    match,
    SP.Language.of(match.scope).parserMessage("not-a-dimension", { AType: upperFirst(words) })
  )
}

/** SIDE EFFECT:  `unit` on `match`'s dimension, and its names in the quick test's list. */
export function declareUnit(match: P.Match, unit: P.DimensionUnit | undefined): void {
  const dimension = dimensionOf(match)
  if (!dimension || !unit) return
  dimension.declareUnit(unit)
  SP.noteUnitNames(unit)
}

/** `core.defineUnit("Length", { id, names, factor, offset })`. */
export function defineUnitAST(match: P.Match, dimension: string, unit: P.DimensionUnit): P.ASTCoreMethodInvocation {
  const text = (value: string) => new P.ASTStringLiteral(match, { value, quote: '"' })
  const number = (value: number) => new P.ASTNumericLiteral(match, { value, raw: `${value}` })
  const property = (name: string, value: P.ASTExpression) =>
    new P.ASTObjectLiteralProperty(match, { property: name, value } as P.ASTObjectLiteralPropertyProps)
  const properties = [
    property("id", text(unit.id)),
    property("names", new P.ASTArrayLiteral(match, { items: unit.names.map(text) })),
    property("factor", number(unit.factor)),
    ...(unit.offset ? [property("offset", number(unit.offset))] : [])
  ]
  return new P.ASTCoreMethodInvocation(match, {
    methodName: "defineUnit",
    args: [text(dimension), new P.ASTObjectLiteral(match, { properties })]
  })
}
