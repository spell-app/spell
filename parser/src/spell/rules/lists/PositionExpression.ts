import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
import { ListItemExpression } from "./ListItemExpression"

/**
 * `position_expression` rule:  numeric-position index expression, e.g. `card 1 of the pile`, `card #2 of the pile`.
 * - `{arg}` (e.g. `card`) captured for readability only, unused in output.
 * - NOTE: negative positions come from end of list, e.g. `card -1 of the pile`.
 * - NOTE: positions are **1-based** while Javascript is **0-based**, e.g. `item 1 of the array` => `array[0]`.
 * - Compiles to `core.getItemAt(list, index)`:  `card 10 of deck` => `core.getItemAt(deck, 9)`.
 * - Rejects what isn't a numeric position:
 *   - a yes / no, which counts no place in a list:
 *     Spanish's `thing no es uno de theList` would read `no es uno` (`false == 1`) as the position of `thing`
 *   - an ordinal for `{arg}`, which is `ordinal_position_expression`'s:
 *     Spanish's `la última carta de la pile` would read `carta` as the position of `última`
 */
export class PositionExpression extends ListItemExpression<"arg|position|expression"> {
  @proto static listGroup = "expression"

  /** Only a numeric position, of a thing not named by an ordinal -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { arg, position } = match.groups
    if (position.datatype === "choice" || Wording.reads(scope, "ordinal", `${arg.raw}`)) return undefined
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { position, expression } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "getItemAt",
      args: [P.matchAST(expression), P.matchAST(position)]
    })
  }
}
