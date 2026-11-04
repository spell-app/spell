import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { getWhereMethod, getWhereScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import {
  ownListAST,
  ownListOf,
  savedPlaceOfMatch,
  searchesOf,
  type OwnList
} from "spell/parser/spell/rules/places/places.shared"
import { canNeverBeTrue, EveryThing, handedFilterOf, handedSearchOf } from "./EveryThing"

/** How far in a type's name can start:  Spanish's `todas las recetas donde`. */
const WORDS_TO_THE_TYPE = 3

/**
 * `every_thing_where` rule:  every thing of a type that fits (epic `data` P10, a short form of `list_filter`).
 * - e.g. `every recipe where its title includes the search`
 * - e.g. `every recipe where it is quick`
 * - e.g. `recipes where it is quick`, `all recipes where ...`, `the recipes where ...`:  by its plural
 *   - What the program has by that name wins:  a list property called `recipes` is what's looked through.
 * - `it` and `its` are the recipe;  `the search` is still the action's thing's.
 * - Compiles to `core.filter(core.everyThing(Recipe), (recipe) => ...)`.
 */
export class EveryThingWhere extends SpellExpression<"type|body?", { own?: OwnList }> {
  /** A list of the type, e.g. `list of recipes`:  as `every_thing`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOfType(SP.typeName(`${match.groups.type.value}`))
  }

  /** Quick test:  a known type, up to two words in:  it can start with a type's plural alone, and this runs on every expression. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (super.test(scope, tokens, start) === false) return false
    for (let index = start; index < start + WORDS_TO_THE_TYPE && tokens[index]; index++) {
      if (tokens[index] instanceof P.WordToken && scope.getType(`${tokens[index]!.value}`)) return true
    }
    return false
  }

  /** Nested scope for the predicate:  the type's name (`the recipe`) and `it` are the current item. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { type } = match.groups
    return getWhereScope(match, type, match, P.instanceCase(SP.typeName(`${type.value}`)))
  }

  /** A known type, or what the program has by that plural;  and the warnings about its `where`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type } = match.groups
    const words = `${type.raw}`.trim()
    // `every recipe` is of the type, whatever else is called `recipe`
    match.data.own = SP.singularIn(scope, words) === words ? undefined : ownListOf(scope, words)
    if (!match.data.own && !EveryThing.kindOf(type)) return undefined
    EveryThingWhere.warnAboutWhere(match, type, this.getBody(match))
    return match
  }

  /**
   * SIDE EFFECT:  a warning, for a `where` on a saved type that can't go to its place:  it's done here, up to a ceiling.
   * - None when a search can go instead (`it searches names with "search"`):  the server narrows what's read.
   */
  static warnAboutWhere(match: P.Match, type: P.Match, body: P.Match | undefined): void {
    const { scope } = match
    const message = SP.Language.of(scope).parserMessage("where-looks-through", {
      type: SP.singularIn(scope, `${type.raw}`.trim())
    })
    SP.SpellWarnings.noteIf(match, message, () => {
      const saved = savedPlaceOfMatch(type)
      if (!saved) return false
      const where = getWhereMethod(match, type, body)
      return !handedFilterOf(where) && !handedSearchOf(where, searchesOf(saved)?.fields ?? []).length
    })
    // given only to a search:  this `where` has to be one
    if (savedPlaceOfMatch(type)) EveryThing.refusedUnlessSearched(match, type, () => getWhereMethod(match, type, body))
    const never = SP.Language.of(scope).parserMessage("never-both")
    SP.SpellWarnings.noteIf(match, never, () => canNeverBeTrue(P.matchAST(body)))
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { type } = match.groups
    const { own } = match.data
    if (own) {
      return new P.ASTCoreMethodInvocation(match, {
        methodName: "filter",
        args: [ownListAST(match, own), getWhereMethod(match, type, this.getBody(match))]
      })
    }
    const handed = EveryThing.savedAST(match, type, { predicate: getWhereMethod(match, type, this.getBody(match)) })
    if (handed) return handed
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "filter",
      args: [EveryThing.listAST(match, type), getWhereMethod(match, type, this.getBody(match))]
    })
  }
}
