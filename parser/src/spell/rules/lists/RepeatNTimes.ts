import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"
import { type MethodBody } from "./lists.shared"

/**
 * `repeat_n_times` rule:  repeat an action `N` times, e.g. `repeat 3 times: print the number`.
 * - Both a `statement` and an `expression` -- usable inline or as a block.
 * - Body runs as a nested block or inline statement (`{statement_body}?`);
 *   current iteration number, from 1, is available as `number` (also aliased from `it`):
 *   its name is the language's, `counterName`, e.g. `número` in Spanish.
 * - Compiles to `core.map(core.countTo(number), (number) => { ... })`, or
 *   `await core.forEachSequential(...)` if body contains an `await` (`method.isAsync`).
 */
export class RepeatNTimes extends SpellStatement<"number|body?"> {
  @proto static alias = ["statement", "expression"]
  /**
   * Name of the variable holding the current iteration number, in the language's words:  `number`, `número`.
   * - A language other than English registers `RepeatNTimes.specialize({ counterName: "número" })`.
   */
  @proto static counterName = "number"
  declare counterName: string
  /** What `specialize()` takes:  a `Sequence`'s props, plus `counterName`. */
  declare readonly Props: P.SequenceProps & { counterName?: string }

  /** Nested scope for body -- `counterName` variable (current iteration number), also aliased from `it`. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return new P.MethodScope({
      parentScope: match.scope,
      args: [new P.ScopeVariable({ name: this.counterName, datatype: "number" })],
      mapItTo: this.counterName,
      itDatatype: "number",
      declaredBy: match
    })
  }

  /**
   * Build `map`/`forEachSequential` call over `countTo(number)` -- runs `number` times, NOT one more.
   * - SIDE EFFECT: switches to `forEachSequential` + wraps result in `AwaitExpression` when body's
   *   `method.isAsync` -- set by an `await` expression somewhere in body.
   */
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { number } = match.groups
    const method = new P.ASTMethodDefinition(match, {
      inline: true,
      args: [new P.ASTVariableExpression(match, { name: this.counterName })],
      body: P.matchAST<MethodBody>(this.getBody(match))
    })
    const countTo = new P.ASTCoreMethodInvocation(match, { methodName: "countTo", args: [P.matchAST(number)] })
    const expression = new P.ASTCoreMethodInvocation(match, {
      methodName: method.isAsync ? "forEachSequential" : "map",
      args: [countTo, method]
    })
    if (method.isAsync) return new P.ASTAwaitExpression(match, { expression })
    return expression
  }
}
