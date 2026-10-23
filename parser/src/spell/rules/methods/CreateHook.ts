import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Wording } from "spell-lang/spell/rules/expressions"
import { Priority } from "spell-lang/spell/rules/rules.types"
import type { MethodSignatureData } from "./methods.shared"
// Import directly to avoid circular import
import { ToDoSomething } from "./ToDoSomething"

/**
 * `create_hook` rule:  what runs as a thing is made, in its type's outline, e.g. `- when created (with title as text):`.
 * - Spanish:  `- al crearla (con título como texto):`.
 * - The type's `create()` hook, as `- to create it:` is:  core runs it once, after the thing's props are set,
 *   and hands it those props, so its `(with ...)` names read them (epic `spanish` P28).
 * - Its words are the language's `create_hook_words`:  `created` / `creating it`, `crearla` / `crear` ...
 * - A thing is made as any is:  `create a new task with title = "Shop"`, `a new task with ...`.
 * - Only in a type's outline;  anywhere else, or with other words, it isn't this rule:
 *   Spanish's `al ...` is also an event's handler (`al card click`), which it beats on the same words (`priority`).
 * - Registers no call rule:  nothing calls a hook by its words.
 */
export class CreateHook extends ToDoSomething {
  @proto static priority = Priority.specific

  /** Only a `create_hook`'s words, in a type's outline. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !P.SubjectScope.of(scope)?.subjectType) return undefined
    const signature = (match.groups as { signature?: P.Match }).signature
    const words = signature?.inputText.split("(")[0]!.trim() ?? ""
    return Wording.reads(scope, "create_hook_words", words, "create") ? match : undefined
  }

  /** The type's `create()`, whatever its words:  its `(with ...)` kept. */
  processSignature(groups: P.MatchGroups, signature: MethodSignatureData, scope: P.Scope): MethodSignatureData {
    const processed = super.processSignature(groups, signature, scope)
    processed.methodBits = ["create"]
    return processed
  }

  /** Records the method, but no call rule:  nothing calls a hook by its words. */
  mutateScope(match: P.MatchFor<this>): void {
    this.addMethod(match)
  }

  /** Nothing to call ahead of it either. */
  callAhead(): void {}
}
