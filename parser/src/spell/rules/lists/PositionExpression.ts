import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { ListItemExpression } from "./ListItemExpression"

/**
 * `position_expression` rule:  numeric-position index expression, e.g. `card 1 of the pile`, `card #2 of the pile`.
 * - `{arg}` (e.g. `card`) captured for readability only, unused in output.
 * - NOTE: negative positions come from end of list, e.g. `card -1 of the pile`.
 * - NOTE: positions are **1-based** while Javascript is **0-based**, e.g. `item 1 of the array` => `array[0]`.
 * - Compiles to `core.getItemAt(list, index)`:  `card 10 of deck` => `core.getItemAt(deck, 9)`.
 */
export class PositionExpression extends ListItemExpression<"arg|position|expression"> {
  @proto static listGroup = "expression"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { position, expression } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "getItemAt",
      args: [P.matchAST(expression), P.matchAST(position)]
    })
  }
}
