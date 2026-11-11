import type { P } from "spell/parser/parser"
import type { BubblyRulePresentation } from "./highlight.types"

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

    // properties:  `its "rank" is one of ace, 2 ... 10`, `its "state" is`, `it "is a face card" if ...`
    define_property_has: { head: "property", inputs: ["quoted_member"], choices: ["identifier_list"] },
    property_value_getter: { head: "property", inputs: ["quoted_member"], choices: ["identifier_list"] },
    quoted_type_expression: { head: "property", inputs: ["quoted_signature_words"], steps: ["expression"] },
    quoted_property_formula: { head: "property", inputs: ["text"] },
    define_menu: { head: "property", inputs: ["quoted_member"] },
    belongs_to_one: { head: "property" },

    // actions and handlers:  `to deal the cards`, `to draw its front`, `when its score changes`, `on click`
    to_do_something: {
      head: "action",
      headWhen: { group: "asTest", partOfSpeech: "plain" },
      inputs: ["method_keyword"]
    },
    draw_it: { head: "action", inputs: ["member_words"] },
    on: { head: "action" },
    drag_handler: { head: "action" },

    // the rest:  groups, settings
    define_group: { head: "plain", isGroup: true, inputs: ["text"] },
    drag_and_drop: { head: "plain" },

    ////////////////
    // ## Control lines:  their steps in a bracket (how they're finally drawn is P52's)
    ////////////////

    if: { isControl: true },
    list_iteration: { isControl: true },
    list_range_iteration: { isControl: true },
    else_if: { isControl: true },
    else: { isControl: true },
    repeat_n_times: { isControl: true },

    ////////////////
    // ## In a step
    ////////////////

    // a phrase a project declares, called whole:  `it is a diamond`, `seven is a number card`
    quoted_property: { isPhrase: true },
    method_postfix: { isPhrase: true },
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
