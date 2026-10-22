import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"

/**
 * `property` rule:  ONE word naming a property:
 * initial-lower-case, not one of the language's own words (its `blacklist`).
 * - What a LOOSE read takes, e.g. `the is-set-up of the deck` -- see `property_expression`.
 * - Declarations and resolved reads take `member_words`.
 * - `mapValue()` converts dashes to underscores, e.g. `foo-bar` compiles as `foo_bar`.
 */
export class Property extends P.Pattern {
  @proto static pattern = P.LOWER_INITIAL_WORD_WITH_DASHES

  /** Matches our `pattern`, and isn't one of the language's own words (its `blacklist`, `SP.LanguageWords`). */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return super.test(scope, tokens, start) && !SP.Language.of(scope).words.blacklist[`${tokens[start]!.value}`]
  }
  @proto static highlightAs: P.HighlightKind = "property"

  /**
   * Convert dashes to underscores.
   * - NOTE: `Rules.Pattern.mapValue` is generic (`<T = string>`) for subclasses that map to non-string
   *   values; this rule always maps to a string, hence the cast.
   */
  mapValue<T = string>(value: string): T {
    return `${value}`.replace(/-/g, "_") as T
  }
  getAST(match: P.MatchFor<this>) {
    return new P.ASTPropertyLiteral(match)
  }
}
