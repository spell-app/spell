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

  /** Refused unless its words name a type's action above it:  see the class docs. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const signature = this.getSignature(match)
    const action = signature && AfterHook.actionOf(signature, scope)
    if (!signature || !action) {
      const message = SP.Language.of(scope).parserMessage("after-names-no-action", { text: match.inputText.trim() })
      return SpellStatement.refuse(match, message)
    }
    const data = match.data as AfterHookData
    data.action = action.name
    // its own name:  `after_put_on_$pile`, or the next free one, `after_put_on_$pile_2` ...
    const type = scope.getType(P.typeCase(signature.instanceType!))
    const base = `after_${action.name}`
    let hookName = base
    for (let number = 2; AfterHook.isTaken(type, hookName, match); number++) hookName = `${base}_${number}`
    signature.methodName = hookName
    return match
  }

  /**
   * The action `signature`'s words name, a type's, if one is above it:  its verb as the language says it after `after`
   * (`putting` => `put`), then its blanks.
   */
  private static actionOf(signature: MethodSignatureData, scope: P.Scope): P.ScopeMethod | undefined {
    const { instanceType, methodBits } = signature
    const [doing, ...rest] = methodBits
    if (!instanceType || !doing) return undefined
    const verbsForDoing = SP.Language.of(scope).words.verbsForDoing
    const verbs = verbsForDoing ? verbsForDoing(doing) : [doing]
    const datatype = P.typeCase(instanceType)
    for (const verb of verbs) {
      const method = MethodDefinition.findMethod(scope, [verb, ...rest].join("_"), datatype)
      if (method) return method
    }
    return undefined
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

  /** Its method, as an action's;  then the line adding it to its action's hooks. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const group = super.getAST(match)
    const signature = this.getSignature(match)!
    const typeName = signature.instanceTypeName ?? P.typeCase(signature.instanceType!)
    const { action } = match.data as AfterHookData
    ;(group.statements ??= []).push(
      new P.ASTTypeDescription(match, {
        type: typeName,
        describes: "after",
        name: action!,
        description: { hook: { member: signature.methodName! } }
      })
    )
    return group
  }
}

/** What `after_hook` stashes on its match. */
type AfterHookData = {
  /** The action it runs after, by spell's name:  `put_on_$pile`. */
  action?: string
}
