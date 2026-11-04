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
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * `list_add` rule:  add to list, e.g. `add thing to my-list`, `add thing to the front of my-list`.
 * - Compiles to `core.prepend(list, thing)` when `method` means the `start` (`list_end`, e.g. `front`),
 *   else `core.append(list, thing)`;
 *   for things saved in a place, `core.saveThing(thing)`, which needs no list (epic `data` P11).
 */
export class ListAdd extends SpellStatement<"thing|method?|list"> {
  @proto static alias = "statement"

  /** SIDE EFFECT:  it won't compile if `the things` it changes are saved in a read-only place. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) refuseWriteIfReadOnly(match, EveryThing.kindOf(savedTypeMatchOf(match.groups.list) ?? match))
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    if (savedPlaceOfMatch(savedTypeMatchOf(match.groups.list))) {
      return new P.ASTCoreMethodInvocation(match, { methodName: "saveThing", args: [P.matchAST(match.groups.thing)] })
    }
    const { thing, list, method } = match.groups
    const spellMethod = Wording.meaningOf(method) === "start" ? "prepend" : "append"
    return new P.ASTCoreMethodInvocation(match, {
      methodName: spellMethod,
      args: [P.matchAST(list), P.matchAST(thing)]
    })
  }
}
