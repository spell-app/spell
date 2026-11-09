import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
import { ownListAST, ownListOf, type OwnList } from "spell/parser/spell/rules/places/places.shared"
import { EveryThing } from "./EveryThing"

/** How far in a type's plural can be:  Spanish's `todas las recetas`. */
const WORDS_TO_THE_PLURAL = 3

/**
 * `the_things` rule:  `the foundations` -- every thing of a type, by its plural (epic page `outline-spell`, P23).
 * - e.g. `for each pile in the tableaus`, `the first pile in the foundations where ...`
 * - e.g. `all recipes`, `recipes`:  the plural starts a read, with or without a word in front (epic `data` P15)
 * - The same as `every foundation` (`every_thing`):  `core.everyThing(Foundation)`.
 * - Only when nothing else goes by that word here.  These keep their meaning:
 *   - a variable or constant called `foundations`
 *   - a property or method of the thing a method is about
 */
export class TheThings extends EveryThing {
  /**
   * Quick test:  a known type's plural, up to two words in -- `the X` starts most lines' expressions, and a word alone can.
   * - `the` is checked by our syntax's own quick test:  the language's word, whatever it is.
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (super.test(scope, tokens, start) === false) return false
    for (let index = start; index < start + WORDS_TO_THE_PLURAL && tokens[index]; index++) {
      const words = `${tokens[index]!.value}`
      if (tokens[index] instanceof P.WordToken && scope.getType(words) && words === P.pluralize(words)) return true
    }
    return false
  }

  /**
   * A known type's plural, which nothing in `scope` is called -- see the class docstring.
   * - Written without `the`, it's read here even when something is:  no other rule reads a member from a word alone.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type } = match.groups
    const words = `${type.raw}`.trim()
    if (!scope.getType(`${type.value}`)) return undefined
    if (scope.constants?.get(words)) return undefined
    const first = `${tokens[0]?.value}`
    const isBare = first === words
    // what `property_expression` asks, as `caja de recetas` is a name, not a `caja` of the recipes
    ;(match.data as { isBare?: boolean }).isBare = isBare
    const own = ownListOf(scope, words)
    if (!own) return EveryThing.refusedIfFoundByName(match, type)
    if (own.isAction || (own.variable && isBare) || Wording.reads(scope, "definite_article", first)) return undefined
    ;(match.data as { own?: OwnList }).own = own
    return match
  }

  /** A list of the type;  or what the program's own is. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return (match.data as { own?: OwnList }).own?.datatype ?? super.getDatatype(match)
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { own } = match.data as { own?: OwnList }
    return own ? ownListAST(match, own) : super.getAST(match)
  }

  /** Is `words` a property or method of what `this` is, in the method `scope` is in? */
  static memberOfThis(scope: P.Scope, words: string): boolean {
    return !!P.MethodScope.thingTypeOf(scope)?.getMember(words)
  }
}
