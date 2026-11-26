import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { And } from "./And"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { JoinedValues, type ItemJoin } from "./JoinedValues"
import { Or } from "./Or"
import { PostfixOperatorSuffix } from "./PostfixOperatorSuffix"
import { SpellExpression } from "./SpellExpression"
import { Precedence, SuffixLeft } from "./expressions.shared"

/**
 * `expression` rule:  an operand, then each operator suffix binding TIGHTER than `bound`, e.g. `x + 1 is 3`.
 * - The ONLY rule registered as `expression`:
 *   every other `expression` alias is an `operand` -- see `SpellParser.getNamesForRule()`.
 * - No suffix => the operand's own match, as is,
 *   so `match.is(KnownVariable)` still works on `{thing:expression}`.
 * - Suffixes' rhs is an `operand`, so the chain is flat:
 *   `getAST()` groups it by `precedence` (shunting-yard).
 */
export class CompoundExpression extends SpellExpression<"lhs|rhsChain"> {
  static ruleName = "expression"
  @proto static alias: string | string[] = []
  /** Suffixes must bind tighter than this to be ours:  0 takes them all, see `ArithmeticExpression`. */
  declare bound: number
  @proto static bound = 0

  /**
   * Our operand, then suffixes while they bind tighter than `bound`.
   * - Expecting mode (see `P.Expectations`):  out of tokens, an operator after us only EXTENDS us,
   *   as a `Sequence` would record, nested like its children.
   * - NOTE: `rules` is `[{lhs:operand}, {rhsChain:expression_suffix}*]`, from our syntax.
   *   The `*` matters:  `Sequence.test()` then lets a lone operand through, e.g. `1`.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const expecting = P.Expectations.current
    const [operand, chain] = this.rules as [P.Rule, P.Repeat]
    const lhs = expecting ? expecting.nested(() => operand.parse(scope, tokens)) : operand.parse(scope, tokens)
    if (!lhs) return undefined

    const suffixes: P.Match[] = []
    let rest = tokens.slice(lhs.length)
    while (rest.length) {
      const remaining = rest
      // what the suffix follows, when known -- see `SuffixLeft`
      const left = CompoundExpression.suffixLeft(lhs, suffixes.at(-1))
      const parseSuffix = () => SuffixLeft.while(left, () => chain.rule.parse(scope, remaining))
      const suffix = expecting ? expecting.nested(parseSuffix) : parseSuffix()
      if (!suffix || CompoundExpression.precedenceOf(suffix) <= this.bound) break
      suffixes.push(suffix)
      rest = rest.slice(suffix.length)
    }
    if (expecting && !rest.length) expecting.expect(chain, this, 1, true)

    if (!suffixes.length) {
      // an operand taking no tokens (`implied_it`) is one only with a suffix after it
      if (!lhs.length) return undefined
      lhs.matchGroup = this.name
      return lhs
    }
    // the same shape `Sequence` would make of our syntax:  `lhs`, then a `Repeat` match as `rhsChain`
    const suffixTokens = suffixes.flatMap((it) => it.tokens)
    const rhsChain = new P.Match({ rule: chain, matched: suffixes, items: suffixes, tokens: suffixTokens, scope })
    const value = tokens
      .slice(0, tokens.length - rest.length)
      .join("")
      .trim()
    const match = new P.Match({
      rule: this,
      matched: [lhs, rhsChain],
      value,
      tokens: [...lhs.tokens, ...suffixTokens],
      scope
    })
    CompoundExpression.refuseIfJoinedWrong(match, suffixes)
    return match
  }

  /**
   * SIDE EFFECT:  `match` is refused when an `and` / `or` in it joins what it can't (epic `language` T146):
   * a question and a value, two values of different kinds, `and` and `or` between values with no parentheses ...
   * - Asked when the errors are gathered, as `JoinedValues.of()` reads what each side is:  a type a line uses may be
   *   declared below it.
   */
  private static refuseIfJoinedWrong(match: P.Match, suffixes: P.Match[]): void {
    if (!suffixes.some((suffix) => suffix.rule instanceof And || suffix.rule instanceof Or)) return
    SP.SpellWarnings.refuseIf(
      match,
      () => JoinedValues.of(match).problem ?? "",
      () => !!JoinedValues.of(match).problem
    )
  }

  /**
   * What the whole expression is:  the same shunting-yard as `getAST()`, over datatypes.
   * - Each operator's `getResultDatatype()`, applied in the order `getAST()` applies it.
   * - e.g. `the rank of the card + 1 is 2` => `+` makes `number`, then `is` makes `choice`.
   * - A match only partway there (the editor asking what comes next, `expectedAfter()`) may have neither side yet:
   *   `undefined`, never a throw (a plural call asked its list's, `if the number of cards in the foundations is 52`).
   * - `and` / `or` between values are values:  a list of both, the first that's there -- see `JoinedValues`.
   */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return JoinedValues.of(match).datatype
  }

  /**
   * What the expression measures, if anything -- read by `SP.measureOf()`:  its LAST suffix's `resultMeasure()`, given
   * what each side is, e.g. a date minus a date is a duration in seconds (epic `language` P63).
   * - Only a chain of one precedence, which reads left to right (`now + 2 days - now`):  the left side's datatype is
   *   each suffix's result in turn.  A mix measures nothing yet.
   */
  getMeasure(match: P.MatchFor<this>): P.Measure | undefined {
    const { lhs, rhsChain } = match.groups
    const suffixes = (rhsChain?.matched ?? []) as P.Match[]
    const last = suffixes.at(-1)
    if (
      !last ||
      suffixes.some(
        (suffix) => (suffix.rule as InfixOperatorSuffix).precedence !== (last.rule as InfixOperatorSuffix).precedence
      )
    ) {
      return undefined
    }
    const rhsOf = (suffix: P.Match) => (suffix.groups.expression as P.Match | undefined)?.datatype
    let left = (lhs as P.Match).datatype
    for (const suffix of suffixes.slice(0, -1)) {
      left = (suffix.rule as InfixOperatorSuffix).getResultDatatype(suffix as never, left, rhsOf(suffix))
    }
    const rule = last.rule as { resultMeasure?(lhs?: P.Datatype, rhs?: P.Datatype): P.Measure | undefined }
    return rule.resultMeasure?.(left, rhsOf(last))
  }

  /**
   * Runs shunting-yard over `rhsChain` to combine `lhs` with each suffix, by `precedence`.
   * - `compile()` normalizes a matched sub-`Match`/array down to plain `ASTNode`(s).
   * - `applyOperatorToRule()` calls the matched suffix rule's own `compileAST()`.
   * - Postfix pops like infix, then applies at once:  `x + y is empty` => `isEmpty(x + y)`.
   */
  getAST(match: P.MatchFor<this>): P.ASTNode {
    function compile(thing: unknown): unknown {
      if (!thing) return undefined
      // TODO: we have one case ("is the queen of spades") where `thing` match is an array... :-(
      if (Array.isArray(thing)) return thing.map(compile)
      if (thing instanceof P.Match && thing.rule.getAST) return thing.AST
      return thing
    }

    function applyOperatorToRule({
      match: ruleMatch,
      operator,
      rhs,
      lhs
    }: {
      match: P.Match
      operator: P.Match
      rhs?: unknown
      lhs?: unknown
    }): P.ASTNode {
      // Every match pushed onto `opStack` (below) came from an item whose `.rule` is an `InfixOperatorSuffix`:
      // assert it again here, so `compileAST()` is callable.
      // The base `Rule` type doesn't know about this language-specific method.
      if (!(ruleMatch.rule instanceof InfixOperatorSuffix)) {
        throw new TypeError("Expected an InfixOperatorSuffix rule in CompoundExpression's shunting-yard")
      }
      // NOTE: re-typed to plain (default-parameterized) `InfixOperatorSuffix`:
      // a bare `instanceof` against a generic class narrows to `InfixOperatorSuffix<any, any>`,
      // which makes `MatchFor<this>` an unhelpful distributed type at the `compileAST()` call below.
      const rule: InfixOperatorSuffix = ruleMatch.rule
      // `the stock and the discard pile`:  both, in a list -- `A and B and C` one list of three
      // `cards in the stock and cards in the discard pile`:  their items, one flat list
      const items = itemJoins.get(ruleMatch)
      if (items) return itemsCollected(ruleMatch, compile(lhs), compile(rhs), items)
      if (valueJoins.has(ruleMatch) && rule instanceof And) return collected(ruleMatch, compile(lhs), compile(rhs))
      const args = {
        operator,
        // `compile()` turns matches and arrays into `ASTNode`s at run time:
        // the type can't say `Expression`, but every operand here is one in practice.
        rhs: compile(rhs) as P.ASTExpression | undefined,
        lhs: compile(lhs) as P.ASTExpression | undefined
      }
      const result = rule.compileAST(ruleMatch, args)
      return result
    }

    /** Apply every stacked operator binding at least as tightly as `power`, to the top 2 things on `output`. */
    function reduceWhile(power: number) {
      for (let top = opStack.at(-1); top && CompoundExpression.precedenceOf(top.match) >= power; top = opStack.at(-1)) {
        const topOp = opStack.pop()!
        const rhs = output.pop() // NOTE: order is vital here!
        output.push(applyOperatorToRule({ ...topOp, rhs, lhs: output.pop() }))
      }
    }

    // Go through the rhs expressions, with a variant of the shunting-yard algorithm for operator precedence:
    // - it assumes every operator, infix and postfix, is left-to-right associative
    // See: https://en.wikipedia.org/wiki/Shunting-yard_algorithm
    // See: https://www.chris-j.co.uk/parsing.php
    const { lhs, rhsChain } = match.groups
    const { valueJoins, itemJoins } = JoinedValues.of(match)
    const output: unknown[] = [lhs]
    const opStack: Array<{ match: P.Match; operator: P.Match }> = []
    rhsChain.matched.forEach((rhsItem) => {
      if (!(rhsItem instanceof P.Match)) return
      // `rhsChain` has no delimiter, so every item in `.matched` is a `Match` for one of the
      // `expression_suffix` rules below, whose syntax always names `operator`/`expression` groups
      // (except the no-`rhs` postfix rules, which may omit `expression`).
      const rhs = rhsItem as unknown as P.Match<P.GroupsFor<"operator?|expression?">>
      // Unary postfix operator, e.g. "<lhs> is empty":  first apply what binds at least as tightly
      if (rhs.rule instanceof PostfixOperatorSuffix) {
        reduceWhile(CompoundExpression.precedenceOf(rhs))
        const args = {
          match: rhs,
          lhs: output.pop(),
          // use explicit operator if there is one, default to entire match
          operator: rhs.groups.operator || rhs
        }
        output.push(applyOperatorToRule(args))
      }
      // Infix binary operator, e.g. "<lhs> is a <rhs>"
      else if (rhs.rule instanceof InfixOperatorSuffix) {
        const { operator, expression } = rhs.groups

        // Apply each stacked operator binding at least as tightly as this one
        reduceWhile(CompoundExpression.precedenceOf(rhs))

        // Push the current operator and expression.
        // `operator` is always present: every `InfixOperatorSuffix` rule below declares an
        // explicit `(operator:...)` group in its syntax.
        opStack.push({ match: rhs, operator: operator! })
        output.push(expression)
      } else {
        console.warn("Unexpected rule type", rhs.rule.name)
      }
    })

    // At this point, we have only binary operators in the output stack.
    // Run through them and apply the operator to them in pairs.
    reduceWhile(-Infinity)
    if (output.length !== 1) {
      console.warn("Shunting yard ended up with too much output:", output)
    }
    // Dynamic: the shunting-yard reduction above always leaves exactly one `ASTNode`.
    return output[0] as P.ASTNode
  }

  /**
   * What the next suffix follows, if known -- see `SuffixLeft`.
   * - The first suffix:  our operand, `lhs`.
   * - After `and` / `or`:  the operand after it, e.g. `the game` in `the card is face up and the game is red`.
   *   Every suffix which asks (a person's phrase) binds tighter than those, so that operand is its whole left side.
   * - After anything else:  unknown, e.g. after `+` the left side is the sum so far.
   */
  private static suffixLeft(lhs: P.Match, previous: P.Match | undefined): P.Match | undefined {
    if (!previous) return lhs
    if (previous.rule instanceof PostfixOperatorSuffix) return undefined
    const precedence = CompoundExpression.precedenceOf(previous)
    if (precedence !== Precedence.and && precedence !== Precedence.or) return undefined
    return previous.groups.expression as P.Match | undefined
  }

  /** A suffix match's `precedence` -- every `expression_suffix` is an `InfixOperatorSuffix`, which must have one. */
  private static precedenceOf(suffix: P.Match): number {
    return (suffix.rule as InfixOperatorSuffix).precedence
  }
}

/** Lists `and` made of values, so a second `and` adds to it:  see `collected()`. */
const COLLECTED = new WeakSet<P.ASTArrayLiteral>()

/** `lhs` and `rhs` in one list, `[stock, discardPile]`:  `lhs` a list `and` made, `rhs` added to its items. */
function collected(match: P.Match, lhs: unknown, rhs: unknown): P.ASTArrayLiteral {
  const items = lhs instanceof P.ASTArrayLiteral && COLLECTED.has(lhs) ? [...(lhs.items ?? [])] : [lhs]
  const list = new P.ASTArrayLiteral(match, { items: [...items, rhs] as P.ASTExpression[] })
  COLLECTED.add(list)
  return list
}

/** Lists `and` made of items, so a second `and` adds to their parts:  see `itemsCollected()`. */
const ITEMS_COLLECTED = new WeakSet<P.ASTCoreMethodInvocation>()

/**
 * `lhs` and `rhs`, their items in one flat list (epic `language` T152):
 * `core.mergeLists([stock, [discardPile.lastItem]], List)` -- a side saying items as it is, one item in a list of its own.
 * - `lhs` a list we made:  `rhs` joins its parts, `A and B and C` one merge of three.
 */
function itemsCollected(match: P.Match, lhs: unknown, rhs: unknown, sides: ItemJoin): P.ASTCoreMethodInvocation {
  const part = (side: unknown, as: "items" | "one") =>
    (as === "one" ? new P.ASTArrayLiteral(match, { items: [side as P.ASTExpression] }) : side) as P.ASTExpression
  const made = lhs instanceof P.ASTCoreMethodInvocation && ITEMS_COLLECTED.has(lhs)
  const joinedSoFar = made ? (lhs.args.args?.[0] as P.ASTArrayLiteral | undefined) : undefined
  const parts = joinedSoFar ? [...(joinedSoFar.items ?? [])] : [part(lhs, sides.lhs)]
  const list = new P.ASTCoreMethodInvocation(match, {
    methodName: "mergeLists",
    args: [
      new P.ASTArrayLiteral(match, { items: [...parts, part(rhs, sides.rhs)] }),
      new P.ASTTypeExpression(match, { name: "List" })
    ],
    // what the list holds, `list of cards`:  the `and` it's made by is a question's operator otherwise (I164)
    datatype: sides.datatype
  })
  ITEMS_COLLECTED.add(list)
  return list
}
