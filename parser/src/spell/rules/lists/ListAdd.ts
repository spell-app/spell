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
import { Wording } from "spell/parser/spell/rules/expressions"
import { refuseIfNotAnItem } from "./lists.shared"

/**
 * `list_add` rule:  add to list, e.g. `add thing to my-list`, `add thing to the front of my-list`.
 * - Compiles to `core.prepend(list, thing)` when `method` means the `start` (`list_end`, e.g. `front`),
 *   else `core.append(list, thing)`;
 *   for things saved in a place, `core.saveThing(thing)`, which needs no list (epic `data` P11).
 * - Added to a NUMBER, it adds up (epic `language` P56):  `add 10 to solitaire's score` is
 *   `solitaire.score = solitaire.score + 10`.
 */
export class ListAdd extends SpellStatement<"thing|method?|list"> {
  @proto static alias = "statement"

  /**
   * SIDE EFFECT:  it won't compile if `the things` it changes are saved in a read-only place.
   * - SIDE EFFECT:  warns when its list is a property worked out from a place, which saves nothing (`warnIfWritesARead()`).
   * - SIDE EFFECT:  it won't compile if `thing` can't be what `list` holds (`refuseIfNotAnItem()`).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) refuseWriteIfReadOnly(match, EveryThing.kindOf(savedTypeMatchOf(match.groups.list) ?? match))
    if (match) warnIfWritesARead(match, match.groups.list, "add")
    return match && !this.addsUp(match) ? refuseIfNotAnItem(match, match.groups.thing, match.groups.list) : match
  }

  /** Do we add to a NUMBER, `add 10 to solitaire's score`? */
  private addsUp(match: P.MatchFor<this>): boolean {
    return match.groups.list.datatype === "number" && !match.groups.method
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation | P.ASTAssignmentStatement {
    if (this.addsUp(match)) {
      const total = P.matchAST(match.groups.list)
      const sum = new P.ASTInfixExpression(match, { lhs: total, operator: "plus", rhs: P.matchAST(match.groups.thing) })
      return new P.ASTAssignmentStatement(match, { thing: total, value: sum })
    }
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
