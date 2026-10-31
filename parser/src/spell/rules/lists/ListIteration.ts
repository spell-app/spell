import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { KindName } from "spell/parser/spell/rules/types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { type MethodBody, type ItemVariableData } from "./lists.shared"

/**
 * `list_iteration` rule:  generic `for each` list iteration:
 * e.g. `for each card in deck:`, `for item, index in my-list:`.
 * - Optional `{position}` (`for item, index in ...`) adds a numeric index arg alongside `{item}`.
 * - Both a `statement` and an `expression`:  usable inline or as a block.
 * - Body runs as nested block or inline statement;  `{item}`'s value is also aliased from `it`.
 * - The item may be named for a value kind of several words (`kind_name`, epic `spanish` P22):
 *   `for each card rank in card ranks`, then `card rank` in the body -- see `itemName()`.
 * - Builds `core.map(list, (item, position?) => { ... })`,
 *   one by one if its body waits, which the writers work out -- see `WriterProject.findWaiting()`.
 * - How javascript writes it (`JSWriter`):
 *   - as the list's own method, where it knows the value is a list
 *   - as a `for...of` loop, when its body waits
 * TODO: can work for object enumeration as well (maybe with 'of'?)
 * TODO: return values e.g. array.map() ???
 */
export class ListIteration extends SpellStatement<"item|position?|list|body?"> {
  /** A loop:  a markup line in its body draws, in a drawing -- see `SpellStatement.loops`. */
  @proto static loops = true
  @proto static alias = ["statement", "expression"]

  /**
   * Nested scope for body -- `{item}` (and optional numeric `{position}`) vars, `it` aliased to `{item}`.
   * - `{item}` and `it` are what the list holds, e.g. `Card` for `for each card in the deck`.
   * - Looked up now, while parsing:  a body parses in this scope.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { item, position, list } = match.groups
    const datatype = match.scope.getItemType(list.datatype)
    const name = ListIteration.itemName(item)
    const variable = new P.ScopeVariable({ name, datatype, declaredBy: item })
    // for `getAST()`, which can't look it up
    ;(match.data as ItemVariableData).itemVariable = variable
    const args: P.ScopeVariable[] = [variable]
    if (position) args.push(new P.ScopeVariable({ name: position.value, datatype: "number", declaredBy: position }))
    return new P.MethodScope({
      parentScope: match.scope,
      args,
      mapItTo: name,
      itDatatype: datatype,
      declaredBy: match
    })
  }
  /**
   * Build `map` call over `{list}`:  written one by one if its body waits, which only the whole project can say.
   */
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { list, item, position } = match.groups
    const { itemVariable: variable } = match.data as ItemVariableData
    const args = [new P.ASTVariableExpression(item, { name: ListIteration.itemName(item), variable })]
    if (position) args.push(new P.ASTVariableExpression(position, { datatype: "number" }))
    const method = new P.ASTMethodDefinition(match, {
      inline: true,
      args,
      body: P.matchAST<MethodBody>(this.getBody(match))
    })

    return new P.ASTCoreMethodInvocation(match, {
      methodName: "map", // TODO...
      args: [P.matchAST(list), method]
    })
  }

  /** The item's variable:  its word, `card`, or a kind's words joined, `card_rank` for `card rank` (`kind_name`). */
  static itemName(item: P.Match): string {
    return item.is(KindName) ? KindName.variableName(item) : `${item.value}`
  }
}
