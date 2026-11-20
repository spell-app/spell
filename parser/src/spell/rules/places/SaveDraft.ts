import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { DRAFT_DATATYPE } from "./DraftOf"
import { pickedPlaceNameOf } from "./places.shared"

/**
 * `save_draft` rule:  a draft's changes go out, together (epic `data` Q9).
 * - e.g. `save the draft`, `save d`
 * - Or a file a person picked (`a json file you pick`, epic `editor` P41, Q67's B):  `save family cookbook` writes it
 *   back to that file, asking the browser first, or downloads it where the browser can't write files.
 *   Compiles to `await core.savePickedFile("family_cookbook")`.
 * - Anything else:  `save` says how Spell keeps things:  a change is kept as it's made, with no save step.
 * - Compiles to `core.saveDraft(d)`.
 */
export class SaveDraft extends SpellStatement<"draft", { pickedPlace?: string }> {
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { draft } = match.groups
    if (draft.datatype === DRAFT_DATATYPE) {
      // over a view's own `to save it:`, which a form's Save button would be called (epic `data` T135)
      match.priority = Priority.preferred
      return match
    }
    const pickedPlace = pickedPlaceNameOf(scope, draft)
    if (pickedPlace) {
      match.data.pickedPlace = pickedPlace
      match.priority = Priority.preferred
      return match
    }
    const text = draft.inputText.trim()
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("no-save-step", { text }))
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation | P.ASTAwaitExpression {
    const { pickedPlace } = match.data
    if (pickedPlace) {
      const save = new P.ASTCoreMethodInvocation(match, {
        methodName: "savePickedFile",
        args: [new P.ASTStringLiteral(match, { value: JSON.stringify(pickedPlace) })]
      })
      return new P.ASTAwaitExpression(match, { expression: save })
    }
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "saveDraft",
      args: [P.asAST<P.ASTExpression>(match.groups.draft.AST)]
    })
  }
}
