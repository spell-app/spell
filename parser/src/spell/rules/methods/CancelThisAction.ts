import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { Block } from "spell/parser/spell/rules/Block"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { MethodDefinition } from "./MethodDefinition"

/**
 * `cancel_this_action` rule:  in an action, call it off (epic `language` P56, Owen 2026-11-15).
 * - e.g. `cancel`:  `core.cancel()`
 * - e.g. `cancel if the pile cannot take the card`:  `if (!core.canTake(pile, this)) core.cancel()`
 * - e.g. `cancel unless the card is face up`:  `if (!this.isFaceDirection("up")) core.cancel()`
 * - Spanish:  `cancelar`, `cancelar si ...`, `cancelar a menos que ...`.
 * - Called off, the action changes nothing:  every change it made is put back, it leaves no undo step,
 *   its `after` hooks don't run, and it answers no (`if put the card on the pile` reads false).
 *   Done, an action that can cancel answers yes.  The core does it:  `core.cancel()`, `runActing()`.
 * - Its condition may go on over lines starting `or` / `and`, as an `if`'s (`JoinedLines`).
 * - Only in an action's steps, `to ...` or `after ...`, its loops included:  anywhere else it's refused, saying so.
 *   A handler's own is `cancel event` (`cancel_event`);  another action's, running, `cancel search` (`cancel_action`).
 * - Whether an action cancels:  `CancelThisAction.isIn()`, so it's described `cancels` (`MethodDefinition`).
 */
export class CancelThisAction extends SpellStatement<"when?|condition?"> {
  @proto static alias = "statement"
  // a rule reading more words wins:  `cancel search` stops the action `search` (`places`' `cancel_action`)
  @proto static priority = Priority.overridable

  /** Refused outside an action's steps:  see the class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || CancelThisAction.isInAction(scope)) return match
    const message = SP.Language.of(scope).parserMessage("cancel-outside-an-action", { text: match.inputText.trim() })
    return SpellStatement.refuse(match, message)
  }

  getAST(match: P.MatchFor<this>): P.ASTStatement | P.ASTExpression {
    const cancel = new P.ASTCoreMethodInvocation(match, { methodName: "cancel", args: [] })
    const { when, condition } = match.groups
    if (!condition) return cancel
    const expression = condition.AST as P.ASTExpression
    const isUnless = Wording.meaningOf(when) === "unless"
    return new P.ASTIfStatement(match, {
      condition: isUnless ? new P.ASTNotExpression(condition, { expression }) : expression,
      statements: cancel
    })
  }

  /**
   * Is `scope` an action's steps:  a `to ...` (not a test, a drawing or a creation hook) or an `after ...`,
   * or a loop's inside one?
   */
  static isInAction(scope: P.Scope): boolean {
    for (let current: P.Scope | undefined = scope; current; current = current.parentScope) {
      if (!(current instanceof P.MethodScope)) continue
      const declaredBy = current.declaredBy
      const rule = declaredBy?.rule as (P.Rule & { loops?: boolean }) | undefined
      if (rule?.loops) continue
      return !!declaredBy && rule instanceof MethodDefinition && rule.takesCancel(declaredBy)
    }
    return false
  }

  /**
   * Does `body`, an action's, say `cancel` anywhere:  in an `if`, a loop, any line under it?
   * - Reads only matches:  call it once the body has parsed.
   */
  static isIn(body: P.Match | undefined): boolean {
    if (!body) return false
    if (body.is(CancelThisAction)) return true
    // a line's own parts:  `cancel if ...` may be the `<step> if <condition>` rule's, its step inside it
    if (body.matched.some((child) => child instanceof P.Match && CancelThisAction.isIn(child))) return true
    if (body.is(Block)) return false
    const statement = body.rule instanceof SpellStatement ? body : (body.data as { statement?: P.Match }).statement
    if (!(statement?.rule instanceof SpellStatement)) return false
    if (statement !== body && CancelThisAction.isIn(statement)) return true
    return CancelThisAction.isIn(statement.rule.getBody(statement))
  }
}
