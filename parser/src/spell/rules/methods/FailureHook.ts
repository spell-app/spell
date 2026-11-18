import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { AfterHook, type HookMoment } from "./AfterHook"

/**
 * `failure_hook` rule:  steps that run when an action fails, from any file (epic `data` P50, Q82, Q87-Q89).
 *
 * ```spell
 * if completing a job fails
 * 	if the error is "not found"
 * 		nevermind
 * 	otherwise if the error is "not permitted"
 * 		alert "You can't complete jobs"
 * ```
 *
 * - `when completing a job fails` says the same;  Spanish `si falla al completar un trabajo`, `cuando falla al ...`
 *   (`si falla:` alone is `if that fails:`).
 * - Its steps see the action's blanks, and `the error`, what went wrong:  `the error is "not found"` tests it
 *   (`error_is`).
 * - Catching:  a step that ends without passing it on caught it, and nothing more hears of it.
 *   - Its last `if` with no `otherwise`, when no branch of it matched, passes it on:  it caught nothing.
 *   - `nevermind` (or `do nothing`) ends a branch, caught;  `pass the error` sends it on (`pass_the_error`).
 * - Passed on, the next failure step hears it:  the API file's first, then the app's, then the page's (even once the
 *   page is left);  then, for a server's action, `when any server call fails`;  last, Spell's notice.
 * - Compiles to a method of the action's type taking the blanks and `error`, then
 *   `core.addActionHook(Job, "complete", { moment: "failed", hook: "failedComplete", level: "api" })`.
 */
export class FailureHook extends AfterHook {
  @proto static moment: HookMoment = "failed"
  // Spanish's `si falla:` (`if that fails:`) reads these words too, its step on the line
  @proto static priority = Priority.aboveDeclaration
  // words naming no action are left to the `if`:  `if the download fails`
  @proto static refusesWhenNoAction = false

  /** Its steps see `the error`. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const scope = super.getNestedScopeForMatch(match)
    scope.variables?.add({ name: CAUGHT_ERROR })
    return scope
  }

  /** Its method takes the error after the action's blanks, its body passing on what it didn't catch. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const group = super.getAST(match)
    for (const each of group.statements ?? []) {
      if (!(each instanceof P.ASTPropertyDefinition) || !each.method) continue
      each.method.args = [...(each.method.args ?? []), new P.ASTVariableExpression(match, { name: CAUGHT_ERROR })]
      passesWhatItDidNotCatch(match, each.method.body)
    }
    return group
  }
}

/** What a failure step calls its error:  `the error`, as `if that fails:`'s. */
export const CAUGHT_ERROR = "error"

/**
 * SIDE EFFECT:  `body`'s last `if` chain, with no `otherwise`, passes the error on when no branch of it ran:
 * each branch ends with `return`, caught, and after the chain, `return core.passTheError()`.
 * - A body with no such chain catches whatever it's given, as `if that fails:` does.
 */
export function passesWhatItDidNotCatch(match: P.Match, body: P.ASTStatementBlock): void {
  const statements = body.statements ?? []
  let end = statements.length
  while (end > 0 && (statements[end - 1] instanceof P.ASTBlankLine || statements[end - 1] instanceof P.ASTComment))
    end--
  let start = end
  while (start > 0 && statements[start - 1] instanceof P.ASTElseIfStatement) start--
  if (!(statements[start - 1] instanceof P.ASTIfStatement)) return
  start--
  const chain = statements.slice(start, end) as Array<P.ASTIfStatement | P.ASTElseIfStatement>
  for (const branch of chain) {
    const steps = branch.statements.statements ?? []
    // a branch ending `nevermind` or `pass the error` says so itself
    if (steps.at(-1) instanceof P.ASTReturnStatement) continue
    const end = new P.ASTReturnStatement(branch.match, {})
    branch.statements = new P.ASTStatementBlock(branch.match, { statements: [...steps, end] })
  }
  const pass = new P.ASTCoreMethodInvocation(match, { methodName: "passTheError", args: [] })
  statements.splice(end, 0, new P.ASTReturnStatement(match, { value: pass }))
  body.statements = statements
}
