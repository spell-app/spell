import type { P } from "spell/parser/parser"
import type { BubblyRulePresentation } from "./highlight.types"

/** The rules of an action's parameters, `(a card)`, `(x as text)`, `a card`. */
const METHOD_PARAMS = [
  "bare_type_arg",
  "type_method_arg",
  "typed_method_arg",
  "var_method_arg",
  "valued_var_method_arg",
  "with_props_arg"
] as const

/****************
 * ### `BubblyPresentation`
 * How each rule presents in the bubbly look:  ONE table, by rule name, read by everything that draws it.
 * - Read by `SP.BubblyLayout` (so by the app's `<spell-code>`, the docs pages and the drawn-bubbly page),
 *   and by Monaco's and VS Code's drawings (epic `language` P50, P51).
 * - "This rule should present this way" is a one-line edit here (Owen, 2026-11-11:  "I'm going to have more notes
 *   about 'this rule should present this way'");  its starting rows are the drawn-bubbly page's choices.
 * - Keyed by a rule's NAME, what its syntax strings call it (`{define_property_has}`), the same in every language;
 *   a rule built while parsing (a phrase, `is_a_$suit`) by its `importableAs` (`quoted_property`).
 *   Never by its class (WWOD §3 › "Names aren't identifiers").
 * - A rule with no row draws as a plain step:  its names bold, its values italic;  an expression in it, a value, is
 *   underlined;  an operator in one combines what's either side of it.
 * - STATIC and instance-free:  pure data, and one lookup.
 ****************/
export class BubblyPresentation {
  /** Each rule's row, by rule name (or `importableAs`). */
  static readonly rules: Readonly<Record<string, BubblyRulePresentation>> = {
    ////////////////
    // ## Declarations:  a head on a band
    ////////////////

    // things:  `a "card" is a draggable two sided view`, `solitaire is an app`, `a card` re-opened;
    // the name a head defines a pill, quoted or bare (`solitaire`, `a card is a thing`;  epic `language` T131)
    // the kind it is bold whole, one name:  `two sided view`, `viewable list of cards` (epic `language` I111)
    create_type: { head: "thing", inputs: ["quoted_type", "type_words"], namesAbility: true, namesKind: "superType" },
    create_list_type: {
      head: "thing",
      inputs: ["quoted_type", "type_words"],
      namesAbility: true,
      namesKind: "instanceType"
    },
    create_viewable_list_type: {
      head: "thing",
      inputs: ["quoted_type", "type_words"],
      namesAbility: true,
      namesKind: "instanceType"
    },
    create_one_of_a_kind: { head: "thing", inputs: ["type_words"], namesAbility: true, namesKind: "superType" },
    reopen_type: { head: "thing" },
    // places and sites:  `family cookbook is saved in the cloud`, `galaxy guide is a site`
    create_place: { head: "thing", inputs: ["type_words"] },
    saved_in_the_cloud: { head: "thing", inputs: ["type_words"] },
    stored_on_this_device: { head: "thing", inputs: ["type_words"] },
    projection_of: { head: "thing", inputs: ["type_words"] },
    create_site: { head: "thing", inputs: ["type_words"] },

    // properties:  `its "rank" is one of ace, 2 ... 10`, `its "state" is`, `it "is a face card" if ...`
    define_property_has: { head: "property", inputs: ["quoted_member"], choices: ["identifier_list"] },
    property_value_getter: { head: "property", inputs: ["quoted_member"], choices: ["identifier_list"] },
    quoted_type_expression: { head: "property", inputs: ["quoted_signature_words"], steps: ["expression"] },
    quoted_property_formula: { head: "property", inputs: ["text"] },
    define_menu: { head: "property", inputs: ["quoted_member"] },
    belongs_to_one: { head: "property" },
    // `it is droppable when ...`, `it has a films page at "/films"`:  `droppable` a name, what it asks a step's
    list_guard: { head: "property", namesAbility: true, steps: ["expression"] },
    site_page: { head: "property" },

    // actions and handlers:  `to deal the cards`, `to draw its front`, `when its score changes`, `on click`;
    // an action's head:  everything after `to` is what a person typed, ONE pill (Owen, 2026-11-11), its blanks
    // underlined in it, their kind words bold, `a card` (epic `language` I109)
    to_do_something: {
      head: "action",
      inputs: ["method_keyword"],
      typedAfterLead: true,
      params: METHOD_PARAMS
    },
    // a drawing's:  its verb and the part it draws bold, `to <draw> its <placeholder>` (epic `language` I99)
    draw_it: { head: "action", namesWhatItDraws: true },
    on: { head: "action" },
    // a drag handler's and a create hook's, as an action's (epic `language` I109):  `when <a card is dropped>`,
    // `while <a card is dragged over it>`, `when <creating solitaire>`, its thing underlined in its pill
    drag_handler: { head: "action", typedAfterLead: true, typedToEnd: true, blankThrough: "item" },
    create_hook: { head: "action", inputs: ["method_signature"], typedAfterLead: true, blankAfterVerb: "signature" },
    // steps at an action's end, as its own head draws:  `after <putting> a card <on> a pile` (epic `language` P56);
    // its `cancel`, as any action's, is a plain step (`cancel_this_action` needs no row)
    after_hook: {
      head: "action",
      inputs: ["method_keyword"],
      typedAfterLead: true,
      // Spanish leads with two words, `después de`:  the pill starts at the action's words
      typedFrom: "signature",
      params: METHOD_PARAMS
    },

    // the rest:  groups, settings
    define_group: { head: "plain", isGroup: true, inputs: ["text"] },
    drag_and_drop: { head: "plain" },

    ////////////////
    // ## Control lines:  with steps under them, a light grey block holding them
    ////////////////

    if: { isControl: true },
    list_iteration: { isControl: true },
    list_range_iteration: { isControl: true },
    else_if: { isControl: true },
    else: { isControl: true },
    repeat_n_times: { isControl: true },
    list_iteration_named_for_list: { isControl: true },
    while_waiting: { isControl: true },
    if_that_fails: { isControl: true },
    if_there_are_none: { isControl: true },

    ////////////////
    // ## In a step:  bold names, italic values, ONE dotted line under each value and each question
    ////////////////

    // a yes-or-no asked of the thing before it, underlined with it, its own words plain:
    // a phrase a project declares (`the card is on top of its pile`, `it is face up`), a kind or a list's value
    // (`pile is a foundation`, `test card is a king`), and Spell's own (`it is empty`, `it can take the card`)
    quoted_property: { isQuestion: true },
    method_postfix: { isQuestion: true },
    method_infix: { isQuestion: true },
    is_a: { isQuestion: true },
    is_in_a_type: { isQuestion: true },
    is_listed_value: { isQuestion: true },
    is_empty: { isQuestion: true },
    is_defined: { isQuestion: true },
    exists: { isQuestion: true },
    can_take: { isQuestion: true },
    can_give_up: { isQuestion: true },
    there_is_a: { isQuestion: true },
    // a call of an action the project declares, whole:  `turn over the next card`, `put the card on end pile`,
    // its blanks' values bold inside it;  a built-in template's (`turn the card face up`) a plain step (epic `language` I108)
    method_call: { isCall: true },
    // `each <card> in <the deck>`, `the <cards> in <the stock>`:  ONE value, the words that say it and the list
    // (`add <each card in the cards> to the stock`;  epic `language` I108)
    each_in_statement: { readsEach: true },
    plural_call_statement: { readsEach: true },
    // more of the value before it:  `"foo" as lower case`, `its height in feet`
    as_lowercase: { continuesValue: true },
    as_uppercase: { continuesValue: true },
    as_title_case: { continuesValue: true },
    as_a_date: { continuesValue: true },
    as_a_type: { continuesValue: true },
    with_commas: { continuesValue: true },
    measure_in: { continuesValue: true },
    list_sorted_by: { continuesValue: true },
    // what joins two yes-or-nos:  a question after it is asked of what follows it
    and: { isJoin: true },
    or: { isJoin: true },
    // what holds expressions, each underlined on its own:  every other operator (`is`, `+`) combines what's either side
    expression: { isCombination: true },
    arithmetic_expression: { isCombination: true },
    parenthesized_expression: { isCombination: true },
    // what a step sets:  `set <the score> to 0`, `<the deck> is a new deck`
    assignment: { sets: ["thing"] },
    words_assignment: { sets: ["thing"] },
    // a number and its unit:  `pause for 300 msec`, `172 cm`
    pause: { isQuantity: true },
    measure_literal: { isQuantity: true },
    // a value written in:  italic, never underlined
    boolean: { isValue: true },
    number: { isValue: true },
    text: { isValue: true },
    constant: { isValue: true },
    known_constant: { isValue: true },
    hex_literal: { isValue: true },
    unicode_literal: { isValue: true },
    // `'s` in `pile's`:  part of the name, bold with it
    possessive_mark: { isNamePart: true },
    // `a new` in `a new foundation with suit = hearts` (`una nueva fundación`):  bold with its kind, a name (epic `language` I98)
    new_thing: { namesThrough: "type" },
    // `item` in `item column of [...]`:  Spell's word, though the highlighter marks it a variable
    position_expression: { plain: ["singular_identifier"] }
  }

  /** `rule`'s row:  by its name, else its `importableAs`;  `undefined` for a rule with none. */
  static for(rule: P.Rule): BubblyRulePresentation | undefined {
    const { rules } = BubblyPresentation
    for (const key of [rule.name, rule.importableAs]) if (key && Object.hasOwn(rules, key)) return rules[key]
    return undefined
  }
}
