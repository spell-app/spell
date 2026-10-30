import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { longestNameIn } from "spell/parser/spell/rules/rules.types"
import { SpellType } from "spell/parser/spell/rules/types"

/**
 * `changed_property` rule:  the property a change event names, `score` in `- when its score changes:`
 * (epic `debut` P30).
 * - Only one its template declares, or a type it comes from does:  `direction` for a card, a two sided view's.
 *   - The longest such name at the start of the words, `high score` before `high`.
 *   - Anything else isn't one:  the line reads as the event it always did.
 * - Only in a template's outline:  the thing whose property changes is the template's thing (`it`).
 * - `value` is the property's name as spell keeps it, `high_score`;  `raw`, its words as written.
 * - What reads it:  `On` names the event `high-score-change`, its handler `onHighScoreChange()`,
 *   which the core sends each time the property changes (`noteSetting()`).
 */
export class ChangedProperty extends P.Pattern {
  @proto static pattern = P.ALPHANUMERIC_WORD_WITH_DASHES
  @proto static highlightAs: P.HighlightKind = "property"

  /** Quick test:  a word, in a template's outline. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return start < tokens.length && tokens[start] instanceof P.WordToken && !!P.SubjectScope.of(scope)?.subjectType
  }

  /** The longest name of a property its template (or a type it comes from) declares, at the start of `tokens`. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const subject = P.SubjectScope.of(scope)?.subjectType
    if (!subject) return undefined
    const names = new Map<string, string>()
    for (const type of subject.chain()) {
      for (const variable of type.variables.get()) {
        const words = `${variable.name}`.split("_").join(" ").toLowerCase()
        if (!names.has(words)) names.set(words, variable.name)
      }
    }
    const count = longestNameIn(SpellType.lowerWords(tokens, tokens.length), [...names.keys()])
    if (!count) return undefined
    const words = tokens.slice(0, count)
    const name = names.get(words.map((token) => `${token.value}`.toLowerCase()).join(" "))!
    return new P.Match({
      rule: this,
      matched: words,
      raw: words.map((token) => token.value).join(" "),
      value: name,
      tokens: words,
      scope
    })
  }
}
