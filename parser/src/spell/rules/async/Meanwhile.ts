import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { type MethodBody } from "spell/parser/spell/rules/lists/lists.shared"

/**
 * `meanwhile` rule:  starts something and carries on, with no waiting for it:  `meanwhile deal the cards`.
 * - Inline, or a block of lines, which run one after another.
 * - Compiles to `core.meanwhile(() => ...)`:
 *   - a failure is said on the program's console, never lost
 *   - people's actions don't wait for it (`ActionQueue`)
 * - What it runs is a function of its own, so the action it's in doesn't wait because of it
 *   (`WriterProject.findWaiting()`).
 */
export class Meanwhile extends SpellStatement<"body?"> {
  @proto static alias = ["statement", "async"]

  /** Nested scope for what it runs:  no variables of its own;  it still reads the action's. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return new P.MethodScope({ parentScope: match.scope, declaredBy: match })
  }

  getAST(match: P.MatchFor<this>) {
    const run = new P.ASTMethodDefinition(match, {
      inline: true,
      args: [],
      body: P.matchAST<MethodBody>(this.getBody(match))
    })
    return new P.ASTCoreMethodInvocation(match, { methodName: "meanwhile", args: [run] })
  }
}
