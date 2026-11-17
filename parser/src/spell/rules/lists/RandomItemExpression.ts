import { P } from "spell/parser/parser"
import { ListItemExpression } from "./ListItemExpression"

/**
 * `random_item_expression` rule:  pick a single random item from list, e.g. `a random item of my-list`.
 * - `{arg}` (e.g. `item`) names the items:  of a list of lists, it may name their items (`ListItemExpression`).
 * - Compiles to `core.randomItemOf(list)`.
 */
export class RandomItemExpression extends ListItemExpression<"arg|list"> {
  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "randomItemOf",
      args: [this.itemsList(match)]
    })
  }
}
