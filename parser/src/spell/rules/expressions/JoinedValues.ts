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
    const read: JoinedValuesRead = { datatype: undefined, valueJoins: new Set() }
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

/** One side of an operator, as the shunting-yard reduces them. */
type Side = {
  datatype: P.Datatype | undefined
  /** What it was read from:  an operand, or the operator that made it */
  match: P.Match | undefined
  /** Made by `and` / `or` joining values, with no parentheses round it */
  joined?: "and" | "or"
  /** Its words, when it's more than `match`'s:  `the stock and the discard pile` */
  text?: string
}

/** `side`'s words, as written. */
function textOf(side: Side | undefined): string {
  return side?.text ?? side?.match?.inputText.trim() ?? ""
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
