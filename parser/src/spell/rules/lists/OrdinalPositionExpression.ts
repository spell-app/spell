import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { ListItemExpression } from "./ListItemExpression"

/**
 * `ordinal_position_expression` rule:  ordinal-word index expression:
 * e.g. `the first item of my-list`, `the tenth card of deck`.
 * - `{arg}` (e.g. `item`) names the items:  of a list of lists, it may name their items (`ListItemExpression`).
 * - Shares same `getItemAt` compile target as `position_expression`, with `{ordinal}` resolved to a number.
 */
export class OrdinalPositionExpression extends ListItemExpression<"ordinal|arg|expression"> {
  @proto static listGroup = "expression"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { ordinal } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "getItemAt",
      args: [this.itemsList(match), P.matchAST(ordinal)]
    })
  }
}
