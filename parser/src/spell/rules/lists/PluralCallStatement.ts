import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Through the folder:  read only when called, once the folder has loaded
import { DynamicMethodRule, MethodDefinition } from "spell/parser/spell/rules/methods"
// Import directly to avoid circular import
import { EachInStatement, type EachReading } from "./EachInStatement"

/**
 * `plural_call_statement` rule:  a thing's action, called on a list of those things, done to each in turn --
 * `turn the cards in the deck face down` (epic `language` T126).
 * - The same as `turn each card in the deck face down`:  `core.map(deck, (card) => card.turnFaceDown())`.
 * - The list said either way:  `the cards in the deck`, `the cards of the stock`, `cards in the pile where it is face up`
 *   (that one `core.filter()`s first).
 * - Spanish:  `voltear las cartas del mazo boca abajo`.
 * - Only of a list known to hold things, its type said:  `the clubs of game`, a property of an app, isn't ours.
 *   And any other reading of the words wins (`priority`).
 * - Any action whose `it` is a thing:  the statement, read with `card` in place of `the cards in the deck`,
 *   must call a method of a type on that card.  `print the cards in the deck` isn't ours.
 * - The LIST's own action of the same words wins:  with a deck's own `to turn it face down`,
 *   `turn the cards in the deck face down` is `deck.turnFaceDown()`, as `turn the deck face down` is.
 * - Reads its statement by hand, as `each_in_statement` does (its base):  only the item and its words differ.
 */
export class PluralCallStatement extends EachInStatement {
  /** Any other reading of the same words wins:  `play the clubs of game` plays the game's clubs, a property. */
  @proto static priority = Priority.overridable

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const [, theWord, itemRule, inWord, listRule] = this.rules
    if (!theWord || !itemRule || !inWord || !listRule) return undefined
    // `in` first, a word's check:  then the plural word before it, and `the` before that
    for (let inAt = 1; inAt < tokens.length - 1; inAt++) {
      const said = inWord.parse(scope, tokens.slice(inAt))
      if (!said) continue
      const itemAt = inAt - 1
      const item = itemRule.parse(scope, tokens.slice(itemAt, inAt))
      if (item?.length !== 1) continue
      const the = itemAt > 0 ? theWord.parse(scope, tokens.slice(itemAt - 1, itemAt)) : undefined
      const at = the?.length === 1 ? itemAt - 1 : itemAt
      const itemTokens = PluralCallStatement.itemTokens(scope, tokens, at, item)
      const lead = EachInStatement.contractedArticle(scope, said)
      const reading = { at, item, itemTokens, listAt: inAt + said.length, listRule, lead }
      const match = this.matchAt(scope, tokens, reading)
      if (match) return match
    }
    return undefined
  }

  /**
   * The list from `at` to `end`:  with a `where`, the whole of `the cards in the pile where it is face up`, filtered;
   * else the list after `in`.
   */
  protected readList(scope: P.Scope, tokens: P.Token[], reading: EachReading, end: number) {
    const phrase = tokens.slice(reading.at, end)
    const filtered = scope.parser?.parse(phrase, "list_filter", scope)
    if (filtered && filtered.length === phrase.length) return filtered
    return super.readList(scope, tokens, reading, end)
  }

  /**
   * Only a call of a thing's action on the item:  `turn card face down` calling a card's `turnFaceDown()`.
   * - SIDE EFFECT:  notes the list's own method of the same name, if it has one -- `getAST()` calls that instead.
   */
  protected takesStatement(match: P.Match, statement: P.Match): boolean {
    const rule = statement.rule
    if (!(rule instanceof DynamicMethodRule) || !rule.thisType) return false
    // a list KNOWN to hold things:  `the clubs of game`, the game no list, is its property
    const list = match.groups.list as P.Match
    if (typeof match.scope.getItemType(list.datatype) !== "string") return false
    const { thisArg } = (statement as P.MatchFor<DynamicMethodRule>).groups
    const name = this.itemName(match.scope, match.groups.item as P.Match)
    if (thisArg?.inputText.trim() !== name) return false
    const listsOwn = MethodDefinition.findMethod(match.scope, rule.methodName, list.datatype)
    ;(match.data as PluralCallData).listsOwn = !!listsOwn
    return true
  }

  /** The item's word, made singular:  `card` for `cards`, `carta` for `cartas`. */
  protected itemName(scope: P.Scope, item: P.Match): string {
    return SP.singularIn(scope, `${item.value}`)
  }

  /** `core.map(deck, (card) => card.turnFaceDown())`;  the list's own action, `deck.turnFaceDown()`. */
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    if (!(match.data as PluralCallData).listsOwn) return super.getAST(match)
    const { list, statement } = match.groups
    const call = P.matchAST<P.ASTScopedMethodInvocation>(statement)
    return new P.ASTScopedMethodInvocation(match, {
      thing: P.matchAST<P.ASTExpression>(list),
      methodName: call.methodName,
      args: call.args.args
    })
  }

  /**
   * What the statement reads in place of `the cards in the deck`:  the item's one word, `card`.
   * - Where the words it stands for start, so the statement's matches sit on the line.
   */
  private static itemTokens(scope: P.Scope, tokens: P.Token[], at: number, item: P.Match): P.Token[] {
    const name = SP.singularIn(scope, `${item.value}`)
    const said = item.tokens.at(-1) ?? tokens[at]!
    const record = { ...said.record, start: tokens[at]!.start, value: name, raw: name }
    return [new P.WordToken(record)]
  }
}

/** What `PluralCallStatement` notes while parsing. */
type PluralCallData = {
  /** The list's type has its own method of the call's name:  call that, on the list. */
  listsOwn?: boolean
}
