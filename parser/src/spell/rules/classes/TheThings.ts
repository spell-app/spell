import { P } from "spell-parser/parser"
import { EveryThing } from "./EveryThing"

/**
 * `the_things` rule:  `the foundations` -- every thing of a type, by its plural (epic page `outline-spell`, P23).
 * - e.g. `for each pile in the tableaus`, `the first pile in the foundations where ...`
 * - The same as `every foundation` (`every_thing`):  `core.everyThing(Foundation)`.
 * - Only when nothing else goes by that word here.  These keep their meaning:
 *   - a variable or constant called `foundations`
 *   - a property or method of the thing a method is about
 */
export class TheThings extends EveryThing {
  /**
   * Quick test:  `the`, then a known type's plural -- `the X` starts most lines' expressions.
   * - `the` is checked by our syntax's own quick test:  the language's word, whatever it is.
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const word = tokens[start + 1]
    if (!word || super.test(scope, tokens, start) === false) return false
    const words = `${word.value}`
    return words === P.pluralize(words) && !!scope.getType(words)
  }

  /** A known type's plural, which nothing in `scope` is called -- see the class docstring. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type } = match.groups
    const words = `${type.raw}`.trim()
    if (!scope.getType(`${type.value}`)) return undefined
    if (scope.variables?.get(words) || scope.constants?.get(words)) return undefined
    return TheThings.memberOfThis(scope, words) ? undefined : match
  }

  /** Is `words` a property or method of what `this` is, in the method `scope` is in? */
  static memberOfThis(scope: P.Scope, words: string): boolean {
    for (let current: P.Scope | undefined = scope; current; current = current.parentScope) {
      if (!(current instanceof P.MethodScope) || !current.thisVar) continue
      return !!scope.getType(current.itDatatype)?.getMember(words)
    }
    return false
  }
}
