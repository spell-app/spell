import { describe, expect, test } from "vite-plus/test"
import { describeParseErrors, describeWarnings, unitTestModuleRules } from "spell/parser/spell/test"
import { P } from "spell/parser/parser"
import { SP, spellParser } from "spell/parser/spell"
import { Precedence } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { core } from "spell/parser/core"

describe("testing spell module expressions", () => {
  unitTestModuleRules(spellParser, "expressions", core.resetRuntime)

  // describe("integration tests", () => {})
})

/**
 * Every built-in rule's non-default `priority`, and every operator's `precedence`:
 *   so neither table, `Priority` nor `Precedence`, drifts unseen.
 * - A change here is a grammar change:  say why in the rule's docstring.
 */
describe("priority and precedence", () => {
  test("every rule which sets one", () => {
    const levels = new Map(Object.entries(Precedence).map(([name, level]) => [level, `Precedence.${name}`]))
    const priorities = new Map(Object.entries(Priority).map(([name, level]) => [level, `Priority.${name}`]))
    const seen = new Map<string, string>()
    for (const rule of Object.values(spellParser.rules).flatMap(ruleAndAlternatives)) {
      const { precedence } = rule as { precedence?: unknown }
      const bits = [
        rule.priority ? (priorities.get(rule.priority) ?? `priority ${rule.priority}`) : "",
        typeof precedence === "number" ? (levels.get(precedence) ?? `precedence ${precedence}`) : ""
      ].filter(Boolean)
      if (bits.length && rule.name) seen.set(rule.name, `${rule.name}:  ${bits.join(", ")}`)
    }
    expect([...seen.keys()].sort().map((name) => seen.get(name))).toMatchInlineSnapshot(`
      [
        "action_detail:  Priority.declaration",
        "and:  Precedence.and",
        "as_a_type:  Precedence.comparison",
        "as_lowercase:  Precedence.comparison",
        "as_uppercase:  Precedence.comparison",
        "at_the_same_time:  Priority.preferred",
        "backwards_if:  Precedence.ternary",
        "belongs_to_one:  Priority.declaration",
        "can_belong_to_many:  Priority.declaration",
        "can_give_up:  Precedence.comparison",
        "can_take:  Precedence.comparison",
        "class_member:  Priority.userDeclared",
        "create_hook:  Priority.specific",
        "create_list_type:  Priority.declaration",
        "create_one_of_a_kind:  Priority.declaration",
        "create_type:  Priority.declaration",
        "create_viewable_list_type:  Priority.declaration",
        "css_block:  Priority.declaration",
        "declare_event:  Priority.declaration",
        "define_group:  Priority.declaration",
        "define_menu:  Priority.declaration",
        "define_property_has:  Priority.declaration",
        "divided_by:  Precedence.product",
        "does_not_include:  Precedence.comparison",
        "drag_and_drop:  Priority.declaration",
        "drag_handler:  Priority.declaration",
        "draw_it:  Priority.declaration",
        "draw_items:  Priority.specific",
        "draw_slot:  Priority.specific",
        "draw_thing:  Priority.preferred",
        "drawn_markup:  Priority.specific",
        "else_if:  Priority.preferred",
        "ends_with:  Precedence.comparison",
        "example_block:  Priority.preferred",
        "exists:  Precedence.comparison",
        "gt_lt:  Precedence.comparison",
        "has_slots:  Priority.declaration",
        "implied_it:  Priority.preferred",
        "includes:  Precedence.comparison",
        "is_a:  Precedence.comparison",
        "is_defined:  Priority.preferred, Precedence.comparison",
        "is_empty:  Precedence.comparison",
        "is_equal:  Precedence.equality",
        "is_exactly:  Precedence.equality",
        "is_gt_lt:  Precedence.comparison",
        "is_in:  Precedence.comparison",
        "is_same_type_as:  Precedence.comparison",
        "items_reordered:  Priority.declaration",
        "its_known_property:  Priority.preferred",
        "kind_values:  Priority.userDeclared",
        "list_count:  Priority.mostSpecific",
        "list_filter:  Priority.specific",
        "list_guard:  Priority.declaration",
        "list_length:  Priority.mostSpecific",
        "list_membership_test:  Precedence.comparison",
        "list_move:  Priority.overridable",
        "list_position:  Priority.mostSpecific",
        "markdown_block:  Priority.preferred",
        "markdown_description:  Priority.declaration",
        "max:  Priority.specific",
        "menu_bar:  Priority.declaration",
        "min:  Priority.specific",
        "minus:  Precedence.sum",
        "on:  Priority.preferred",
        "or:  Precedence.or",
        "ordinal_where_expression:  Priority.specific",
        "outline_specifier_text_kind:  Priority.specific",
        "plus:  Precedence.sum",
        "property_body_must:  Priority.declaration",
        "property_expression:  Priority.preferred",
        "property_must:  Priority.declaration",
        "quoted_property_formula:  Priority.declaration",
        "quoted_type_expression:  Priority.belowDeclaration",
        "random_kind_value:  Priority.userDeclared",
        "reopen_type:  Priority.declaration",
        "round_number:  Priority.preferred",
        "saved_in_file:  Priority.declaration",
        "saved_inline:  Priority.declaration",
        "starts_with:  Precedence.comparison",
        "times:  Precedence.product",
        "type_specifier_text_kind:  Priority.specific",
        "unicode_literal:  Priority.specific",
        "unicode_offset:  Priority.mostSpecific",
        "upgrade_method:  Priority.declaration",
        "value_if:  Priority.overridable",
        "value_kind:  Priority.declaration",
        "value_otherwise:  Priority.overridable",
        "version_step:  Priority.declaration",
      ]
    `)
  })

  /** `rule`, and each rule of a same-named `Group` it stands for. */
  function ruleAndAlternatives(rule: P.Rule): P.Rule[] {
    return rule instanceof P.Group ? [rule, ...rule.rules] : [rule]
  }
})

/**
 * `Negatable` words:  which of a word's forms are negated is said by its syntax's `negated` group.
 */
describe("Negatable", () => {
  /** `true` / `false` if `input` matches negatable rule `word` negated / not, `undefined` if it doesn't match. */
  function negatedIn(parser: SP.SpellParser, word: string, input: string) {
    const match = parser.getScope().parse(input, word)
    return match ? SP.Negatable.isNegated(match) : undefined
  }

  test.each([
    ["is", "is", false],
    ["is", "is not", true],
    ["is", "isn't", true],
    ["is", "isnt", true],
    ["can", "can", false],
    ["can", "cannot", true],
    ["can", "can't", true],
    ["will", "will", false],
    ["will", "won't", true],
    ["has", "has", false],
    ["has", "doesn't have", true]
  ])("`%s`:  '%s' is negated:  %s", (word, input, negated) => {
    expect(negatedIn(spellParser, word, input)).toBe(negated)
  })

  test("several positive forms, in any order -- e.g. a translation's own word", () => {
    const parser = spellParser.clone({ module: "negatable-test" })
    parser.addRule(SP.Negatable.specialize({ ruleName: "tiene" }), { syntax: "((negated:no tiene)|tiene|tienen)" })
    expect(negatedIn(parser, "tiene", "tiene")).toBe(false)
    expect(negatedIn(parser, "tiene", "tienen")).toBe(false)
    expect(negatedIn(parser, "tiene", "no tiene")).toBe(true)
  })
})

/**
 * Article agreement, English's half (epic `spanish` P8):  `a` before a consonant sound, `an` before a vowel sound.
 * - A warning under the article, never an error:  the line still parses.
 * - Spanish's half, gender and number:  `tests/spell/rules/es/expressions/expressions.test.ts`.
 */
describe("article agreement", () => {
  /** The warnings `lines` parse with, in a fresh scope called `scopeName`. */
  const warningsIn = (lines: string[], scopeName: string) =>
    describeWarnings(spellParser.getScope(scopeName).parse(lines.join("\n"), "block"))

  test('`a apple` warns "an apple"?, under the article, and still parses', () => {
    const block = spellParser.getScope("agreement-a-apple").parse("a apple is a thing", "block")
    expect(describeParseErrors(block)).toEqual([])
    expect(describeWarnings(block)).toEqual(['1:0 Did you mean "an apple"?'])
  })

  test('`an card` warns "a card"?, wherever it is', () => {
    const lines = ["a card is a thing", "the x is a new card", "if the x is an card then print 1"]
    expect(warningsIn(lines, "agreement-an-card")).toEqual(['3:12 Did you mean "a card"?'])
  })

  test("no type needed:  `a apple` warns though nothing is called `apple`", () => {
    const lines = ["a card is a thing", "to peel a apple:", "\tprint 1"]
    expect(warningsIn(lines, "agreement-no-type")).toEqual(['2:8 Did you mean "an apple"?'])
  })

  test("by the noun's first sound:  `an hour`, `a unicorn`, `a user`, `a one-of-a-kind thing` agree", () => {
    const lines = [
      "an hour is a thing",
      "a unicorn is a thing",
      "a user is a thing",
      "an apple is a thing",
      "a card is a thing",
      "an apple has a unicorn as a unicorn",
      "an apple has an hour as an hour"
    ]
    expect(warningsIn(lines, "agreement-sounds")).toEqual([])
  })

  test("never a variable named `a`, nor an article before a structural word", () => {
    const lines = ["set a to 1", "if a is 1 then print a", "set an to 2", "print an + a"]
    expect(warningsIn(lines, "agreement-variable")).toEqual([])
  })
})
