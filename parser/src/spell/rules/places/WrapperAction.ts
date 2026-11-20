import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import
import { AfterHook, type HookMoment } from "spell/parser/spell/rules/methods/AfterHook"
import { OperationAt } from "./OperationAt"

/** What a wrapping action calls what it wraps:  `call the server` compiles to a call of it. */
export const SERVER_CALL = "server_call"

/** The word `call native ...` starts with, which `call {place}` never takes as a place's name. */
const NATIVE_WORD = "native"

/**
 * `wrapper_action` rule:  a second `to complete a job`, for a server's action, wraps it (epic `data` P50, Q83, I104).
 *
 * ```spell
 * to complete a job
 * 	set the busy note to "Completing ..."
 * 	call the server
 * 	alert "Job done"
 * ```
 *
 * - `call the server` (or the place by name, `call netbox`) runs what it wraps:  the server's call, inside any
 *   other file's wrapper (`call_the_server`).
 * - The same steps underneath as `before`, `after` and `if ... fails` (Q83):  it's one more of the action's hooks,
 *   by its file's level, the page outermost.
 * - Spanish:  `para completar un trabajo`, then `llamar al servidor`.
 * - Never calling the server, it warns:  it would stand in for the server's action, which was I104's silent loss.
 * - Only for a server's action (`operation_at`):  any other `to ...` is a new action, as before.
 * - Compiles to a method of the action's type, taking the action's blanks and what it wraps, then
 *   `core.addActionHook(Job, "complete", { moment: "around", hook: "aroundComplete", level: "app" })`.
 */
export class WrapperAction extends AfterHook {
  @proto static moment: HookMoment = "around"
  @proto static refusesWhenNoAction = false

  /** Its words are the action's own, as written:  `complete`, not `completing`. */
  protected verbsFor(): undefined {
    return undefined
  }

  /**
   * Only a server's action, declared on another line than this one.
   * - SIDE EFFECT:  notes its place's name, for what `call_the_server` says.
   */
  protected isHookFor(action: P.ScopeMethod, match: P.Match): boolean {
    const declaredBy = action.declaredBy
    if (!(declaredBy?.rule instanceof OperationAt) || P.TypeScope.sameStatement(declaredBy, match)) return false
    ;(match.data as { placeName?: string }).placeName = (declaredBy.data as { placeName?: string }).placeName
    return true
  }

  /** Its steps can call what it wraps. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const scope = super.getNestedScopeForMatch(match)
    scope.variables?.add({ name: SERVER_CALL })
    return scope
  }

  /** Warns when its steps never call the server:  see the class docs. */
  mutateScopeFromBody(match: P.Match): string | undefined {
    const calls = WrapperAction.callsTheServer((match.rule as WrapperAction).getBody(match as never))
    const message = SP.Language.of(match.scope).parserMessage("wrapper-never-calls", {
      text: `${match.inputText}`.split("\n")[0]!.trim()
    })
    SP.SpellWarnings.noteIf(match, message, () => !calls)
    return super.mutateScopeFromBody(match)
  }

  /** Its method takes what it wraps after the action's blanks. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const group = super.getAST(match)
    for (const each of group.statements ?? []) {
      if (!(each instanceof P.ASTPropertyDefinition) || !each.method) continue
      each.method.args = [...(each.method.args ?? []), new P.ASTVariableExpression(match, { name: SERVER_CALL })]
    }
    return group
  }

  /** Does `body` say `call the server` anywhere? */
  private static callsTheServer(body: P.Match | undefined): boolean {
    if (!body) return false
    if ((body.rule as { callsWrapped?: boolean }).callsWrapped) return true
    return (
      body.matched.some((child) => child instanceof P.Match && WrapperAction.callsTheServer(child)) ||
      Object.values(body.data).some(
        (value) => value instanceof P.Match && value !== body && WrapperAction.callsTheServer(value)
      )
    )
  }
}

/**
 * `call_the_server` rule:  in an action that wraps a server's own, run what it wraps (epic `data` P50, Q83, J266).
 * - e.g. `call the server`, `call netbox`;  Spanish `llamar al servidor`, `llamar a netbox`.
 * - `the server` means the place only in its own API file;  anywhere else, call it by its name.
 * - Compiles to `await serverCall()`:  the next wrapper in, or the call itself.
 * - Only in a wrapping action's steps (`wrapper_action`):  anywhere else it's refused, saying so.
 */
export class CallTheServer extends SpellStatement<"place?"> {
  @proto static alias = "statement"
  /** What `WrapperAction.callsTheServer()` looks for. */
  @proto static callsWrapped = true
  declare callsWrapped: boolean

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    // `call native ...` calls the project's code (`call_native`):  no place is called `native`
    if (`${match.groups.place?.value ?? ""}` === NATIVE_WORD) return undefined
    const language = SP.Language.of(scope)
    const wrapper = CallTheServer.wrapperOf(scope)
    if (!wrapper) {
      return SpellStatement.refuse(
        match,
        language.parserMessage("call-outside-wrapper", { text: match.inputText.trim() })
      )
    }
    if (!match.groups.place && AfterHook.levelOf(scope).level !== "api") {
      const place = `${(wrapper.data as { placeName?: string }).placeName ?? ""}`.replace(/_/g, " ")
      return SpellStatement.refuse(match, language.parserMessage("the-server-outside-api", { place }))
    }
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTAwaitExpression {
    const call = new P.ASTMethodInvocation(match, { methodName: SERVER_CALL, args: [] })
    return new P.ASTAwaitExpression(match, { expression: call })
  }

  /** The wrapping action whose steps `scope` is, or is inside. */
  private static wrapperOf(scope: P.Scope): P.Match | undefined {
    for (let current: P.Scope | undefined = scope; current; current = current.parentScope) {
      if (!(current instanceof P.MethodScope)) continue
      const declaredBy = current.declaredBy
      if (declaredBy?.rule instanceof WrapperAction) return declaredBy
      if (!(declaredBy?.rule as { loops?: boolean } | undefined)?.loops) return undefined
    }
    return undefined
  }
}
