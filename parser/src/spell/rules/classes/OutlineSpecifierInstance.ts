import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { TypeSpecifierInstance } from "./TypeSpecifierInstance"

/**
 * `outline_specifier_instance` rule:  `a new foundation with ...` --
 * a property's starting value, in a type's outline body (epic `outline-spell` P19).
 * - e.g. `- its clubs is a new foundation with name = clubs, symbol = "♣️"`
 * - The outline twin of `has ... as a new ...` (`type_specifier_instance`):
 *   the same starting value, made once per thing, and the property's type is the new thing's.
 */
export class OutlineSpecifierInstance extends TypeSpecifierInstance {
  @proto static alias = "outline_specifier"

  /**
   * Quick test:  `a new` first, as every outline specifier is tried on every body line.
   * - Asks `new_thing` and `new_list` themselves:  they check their own words, e.g. `a new`, whatever the language.
   *   Ours alone can't:  our syntax is nothing but those two rules.
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const rules = scope.parser?.rules
    return !!(rules?.new_thing?.test(scope, tokens, start) || rules?.new_list?.test(scope, tokens, start))
  }
}
