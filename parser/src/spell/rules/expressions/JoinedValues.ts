import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { isItemScope } from "spell/parser/spell/rules/lists/lists.shared"
import { And } from "./And"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Or } from "./Or"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"

/**
 * What an expression with operators adds up to, read the way `CompoundExpression` groups it (its shunting-yard),
 * with `and` / `or` between VALUES (epic `language` T146):
 * - Between two yes-or-no questions, a question, as always:  `the stock is empty and the deck is empty`.
 * - Between two values of one kind:
 *   - `or`:  the first of them that's there -- `the last card of the discard pile or the first card of the stock`
 *     is a card, `discardPile.lastItem || stock.firstItem`
 *   - `and`:  both, collected into a list -- `the stock and the discard pile` is a list of two piles,
 *     `[stock, discardPile]`;  `A and B and C`, one list of three
 *     - what reads it says which items it means:  `each card in the stock and the discard pile` is both piles' cards,
 *       `each pile in ...` the two piles (`itemsAcrossOf()`, epic `language` I152)
 * - Refused, saying how to write it (`problem`, through `SpellWarnings.refuseIf()`, asked once types are known):
 *   - a question joined with a value, or two values of different kinds:  `the stock and 3`, `it is face up and red`
 *     - but `its title is "Ana" or "Bo"`:  `Or`'s own reading, its title one of them
 *   - `and` in a `where` joining a value:  a `where`'s `and` always joins conditions
 *   - `and` and `or` between values with no parentheses to say which goes first
 * - In a condition (`if ...`, a `where`, `when ...`), values stay tests of whether they're there, as always:
 *   `if its title and its picture`, `if its page and its page's fits and its page's thumbnail`;
 *   in a `where`, a question then a value is refused (`where it is face up and the discard pile`).
 * - Not sure what a side is (a name not typed yet):  as always, a question.
 * - STATIC and pure:  read again whenever asked, as a type a line uses may be declared below it.
 */
export class JoinedValues {
  /** What `match`, an expression and its operators (`lhs`, `rhsChain`), adds up to. */
  static of(match: P.Match): JoinedValuesRead {
    const { lhs, rhsChain } = match.groups as { lhs?: P.Match; rhsChain?: P.Match }
    const read: JoinedValuesRead = { datatype: undefined, valueJoins: new Set(), itemJoins: new Map() }
    if (!lhs || !rhsChain) return read
    const { scope } = match
    read.isCondition = CONDITION_GROUPS.has(match.matchGroup ?? "") || isItemScope(scope)
    const output: Side[] = [{ datatype: lhs.datatype, match: lhs }]
    const opStack: P.Match[] = []
    for (const suffix of rhsChain.matched) {
      if (!(suffix instanceof P.Match)) continue
      reduceWhile(precedenceOf(suffix))
      const rule = suffix.rule as InfixOperatorSuffix
      if (suffix.rule instanceof PostfixOperatorSuffix) {
        const side = output.pop()
        const datatype = rule.getResultDatatype(suffix, side?.datatype, undefined)
        output.push({ datatype, match: suffix, text: `${textOf(side)} ${suffix.inputText.trim()}` })
      } else {
        opStack.push(suffix)
        const rhs = suffix.groups.expression as P.Match | undefined
        output.push({ datatype: rhs?.datatype, match: rhs })
      }
    }
    reduceWhile(-Infinity)
    read.datatype = output[0]?.datatype
    return read

    /** Apply every stacked operator binding at least as tightly as `power`. */
    function reduceWhile(power: number) {
      for (let top = opStack.at(-1); top && precedenceOf(top) >= power; top = opStack.at(-1)) {
        const operator = opStack.pop()!
        const rhs = output.pop()!
        const lhs = output.pop()!
        output.push(JoinedValues.joined(scope, operator, lhs, rhs, read))
      }
    }
  }

  /** `lhs` and `rhs` with `operator` between them;  SIDE EFFECT:  notes a value join, or the first problem, in `read`. */
  private static joined(scope: P.Scope, operator: P.Match, lhs: Side, rhs: Side, read: JoinedValuesRead): Side {
    const rule = operator.rule as InfixOperatorSuffix
    const asAlways = (): Side => ({
      datatype: rule.getResultDatatype(operator, lhs.datatype, rhs.datatype),
      match: operator,
      text: `${textOf(lhs)} ${operator.inputText.trim()}`
    })
    const word = rule instanceof And ? "and" : rule instanceof Or ? "or" : undefined
    if (!word) return asAlways()
    // the word as written, for the message:  Spanish's `y`, `o`
    const written = ((operator.groups.operator as P.Match | undefined) ?? operator).inputText.trim()
    const left = kindOf(lhs.datatype)
    const right = kindOf(rhs.datatype)
    const language = SP.Language.of(scope)
    const text = textOf
    const refuse = (key: SP.ParserMessageKey, params: Record<string, string> = {}): Side => {
      read.problem ??= language.parserMessage(key, { lhs: text(lhs), rhs: text(rhs), ...params })
      return asAlways()
    }
    // nothing written there (a subject put back, `withWhichSubject()`):  the words after it say what's wrong
    if (!text(rhs)) return asAlways()
    // `the card is face up and red`:  a word alone asks nothing, whatever it is
    if (word === "and" && left === "question" && isPlainValue(rhs.match)) {
      return refuse(isItemScope(scope) ? "and-in-where-joins-conditions" : "and-plain-value")
    }
    if (left === "unknown" || right === "unknown" || (left === "question" && right === "question")) return asAlways()
    // a condition:  a value is there or not, as always -- `if its title and its picture`, `if its page and it fits`
    // - but a question then a thing, in a `where`, is refused:  `where it is face up and the discard pile` (rule 3)
    if (read.isCondition && (left === "value" || !isItemScope(scope))) return asAlways()
    if (left !== right) {
      // `its title is "Ana" or "Bo"`:  `Or`'s own reading
      if (word === "or" && left === "question" && isPlainValue(rhs.match)) return asAlways()
      if (word === "and" && left === "question" && isItemScope(scope)) return refuse("and-in-where-joins-conditions")
      return refuse("joined-question-and-value", { word: written })
    }
    // two values
    const other = word === "and" ? "or" : "and"
    if (lhs.joined === other || rhs.joined === other) return refuse("joined-values-and-or")
    // `cards in the stock and cards in the discard pile`:  their items, in one flat list
    if (word === "and" && (saysItems(lhs) || saysItems(rhs)))
      return JoinedValues.joinedItems(scope, operator, lhs, rhs, read, refuse)
    const lhsItem = word === "and" && lhs.joined === "and" ? scope.getItemType(lhs.datatype) : lhs.datatype
    const rhsItem = word === "and" && rhs.joined === "and" ? scope.getItemType(rhs.datatype) : rhs.datatype
    const common = JoinedValues.commonType(scope, lhsItem, rhsItem)
    if (!common) return refuse("joined-values-of-two-kinds", { word: written })
    read.valueJoins.add(operator)
    return {
      datatype: word === "and" ? P.listOf(common) : common,
      match: operator,
      joined: word,
      text: `${text(lhs)} ${operator.inputText.trim()}`
    }
  }

  /**
   * `lhs` and `rhs`, one or both saying ITEMS, as one flat list of them (epic `language` T152):
   * `cards in the stock and cards in the discard pile` is both piles' cards, `cards in the stock and the last card of
   * the discard pile` the stock's cards and that one.
   * - A side that says items joins as its items;  one that's an item, as that one.
   * - A side that names a list (`the stock`) beside items is refused:  a thing stays a thing, so it can't be items too.
   * - SIDE EFFECT:  notes how each side joins in `read.itemJoins`, or the first problem.
   */
  private static joinedItems(
    scope: P.Scope,
    operator: P.Match,
    lhs: Side,
    rhs: Side,
    read: JoinedValuesRead,
    refuse: (key: SP.ParserMessageKey, params?: Record<string, string>) => Side
  ): Side {
    const items = saysItems(lhs) ? lhs : rhs
    const itemType = scope.getItemType(items.datatype)
    const kindOf = (side: Side): P.Datatype | undefined =>
      saysItems(side) ? scope.getItemType(side.datatype) : side.datatype
    for (const side of [lhs, rhs]) {
      if (saysItems(side)) continue
      // `the stock`, a list of what the items are:  a named list beside items
      const sideItems = scope.getItemType(side.datatype)
      const isList = !!scope.getType(side.datatype)?.isA("list") || !!P.itemTypeOf(side.datatype)
      if (
        isList &&
        JoinedValues.commonType(scope, sideItems, itemType) &&
        !JoinedValues.commonType(scope, side.datatype, itemType)
      ) {
        return refuse("joined-list-and-items", {
          list: textOf(side),
          items: textOf(items),
          things: JoinedValues.pluralWords(scope, itemType)
        })
      }
    }
    const common = JoinedValues.commonType(scope, kindOf(lhs), kindOf(rhs))
    if (!common)
      return refuse("joined-values-of-two-kinds", {
        word: ((operator.groups.operator as P.Match | undefined) ?? operator).inputText.trim()
      })
    read.valueJoins.add(operator)
    const datatype = P.listOf(common)
    read.itemJoins.set(operator, {
      lhs: saysItems(lhs) ? "items" : "one",
      rhs: saysItems(rhs) ? "items" : "one",
      datatype
    })
    return {
      datatype,
      match: operator,
      joined: "and",
      items: true,
      text: `${textOf(lhs)} ${operator.inputText.trim()}`
    }
  }

  /** `datatype`'s words, plural, as the language says them:  `cards`, `cartas`. */
  private static pluralWords(scope: P.Scope, datatype: P.Datatype | undefined): string {
    const language = SP.Language.of(scope)
    const type = scope.getType(datatype)
    const words = type ? SP.SpellWarnings.exampleNoun(scope, type, "definite").split(/\s+/).slice(1).join(" ") : ""
    return words ? language.inflector.pluralize(words) : `${datatype ?? ""}`
  }

  /**
   * The kind `one` and `other` both are:  the same, the one the other is a kind of, or the nearest kind both are that
   * a program declared (two piles:  a stock pile and a discard pile) -- `undefined` if none (a pile and a card).
   * - Not sure (a stub, a name only), the first:  nothing refused for what isn't known yet.
   */
  static commonType(
    scope: P.Scope,
    one: P.Datatype | undefined,
    other: P.Datatype | undefined
  ): P.Datatype | undefined {
    if (one === other) return one
    if (!one || !other) return one ?? other
    const oneType = scope.getType(one)
    const otherType = scope.getType(other)
    if (!oneType || !otherType) return scope.couldBeA(one, other) ? one : undefined
    if (otherType.isA(oneType)) return one
    if (oneType.isA(otherType)) return other
    if (scope.couldBeA(one, other)) return one
    // two lists of one kind of item:  a deck and a pile of cards
    const items = scope.getItemType(one)
    if (items && oneType.isA("list") && otherType.isA("list") && items === scope.getItemType(other)) return one
    const shared = oneType.chain().find((type) => otherType.isA(type))
    return shared && !SP.isBuiltInTypeScope(shared) ? shared.name : undefined
  }
}

/** What `JoinedValues.of()` found. */
export type JoinedValuesRead = {
  /** What the whole expression is */
  datatype: P.Datatype | undefined
  /** Each `and` / `or` suffix joining two values, not two questions */
  valueJoins: Set<P.Match>
  /**
   * Each `and` among them joining ITEMS into one flat list, and how each side joins:  as its items, or as one
   * (epic `language` T152)
   */
  itemJoins: Map<P.Match, ItemJoin>
  /** Why it's refused, in the scope's language -- `undefined` if it isn't */
  problem?: string
  /** It's a condition (`if ...`, a `where`):  a value there is a test of whether it's there */
  isCondition?: boolean
}

/**
 * The groups a condition is read into:  `if {condition}`, `X if {operator} otherwise Y`, `when {enabled}` ...
 * - With a `where`'s, these say a value in an `and` / `or` is a test of whether it's there, as always.
 */
const CONDITION_GROUPS = new Set(["condition", "operator", "enabled", "disabled", "selected"])

/** How an `and` joins ITEMS:  each side as its items, or as one;  and the flat list it makes, `list of cards`. */
export type ItemJoin = { lhs: "items" | "one"; rhs: "items" | "one"; datatype: P.Datatype }

/** One side of an operator, as the shunting-yard reduces them. */
type Side = {
  datatype: P.Datatype | undefined
  /** What it was read from:  an operand, or the operator that made it */
  match: P.Match | undefined
  /** Made by `and` / `or` joining values, with no parentheses round it */
  joined?: "and" | "or"
  /** A flat list of items, `and` made of sides saying items (epic `language` T152) */
  items?: boolean
  /** Its words, when it's more than `match`'s:  `the stock and the discard pile` */
  text?: string
}

/** `side`'s words, as written. */
function textOf(side: Side | undefined): string {
  return side?.text ?? side?.match?.inputText.trim() ?? ""
}

/**
 * Does `side` say items:  words that say them (`cards in the deck`, `SpellExpression.saysItems`), or `and` joining
 * such words?
 */
function saysItems(side: Side): boolean {
  if (side.items) return true
  const { match } = side
  if (!match || side.joined) return false
  const rule = match.rule as { saysItemsOf?: (match: P.Match) => boolean }
  return !!rule.saysItemsOf?.(match)
}

/** A question (`choice`), a value, or not known. */
function kindOf(datatype: P.Datatype | undefined): "question" | "value" | "unknown" {
  if (datatype === undefined) return "unknown"
  return datatype === "choice" ? "question" : "value"
}

/** Is `match` a plain text or number, written out:  `"Ana"`, `3`, `red`? */
function isPlainValue(match: P.Match | undefined): boolean {
  if (!match || match.rule instanceof InfixOperatorSuffix || match.rule instanceof PostfixOperatorSuffix) return false
  const ast = match.AST
  return (
    ast instanceof P.ASTStringLiteral || ast instanceof P.ASTNumericLiteral || ast instanceof P.ASTConstantExpression
  )
}

/** A suffix's `precedence`. */
function precedenceOf(suffix: P.Match): number {
  return (suffix.rule as InfixOperatorSuffix).precedence
}
