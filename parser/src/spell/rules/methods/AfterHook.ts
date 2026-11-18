import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import type { MethodSignatureData } from "./methods.shared"
// Import directly to avoid circular import
import { MethodDefinition } from "./MethodDefinition"
import { ToDoSomething } from "./ToDoSomething"

/**
 * `after_hook` rule:  steps that run at the end of an action, from any file (epic `language` P56, Owen 2026-11-15).
 * - e.g. `after putting a card on a pile`, its steps under it:  they run when `to put a card on a pile` is done.
 * - Spanish:  `después de poner una carta en una pila`.
 * - Its words name the action:  the action's verb as the language says it after `after` (English's `putting`,
 *   Spanish's `poner`, `SP.LanguageWords.verbsForDoing`), then the action's blanks, `a card`, `a pile`.
 *   - Its steps see those blanks, `the card`, `the pile`, as the action's do;  NOT the action's own variables.
 *   - What the action changed is there to read:  the card is on the pile, and `the card's last pile` is where it was.
 * - When it runs:  at the end of the action, inside its undo step, so one Undo takes back both.
 *   - Several hooks of one action run in the program's file order.
 *   - Skipped when the action is called off (`cancel`);  a hook may `cancel` it too.
 * - Compiles to a method of the action's type, then a line adding it to the action's hooks:
 *   `core.addAfterHook(Card, "putOnPile", { hook: "afterPutOnPile" })` (`runActing()`, the core's).
 *   - A second hook of the same action is `afterPutOnPile2`, and so on.
 * - Naming no action that's above it, it's refused, saying so.  A type's action only, for now.
 * - Registers no call rule:  nothing calls a hook by its words.
 */
export class AfterHook extends ToDoSomething {
  @proto static priority = Priority.specific
  // runs inside its action's step, never one of its own
  @proto static undoableByDefault = false
  /** When it runs in its action:  see `HookMoment`.  The rules built on this one say their own. */
  declare moment: HookMoment
  @proto static moment: HookMoment = "after"

  /** Refused unless its words name a type's action above it:  see the class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const signature = this.getSignature(match)
    const action = signature && AfterHook.actionOf(signature, scope, this.verbsFor(scope))
    if (!signature || !action || !this.isHookFor(action, match)) {
      if (!this.refusesWhenNoAction) return undefined
      const key = this.moment === "after" ? "after-names-no-action" : "hook-names-no-action"
      const message = SP.Language.of(scope).parserMessage(key, { text: match.inputText.trim() })
      return SpellStatement.refuse(match, message)
    }
    const data = match.data as AfterHookData
    data.action = action.name
    Object.assign(data, AfterHook.levelOf(scope))
    // its own name:  `after_put_on_$pile`, or the next free one, `after_put_on_$pile_2` ...
    const type = scope.getType(P.typeCase(signature.instanceType!))
    const base = `${this.moment}_${action.name}`
    let hookName = base
    for (let number = 2; AfterHook.isTaken(type, hookName, match); number++) hookName = `${base}_${number}`
    signature.methodName = hookName
    return match
  }

  /**
   * The action `signature`'s words name, a type's, if one is above it:  its verb as the language says it after `after`
   * (`putting` => `put`), then its blanks.
   */
  private static actionOf(
    signature: MethodSignatureData,
    scope: P.Scope,
    verbsFor: ((word: string) => string[]) | undefined
  ): P.ScopeMethod | undefined {
    const { instanceType, methodBits } = signature
    const [doing, ...rest] = methodBits
    if (!instanceType || !doing) return undefined
    const verbs = verbsFor ? verbsFor(doing) : [doing]
    const datatype = P.typeCase(instanceType)
    for (const verb of verbs) {
      const method = MethodDefinition.findMethod(scope, [verb, ...rest].join("_"), datatype)
      if (method) return method
    }
    return undefined
  }

  /**
   * Does this rule take `action`, which its words name?  Any action, for a hook;  a rule built on it may want only some,
   * and leave the rest to another (`wrapper_action`, a server's).
   */
  protected isHookFor(_action: P.ScopeMethod, _match: P.Match): boolean {
    return true
  }

  /** Words that name no action it takes:  refused, saying so.  A rule built on it may leave them to another rule. */
  declare refusesWhenNoAction: boolean
  @proto static refusesWhenNoAction = true

  /**
   * How the language turns the hook's first word into the action's verb:  English's `completing` => `complete`
   * (`SP.LanguageWords.verbsForDoing`);  a rule whose words say it otherwise says its own.
   */
  protected verbsFor(scope: P.Scope): ((word: string) => string[]) | undefined {
    return SP.Language.of(scope).words.verbsForDoing
  }

  /**
   * Which file `scope` is in, for the order its hooks run in (epic `data` Q84, Q96):  told apart by what it holds,
   * no new file names.
   * - a `.api.spell` file (`NetBox.api.spell`, `NetBox.api.es.spell`):  `"api"`, the innermost
   * - a file holding a page (`a "jobs page" is a page`, or a page alone in its file):  `"page"`, the outermost, and
   *   which page
   * - any other:  `"app"`
   */
  static levelOf(scope: P.Scope): { level: HookLevel; page?: string } {
    const file = fileOf(scope)
    if (!file) return { level: "app" }
    if (API_FILE.test(file.path ?? "")) return { level: "api" }
    // a page declared in this file:  the project's types are every file's;  `scan()`, so an edit to another type
    // doesn't read this file again (`P.Outline`)
    const isPageHere = (type: P.TypeScope) =>
      type.isA(PAGE_TYPE) && (type.alonePage === file.path || fileOf(type.declaredBy?.scope) === file)
    const page = file.types?.scan(isPageHere).find(isPageHere)
    return page ? { level: "page", page: page.name } : { level: "app" }
  }

  /** Is `name` a member of `type` already, other than an earlier parse of `match`'s own line? */
  private static isTaken(type: P.TypeScope | undefined, name: string, match: P.Match): boolean {
    const member = type?.getMember(name)
    return !!member && !P.TypeScope.sameStatement(member.declaredBy, match)
  }

  /** Records the method, but no call rule:  nothing calls a hook by its words. */
  mutateScope(match: P.MatchFor<this>): void {
    this.addMethod(match)
  }

  /** Nothing to call ahead of it either. */
  callAhead(): void {}

  /**
   * Its method, as an action's;  then the line adding it to its action's hooks:
   * - an after hook from the app's file:  `core.addAfterHook(Card, "putOnPile", { hook: "afterPutOnPile" })`
   * - any other:  `core.addActionHook(Job, "complete", { moment: "before", hook: "beforeComplete", level: "api" })`,
   *   a page's naming its page, `page: JobsPage`
   */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const group = super.getAST(match)
    const signature = this.getSignature(match)!
    const typeName = signature.instanceTypeName ?? P.typeCase(signature.instanceType!)
    const { action, level = "app", page } = match.data as AfterHookData
    const hook = { member: signature.methodName! }
    const isPlainAfter = this.moment === "after" && level === "app"
    const description: Record<string, P.ASTDescriptionValue> = isPlainAfter
      ? { hook }
      : { moment: this.moment, hook, level, ...(page && { page: { type: page } }) }
    ;(group.statements ??= []).push(
      new P.ASTTypeDescription(match, {
        type: typeName,
        describes: isPlainAfter ? "after" : "hook",
        name: action!,
        description
      })
    )
    return group
  }
}

/** The file `scope` is in, if any. */
function fileOf(scope: P.Scope | undefined): P.Scope | undefined {
  let file = scope
  while (file && !(file instanceof P.FileScope)) file = file.parentScope
  return file
}

/** When a hook runs in its action:  the core's `HookMoment`. */
export type HookMoment = "before" | "while" | "after" | "failed" | "around"

/** Which file a hook comes from:  the core's `HookLevel`. */
export type HookLevel = "api" | "app" | "page"

/** A file of a place's API:  its hooks run nearest the call (epic `data` Q96). */
const API_FILE = /\.api(\.[a-z]{2})?\.spell$/i

/** The type every page is:  a file holding one is a page's. */
const PAGE_TYPE = "Page"

/** What `after_hook` stashes on its match. */
type AfterHookData = {
  /** The action it runs after, by spell's name:  `put_on_$pile`. */
  action?: string
  /** Which file it's in:  `levelOf()`. */
  level?: HookLevel
  /** The page whose file it's in, by its class's name. */
  page?: string
}
