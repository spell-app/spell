import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { type MethodBody } from "./lists.shared"

/**
 * `repeat_n_times` rule:  repeat an action `N` times, e.g. `repeat 3 times: print the number`.
 * - Both a `statement` and an `expression` -- usable inline or as a block.
 * - Body runs as a nested block or inline statement (`{statement_body}?`);
 *   current iteration number, from 1, is available as `number` (also aliased from `it`):
 *   its name is the language's, `counterName`, e.g. `número` in Spanish.
 * - Compiles to `core.map(core.countTo(number), (number) => { ... })`, or
 *   one by one if its body waits, which the writers work out -- see `WriterProject.findWaiting()`.
 */
export class RepeatNTimes extends SpellStatement<"number|body?"> {
  /** A loop:  a markup line in its body draws, in a drawing -- see `SpellStatement.loops`. */
  @proto static loops = true
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
   * Build `map` call over `countTo(number)` -- runs `number` times, NOT one more.
   */
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { number } = match.groups
    const method = new P.ASTMethodDefinition(match, {
      inline: true,
      args: [new P.ASTVariableExpression(match, { name: this.counterName })],
      body: P.matchAST<MethodBody>(this.getBody(match))
    })
    const countTo = new P.ASTCoreMethodInvocation(match, { methodName: "countTo", args: [P.matchAST(number)] })
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "map",
      args: [countTo, method]
    })
  }
}
