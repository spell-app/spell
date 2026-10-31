import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { textIn } from "./PlaceDetail"

/**
 * `operation_at` rule:  where an action declared under a place goes (epic `data` Q14, Q17's option A).
 *
 * ```spell
 * family cookbook is a web service at "https://api.example.com/v1":
 * 	- to publish (a recipe):
 * 		- it is at "/recipes/publish"
 * ```
 *
 * - An ordinary action, with a detail under it, as `- undone as` is, and called as any action is:  `publish the recipe`.
 * - Its body IS the call:  `core.callPlace()`, with the action's first argument.
 */
export class OperationAt extends SpellStatement<"path"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration

  /** Only in an action, under a place. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const place = P.SubjectScope.of(scope)?.subjectType
    const method = P.MethodScope.withThing(scope)
    const match = place?.placeName && method ? super.parse(scope, tokens) : undefined
    if (!match) return undefined
    match.data.placeName = place!.placeName
    match.data.operation = method!.name
    return match
  }

  /** The operation this line names, and its address. */
  static operationOf(match: P.Match): { name: string; at: string } | undefined {
    const { operation } = match.data as { operation?: string }
    return operation ? { name: operation, at: textIn(match.groups.path as P.Match) } : undefined
  }

  /** The call:  `core.callPlace("family_cookbook", "publish", this)`. */
  getAST(match: P.MatchFor<this>): P.ASTReturnStatement {
    const { placeName, operation } = match.data as { placeName: string; operation: string }
    const text = (value: string) => new P.ASTStringLiteral(match, { value: JSON.stringify(value) })
    return new P.ASTReturnStatement(match, {
      value: new P.ASTCoreMethodInvocation(match, {
        methodName: "callPlace",
        args: [text(placeName), text(operation), new P.ASTSelfLiteral(match)]
      })
    })
  }
}
