import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"
// Import directly to avoid circular import
import { EveryThingWith, savedTypeWithOf } from "spell/parser/spell/rules/classes/EveryThingWith"
import { ownListAST, refuseWriteIfReadOnly } from "spell/parser/spell/rules/places/places.shared"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { ListRemoveWhere } from "./ListRemoveWhere"

/**
 * `list_remove_with` rule:  remove every thing a `with` read finds (epic `data` P32):
 * e.g. `remove saved favourites with the same address and name "blah"`.
 * - Its list is a `things_with` read:  `every favourite with ...`, `favourites with ...`, `the saved favourites with ...`.
 * - Of a saved type, each leaves its place, all of them one undo step, as `list_remove_where`'s do (epic `data` I46).
 *   A read-only place won't compile.
 * - A list of the program's own (`my picks with suit hearts`, by its plural):  `core.removeWhere(list, test)`.
 */
export class ListRemoveWith extends SpellStatement<"list"> {
  @proto static alias = "statement"

  /** SIDE EFFECT:  it won't compile if the things it removes are saved in a read-only place. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    const type = match && savedTypeWithOf(match.groups.list)
    if (type) refuseWriteIfReadOnly(match, EveryThing.kindOf(type))
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { list } = match.groups
    const rule = list.rule as EveryThingWith
    const read = list as P.MatchFor<EveryThingWith>
    const filter = rule.predicateOf(read)
    const type = savedTypeWithOf(list)
    if (type) return ListRemoveWhere.removeSavedAST(match, type, filter)
    const { own } = read.data
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "removeWhere",
      args: [own ? ownListAST(read, own) : EveryThing.listAST(read, read.groups.type), filter]
    })
  }
}
