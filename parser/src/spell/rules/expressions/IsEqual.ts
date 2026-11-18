import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellConstant } from "spell/parser/spell/rules/constants"

import { Negatable } from "./Negatable"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, SuffixLeft, type OperatorOperands } from "./expressions.shared"

/**
 * `is_equal` rule:  `{lhs} is [not] {rhs}`, e.g. `thing is other` -- compiles to `===`/`!==`.
 * - e.g. `its cook is them`:  to `core.isCurrentPerson()`, as what's saved of a person comes back a new object each time it's read.
 */
export class IsEqual extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.equality
  @proto static parenthesize = true

  /**
   * Match -- and when it compares a thing to one of the values its type lists, which property it means:
   * `it is clubs`, in a card, is `its suit is clubs` (see `listedPropertyFor()`).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return match
    const listed = this.listedFor(scope, SuffixLeft.current, match.groups.expression)
    if (listed) {
      const { property, value } = listed
      ;(match.data as IsEqualMatchData).property = property.output ?? property.name
      // the value as its list says it, and what that compiles to:  `it is a club` is `clubs`, `bloqueada` is `locked`
      SpellConstant.compileAs(match.groups.expression, property.valueOutputs?.[value] ?? value)
    }
    // the last dialog's answer, `the result is ok`:  its own words read as its answers (epic `language` T155)
    if (isLastAnswer(SuffixLeft.current) || isLastAnswer(match.groups.expression)) {
      const data = match.data as IsEqualMatchData
      data.comparesAnswer = true
      // a bare word, unquoted:  `ok` is otherwise yes, and `aceptar` a word of its own
      const left = SuffixLeft.current
      const other = isLastAnswer(left) ? match.groups.expression : left
      const word = other?.inputText.trim()
      if (word && !/\s/.test(word)) data.answer = answerFor(scope, word)
      return match
    }
    // a value said for a built-in template's property, in its own language:  `arriba` is `up` (epic `language` T74)
    SpellConstant.sayFor(SuffixLeft.current, match.groups.expression)
    // a quoted value that isn't one of its values:  `if its lock is "banana"` (epic `language` P39)
    const wrongValue = SpellConstant.wrongValueOf(scope, SuffixLeft.current, match.groups.expression)
    if (wrongValue) SP.SpellWarnings.note(match, wrongValue)
    return match
  }

  /** The property of `left`'s thing that lists `right`'s value, if one does -- see `listedPropertyFor()`. */
  protected listedFor(scope: P.Scope, left: P.Match | undefined, right: P.Match | undefined) {
    return IsEqual.listedPropertyFor(scope, left, right)
  }

  /** `thing is clubs` => `thing.suit == "clubs"`, when it compares a thing to a value of its own -- see `parse()`. */
  compileASTExpression(match: P.MatchFor<this>, operands: OperatorOperands): P.ASTNode {
    const other = isCurrentPerson(operands.rhs)
      ? operands.lhs
      : isCurrentPerson(operands.lhs)
        ? operands.rhs
        : undefined
    if (other) {
      const call = new P.ASTCoreMethodInvocation(match, { methodName: "isCurrentPerson", args: [other] })
      return Negatable.isNegated(operands.operator) ? new P.ASTNotExpression(match, { expression: call }) : call
    }
    // `the result is ok`:  compared with no regard to case (epic `language` T155)
    if ((match.data as IsEqualMatchData).comparesAnswer) {
      const { answer } = match.data as IsEqualMatchData
      const given = isLastAnswerCall(operands.lhs) ? operands.rhs : operands.lhs
      const value = answer ? new P.ASTStringLiteral(match, { value: answer, quote: '"' }) : given
      const call = new P.ASTCoreMethodInvocation(match, { methodName: "resultIs", args: value ? [value] : [] })
      return Negatable.isNegated(operands.operator) ? new P.ASTNotExpression(match, { expression: call }) : call
    }
    const { property } = match.data as IsEqualMatchData
    if (!property || !operands.lhs) return super.compileASTExpression(match, operands)
    const lhs = new P.ASTPropertyExpression(match, { object: operands.lhs, property })
    return super.compileASTExpression(match, { ...operands, lhs })
  }

  /**
   * The ONE property of `left`'s type whose own list of values holds the word `right` is, e.g. `suit` for
   * `it is clubs` in a card, which says `its "suit" is one of clubs, diamonds, hearts or spades`.
   * - So a thing compared to one of its values compares the property that has it:  a card is never `clubs` itself.
   * - `undefined`:  `left`'s type is unknown or lists no such value, `right` is more than a word or a variable,
   *   or two of its properties list it.
   * - SEE:  `P.TypeScope.propertiesListing()`.
   * - A lookup:  call it WHILE PARSING.
   */
  static listedPropertyFor(
    scope: P.Scope,
    left: P.Match | undefined,
    right: P.Match | undefined,
    { anywhere = false }: { anywhere?: boolean } = {}
  ): { property: P.ScopeVariable; value: string } | undefined {
    const type = scope.getType(left?.datatype)
    const word = right?.inputText.trim()
    if (!word || /\s/.test(word) || scope.variables?.get(word)) return undefined
    if (!type && !anywhere) return undefined
    const found = type ? type.propertiesListing(word) : IsEqual.listedAnywhere(scope, word)
    return found.length === 1 ? found[0] : undefined
  }

  /**
   * Each property, of every type the program has, that lists `word` -- one per property name -- for a thing whose type
   * isn't known yet where it's read (epic `language` P55):  `test card is a king`, `test card` set from a pile of a
   * kind declared further down.
   * - Only a word ONE property name lists is read so:  a card's `rank`, not a word two kinds of thing list.
   */
  private static listedAnywhere(scope: P.Scope, word: string): Array<{ property: P.ScopeVariable; value: string }> {
    const byName = new Map<string, { property: P.ScopeVariable; value: string }>()
    // every list of types up the chain:  the file's, the project's, what it imports
    for (let list = scope.types; list; list = list.parent) {
      for (const type of list.get()) {
        for (const found of type.propertiesListing(word)) byName.set(`${found.property.name}`, found)
      }
    }
    return [...byName.values()]
  }

  getOperator(operator: P.Match): P.ASTOperator {
    return Negatable.isNegated(operator) ? "not equals" : "equals"
  }

  /** Negated as `!=`, by `getOperator()`:  never wrapped in a `!(...)` too. */
  shouldNegateOutput(): boolean {
    return false
  }
}

/** Is `operand` what `them` compiles to?  Asked of the AST, as this rule's module can't see the `places` rules. */
function isCurrentPerson(operand: P.ASTExpression | undefined): boolean {
  return operand instanceof P.ASTCoreMethodInvocation && operand.methodName === "currentPerson"
}

/** Is `operand` what `the result` compiles to, `core.result()`? */
function isLastAnswerCall(operand: P.ASTExpression | undefined): boolean {
  return operand instanceof P.ASTCoreMethodInvocation && operand.methodName === "result"
}

/**
 * Is `match`, through matches of one child, the last dialog's answer, `the result` (`the_result`, epic `language` T155)?
 * - Read off its data, as this rule's module can't see the `UI` rules:  not a program's own `result`.
 */
function isLastAnswer(match: P.Match | undefined): boolean {
  for (let each = match; each; each = onlyChild(each)) {
    if ((each.data as { isLastAnswer?: boolean } | undefined)?.isLastAnswer) return true
  }
  return false
}

/** `match`'s one child match, if it has exactly one. */
function onlyChild(match: P.Match): P.Match | undefined {
  const children = (Array.isArray(match.matched) ? match.matched : []).filter((it) => it instanceof P.Match)
  return children.length === 1 ? (children[0] as P.Match) : undefined
}

/**
 * The answer `word`, a bare word, is in `scope`'s language:  `ok` for `aceptar`;  `undefined` for none.
 * - English's words in every language too, as `<action ok />` reads them;  case never matters.
 */
function answerFor(scope: P.Scope, word: string): SP.DialogAnswer | undefined {
  const words = { ...ANSWER_WORDS, ...SP.Language.of(scope).words.answerWords }
  return Object.entries(words).find(([each]) => each.toLowerCase() === word.toLowerCase())?.[1]
}

/** The answers' words in English, read in every language. */
const ANSWER_WORDS: Readonly<Record<string, SP.DialogAnswer>> = { ok: "ok", cancel: "cancel" }

/** What `is_equal` stashes on its match. */
type IsEqualMatchData = {
  /** It compares the last dialog's answer, `the result is ok`:  `core.resultIs(...)` (epic `language` T155). */
  comparesAnswer?: boolean
  /** The answer the other side's bare word says, `ok` for `aceptar`:  compared as that text. */
  answer?: SP.DialogAnswer
  /** The property of the thing on its left it compares, e.g. `suit` for `it is clubs` -- see `listedPropertyFor()`. */
  property?: string
}
