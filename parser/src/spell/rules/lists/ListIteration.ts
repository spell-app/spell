import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { type MethodBody, type ItemVariableData } from "./lists.shared"

/**
 * `list_iteration` rule:  generic `for each` list iteration:
 * e.g. `for each card in deck:`, `for item, index in my-list:`.
 * - Optional `{position}` (`for item, index in ...`) adds a numeric index arg alongside `{item}`.
 * - Both a `statement` and an `expression`:  usable inline or as a block.
 * - Body runs as nested block or inline statement;  `{item}`'s value is also aliased from `it`.
 * - Builds `core.map(list, (item, position?) => { ... })`,
 *   or `await core.forEachSequential(...)` if its body contains an `await`.
 * - How javascript writes it (`JSWriter`):
 *   - as the list's own method, where it knows the value is a list
 *   - as a `for...of` loop, when its body waits
 * TODO: can work for object enumeration as well (maybe with 'of'?)
 * TODO: return values e.g. array.map() ???
 */
export class ListIteration extends SpellStatement<"item|position?|list|body?"> {
  @proto static alias = ["statement", "expression"]

  /**
   * Nested scope for body -- `{item}` (and optional numeric `{position}`) vars, `it` aliased to `{item}`.
   * - `{item}` and `it` are what the list holds, e.g. `Card` for `for each card in the deck`.
   * - Looked up now, while parsing:  a body parses in this scope.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { item, position, list } = match.groups
    const datatype = match.scope.getItemType(list.datatype)
    const variable = new P.ScopeVariable({ name: item.value, datatype, declaredBy: item })
    // for `getAST()`, which can't look it up
    ;(match.data as ItemVariableData).itemVariable = variable
    const args: P.ScopeVariable[] = [variable]
    if (position) args.push(new P.ScopeVariable({ name: position.value, datatype: "number", declaredBy: position }))
    return new P.MethodScope({
      parentScope: match.scope,
      args,
      mapItTo: item.value,
      itDatatype: datatype,
      declaredBy: match
    })
  }
  /**
   * Build `map`/`forEachSequential` call over `{list}`.
   * - SIDE EFFECT: switches to `forEachSequential` + wraps result in `AwaitExpression` when body's
   *   `method.isAsync` -- set by an `await` expression somewhere in body.
   */
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { list, item, position } = match.groups
    const { itemVariable: variable } = match.data as ItemVariableData
    const args = [new P.ASTVariableExpression(item, { name: item.value, variable })]
    if (position) args.push(new P.ASTVariableExpression(position, { datatype: "number" }))
    const method = new P.ASTMethodDefinition(match, {
      inline: true,
      args,
      body: P.matchAST<MethodBody>(this.getBody(match))
    })

    if (method.isAsync) {
      // console.warn(match.inputText)
      return new P.ASTAwaitExpression(match, {
        expression: new P.ASTCoreMethodInvocation(match, {
          methodName: "forEachSequential",
          args: [P.matchAST(list), method]
        })
      })
    }

    return new P.ASTCoreMethodInvocation(match, {
      methodName: "map", // TODO...
      args: [P.matchAST(list), method]
    })
  }
}
