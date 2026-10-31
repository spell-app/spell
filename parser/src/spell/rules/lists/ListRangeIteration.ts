import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { type MethodBody } from "./lists.shared"

/**
 * `list_range_iteration` rule:  number range-specific iteration, e.g. `for each number from 1 to 10:`.
 * - Builds `core.map(core.getRange(start, end), (item) => { ... })`,
 *   one by one if its body waits, which the writers work out -- see `WriterProject.findWaiting()`.
 * - How javascript writes it (`JSWriter`):
 *   - as a list's own method, `core.getRange(1, 10).forEach((number) => {...})`
 *   - as a `for...of` loop, when its body waits
 * TODO: this only works if you `from 1 to 10`, a more general solution which also supports `in {list}` is needed.
 * TODO: `down` is not accounted for in the output
 */
export class ListRangeIteration extends SpellStatement<"item|start|end|body?"> {
  /** A loop:  a markup line in its body draws, in a drawing -- see `SpellStatement.loops`. */
  @proto static loops = true
  @proto static alias = "statement"

  /**
   * Nested scope for body -- singularized `{item}` variable.
   * - NOTE: unlike sibling iteration rules (`repeat_n_times`, `list_iteration`), doesn't pass
   *   `mapItTo` -- `it` is NOT aliased to `{item}` here, possibly a missed feature.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { item } = match.groups
    return new P.MethodScope({
      parentScope: match.scope,
      args: [new P.ScopeVariable({ name: P.singularize(item.value), declaredBy: item })],
      declaredBy: match
    })
  }
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { item, start, end } = match.groups
    const getRange = new P.ASTCoreMethodInvocation(match, {
      methodName: "getRange",
      args: [P.matchAST(start), P.matchAST(end)]
    })
    const method = new P.ASTMethodDefinition(match, {
      inline: true,
      args: [new P.ASTVariableExpression(item)],
      body: P.matchAST<MethodBody>(this.getBody(match))
    })
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "map",
      args: [getRange, method]
    })
  }
}
