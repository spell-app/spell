import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { getWhereMethod } from "spell/parser/spell/rules/lists/lists.shared"
import { savedPlaceOfMatch } from "spell/parser/spell/rules/places/places.shared"
import { EveryThing } from "./EveryThing"
import { EveryThingWhere } from "./EveryThingWhere"
import { TheSavedThings } from "./TheSavedThings"
import { ThingFilters } from "./ThingFilter"

/** How far in its `with` can be:  Spanish's `los favoritos guardados con`, the type's name of up to 3 words. */
const WORDS_TO_WITH = 7

/** What `every_thing_with`'s groups hold besides `every_thing_where`'s. */
type FiltersGroups = { filters: P.Match }

/**
 * `every_thing_with` rule:  every thing of a type whose fields hold these values (epic `data` P32, Q29).
 * - e.g. `every favourite with the same address`:  its address is the value `address` means here
 * - e.g. `every favourite with name "blah"`, `every card with suit hearts and short name "x"`
 * - Several, joined by `and` or `,`;  then a `where`, for anything else:
 *   `every favourite with the same address where its name starts with "P"`.
 * - Its plural too, as `every_thing_where`'s:  `favourites with ...`, `all favourites with ...`;
 *   and `the saved favourites with ...` (`the_saved_things_with`).
 * - Each field must be one of the type's:  any other word reads as something else.
 * - Compiles to the test a `where` would:  `every favourite where its address is address and its name is "blah"`.
 *   So a place is handed it as its query, `remove` takes them from the place (`list_remove_with`), and so on.
 * - `with the address` isn't a form (Q29):  `the same` says it's matched.
 */
export class EveryThingWith extends EveryThingWhere {
  @proto static alias = ["expression", "things_with"]
  /** Said `the saved ...`:  the things in their place, never a list of the program's own of that name. */
  @proto static isSaved = false
  declare isSaved: boolean

  /**
   * Quick test:  `every_thing_where`'s, and a leading word close after (`with`, Spanish's `con`):
   * this runs on every expression.
   * - The language's `memberLeadingWords` hold it, with a few more:  cheap to ask, and never misses it.
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (super.test(scope, tokens, start) === false) return false
    const { memberLeadingWords } = SP.Language.of(scope).words
    for (let index = start + 1; index < start + WORDS_TO_WITH && tokens[index]; index++) {
      if (memberLeadingWords.has(`${tokens[index]!.value}`.toLowerCase())) return true
    }
    return false
  }

  /** As `every_thing_where`'s, and each field one of the type's;  `the same X` with nothing called X here won't compile. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { filters } = match.groups as unknown as FiltersGroups
    const { type } = match.groups
    // `the saved favourites` is always the place's, as `the_saved_things` is
    if (this.isSaved) match.data.own = undefined
    const { own } = match.data
    const kind = own ? scope.getType(scope.getItemType(own.datatype)) : EveryThing.kindOf(type)
    if (!ThingFilters.fieldsOf(filters).every((field) => kind?.hasProperty(`${field.raw}`.trim()))) return undefined
    // the predicate's item, for `predicateOf()`:  `getAST()` must be pure
    void match.nestedScope
    for (const filter of ThingFilters.unreadOf(filters)) {
      const field = `${(filter.groups as { field: P.Match }).field.raw}`.trim()
      const message = SP.Language.of(scope).parserMessage("nothing-the-same", {
        field,
        thing: SP.singularIn(scope, `${type.raw}`.trim())
      })
      SP.SpellWarnings.refuseIf(match, message, () => true, filter)
    }
    return match
  }

  /** Each filter's test, then the `where`'s, joined by `and`. */
  predicateOf(match: P.MatchFor<this>): P.ASTMethodDefinition {
    const body = this.getBody(match)
    const where = getWhereMethod(match, match.groups.type, body)
    const [item] = where.args as P.ASTVariableExpression[]
    const { filters } = match.groups as unknown as FiltersGroups
    const tests = ThingFilters.testsOf(
      filters,
      () => new P.ASTVariableExpression(item!.match, { name: item!.name, variable: item!.variable })
    )
    if (body) tests.push(P.matchAST<P.ASTExpression>(body)!)
    return new P.ASTMethodDefinition(match, {
      inline: true,
      args: where.args,
      body: P.ASTMultiInfixExpression(match, { expressions: tests, operator: "and" })
    })
  }
}

/**
 * `the_saved_things_with` rule:  `the saved favourites with the same address` --
 * as `every_thing_with`, of the things in their place, as `the_saved_things` says it (epic `data` P32).
 * - Spanish's `los favoritos guardados con la misma dirección`.
 * - Of a type no place saves, it won't compile, as `the saved piles` doesn't.
 */
export class TheSavedThingsWith extends EveryThingWith {
  @proto static isSaved = true

  /** SIDE EFFECT:  refused while its type is saved in no place. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) TheSavedThings.refusedUnlessSaved(match, match.groups.type)
    return match
  }
}

/** Is `list` a `with` read of a saved type:  its type, if so. */
export function savedTypeWithOf(list: P.Match): P.Match | undefined {
  if (!list.is(EveryThingWith) || list.data.own) return undefined
  const { type } = list.groups
  return savedPlaceOfMatch(type) ? type : undefined
}
