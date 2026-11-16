import type { P } from "spell/parser/parser"
import type { BubblyRulePresentation } from "./highlight.types"

/****************
 * ### `BubblyPresentation`
 * The SHAPE of each rule's lines in the bubbly look, by rule name:  what its ROLES don't say.
 * - What each part of a rule IS to a reader (a declaration's band, a pill, a name, a question ...) is its roles,
 *   beside its syntax (`SP.BubblyRuleRoles`, `SP.BubblyRoles`;  epic `language` P60).
 * - What's here:
 *   - a line's SHAPE:  a control line's bracket, a group, what a head draws as a step, what joins two questions,
 *     what holds expressions, what a step sets
 *   - the CHECKS no role says yet, each kept by name (epic `language` P60, Q69:  a red judgement call each):
 *     `namesWhatItDraws`, `blankAfterVerb`
 * - Read by `SP.BubblyLayout` (so by the app's `<spell-code>`, the docs pages and the drawn-bubbly page),
 *   and by the code editor's and VS Code's drawings (epic `language` P50, P51).
 * - Keyed by a rule's NAME, what its syntax strings call it (`{define_property_has}`), the same in every language;
 *   a rule built while parsing (a phrase, `is_a_$suit`) by its `importableAs` (`quoted_property`).
 *   Never by its class (WWOD §3 › "Names aren't identifiers").
 * - STATIC and instance-free:  pure data, and one lookup.
 ****************/
export class BubblyPresentation {
  /** Each rule's row, by rule name (or `importableAs`). */
  static readonly rules: Readonly<Record<string, BubblyRulePresentation>> = {
    ////////////////
    // ## Declarations
    ////////////////

    // a property's:  `it "is a face card" if ...`, what it asks, a step's
    quoted_type_expression: { steps: ["expression"] },
    // `it is droppable when ...`:  what it asks, a step's
    list_guard: { steps: ["expression"] },

    // a drawing's:  its verb and the part it draws bold, `to <draw> its <placeholder>` (epic `language` I99)
    draw_it: { namesWhatItDraws: true },
    // a create hook's blank:  its signature but its verb, `when creating <solitaire>`, `when creating <it>`
    create_hook: { blankAfterVerb: "signature" },

    // a group:  holds the declarations after it
    define_group: { isGroup: true },

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

    // what joins two yes-or-nos:  a question after it is asked of what follows it
    and: { isJoin: true },
    or: { isJoin: true },
    // what holds expressions, each underlined on its own:  every other operator (`is`, `+`) combines what's either side
    expression: { isCombination: true },
    arithmetic_expression: { isCombination: true },
    parenthesized_expression: { isCombination: true },
    // what a step sets:  `set <the score> to 0`, `<the deck> is a new deck`
    assignment: { sets: ["thing"] },
    words_assignment: { sets: ["thing"] }
  }

  /** `rule`'s row:  by its name, else its `importableAs`;  `undefined` for a rule with none. */
  static for(rule: P.Rule): BubblyRulePresentation | undefined {
    const { rules } = BubblyPresentation
    for (const key of [rule.name, rule.importableAs]) if (key && Object.hasOwn(rules, key)) return rules[key]
    return undefined
  }
}
