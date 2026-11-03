import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Through the folder:  read only when called, once the folder has loaded
import { PossessiveProperty } from "spell/parser/spell/rules/properties"

/**
 * `the_property_of_a_thing` rule:  `the color of a card` -- one of two `type_property` spellings,
 * read by `property_value_either` and `property_value_getter`.
 * - Or as a possessive (epic `language` T24):  `a card's color`;  `a card' color` is refused, saying how to write it.
 *   - A plural with no article reads as one, warning to write that (T26):  `cards' color` => `a card's color`.
 * - No `getAST()`:  they read `match.groups.type` / `.property` directly.
 */
export class ThePropertyOfAThing extends P.Sequence<"property|type"> {
  @proto static alias = "type_property"

  /** Refuse a possessive misspelled, `a card' color`;  warn on a plural with no article, `cards' color`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match || !PossessiveProperty.warnIfNoArticle(match)) return undefined
    PossessiveProperty.refuseIfDeclarationMisspelled(match)
    return match
  }
}
