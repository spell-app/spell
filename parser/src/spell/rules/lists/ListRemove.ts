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

  /** SIDE EFFECT:  it won't compile if `the things` it changes are saved in a read-only place. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) refuseWriteIfReadOnly(match, EveryThing.kindOf(savedTypeMatchOf(match.groups.list) ?? match))
    return match
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
