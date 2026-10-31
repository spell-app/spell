import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `total_of` rule:  the sum of a list (epic `data` P11).
 * - e.g. `the total of its prices`
 * - Only of a list:  a type's own `total` stays what it was.
 * - Compiles to `core.totalOf(list)`.
 */
export class TotalOf extends SpellExpression<"list"> {
  @proto static datatype: P.Datatype | undefined = "number"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    return scope.getItemType(match.groups.list.datatype) ? match : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "totalOf",
      args: [P.asAST<P.ASTExpression>(match.groups.list.AST)]
    })
  }
}
