import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import
import { FailureHook } from "spell/parser/spell/rules/methods/FailureHook"

/**
 * `nevermind` rule:  in a failure step, the error is caught, and nothing more is done (epic `data` P50, Q88).
 * - e.g. `if the error is "not found"`, then `nevermind`:  nothing more hears of it, and no notice shows.
 * - `do nothing` says the same there.
 * - Spanish:  `no importa`.
 * - Compiles to `return`.
 * - Only in a failure step's steps:  anywhere else it's refused, saying so (`FailureWords.isInFailureStep()`).
 */
export class Nevermind extends SpellStatement {
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    return refusedOutsideFailure(super.parse(scope, tokens), scope)
  }

  getAST(match: P.MatchFor<this>): P.ASTReturnStatement {
    return new P.ASTReturnStatement(match, {})
  }
}

/**
 * `pass_the_error` rule:  in a failure step, send the error on, to the next step and in the end Spell's notice
 * (epic `data` P50, Q87), as `pass event` does an event.
 * - e.g. `otherwise`, then `pass the error`
 * - Spanish:  `pasar el error`.
 * - Compiles to `return core.passTheError()`.
 * - Only in a failure step's steps:  anywhere else it's refused, saying so.
 */
export class PassTheError extends SpellStatement {
  @proto static alias = "statement"
  // `pass {event_words}` reads these words too:  an event's name is only a word until someone sends it
  @proto static priority = Priority.specific

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    return refusedOutsideFailure(super.parse(scope, tokens), scope)
  }

  getAST(match: P.MatchFor<this>): P.ASTReturnStatement {
    const pass = new P.ASTCoreMethodInvocation(match, { methodName: "passTheError", args: [] })
    return new P.ASTReturnStatement(match, { value: pass })
  }
}

/** `match`, or its refusal when `scope` is no failure step's steps. */
function refusedOutsideFailure(match: P.Match | undefined, scope: P.Scope): P.Match | undefined {
  if (!match || isInFailureStep(scope)) return match
  const message = SP.Language.of(scope).parserMessage("failure-word-outside", { text: match.inputText.trim() })
  return SpellStatement.refuse(match, message)
}

/**
 * Is `scope` a failure step's steps, or inside them:  `if completing a job fails`, `when any server call fails`?
 * - Duck-typed for the app-wide one, `failureStep` on its rule:  it's declared beside this.
 */
export function isInFailureStep(scope: P.Scope): boolean {
  for (let current: P.Scope | undefined = scope; current; current = current.parentScope) {
    if (!(current instanceof P.MethodScope)) continue
    const rule = current.declaredBy?.rule as (P.Rule & { failureStep?: boolean; loops?: boolean }) | undefined
    if (rule instanceof FailureHook || rule?.failureStep) return true
    if (!rule?.loops) return false
  }
  return false
}
