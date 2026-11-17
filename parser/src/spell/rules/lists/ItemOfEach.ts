import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { getWhereMethod, getWhereScope } from "./lists.shared"

/**
 * `item_of_each` rule:  one item of each thing, by its place, as ONE list -- `the last card of each column`
 * (epic `language` T152).
 * - Anything that picks one item of one list by its place picks one of each:
 *   `the first card of each column`, `the second card of each column`, `a random card of each column`.
 * - A list, in the things' order:  `core.pickFromEach(core.everyThing(Column), (column) => column.lastItem)`.
 *   - A thing with nothing to pick, an empty column, adds nothing.
 *   - A list, never a loop:  `set x to the last card of each column` is the list, not x set again for each column.
 * - `each column` is every column;  `each column in the columns` names the list, as a loop does.
 * - A `where` after it:
 *   - about the item, `where the card is face up`, or `where it is face up`:  each thing's items that pass, then the
 *     pick -- `the first card of each column where the card is face up` is each column's first face-up card
 *   - about the thing, `where the column is not empty`:  the things that pass, then the pick from each
 * - Spanish:  `la última carta de cada columna`.
 * - Reads its pick by hand, as `each_in_statement` reads its statement:  the words with the thing in place of
 *   `each column`, `the last card of column`, read by the rule that reads one item of one list, in a scope where
 *   `column` is each thing.  So whatever that rule does, a `where` that asks an action included, this does for each.
 */
export class ItemOfEach extends SpellExpression<"ordinal?|random?|arg|each?|thing?|list?|things?"> {
  /**
   * Beats the one-list reading of the same words:  Spanish's `cada columna` is also every column, a list,
   * so `la primera carta de cada columna donde ...` would be the first card of all the columns' cards.
   */
  @proto static priority = Priority.mostSpecific
  /** One of each:  items -- see `SpellExpression.saysItems`. */
  @proto static saysItems = true

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const head = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!head) return undefined
    const { each, thing, things } = head.groups
    // the thing's word:  `column`, in `each column in ...` or `each column`
    const thingWord = thing ?? (things?.groups.type as P.Match | undefined)
    if (!thingWord || thingWord.length !== 1) return undefined
    const eachAt = tokens.indexOf((each ?? things)!.tokens[0]!)
    if (eachAt < 0) return undefined

    const match = new P.Match({
      rule: this,
      matched: [...head.matched],
      tokens: [...head.tokens],
      scope
    }) as P.MatchFor<this>
    const data = match.data as ItemOfEachData
    const thingsScope = this.thingsScopeOf(match, thingWord)
    let rest = tokens.slice(head.length)

    // `where the column is not empty`:  the things that pass
    const where = ItemOfEach.whereAboutThe(scope, rest, `${thingWord.raw}`.trim())
    if (where) {
      const condition = ItemOfEach.conditionOf(scope, rest.slice(where), thingsScope)
      if (!condition) return undefined
      data.thingsWhere = condition
      match.matched.push(...rest.slice(0, where))
      match.tokens.push(...rest.slice(0, where))
      match.addMatch(condition, "condition")
      rest = []
    }

    // the pick, read with the thing in place of `each column`:  `the last card of column`, and its `where`, if any
    // - only a `where`:  `the last card of column and ...` would read `column and ...` as its list
    if (!Wording.lengthAt(scope, "where_or_which", rest, 0)) rest = []
    const pickTokens = [...tokens.slice(0, eachAt), thingWord.tokens[0]!, ...rest]
    const pick = scope.parser?.parse(pickTokens, "operand", data.pickScope)
    if (!pick || pick.length < eachAt + 1 || pick.datatype === undefined) return undefined
    data.pick = pick
    // the words after the thing it read:  a `where` about the item
    const after = pick.length - (eachAt + 1)
    if (after > 0) {
      const own = new Set(rest.slice(0, after))
      // each part of the pick read from them:  the `where` and its condition
      const extra = pick.matched.filter((item) =>
        (item instanceof P.Match ? item.tokens : [item]).some((it) => own.has(it))
      )
      for (const item of extra) {
        match.matched.push(item)
        if (item instanceof P.Match && item.matchGroup) match.addMatchedToGroups(match.groups, [item])
      }
      match.tokens.push(...rest.slice(0, after))
    }
    ItemOfEach.refuseIfAsksAnAction(match, pick)
    return match
  }

  /**
   * The scopes the thing is each thing in:  `pickScope` for the pick (`the last card of column`), the returned one for a
   * `where` about the thing (`column`, and `it`, each column).
   * - SIDE EFFECT:  notes `pickScope` and `thing`, the thing's variable, on `match.data`.
   */
  private thingsScopeOf(match: P.MatchFor<this>, thingWord: P.Match): P.MethodScope {
    const { list, things } = match.groups
    const listDatatype = (list ?? things)?.datatype
    // by its word as written:  `each column`'s type match holds `Column`
    const name = SP.singularIn(match.scope, `${thingWord.raw}`.trim())
    const thingsScope = getWhereScope(match, thingWord, { datatype: listDatatype }, name)
    const data = match.data as ItemOfEachData & { itemVariable?: P.ScopeVariable }
    data.thing = data.itemVariable
    data.pickScope = new P.MethodScope({ parentScope: match.scope, args: [data.thing!], declaredBy: match })
    return thingsScope
  }

  /**
   * Where a `where` about the thing starts its condition in `rest` -- `where the column ...`, `where column ...` --
   * `undefined` for none, or one about the item (`where the card ...`, `where it ...`).
   */
  private static whereAboutThe(scope: P.Scope, rest: P.Token[], thingWord: string): number | undefined {
    const whereLength = Wording.lengthAt(scope, "where_or_which", rest, 0)
    if (!whereLength) return undefined
    const article = Wording.lengthAt(scope, "definite_article", rest, whereLength)
    const word = rest[whereLength + article]
    return word instanceof P.WordToken && word.value === thingWord ? whereLength : undefined
  }

  /** A `where`'s condition, `tokens` read whole in `scope`, up to an alternative or a value on a line of its own. */
  private static conditionOf(scope: P.Scope, tokens: P.Token[], thingsScope: P.MethodScope): P.Match | undefined {
    const condition = SpellStatement.conditionBeforeAlternatives(scope, thingsScope, tokens)
    const match = scope.parser?.parse(condition, "expression", thingsScope)
    return match && match.length === condition.length ? match : undefined
  }

  /**
   * SIDE EFFECT:  `match` refused when its pick asks an action (`where it can play the card`):  that asks one card at
   * a time, and waits, so it can't be asked of each thing in one list.
   * - Asked when the errors are gathered:  what the pick compiles to may hang on a line below it.
   */
  private static refuseIfAsksAnAction(match: P.Match, pick: P.Match): void {
    const language = SP.Language.of(match.scope)
    SP.SpellWarnings.refuseIf(
      match,
      () => language.parserMessage("item-of-each-asks-an-action", { words: match.inputText.trim() }),
      () => ItemOfEach.waits(pick)
    )
  }

  /** Does `pick` ask an action, one item at a time:  `core.itemWhere()`? */
  private static waits(pick: P.Match): boolean {
    const ast = pick.AST
    return ast instanceof P.ASTCoreMethodInvocation && /^itemWhere/.test(ast.methodName)
  }

  /** A list of what each pick is:  `list of cards`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    const picked = (match.data as ItemOfEachData).pick?.datatype
    return picked ? P.listOf(picked) : "list"
  }

  /** `core.pickFromEach(core.everyThing(Column), (column) => column.lastItem)`. */
  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { list, things } = match.groups
    const data = match.data as ItemOfEachData
    const thingWord = match.groups.thing ?? (things!.groups.type as P.Match)
    let all = P.matchAST<P.ASTExpression>((list ?? things)!)
    if (data.thingsWhere) {
      const condition = getWhereMethod(match, thingWord, data.thingsWhere)
      all = new P.ASTCoreMethodInvocation(match, { methodName: "filter", args: [all, condition] })
    }
    const pick = new P.ASTMethodDefinition(match, {
      inline: true,
      args: [new P.ASTVariableExpression(thingWord, { name: data.thing!.name, variable: data.thing })],
      body: P.matchAST(data.pick)
    })
    return new P.ASTCoreMethodInvocation(match, { methodName: "pickFromEach", args: [all, pick] })
  }
}

/** What `item_of_each` notes on its match, while parsing. */
type ItemOfEachData = {
  /** Each thing, as its pick reads it:  `column` */
  thing?: P.ScopeVariable
  /** Where the pick reads, `column` each thing */
  pickScope?: P.MethodScope
  /** The pick, read with the thing in place of `each column`:  `the last card of column` */
  pick?: P.Match
  /** A `where` about the thing:  its condition */
  thingsWhere?: P.Match
}
