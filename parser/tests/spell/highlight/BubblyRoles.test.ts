import { describe, expect, it } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/** Every rule `parser` has, each registration its own, by rule class. */
function rulesByClass(parser: P.Parser): Map<Function, P.Rule[]> {
  const byClass = new Map<Function, P.Rule[]>()
  for (const rule of Object.values(parser.rules as Record<string, P.Rule>))
    for (const each of rule instanceof P.Group ? rule.rules : [rule]) {
      const list = byClass.get(each.constructor) ?? []
      if (!list.includes(each)) list.push(each)
      byClass.set(each.constructor, list)
    }
  return byClass
}

/**
 * The group names `rules`' syntaxes have, all of them:  their group specs', and those written in their syntax
 * (`{name:rule}`, `{rule}`, `(name:...)`, `[name:...]`), for a rule whose matches keep their own (`method_signature`).
 */
function groupNamesOf(rules: P.Rule[]): Set<string> {
  const written = (syntax: unknown) =>
    typeof syntax === "string" ? [...syntax.matchAll(/[{([](\w+)[:}]/g)].map((found) => found[1]!) : []
  return new Set(
    rules.flatMap((rule) => [
      ...rule.getGroupSpecEntries().map((entry) => entry.name),
      ...written((rule as { syntax?: unknown }).syntax)
    ])
  )
}

describe("SP.BubblyRoles", () => {
  const languages = [SP.spellParser, SP.Language.for("es").parser]

  it("gives every language's rule of a class the same roles:  one per rule class, beside its English syntax", () => {
    const [english, spanish] = languages.map(rulesByClass)
    for (const [ruleClass, rules] of english!) {
      const theirs = spanish!.get(ruleClass)
      if (!theirs) continue
      for (const rule of [...rules, ...theirs])
        expect(SP.BubblyRoles.of(rule), ruleClass.name).toBe(SP.BubblyRoles.of(rules[0]!))
    }
  })

  it("names only groups its rule's syntax has, in every language", () => {
    for (const parser of languages) {
      for (const [ruleClass, rules] of rulesByClass(parser)) {
        const roles = SP.BubblyRoles.of(rules[0]!)
        const groups = groupNamesOf(rules)
        const named = Object.keys(roles).filter((key) => !["band", "match", "literal"].includes(key))
        for (const group of named) expect(groups, `${ruleClass.name} in ${parser.language?.lang}`).toContain(group)
      }
    }
  })

  it("refuses a second, different set of roles for a rule class", () => {
    class Roled {}
    SP.BubblyRoles.record(Roled, { match: "question" })
    expect(() => SP.BubblyRoles.record(Roled, { match: "question" })).not.toThrow()
    expect(() => SP.BubblyRoles.record(Roled, { match: "value" })).toThrow(/one per rule class/)
  })
})
