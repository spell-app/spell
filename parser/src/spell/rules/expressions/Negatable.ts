import { proto } from "spell/util"
import { P } from "spell/parser/parser"

// Import directly to avoid circular import
import { Wording } from "./Wording"

/**
 * A word and its negated forms, e.g. `is_or_is_not`:  `(is|(negated:is not|isn't|isnt))`.
 * - The commonest WORD RULE (`Wording`):  its one meaning is `negated`.
 *   So a rule reads "not" from the match (`isNegated()`), never from the words, in any language.
 * - Negated forms are the ones in a `negated` group.
 *   So order doesn't matter, and there may be several positive forms, e.g. `(has|have|(negated:does not have))`.
 * - Registered once per word, named for both its forms, e.g. `Negatable.specialize({ ruleName: "is_or_is_not" })`;
 *   a translation registers its own under the same name, e.g. `(es|está|(negated:no es|no está))`.
 * - The English ones:  `is_or_is_not`, `is_or_is_not_a`, `can_or_cannot`, `will_or_will_not`, `has_or_has_not`,
 *   and the verbs' own, e.g. `starts_with`, in `expressions.en.ts` and their modules' `.en.ts`.
 * - `quoted_type_expression` makes a signature's negatable word `{operator:<rule>}` -- see `processSignature()`.
 */
export class Negatable extends Wording {
  @proto static meanings = ["negated"]

  /**
   * `true` if `match` came from a `Negatable` and matched a negated form, e.g. `isn't`.
   * - `match` may be missing, e.g. the `operator` of a syntax which has none:  never negated.
   */
  static isNegated(match: P.Match | undefined): boolean {
    return Wording.meaningOf(match) === "negated"
  }

  /**
   * The name of the negatable word rule in `scope` that reads `words`, un-negated, e.g. `is_or_is_not` for `is` --
   * `undefined` if none does.
   * - For code that builds a syntax from a person's own words, e.g. a quoted phrase's `"is a (suit)"`.
   * - Tried in `names` order, so a longer reading goes first, e.g. `is_or_is_not_a` for `is a`.
   */
  static ruleReading(scope: P.Scope, words: string, names = NEGATABLE_WORDS): string | undefined {
    return names.find((name) => scope.parser?.rules[name] instanceof Negatable && Wording.reads(scope, name, words))
  }
}

/** The negatable word rules every language registers, longest reading first -- see `Negatable.ruleReading()`. */
export const NEGATABLE_WORDS = ["is_or_is_not_a", "is_or_is_not", "can_or_cannot", "will_or_will_not", "has_or_has_not"]
