import { afterEach, describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

const { parse } = P.Choice.prototype

afterEach(() => {
  P.Choice.prototype.parse = parse
})

describe("looking rules up by first word (`P.Choice`)", () => {
  test("no rule it leaves out would have matched, for any of Spell's rule tests", () => {
    const wrong = new Set<string>()
    P.Choice.prototype.parse = function checked(this: P.Choice, scope: P.Scope, tokens: P.Token[]) {
      const match = parse.call(this, scope, tokens)
      if (P.Expectations.current || !tokens.length) return match
      const tried = new Set(this["rulesFor"](tokens[0]!))
      for (const rule of this.rules) {
        if (!tried.has(rule) && rule.parse(scope, tokens)) wrong.add(`${rule.name}, starting "${tokens[0]!.value}"`)
      }
      return match
    }
    const { pass } = SP.spellParser.testRules(undefined, false)
    expect(pass).toBeGreaterThan(1000)
    expect([...wrong]).toEqual([])
  }, 60_000)
})
