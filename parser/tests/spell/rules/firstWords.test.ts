import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP, spellParser } from "spell/parser/spell"

/**
 * A `Choice` tries only the rules that can start with a line's first word, so a rule is filed under a word
 * only if its `parse()` really starts with its syntax:  these tests guard that.
 * - A new rule with a `parse()` that reads the line by hand MUST say `@proto static startsWithItsSyntax = false`.
 * - Reads each method's text:  a test may;  the parser itself reads only `Sequence.startsWithItsSyntax`.
 */
describe("first-word filing", () => {
  /** Every `P.Sequence` rule instance of both languages, and every rule class spell exports. */
  function census() {
    const seen = new Set<P.Rule>()
    const classes = new Set<typeof P.Sequence>()
    const walk = (rule: P.Rule | undefined) => {
      if (!rule || seen.has(rule)) return
      seen.add(rule)
      if (rule instanceof P.Sequence) classes.add(rule.constructor as typeof P.Sequence)
      for (const child of rule.childRules ?? []) walk(child)
    }
    for (const { parser } of [SP.english, SP.spanish]) for (const rule of Object.values(parser.rules)) walk(rule)
    for (const value of Object.values(SP)) {
      if (typeof value === "function" && value.prototype instanceof P.Sequence) classes.add(value as typeof P.Sequence)
    }
    return { rules: [...seen], classes }
  }

  /** The classes between `Rule` and `P.Sequence` that wrote their own `method`, as `{ owner, text }`. */
  function ownOverrides(rule: typeof P.Sequence, method: "parse" | "test") {
    const overrides: Array<{ owner: string; text: string }> = []
    for (let at = rule; at && at !== P.Sequence; at = Object.getPrototypeOf(at)) {
      const own = Object.getOwnPropertyDescriptor(at.prototype, method)?.value as unknown
      if (typeof own === "function") overrides.push({ owner: at.name, text: String(own) })
    }
    return overrides
  }

  /** Does `text` call the method's next one up, so the syntax still gets its say? */
  const callsUp = (text: string, method: string) =>
    text.includes(`super.${method}(`) || text.includes(`.prototype.${method}.call(this`)

  test("a Sequence rule's parse() starts with its syntax, or says it doesn't", () => {
    const offenders: string[] = []
    for (const rule of census().classes) {
      if (rule.prototype.startsWithItsSyntax === false) continue
      for (const { owner, text } of ownOverrides(rule, "parse")) {
        if (!callsUp(text, "parse")) offenders.push(`${rule.name} (${owner}.parse)`)
      }
    }
    expect(offenders).toEqual([])
  })

  test("a rule filed under a first word has a test() that still asks its syntax", () => {
    const offenders: string[] = []
    for (const rule of census().rules) {
      if (!(rule instanceof P.Sequence) || !rule.firstWords) continue
      for (const { owner, text } of ownOverrides(rule.constructor as typeof P.Sequence, "test")) {
        if (!callsUp(text, "test")) offenders.push(`${rule.name} (${owner}.test)`)
      }
    }
    expect(offenders).toEqual([])
  })

  test("the rule tests answer the same with the first-word table as without it", () => {
    const withTable = spellParser.testRules(undefined, false)
    P.Choice.USE_FIRST_WORD_INDEX = false
    let without: P.TestResults
    try {
      without = spellParser.testRules(undefined, false)
    } finally {
      P.Choice.USE_FIRST_WORD_INDEX = true
    }
    const answers = (results: P.TestResults) => ({
      pass: results.pass,
      fail: results.fail,
      failed: results.failed.map(({ ruleName, input }) => `${ruleName}: ${input}`)
    })
    expect(withTable.pass).toBeGreaterThan(1000)
    expect(answers(withTable)).toEqual(answers(without))
  })
})
