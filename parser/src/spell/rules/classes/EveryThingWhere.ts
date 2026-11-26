import { proto, snakeCase } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { getWhereMethod, getWhereScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import {
  filtersOf,
  ownListAST,
  ownListOf,
  savedPlaceOfMatch,
  searchesOf,
  type OwnList
} from "spell/parser/spell/rules/places/places.shared"
import { canNeverBeTrue, EveryThing, handedPartsOf } from "./EveryThing"

/** What `, filtered here` notes on the read it follows (`ListFilteredHere`):  nothing's asked of the place. */
export type FilteredHereData = { filteredHere?: boolean }

/** The fields a list of `saved` filters by, by its lines:  none for none said, or for every field. */
function filterFieldsOf(saved: P.SavedPlace | undefined): readonly string[] {
  const filters = filtersOf(saved)
  return Array.isArray(filters) ? filters : []
}

/** A field's words, from its name:  `jobId` => `job id`. */
function wordsOfName(field: string): string {
  return snakeCase(field).replace(/_/g, " ")
}

/** Declared, so a subclass's `@proto` reads its own. */
export interface EveryThingWhere {
  stopsEarly: boolean
}

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
export class EveryThingWhere extends SpellExpression<"type|where|body?", { own?: OwnList }> {
  /** Does its read stop at the first that pass, and so warn of nothing it checks here:  `FirstThingWhere`'s. */
  @proto static stopsEarly = false

  /** A list of the type, e.g. `list of recipes`:  as `every_thing`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOf(SP.typeName(`${match.groups.type.value}`))
  }

  /** Quick test:  a known type, of one word or several, up to two words in:  it can start with a type's plural alone, and this runs on every expression. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (super.test(scope, tokens, start) === false) return false
    return EveryThing.typeNear(scope, tokens, start, WORDS_TO_THE_TYPE)
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
    if (!this.stopsEarly) EveryThingWhere.warnAboutWhere(match, type, () => this.predicateOf(match))
    else if (savedPlaceOfMatch(type)) EveryThing.refusedUnlessSearched(match, type, () => this.predicateOf(match))
    return match
  }

  /** The test each thing must pass:  its `where`, e.g. `(recipe) => recipe.minutes === 5`. */
  predicateOf(match: P.MatchFor<this>): P.ASTMethodDefinition {
    return getWhereMethod(match, match.groups.type, this.getBody(match))
  }

  /**
   * SIDE EFFECT:  a warning, for a `where` on a saved type that can't all go to its place:  it's done here, up to a ceiling.
   * - A web server's list (epic `data`, the filters phase):  naming each clause its list can't be asked
   *   (`EveryThing.clausesStayingIn()`), and how to ask it instead, `its job id is ...` on a field its list filters by,
   *   or that `, filtered here` says it's meant.
   * - Any other place:  when none of it can go.
   * - None when a search can go instead (`it searches names with "search"`):  the server narrows what's read.
   * - None after `, filtered here` (`ListFilteredHere`):  it's what's wanted.
   * - `predicate`:  the test, made when the warnings are gathered.
   */
  static warnAboutWhere(match: P.Match, type: P.Match, predicate: () => P.ASTMethodDefinition): void {
    const { scope } = match
    const language = SP.Language.of(scope)
    const words = `${type.raw}`.trim()
    const isFilteredHere = () => !!(match.data as FilteredHereData).filteredHere
    const isWebServer = () => savedPlaceOfMatch(type)?.placeType.placeKind === "web server"
    const message = language.parserMessage("where-looks-through", { type: SP.singularIn(scope, words) })
    SP.SpellWarnings.noteIf(match, message, () => {
      const saved = savedPlaceOfMatch(type)
      if (!saved || isWebServer() || isFilteredHere()) return false
      const parts = handedPartsOf(predicate(), searchesOf(saved)?.fields ?? [])
      return !parts?.filter.length && !parts?.search.length
    })
    const staying = () => EveryThing.clausesStayingIn(type, predicate())
    const stays = () => {
      const clauses = staying() ?? []
      const [field] = filterFieldsOf(savedPlaceOfMatch(type))
      const params = {
        clauses: clauses.map((clause) => `"${clause}"`).join(", "),
        type: SP.singularIn(scope, words),
        types: P.pluralize(words)
      }
      return field === undefined
        ? language.parserMessage("where-stays-here-no-filter", params)
        : language.parserMessage("where-stays-here", { ...params, field: wordsOfName(field) })
    }
    SP.SpellWarnings.noteIf(match, stays, () => !isFilteredHere() && !!staying(), match, "where-stays-here")
    // given only to a search:  this `where` has to be one
    if (savedPlaceOfMatch(type)) EveryThing.refusedUnlessSearched(match, type, predicate)
    const never = SP.Language.of(scope).parserMessage("never-both")
    SP.SpellWarnings.noteIf(match, never, () => canNeverBeTrue(predicate().body))
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { type } = match.groups
    const { own } = match.data
    if (own) {
      return new P.ASTCoreMethodInvocation(match, {
        methodName: "filter",
        args: [ownListAST(match, own), this.predicateOf(match)]
      })
    }
    // `, filtered here` may come after a sort:  the read is made checked here itself, so the sort is done here too
    const filteredHere = !!(match.data as FilteredHereData).filteredHere
    const handed = EveryThing.savedAST(match, type, { predicate: this.predicateOf(match), filteredHere })
    if (handed) return handed
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "filter",
      args: [EveryThing.listAST(match, type), this.predicateOf(match)]
    })
  }
}
