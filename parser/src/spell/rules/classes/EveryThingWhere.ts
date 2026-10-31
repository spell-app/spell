import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { getWhereMethod, getWhereScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { EveryThing } from "./EveryThing"

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

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { type } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "filter",
      args: [EveryThing.listAST(match, type), getWhereMethod(match, type, this.getBody(match))]
    })
  }
}
