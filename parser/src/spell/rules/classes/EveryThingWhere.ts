import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { getWhereMethod, getWhereScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { savedPlaceOfMatch } from "spell/parser/spell/rules/places/places.shared"
import { canNeverBeTrue, EveryThing, handedFilterOf } from "./EveryThing"

/**
 * `every_thing_where` rule:  every thing of a type that fits (epic `data` P10, a short form of `list_filter`).
 * - e.g. `every recipe where its title includes the search`
 * - e.g. `every recipe where it is quick`
 * - `it` and `its` are the recipe;  `the search` is still the action's thing's.
 * - Compiles to `core.filter(core.everyThing(Recipe), (recipe) => ...)`.
 */
export class EveryThingWhere extends SpellExpression<"type|body?"> {
  /** A list of the type, e.g. `list of recipes`:  as `every_thing`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOfType(SP.typeName(`${match.groups.type.value}`))
  }

  /** Nested scope for the predicate:  the type's name (`the recipe`) and `it` are the current item. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { type } = match.groups
    return getWhereScope(match, type, match, P.instanceCase(SP.typeName(`${type.value}`)))
  }

  /** SIDE EFFECT:  a warning, for a `where` on a saved type that can't go to its place:  it's done here, up to a ceiling. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type } = match.groups
    const message = SP.Language.of(scope).parserMessage("where-looks-through", { type: `${type.raw}`.trim() })
    SP.SpellWarnings.noteIf(match, message, () => {
      if (!savedPlaceOfMatch(type)) return false
      return !handedFilterOf(getWhereMethod(match, type, this.getBody(match)))
    })
    const never = SP.Language.of(scope).parserMessage("never-both")
    SP.SpellWarnings.noteIf(match, never, () => canNeverBeTrue(P.matchAST(this.getBody(match))))
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { type } = match.groups
    const handed = EveryThing.savedAST(match, type, { predicate: getWhereMethod(match, type, this.getBody(match)) })
    if (handed) return handed
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "filter",
      args: [EveryThing.listAST(match, type), getWhereMethod(match, type, this.getBody(match))]
    })
  }
}
