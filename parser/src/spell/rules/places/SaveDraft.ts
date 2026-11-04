import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { DRAFT_DATATYPE } from "./DraftOf"

/**
 * `save_draft` rule:  a draft's changes go out, together (epic `data` Q9).
 * - e.g. `save the draft`, `save d`
 * - A draft only:  `save` of anything else says how Spell keeps things:  a change is kept as it's made, with no save step.
 * - Compiles to `core.saveDraft(d)`.
 */
export class SaveDraft extends SpellStatement<"draft"> {
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { draft } = match.groups
    if (draft.datatype === DRAFT_DATATYPE) return match
    const text = draft.inputText.trim()
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("no-save-step", { text }))
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "saveDraft",
      args: [P.asAST<P.ASTExpression>(match.groups.draft.AST)]
    })
  }
}
