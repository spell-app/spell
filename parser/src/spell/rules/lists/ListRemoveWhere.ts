import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"
import {
  refuseWriteIfReadOnly,
  savedPlaceOfMatch,
  savedTypeMatchOf,
  warnIfWritesARead
} from "spell/parser/spell/rules/places/places.shared"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { getWhereScope, getWhereMethod, type ItemVariableData } from "./lists.shared"

/**
 * `list_remove_where` rule:  remove all items from list where condition is true:
 * e.g. `remove items from my-list where item is not "ace"`.
 * - Trailing `where` expects an inline expression as predicate (`{inline_expression}?`) -- see `getWhereScope()`.
 * - Compiles to `core.removeWhere(list, (item) => { ... })`.
 * - For every thing of a saved type (`remove favourites in every favourite where ...`), each match leaves its place,
 *   as `remove it from the favourites` does, all of them one undo step (epic `data` I46):
 *   `await core.inOneGo(() => core.map(core.filter(<the read>, test), (favourite) => core.removeSaved(favourite)))`.
 *   - The read is `EveryThing.savedAST()`'s, so a simple `where` goes to the place as its query.
 *   - `core.filter()` always, even then:  its list is a copy, and the read's own follows the place,
 *     so removing each from it as it goes would skip every other one.
 *   - NOT `core.removeWhere()` there:  it takes them out of the read's own list, and the place never hears of it.
 */
export class ListRemoveWhere extends SpellStatement<"arg|list|body?"> {
  @proto static alias = "statement"

  /** Nested scope for predicate body -- singularized `{arg}` variable, also aliased from `it`. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return getWhereScope(match, match.groups.arg, match.groups.list)
  }

  /**
   * SIDE EFFECT:  it won't compile if the things it removes are saved in a read-only place.
   * - SIDE EFFECT:  warns when its list is a property worked out from a place, which saves nothing (`warnIfWritesARead()`).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    const type = match && savedTypeMatchOf(match.groups.list)
    if (type) refuseWriteIfReadOnly(match, EveryThing.kindOf(type))
    if (match) warnIfWritesARead(match, match.groups.list, "remove")
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { arg, list } = match.groups
    const filter = getWhereMethod(match, arg, this.getBody(match))
    const type = savedTypeMatchOf(list)
    if (savedPlaceOfMatch(type)) return ListRemoveWhere.removeSavedAST(match, type!, filter)
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "removeWhere",
      args: [P.matchAST(list), filter]
    })
  }

  /** Each thing of the saved `type` that passes `filter` removed from its place, in one go. */
  private static removeSavedAST(match: P.MatchFor<ListRemoveWhere>, type: P.Match, filter: P.ASTMethodDefinition) {
    const { arg } = match.groups
    const { itemVariable: variable } = match.data as ItemVariableData
    const name = variable?.name ?? P.singularize(arg.value)
    const item = () => new P.ASTVariableExpression(arg, { name, variable })
    const removeEach = new P.ASTMethodDefinition(match, {
      inline: true,
      args: [item()],
      body: new P.ASTCoreMethodInvocation(match, { methodName: "removeSaved", args: [item()] })
    })
    // a list of its own:  the read's follows its place, so each one removed would skip the next
    let read = EveryThing.savedAST(match, type, { predicate: filter })!
    if (!(read instanceof P.ASTCoreMethodInvocation && read.methodName === "filter")) {
      read = new P.ASTCoreMethodInvocation(match, { methodName: "filter", args: [read, filter] })
    }
    const removeAll = new P.ASTCoreMethodInvocation(match, { methodName: "map", args: [read, removeEach] })
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "inOneGo",
      args: [new P.ASTMethodDefinition(match, { inline: true, body: removeAll })]
    })
  }
}
