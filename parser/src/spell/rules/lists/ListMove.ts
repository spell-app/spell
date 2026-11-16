import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { refuseIfNotAnItem } from "./lists.shared"

/**
 * `list_move` rule:  `move the card to the tableau` -- moves it, if the pile it belongs to lets it go
 * and the tableau takes it:  their guards, e.g. `a tableau can take a card if: ...` (epic page Q25).
 * - A statement, or a yes / no -- whether it moved:  `if move the card to the tableau ...`.
 *   Refused:  nothing changes.
 * - Its pile:  the one it's in, if `a card belongs to one pile`.  Else only the tableau is asked.
 * - `add`, `remove` and `clear` never ask:  dealing, gathering cards back.
 * - `Priority.overridable`:  a project's own `to move (a card) to (a pile)` runs instead.
 * - Compiles to `core.move(card, tableau)`.
 */
export class ListMove extends SpellStatement<"thing|list"> {
  @proto static priority = Priority.overridable
  @proto static alias = ["statement", "expression"]
  @proto static datatype: P.Datatype = "choice"
  /** `move x to the pile is yes` => `core.move(x, pile) == true` -- see `operandInExpressions`. */
  @proto static operandInExpressions = true

  /** SIDE EFFECT:  it won't compile if `thing` can't be what `list` holds (`refuseIfNotAnItem()`). */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    return match && refuseIfNotAnItem(match, match.groups.thing, match.groups.list)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { thing, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "move",
      args: [P.matchAST(thing), P.matchAST(list)]
    })
  }
}
