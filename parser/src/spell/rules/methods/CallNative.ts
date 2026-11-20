import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { ToDoSomething } from "./ToDoSomething"

/**
 * `call_native` rule:  in an action's steps, call a function from one of the project's code files
 * (epic `from-console` P10, Q9).
 * - e.g. `call native copyText with text`:  `await copyText(text)`, imported from the project's `clipboard.ts`
 * - Several inputs with commas, no parentheses:  `call native readNetlist with source, options`.
 * - Spanish:  `llamar al código nativo copyText con texto`.
 * - Only as a line in a `to ...` body, so a program only ever sees an action's words, never a code name:
 *   anywhere else it's refused, saying so.
 * - The name is looked up as the line parses (`SP.NativeCode.find()`):
 *   a `use` line's file first, else every code file the project lists.
 *   Not found, the line's error names the files it looked in.
 * - Each target calls its own file:  `clipboard.ts` for javascript, `clipboard.py` for Python, by Python's name
 *   (`copy_text`).  Awaited where it gives back a promise, or is `async def`.
 * - `native` is what tells it from `call the server` and `call <a place>`:  a place can't be named `native`.
 */
export class CallNative extends SpellStatement<"name", { native?: SP.NativeCode; words?: string }> {
  @proto static alias = "statement"
  // a helper's answer is its action's:  `to shout (text as text)` then `call native shout with text` gives it back
  @proto static givesValue = true

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const language = SP.Language.of(scope)
    const action = CallNative.actionOf(scope)
    if (!action) {
      return SpellStatement.refuse(match, language.parserMessage("native-outside-to", { text: match.inputText.trim() }))
    }
    const name = `${match.groups.name.value}`
    const found = SP.NativeCode.find(scope, name)
    if (!(found instanceof SP.NativeCode)) {
      return SpellStatement.refuse(match, language.parserMessage(found.key, found.params))
    }
    match.data.native = found
    match.data.words = `${action.inputText}`.split("\n")[0]!.trim()
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTNativeCall {
    const args = CallNative.repeatedIn(match).map((arg) => arg.AST as P.ASTExpression)
    return match.data.native!.callOf(match, `${match.groups.name.value}`, args, match.data.words)
  }

  /**
   * The items of the comma list in `match`, its first `[... ,]`:  the inputs after `with`, a `use` line's names.
   * - `[]` with none.
   */
  static repeatedIn(match: P.Match): P.Match[] {
    for (const child of match.matched) {
      if (!(child instanceof P.Match)) continue
      if (child.rule instanceof P.Repeat) return child.items ?? []
      const found = CallNative.repeatedIn(child)
      if (found.length) return found
    }
    return []
  }

  /** The `to ...` whose steps `scope` is, or is inside a loop of;  else none. */
  private static actionOf(scope: P.Scope): P.Match | undefined {
    for (let current: P.Scope | undefined = scope; current; current = current.parentScope) {
      if (!(current instanceof P.MethodScope)) continue
      const declaredBy = current.declaredBy
      if (declaredBy?.rule instanceof ToDoSomething) return declaredBy
      if (!(declaredBy?.rule as { loops?: boolean } | undefined)?.loops) return undefined
    }
    return undefined
  }
}
