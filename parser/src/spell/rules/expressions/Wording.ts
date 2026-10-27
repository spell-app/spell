import { proto } from "spell/util"
import { P } from "spell-parser/parser"

/**
 * A WORD RULE:  the words a language says one thing with, and what each form MEANS (epic `spanish` P3).
 * - e.g. where an item goes in a list, `((start:start|front|top)|(end:end|back|bottom))`:
 *   `front` means `start`, `back` means `end`.
 * - Each language registers its own wording under the same rule name, so the rule that uses it never reads a word:
 *   it asks `Wording.meaningOf(match)`, e.g. `"start"`, whatever the language said.
 *   - English:  `(start:start|front|top)`;  Spanish:  `(start:principio|frente|arriba)`.
 * - The meanings are the names of the groups the forms sit in;  the rule lists them in `meanings`.
 *   A form outside every named group means nothing special:  `meaningOf()` is `undefined`.
 * - Registered once per wording, `Wording.specialize({ ruleName: "list_end", meanings: ["start", "end"] })`.
 * - `Negatable` is the commonest kind:  one meaning, `negated`.
 */
export class Wording extends P.Choice {
  /** The meanings this wording's forms may have:  the names of the groups in its syntax, e.g. `["start", "end"]`. */
  @proto static meanings: string[] = []
  declare meanings: string[]
  /** What `specialize()` takes:  a `Choice`'s props, plus `meanings`. */
  declare readonly Props: WordingProps

  /**
   * SIDE EFFECT:  marks the winning match with its meaning, `data.meaning`.
   * - `Choice` hands back the winning alternative's own match.  Its `name` says which group:
   *   - a one-form group compiles to a rule of its name
   *   - a several-form one stamps its name on its winner's match
   * - Read it NOW:  a `{operator:...}` around us renames the match `operator` as we return.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (match) {
      const { name } = match
      ;(match.data as WordingMatchData).meaning = name && this.meanings.includes(name) ? name : undefined
    }
    return match
  }

  /**
   * What `match` means, e.g. `"start"` for `front`:  the named group its form sat in.
   * - `undefined` for a form in no named group, or a `match` that isn't a wording's, or none at all.
   */
  static meaningOf(match: P.Match | undefined): string | undefined {
    return (match?.data as WordingMatchData | undefined)?.meaning
  }

  /**
   * Does wording `ruleName` read exactly `words`, with meaning `meaning` (none:  no special meaning)?
   * - e.g. `Wording.reads(scope, "is_or_is_not", "is")` is `true`, and so is `"es"` in Spanish.
   * - For code that meets a word OUTSIDE a parse of its rule, e.g. the first word of a quoted phrase.
   * - `false` if the scope's parser has no such rule.
   */
  static reads(scope: P.Scope, ruleName: string, words: string, meaning?: string): boolean {
    const rule = scope.parser?.rules[ruleName]
    const tokens = scope.parser?.tokenize(words)
    if (!rule || !tokens?.length) return false
    const match = rule.parse(scope, tokens)
    return !!match && match.length === tokens.length && Wording.meaningOf(match) === meaning
  }

  /**
   * How many of `tokens`, from `start`, wording `ruleName` reads -- 0 for none, e.g. 1 for `the` in `the test card`.
   * - As `reads()`, for a person's own TOKENS, e.g. in a rule's quick `test()`:  no tokenizing, so it's cheap.
   * - Only with meaning `meaning`, if given.
   * - 0 if the scope's parser has no such rule.
   */
  static lengthAt(scope: P.Scope, ruleName: string, tokens: P.Token[], start = 0, meaning?: string): number {
    const rule = scope.parser?.rules[ruleName]
    if (!rule || start >= tokens.length || rule.test(scope, tokens, start) === false) return 0
    const match = rule.parse(scope, start ? tokens.slice(start) : tokens)
    if (!match || (meaning !== undefined && Wording.meaningOf(match) !== meaning)) return 0
    return match.length
  }
}

/** What a `Wording` is built and `specialize()`d with:  a `Choice`'s props, plus its `meanings`. */
export type WordingProps = P.ChoiceProps & {
  /** The names of the groups in its syntax, e.g. `["start", "end"]`. */
  meanings?: string[]
}

/** What `Wording` stashes on the winning alternative's match. */
export type WordingMatchData = {
  /** The named group the form sat in, e.g. `negated`;  `undefined` for none. */
  meaning?: string
}
