import { P } from "spell/parser/parser"

/**
 * Walks over a rule's syntax:  what every rule-reading tool asks of a rule, answered once.
 * - Every rule inside one, at any depth:  `rule.childRules`, walked.
 * - What a rule can START with:  `leadingRules()`, below.
 * - The parser's leading words, the language server's first words and kinds, and its keyword list all read these,
 *   each picking out the rules it wants (a `Keyword`'s words, a rule's `highlightAs` ...).
 */

/** How `leadingRules()` follows a `{subrule}`, which names its rule rather than holding it. */
export type LeadingRulesOptions = {
  /** Looks up a `{subrule}`'s rule by name;  without one, a `{subrule}` is as far as it goes. */
  parser?: P.Parser
  /**
   * Follow a `{subrule}` into a category too, e.g. `{expression}`, which could start with almost anything.
   * - Off by default:  a single named rule only.
   * - On for what's being typed, filtered afterwards, e.g. the language server's completion.
   */
  followGroups?: boolean
}

/**
 * Every rule `rule` can start with, itself first, then depth first:  through sequences, choices, repeats and subrules.
 * - A sequence:  its rules up to and including its first one that isn't optional.
 * - A choice:  every alternative;  a repeat:  the rule it repeats.
 * - A `{subrule}`:  its rule, by `options.parser` -- see `LeadingRulesOptions`.
 * - Each rule once, in the order found:  the first word found is the one a person would write first.
 * - e.g. `if {condition:expression} (then|:)?` => the sequence, then `if`.
 */
export function leadingRules(rule: P.Rule, options: LeadingRulesOptions = {}): P.Rule[] {
  const { parser, followGroups = false } = options
  const found = new Set<P.Rule>()
  const visit = (each: P.Rule) => {
    if (found.has(each)) return
    found.add(each)
    if (each instanceof P.Sequence) {
      for (const child of each.rules) {
        visit(child)
        if (!child.optional) break
      }
    } else if (each instanceof P.Choice) {
      each.rules.forEach(visit)
    } else if (each instanceof P.Repeat) {
      visit(each.rule)
    } else if (each instanceof P.Subrule && parser) {
      const target = parser.rules[each.rule]
      if (target && (followGroups || !(target instanceof P.Group))) visit(target)
    }
  }
  visit(rule)
  return [...found]
}
