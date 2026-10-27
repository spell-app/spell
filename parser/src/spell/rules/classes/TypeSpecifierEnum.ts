import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * `type_specifier_enum` rule:  specifies a property's allowed values as an enumeration,
 * for use by `define_property_has`.
 * - e.g. `as either red or black`, `as one of clubs, diamonds, hearts, spades`
 * - Compiles (via `getAST()`) to a `P.ASTEnumeration` array literal, e.g. `["red", "black"]`.
 * - Without `either` / `one of`, only two or more values joined by `or`:  Spanish's `como arriba o abajo`.
 *   One value alone, `como texto`, is a type (`type_specifier_datatype`) -- see `parse()`.
 */
export class TypeSpecifierEnum extends P.Sequence<"enumeration"> {
  @proto static alias = "type_specifier"
  /**
   * How many words come before the list when it has no `either` / `one of`:  1, its `as` (`como`).
   * - English always says `either` or `one of`;  Spanish may leave them out, `como arriba o abajo`.
   */
  @proto static wordsBeforeBareList = 1
  declare wordsBeforeBareList: number

  /**
   * A list with no `either` / `one of` before it (only `wordsBeforeBareList` words) must be two or more values
   * joined by `or`, e.g. `up or down`:  one value alone, or `texto, que`, isn't an enumeration.
   * - `or` is the language's own:  the `and_or` word rule's word meaning `or`.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (!match) return match
    const list = (match.groups as { enumeration: P.Match }).enumeration
    if (wordsBefore(match, list) !== this.wordsBeforeBareList) return match
    if (list.items.length < 2) return undefined
    return list.tokens.some((token) => Wording.reads(scope, "and_or", `${token.value}`, "or")) ? match : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTEnumeration {
    // a range spread into its numbers -- see `number_range`
    const enumeration = P.matchAST<P.ASTListExpression>(match.groups.enumeration).items ?? []
    return new P.ASTEnumeration(match, {
      enumeration,
      values: enumeration.map(valueOf)
    })
  }
}

/** How many words of `match` come before its part `list`:  whitespace isn't a word. */
function wordsBefore(match: P.Match, list: P.Match): number {
  return match.tokens.filter((token) => !(token instanceof P.WhitespaceToken) && token.start < list.start!).length
}

/**
 * An enumeration's value as spell's scopes keep it:  spell's own, `clubs`, `2`.
 * - No quotes, so each writer quotes it its own way (epic `python-target` P3, output-targets' T4).
 *   It was `'clubs'`, javascript's.
 * - Every item here comes from `identifier_list`, which only ever matches `known_variable`, `constant` or `number`
 *   leaves:  all `Literal` subclasses whose `compile()` returns the underlying primitive value.
 *   But the base `ASTNode.compile()` is typed as `unknown`.
 */
function valueOf(literal: P.ASTExpression): string | number {
  return P.spellValueOf(literal.compile() as string | number)
}
