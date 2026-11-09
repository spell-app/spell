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
        "account_included:  Priority.declaration",
        "action_detail:  Priority.declaration",
        "add_new_thing:  Priority.overridable",
        "and:  Precedence.and",
        "as_a_date:  Precedence.comparison",
        "as_a_type:  Precedence.comparison",
        "as_lowercase:  Precedence.comparison",
        "as_title_case:  Precedence.comparison",
        "as_uppercase:  Precedence.comparison",
        "asked_by:  Priority.declaration",
        "at_the_same_time:  Priority.preferred",
        "backwards_if:  Precedence.ternary",
        "belongs_to_one:  Priority.declaration",
        "can_belong_to_many:  Priority.declaration",
        "can_give_up:  Precedence.comparison",
        "can_take:  Precedence.comparison",
        "cancel_action:  Priority.preferred",
        "checked_at:  Priority.declaration",
        "checked_every:  Priority.declaration",
        "class_member:  Priority.userDeclared",
        "collection_at:  Priority.declaration",
        "collection_searched_with:  Priority.declaration",
        "confirmed_join:  Priority.declaration",
        "create_hook:  Priority.specific",
        "create_list_type:  Priority.declaration",
        "create_one_of_a_kind:  Priority.declaration",
        "create_place:  Priority.aboveDeclaration",
        "create_site:  Priority.aboveDeclaration",
        "create_type:  Priority.declaration",
        "create_viewable_list_type:  Priority.declaration",
        "css_block:  Priority.declaration",
        "current_person:  Priority.overridable",
        "declare_event:  Priority.declaration",
        "define_dimension:  Priority.declaration",
        "define_group:  Priority.declaration",
        "define_menu:  Priority.declaration",
        "define_property_has:  Priority.declaration",
        "dimension_base:  Priority.declaration",
        "dimension_unit:  Priority.declaration",
        "discard_draft:  Priority.preferred",
        "divided_by:  Precedence.product",
        "does_not_include:  Precedence.comparison",
        "drag_and_drop:  Priority.declaration",
        "drag_handler:  Priority.declaration",
        "draw_it:  Priority.declaration",
        "draw_items:  Priority.specific",
        "draw_slot:  Priority.specific",
        "draw_slot_of:  Priority.specific",
        "draw_thing:  Priority.preferred",
        "drawn_markup:  Priority.specific",
        "else_if:  Priority.preferred",
        "ends_with:  Precedence.comparison",
        "example_block:  Priority.preferred",
        "exists:  Precedence.comparison",
        "field_called:  Priority.declaration",
        "filters_by:  Priority.declaration",
        "gives_fields_named_in:  Priority.declaration",
        "gt_lt:  Precedence.comparison",
        "has_slots:  Priority.declaration",
        "helpful_word:  priority -2",
        "id_column:  Priority.declaration",
        "if_that_fails:  Priority.declaration",
        "if_that_fails_say:  Priority.declaration",
        "if_there_are_none:  Priority.declaration",
        "implied_it:  Priority.preferred",
        "includes:  Precedence.comparison",
        "is_a:  Precedence.comparison",
        "is_defined:  Priority.preferred, Precedence.comparison",
        "is_empty:  Precedence.comparison",
        "is_equal:  Precedence.equality",
        "is_exactly:  Precedence.equality",
        "is_gt_lt:  Precedence.comparison",
        "is_in:  Precedence.comparison",
        "is_read_only:  Priority.declaration",
        "is_same_type_as:  Precedence.comparison",
        "items_reordered:  Priority.declaration",
        "its_known_property:  Priority.preferred",
        "joined:  Precedence.join",
        "kept_on_device:  Priority.declaration",
        "key_goes_in_address:  Priority.declaration",
        "key_goes_in_header:  Priority.declaration",
        "key_if_set:  Priority.declaration",
        "key_is_secret:  Priority.declaration",
        "key_written:  Priority.declaration",
        "kind_values:  Priority.userDeclared",
        "list_count:  Priority.mostSpecific",
        "list_filter:  Priority.specific",
        "list_guard:  Priority.declaration",
        "list_iteration_named_for_list:  Priority.declaration",
        "list_length:  Priority.mostSpecific",
        "list_membership_test:  Precedence.comparison",
        "list_move:  Priority.overridable",
        "list_position:  Priority.mostSpecific",
        "list_sorted_by:  Precedence.ternary",
        "lists_give_only:  Priority.declaration",
        "lists_under:  Priority.declaration",
        "load_sound:  Priority.overridable",
        "load_things:  Priority.overridable",
        "markdown_block:  Priority.preferred",
        "markdown_description:  Priority.declaration",
        "max:  Priority.specific",
        "measure_in:  Precedence.measure",
        "menu_bar:  Priority.declaration",
        "min:  Priority.specific",
        "minus:  Precedence.sum",
        "most_rows_each:  Priority.declaration",
        "next_page_by_last_id:  Priority.declaration",
        "next_page_by_number:  Priority.declaration",
        "next_page_by_offset:  Priority.declaration",
        "next_page_in:  Priority.declaration",
        "next_page_in_link:  Priority.declaration",
        "now:  Priority.overridable",
        "number_of_things_where:  Priority.mostSpecific",
        "on:  Priority.preferred",
        "operation_at:  Priority.declaration",
        "or:  Precedence.or",
        "ordinal_of_expression:  Priority.mostSpecific",
        "ordinal_where_expression:  Priority.specific",
        "outline_specifier_text_kind:  Priority.specific",
        "page_size_is:  Priority.declaration",
        "picture_at:  Priority.declaration",
        "play_sound:  Priority.overridable",
        "plus:  Precedence.sum",
        "possessive_ordinal:  Priority.specific",
        "possessive_property:  Priority.mostSpecific",
        "projected_fields:  Priority.declaration",
        "projected_into:  Priority.declaration",
        "projected_only_where:  Priority.declaration",
        "projection_of:  Priority.aboveDeclaration",
        "property_body_must:  Priority.declaration",
        "property_expression:  Priority.preferred",
        "property_must:  Priority.declaration",
        "published_as:  Priority.declaration",
        "quoted_property_formula:  Priority.declaration",
        "quoted_type_expression:  Priority.belowDeclaration",
        "random_kind_value:  Priority.userDeclared",
        "reload_things:  Priority.overridable",
        "reopen_type:  Priority.declaration",
        "requests_a_second:  Priority.declaration",
        "round_number:  Priority.preferred",
        "rows_allowed_each:  Priority.declaration",
        "rows_in:  Priority.declaration",
        "rows_only_from:  Priority.declaration",
        "saved_in_file:  Priority.declaration",
        "saved_in_place:  Priority.aboveDeclaration",
        "saved_in_the_cloud:  Priority.aboveDeclaration",
        "saved_inline:  Priority.declaration",
        "searched_at:  Priority.declaration",
        "searches_everything:  Priority.declaration",
        "searches_with:  Priority.declaration",
        "show_it_all_in:  Priority.declaration",
        "show_site_part:  Priority.preferred",
        "show_them_all:  Priority.declaration",
        "show_them_at_a_time:  Priority.declaration",
        "show_them_in:  Priority.declaration",
        "show_them_paged:  Priority.declaration",
        "sign_in_menu:  Priority.overridable",
        "sign_ups_from:  Priority.declaration",
        "site_address_of:  Priority.mostSpecific",
        "site_overlay:  Priority.aboveDeclaration",
        "site_page:  Priority.aboveDeclaration",
        "sort_key_field:  Priority.preferred",
        "sort_key_order:  Precedence.ternary",
        "sorts_by:  Priority.declaration",
        "starts_with:  Precedence.comparison",
        "stop_sound:  Priority.overridable",
        "stored_on_this_device:  Priority.aboveDeclaration",
        "the_date:  Priority.overridable",
        "their_field:  Priority.specific",
        "they_are:  Precedence.equality",
        "times:  Precedence.product",
        "total_of:  Priority.specific",
        "try_again:  Priority.overridable",
        "type_specifier_text_kind:  Priority.specific",
        "ui_defaults:  Priority.declaration",
        "unicode_literal:  Priority.specific",
        "unicode_offset:  Priority.mostSpecific",
        "upgrade_method:  Priority.declaration",
        "value_if:  Priority.overridable",
        "value_kind:  Priority.declaration",
        "value_otherwise:  Priority.overridable",
        "version_step:  Priority.declaration",
        "versions_in:  Priority.declaration",
        "when_someone_else_changes:  Priority.specific",
        "when_thing_changes:  Priority.specific",
        "while_waiting:  Priority.declaration",
        "with_commas:  Precedence.comparison",
        "without_waiting:  Priority.specific",
        "writes_like:  Priority.declaration",
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
