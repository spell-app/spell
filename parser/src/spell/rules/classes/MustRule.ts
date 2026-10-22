import type { PropRule } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Wording } from "spell-lang/spell/rules/expressions"
// Import directly to avoid circular import
import { RuleSuggestion } from "./RuleSuggestion"

/**
 * `must_rule` rule:  what a property's value must be, the words after `must`, e.g. `not be empty`.
 * - A PROPERTY RULE.  Its forms:
 *   - `not be empty`
 *   - `match "^\d+$"`
 *   - `be at least 3 letters long`, `be at most 40 letters long`
 *   - `be between 1 and 5`, `be at least 18`, `be at most 120`
 *   - `be an email`, `be a url`
 * - Then, if it likes, what to say when it's broken (`rule_suggestion`):
 *   `with suggestion "..."` or `saying "..."`.
 * - Where it's said:
 *   - on a line of its own (`property_must`):  `- its title must not be empty`
 *   - in the property's own statement (`define_property_has`):  `- it has a title as text, which must not be empty`
 *   - or indented under that statement:  `- it must not be empty`
 * - Its words that pick the rule are WORD RULES, so it reads what they mean, whatever the language:
 *   `at_least_or_at_most`, and `url_or_email` (as `type_specifier_text_kind`'s).
 * - Compiles to the rule as data (`PropRule`), the shape Spell UI's form checks read:
 *   `{ type: "minLength", value: "3" }`.
 *   - A pattern is written as typed:  `"^\d+$"` means digits, not `d`s.
 * - Where it's checked:
 *   - a form drawn for the type checks it as you type
 *   - a program setting a value that breaks it gets a warning
 * - Epic `property-editor` P9.
 */
export class MustRule extends P.Sequence<
  "empty?|suggestion?|pattern?|bound?|count?|min?|max?|limit?|kind?",
  { rule?: PropRule }
> {
  /** The rule it says, as data, e.g. `{ type: "minLength", value: "3" }`. */
  static ruleOf(match: P.MatchFor<MustRule>): PropRule {
    return (match.data.rule ??= MustRule.readRule(match))
  }

  getAST(match: P.MatchFor<this>): P.ASTObjectLiteral {
    return MustRule.astOf(match, MustRule.ruleOf(match))
  }

  /** `rule` as an object literal:  `{ type: "range", value: "1..5" }`. */
  static astOf(match: P.AnyMatch, rule: PropRule): P.ASTObjectLiteral {
    const literal = new P.ASTObjectLiteral(match, { wrap: false })
    for (const key of ["type", "value", "prompt"] as const) {
      const value = rule[key]
      if (value !== undefined) literal.addProp(key, new P.ASTStringLiteral(match, { value, quote: '"' }))
    }
    return literal
  }

  /** See `ruleOf()`:  worked out from which words matched, and what its word rules' words mean. */
  private static readRule(match: P.MatchFor<MustRule>): PropRule {
    const { empty, pattern, bound, count, min, max, limit, kind, suggestion } = match.groups
    const atLeast = Wording.meaningOf(bound) === "at_least"
    const rule: PropRule = empty
      ? { type: "empty" }
      : pattern
        ? { type: "regExp", value: `/${P.matchAST<P.ASTStringLiteral>(pattern).value}/` }
        : count
          ? { type: atLeast ? "minLength" : "maxLength", value: `${count.value}` }
          : min && max
            ? { type: "range", value: `${min.value}..${max.value}` }
            : limit
              ? { type: atLeast ? "minValue" : "maxValue", value: `${limit.value}` }
              : { type: Wording.meaningOf(kind) === "url" ? "url" : "email" }
    if (suggestion?.is(RuleSuggestion)) rule.prompt = RuleSuggestion.promptOf(suggestion)
    return rule
  }
}
