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

/** `list_append` rule:  append to list, e.g. `append thing to my-list` => `core.append(myList, thing)`. */
export class ListAppend extends SpellStatement<"thing|list"> {
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
    const { thing, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "append",
      args: [P.matchAST(list), P.matchAST(thing)]
    })
  }
}
