import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { DRAFT_DATATYPE } from "./DraftOf"

/**
 * `cancel_draft` rule:  a draft's changes are forgotten:  what a Cancel button does (epic `data` Q9).
 * - e.g. `cancel the draft`, `cancel d`
 * - Compiles to `core.cancelDraft(d)`.
 */
export class CancelDraft extends SpellStatement<"draft"> {
  @proto static alias = "statement"
  @proto static priority = Priority.preferred

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    return match?.groups.draft.datatype === DRAFT_DATATYPE ? match : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "cancelDraft",
      args: [P.asAST<P.ASTExpression>(match.groups.draft.AST)]
    })
  }
}
