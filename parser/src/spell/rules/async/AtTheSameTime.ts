import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { type MethodBody } from "spell/parser/spell/rules/lists/lists.shared"
import { Priority } from "spell/parser/spell/rules/rules.types"

/**
 * `at_the_same_time` rule:  runs its lines together, and carries on once they've all ended.
 * - e.g. each line below is its own run, so the two moves overlap:
 *   ```spell
 *   at the same time:
 *     move the first card to the pile
 *     move the second card to the pile
 *   ```
 * - A line that's a loop runs all its items together:  `for each card in the deck`.
 *   - Only a loop right in the block:  one inside an `if` runs one by one, as it would anywhere.
 * - Compiles to `core.together(() => ..., () => ...)`, `await`ed when any line waits
 *   (`WriterProject.togetherWaits()`).
 * - `Priority.preferred`:  Spanish's `al mismo tiempo:` also reads as `al {event}`, an event called "mismo tiempo".
 * - NOTE:  a line's local belongs to that line:  the lines run together, so none can wait for another's.
 */
export class AtTheSameTime extends SpellStatement<"body?"> {
  @proto static alias = ["statement", "async"]
  @proto static priority = Priority.preferred

  /** Nested scope for the lines:  no variables of its own;  each line still reads the action's. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return new P.MethodScope({ parentScope: match.scope, declaredBy: match })
  }

  getAST(match: P.MatchFor<this>) {
    const body = P.matchAST<MethodBody>(this.getBody(match))
    const lines = body instanceof P.ASTStatementBlock ? (body.statements ?? []) : body ? [body] : []
    const args = lines
      .filter((line) => !(line instanceof P.ASTComment || line instanceof P.ASTBlankLine))
      .map(
        (line) =>
          new P.ASTMethodDefinition(match, { inline: true, args: [], body: itemsTogether(match, line as MethodBody) })
      )
    return new P.ASTCoreMethodInvocation(match, { methodName: "together", args })
  }
}

/** `line` as `core.together()` runs it:  a loop becomes `core.eachTogether()`, its items overlapping. */
function itemsTogether(match: P.AnyMatch, line: MethodBody): MethodBody {
  if (!(line instanceof P.ASTScopedMethodInvocation) || !(line.thing instanceof P.ASTCoreExpression)) return line
  if (!P.CORE_LOOPS.has(line.methodName)) return line
  return new P.ASTCoreMethodInvocation(match, { methodName: "eachTogether", args: line.args.args ?? [] })
}
