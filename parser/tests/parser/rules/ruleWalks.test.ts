import { describe, test, expect } from "vite-plus/test"

import { P } from "spell-parser/parser"

/** A parser that only looks rules up by name:  all `leadingRules()` asks of one. */
function parserWith(rules: Record<string, P.Rule>): P.Parser {
  return { rules } as unknown as P.Parser
}

describe("rule.childRules", () => {
  test("a sequence's and a choice's rules;  none for a leaf", () => {
    const [a, b] = [new P.Keyword("a"), new P.Keyword("b")]
    expect(new P.Sequence([a, b]).childRules).toEqual([a, b])
    expect(new P.Choice({ rules: [a, b] }).childRules).toEqual([a, b])
    expect(a.childRules).toEqual([])
    expect(new P.Subrule({ rule: "thing" }).childRules).toEqual([])
  })

  test("a repeat's rule, then its delimiter:  the delimiter's words are part of the syntax too", () => {
    const [item, and] = [new P.Keyword("card"), new P.Keyword("and")]
    expect(new P.Repeat({ rule: item, delimiter: and }).childRules).toEqual([item, and])
    expect(new P.Repeat(item).childRules).toEqual([item])
  })
})

describe("P.leadingRules()", () => {
  test("a sequence:  up to its first rule that isn't optional, itself first", () => {
    const the = new P.Keyword({ literal: "the", optional: true })
    const [card, is] = [new P.Keyword("card"), new P.Keyword("is")]
    const sequence = new P.Sequence([the, card, is])
    expect(P.leadingRules(sequence)).toEqual([sequence, the, card])
  })

  test("a choice's alternatives, a repeat's rule -- each rule once", () => {
    const word = new P.Keyword("go")
    const choice = new P.Choice({ rules: [word, new P.Repeat(word)] })
    expect(P.leadingRules(choice)).toEqual([choice, word, choice.rules[1]])
  })

  test("a `{subrule}`:  its rule by the parser's name for it;  a category only with `followGroups`", () => {
    const set = new P.Keyword("set")
    const expression = new P.Group({ rules: [new P.Keyword("the")] })
    const parser = parserWith({ setter: set, expression })
    const toSetter = new P.Subrule({ rule: "setter" })
    const toExpression = new P.Subrule({ rule: "expression" })

    expect(P.leadingRules(toSetter)).toEqual([toSetter])
    expect(P.leadingRules(toSetter, { parser })).toEqual([toSetter, set])
    expect(P.leadingRules(toExpression, { parser })).toEqual([toExpression])
    expect(P.leadingRules(toExpression, { parser, followGroups: true })).toEqual([
      toExpression,
      expression,
      expression.rules[0]
    ])
  })
})
