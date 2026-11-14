import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { KindName } from "spell/parser/spell/rules/types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { loopedList } from "./ListIteration"
import { type MethodBody, type ItemVariableData } from "./lists.shared"

/**
 * `each_in_statement` rule:  a statement run once for each item of a list, the list said in it --
 * `add each card in the deck to the stock` (epic `language` P55, Q59).
 * - Any statement:  `turn each card in the stock face down`, `move each card in the discards to the stock`.
 * - Spanish:  `agregar cada carta del mazo a la reserva`.
 * - The same as the loop, `for each card in the deck` then `add it to the stock`:
 *   `core.map(deck, (card) => core.append(stock, card))`.
 * - Only when `in` follows the item:  `each card with rank = ace` is every card the program has, as before.
 * - Only a statement with no body:  `for each card in the deck` is the loop's, `to deal each card in ...` a method's.
 * - ONE `each ... in` a statement:  a second is an error saying so.
 * - Reads its statement by hand, as `without_waiting` does:  the statement with the item in place of
 *   `each card in the deck`, `add card to the stock`, in a scope where `card` (and `it`) is each item.
 *   The list is the shortest run of words after `in` that reads as an expression, with the rest of the line a statement.
 */
export class EachInStatement extends SpellStatement<"item|list|statement"> {
  /** A loop:  a markup line in it draws, in a drawing -- see `SpellStatement.loops`. */
  @proto static loops = true
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const [, eachWord, itemRule, inWord, listRule] = this.rules
    if (!eachWord || !itemRule || !inWord || !listRule) return undefined
    for (let at = 0; at < tokens.length - 3; at++) {
      const each = eachWord.parse(scope, tokens.slice(at))
      if (!each) continue
      const item = itemRule.parse(scope, tokens.slice(at + each.length))
      if (!item) continue
      const inAt = at + each.length + item.length
      const said = inWord.parse(scope, tokens.slice(inAt))
      if (!said) continue
      const lead = EachInStatement.contractedArticle(scope, said)
      const match = this.matchAt(scope, tokens, { at, item, listAt: inAt + said.length, listRule, lead })
      if (match) return match
    }
    return undefined
  }

  /** Our match, the list starting at `listAt` -- `undefined` unless the list and the statement around it read whole. */
  private matchAt(
    scope: P.Scope,
    tokens: P.Token[],
    {
      at,
      item,
      listAt,
      listRule,
      lead
    }: { at: number; item: P.Match; listAt: number; listRule: P.Rule; lead: P.Token[] }
  ): P.Match | undefined {
    for (let end = listAt + 1; end <= tokens.length; end++) {
      const listTokens = [...lead, ...tokens.slice(listAt, end)]
      const list = listRule.parse(scope, listTokens)
      if (list?.length !== listTokens.length) continue
      const match = new P.Match({ rule: this, matched: [...tokens], tokens: [...tokens], scope })
      match.addMatch(item, "item")
      match.addMatch(list, "list")
      const rest = tokens.slice(end)
      const statementTokens = [...tokens.slice(0, at), ...item.tokens, ...rest]
      const statement = scope.parser?.parse(statementTokens, "statement", this.getNestedScopeForMatch(match))
      // read to the line's end:  by where it ends, as a match over tokens cut out of the line may count them its own way
      if (!statement || statement.end !== new P.Match({ rule: this, tokens: statementTokens, scope }).end) continue
      // a statement that takes a body is a loop's or a method's head line, `para cada carta en sus cartas`:  not ours
      if ((statement.rule as SpellStatement).bodySpec) continue
      match.addMatch(statement, "statement")
      // a second `each ... in` in the statement:  one loop a statement
      if (statement.is(EachInStatement)) {
        return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("one-each-a-statement"))
      }
      return match
    }
    return undefined
  }

  /**
   * The article a contraction holds, as tokens to read the list with:  Spanish's `del mazo` is `de el mazo`,
   * so the list is `el mazo` (`SP.LanguageWords.contractions`) -- none for a word that's no contraction.
   */
  private static contractedArticle(scope: P.Scope, said: P.Match): P.Token[] {
    const expanded = SP.Language.of(scope).words.contractions?.[said.inputText.trim()]
    const article = expanded?.split(" ").slice(1).join(" ")
    return (article && scope.parser?.tokenize(`${article} `)) || []
  }

  /**
   * The statement's scope:  the item by its name, and `it`, are each item of the list, as in a `for each` loop.
   * - Looked up now, while parsing:  the statement parses in it.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const cached = (match.data as { nested?: P.MethodScope }).nested
    if (cached) return cached
    const { item, list } = match.groups
    const datatype = match.scope.getItemType(list.datatype)
    const name = EachInStatement.itemName(item)
    const variable = new P.ScopeVariable({ name, datatype, declaredBy: item })
    ;(match.data as ItemVariableData).itemVariable = variable
    const nested = new P.MethodScope({
      parentScope: match.scope,
      args: [variable],
      mapItTo: name,
      itDatatype: datatype,
      declaredBy: match
    })
    ;(match.data as { nested?: P.MethodScope }).nested = nested
    return nested
  }

  /** The item's variable:  its word, `card`, or a kind's words joined (`kind_name`). */
  private static itemName(item: P.Match): string {
    return item.is(KindName) ? KindName.variableName(item) : `${item.value}`
  }

  /** `core.map(deck, (card) => core.append(stock, card))`:  as the loop it says. */
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { list, item, statement } = match.groups
    const { itemVariable: variable } = match.data as ItemVariableData
    const method = new P.ASTMethodDefinition(match, {
      inline: true,
      args: [new P.ASTVariableExpression(item, { name: EachInStatement.itemName(item), variable })],
      body: P.matchAST<MethodBody>(statement)
    })
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "map",
      args: [loopedList(match, P.matchAST(list)), method]
    })
  }
}
