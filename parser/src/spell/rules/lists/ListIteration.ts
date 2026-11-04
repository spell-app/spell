import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { noteLoopItem } from "spell/parser/spell/rules/places/places.shared"
import { Priority } from "spell/parser/spell/rules/rules.types"
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
    // for `DrawnLines`:  a saved type's loop draws as a read
    const itemType = typeof datatype === "string" ? match.scope.getType(datatype) : undefined
    if (itemType) {
      ;(match.data as { itemType?: P.TypeScope }).itemType = itemType
      noteLoopItem(match.scope, itemType)
    }
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

/**
 * `for films`, `for every film where ...`, `for its films`:  a loop with its item named for what's in the list -- `film`.
 * - Named for the list's type when it's known, else for its own word, made singular.
 * - With neither (`for the found`, of a type nobody knows):  it has only `it`.
 * - Anything else as `ListIteration`.
 */
export class ListIterationNamedForList extends SpellStatement<"list|body?"> {
  @proto static loops = true
  @proto static alias = ["statement", "expression"]
  /** Over a method of the same words:  Spanish's `para sus cartas` might be `to`, in `para dibujar eso`. */
  @proto static priority = Priority.declaration

  /**
   * Only what reads as a list:  one plural word, or words after a word that starts a list, `its films`.
   * - So Spanish's `para mover cartas :` is still a method.
   * - With no body (spellx's `<for its types />`, each item drawing itself):  its item is named here,
   *   as no body asks for its scope (epic `data` P24).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { list } = match.groups
    const words = list.inputText.trim()
    // what's left on the line belongs to a rule that names its item:  `for stars from 1 to 240`
    const last = tokens.at(-1)
    if (last && (match.end ?? 0) < last.start) return undefined
    const isList = /\s/.test(words) ? STARTS_A_LIST.test(words) : words !== P.singularize(words)
    if (!isList) return undefined
    if (!this.getBody(match)) this.getNestedScopeForMatch(match)
    return match
  }

  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { list } = match.groups
    const datatype = match.scope.getItemType(list.datatype)
    const name = ListIterationNamedForList.itemName(match, datatype)
    const variable = new P.ScopeVariable({ name, datatype, declaredBy: list })
    ;(match.data as ItemVariableData).itemVariable = variable
    const itemType = typeof datatype === "string" ? match.scope.getType(datatype) : undefined
    if (itemType) {
      ;(match.data as { itemType?: P.TypeScope }).itemType = itemType
      noteLoopItem(match.scope, itemType)
    }
    return new P.MethodScope({
      parentScope: match.scope,
      args: [variable],
      mapItTo: name,
      itDatatype: datatype,
      declaredBy: match
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { list } = match.groups
    const { itemVariable: variable } = match.data as ItemVariableData
    const method = new P.ASTMethodDefinition(match, {
      inline: true,
      args: [new P.ASTVariableExpression(list, { name: variable!.name, variable })],
      body: P.matchAST<MethodBody>(this.getBody(match))
    })
    return new P.ASTCoreMethodInvocation(match, { methodName: "map", args: [P.matchAST(list), method] })
  }

  /** What the item's called -- see the class.  The list's last word is its noun:  `its films`, `las películas`. */
  private static itemName(match: P.Match, datatype: unknown): string {
    if (typeof datatype === "string" && match.scope.getType(datatype)) return P.instanceCase(datatype)
    const { list } = (match as P.MatchFor<ListIterationNamedForList>).groups
    const noun = list.inputText.trim().split(/\s+/).at(-1) ?? ""
    return /^[\p{L}_-]+$/u.test(noun) && noun !== P.singularize(noun) ? P.singularize(noun) : ITEM_WITH_NO_NAME
  }
}

/** Words that start a list, in each language. */
const STARTS_A_LIST = /^(its|every|all|the|my|their|these|those|sus?|cada|tod[oa]s?|l[oa]s|mis|est[oa]s)\s/i

/** The variable of a list with nothing to name its item for:  it's read as `it`. */
const ITEM_WITH_NO_NAME = "item"
