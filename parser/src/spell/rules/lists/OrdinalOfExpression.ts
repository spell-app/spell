import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { ListItemExpression } from "./ListItemExpression"

/**
 * `ordinal_of_expression` rule:  one item of a list by its place, with no word for what the items are,
 * e.g. `the first of its authors`, `the last of the cards`.
 * - The same as `the first item of its authors`:  `core.getItemAt(authors, 0)` (epic `data` I58).
 * - Without it, `property_expression` reads those words as a property called `first`, which no list has.
 * - It beats `property_expression` only where a list is meant:  see `parse()`.
 */
export class OrdinalOfExpression extends ListItemExpression<"ordinal|expression"> {
  @proto static listGroup = "expression"
  @proto static priority = Priority.mostSpecific

  /**
   * Only an item of something that holds items:
   * - a property its owner really declares stays that property, on a list too
   * - a list, known to be one:  yes
   * - something known NOT to be a list:  no, it's a property, `the top of its card`
   * - something we can't tell about:  yes, when it starts with an article and the word is only a place
   *   - `top` and `bottom` are also ordinary property names, so they need a known list
   *   - Spanish may leave the article out, where a bare `cuarto de baño` means something else
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { ordinal, expression } = match.groups
    const word = `${ordinal.raw}`
    const { datatype } = expression
    const owner = scope.getType(datatype)
    if (owner?.getMember(word)) return undefined
    if (datatype === "list" || P.itemTypeOf(datatype) || owner?.isA("List")) return match
    if (datatype !== undefined) return undefined
    const isOnlyAPlace = !END_MEANINGS.some((meaning) => Wording.reads(scope, "list_end", word, meaning))
    return isOnlyAPlace && Wording.lengthAt(scope, "definite_article", tokens, 0) > 0 ? match : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { ordinal, expression } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "getItemAt",
      args: [P.matchAST(expression), P.matchAST(ordinal)]
    })
  }
}

/** What `list_end`'s words mean:  an ordinal among them (`top`, `bottom`) is also a property's name. */
const END_MEANINGS = ["start", "end"]
