import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"

/** What a list reads as with nothing known of what it holds:  `[1, 2]`. */
const LIST = "list"

/**
 * `total_of` rule:  the sum of a list (epic `data` P11).
 * - e.g. `the total of its prices`, `the sum of its prices`
 * - Only of a list:  a type's own `total` or `sum` stays what it was.
 * - `Priority.specific`, as `the biggest of the prices` is:  it has to beat `the x of y`, which reads a property called `total` off the list, and finds nothing.
 * - Compiles to `core.totalOf(list)`.
 */
export class TotalOf extends SpellExpression<"list"> {
  @proto static datatype: P.Datatype | undefined = "number"
  @proto static priority = Priority.specific

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { datatype } = match.groups.list
    return datatype === LIST || scope.getItemType(datatype) ? match : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "totalOf",
      args: [P.asAST<P.ASTExpression>(match.groups.list.AST)]
    })
  }
}
