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
 * - A rule with no row draws as a plain step:  its references bold, its values plain.
 * - STATIC and instance-free:  pure data, and one lookup.
 ****************/
export class BubblyPresentation {
  /** Each rule's row, by rule name (or `importableAs`). */
  static readonly rules: Readonly<Record<string, BubblyRulePresentation>> = {
    ////////////////
    // ## Declarations:  a head on a band
    ////////////////

    // things:  `a "card" is a draggable two sided view`, `solitaire is an app`, `a card` re-opened
    create_type: { head: "thing", inputs: ["quoted_type"] },
    create_list_type: { head: "thing", inputs: ["quoted_type"] },
    create_viewable_list_type: { head: "thing", inputs: ["quoted_type"] },
    create_one_of_a_kind: { head: "thing" },
    reopen_type: { head: "thing" },
    // places and sites:  `family cookbook is saved in the cloud`, `galaxy guide is a site`
    create_place: { head: "thing" },
    saved_in_the_cloud: { head: "thing" },
    stored_on_this_device: { head: "thing" },
    projection_of: { head: "thing" },
    create_site: { head: "thing" },

    // properties:  `its "rank" is one of ace, 2 ... 10`, `its "state" is`, `it "is a face card" if ...`
    define_property_has: { head: "property", inputs: ["quoted_member"], choices: ["identifier_list"] },
    property_value_getter: { head: "property", inputs: ["quoted_member"], choices: ["identifier_list"] },
    quoted_type_expression: { head: "property", inputs: ["quoted_signature_words"], steps: ["expression"] },
    quoted_property_formula: { head: "property", inputs: ["text"] },
    define_menu: { head: "property", inputs: ["quoted_member"] },
    belongs_to_one: { head: "property" },
    // `it is droppable when ...`, `it has a films page at "/films"`
    list_guard: { head: "property" },
    site_page: { head: "property" },

    // actions and handlers:  `to deal the cards`, `to draw its front`, `when its score changes`, `on click`;
    // an action's head:  everything after `to` is what a person typed, its parameters aside (Owen, 2026-11-11)
    to_do_something: {
      head: "action",
      inputs: ["method_keyword"],
      typedAfterLead: true,
      params: METHOD_PARAMS
    },
    draw_it: { head: "action", inputs: ["member_words", "draw_method"], typedAfterLead: true },
    on: { head: "action" },
    drag_handler: { head: "action" },
    // what runs as a thing is made:  `when creating` Spell's words, its type a reference, `when creating a deck`
    create_hook: { head: "action", plain: ["method_keyword"] },

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
    // ## In a step
    ////////////////

    // a phrase a project declares, called whole:  `it is a diamond`, `seven is a number card`
    quoted_property: { isPhrase: true },
    method_postfix: { isPhrase: true },
    // a name of several words read as one:  `card ranks`, the values a type's list can take
    kind_values: { isPhrase: true },
    // a number and its unit:  `pause for 300 msec`
    pause: { isQuantity: true },
    // yes and no
    boolean: { isValue: true },
    // a reference with the words before it:  `the color of seven`, `a new card`, `the stock`
    property_expression: { takesArticle: true },
    new_thing: { takesArticle: true },
    the_own_property: { takesArticle: true },
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
