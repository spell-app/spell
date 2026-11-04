import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"
import {
  refuseWriteIfReadOnly,
  savedPlaceOfMatch,
  savedTypeMatchOf
} from "spell/parser/spell/rules/places/places.shared"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `list_remove` rule:  remove all instances of something from a list.
 * - Compiles to `core.remove(list, thing)`, e.g. `remove thing from my-list` =>
 *   `core.remove(myList, thing)`;
 *   for things saved in a place, `core.removeSaved(thing)`, which needs no list (epic `data` P11).
 */
export class ListRemove extends SpellStatement<"thing|list"> {
  @proto static alias = "statement"

  /**
   * SIDE EFFECT:  it won't compile if `the things` it changes are saved in a read-only place.
   * - Not `remove recipes from the recipes where ...`, saved:  that's `list_remove_where`, each match leaving its place
   *   (epic `data` I46).  Read as this rule, it took every recipe out of a list the read made, and nothing left the place.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match && ListRemove.isSavedRemoveWhere(match)) return undefined
    if (match) refuseWriteIfReadOnly(match, EveryThing.kindOf(savedTypeMatchOf(match.groups.list) ?? match))
    return match
  }

  /** Is `match` `remove recipes from <every recipe where ...>`, of a saved type:  the things named, the type of the list? */
  private static isSavedRemoveWhere(match: P.MatchFor<ListRemove>): boolean {
    const { thing, list } = match.groups
    if (list.rule.name !== "every_thing_where") return false
    const type = (list.groups as { type?: P.Match }).type
    const named = savedTypeMatchOf(thing)
    if (!type || Array.isArray(type) || !named || !savedPlaceOfMatch(type)) return false
    return EveryThing.kindOf(named) === EveryThing.kindOf(type)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    if (savedPlaceOfMatch(savedTypeMatchOf(match.groups.list))) {
      return new P.ASTCoreMethodInvocation(match, { methodName: "removeSaved", args: [P.matchAST(match.groups.thing)] })
    }
    const { thing, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "remove",
      args: [P.matchAST(list), P.matchAST(thing)]
    })
  }
}
