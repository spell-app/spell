import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/** The datatype of `a draft of the recipe`:  what `save` and `cancel` ask for. */
export const DRAFT_DATATYPE = "PlaceDraft"

/**
 * `draft_of` rule:  a copy of a saved thing, whose changes wait to be saved (epic `data` Q9).
 * - e.g. `set d to a draft of the recipe`, `<ui-form value={a draft of it}>`
 * - For an Edit screen with a Cancel button:  a form bound to the thing itself is live.
 * - Compiles to `core.draftOf(recipe)`.
 */
export class DraftOf extends SpellExpression<"thing"> {
  @proto static datatype: P.Datatype | undefined = DRAFT_DATATYPE

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "draftOf",
      args: [P.asAST<P.ASTExpression>(match.groups.thing.AST)]
    })
  }
}
