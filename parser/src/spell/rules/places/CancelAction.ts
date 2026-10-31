import { proto, snakeCase } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { fieldNamed } from "./PlaceDetail"

/**
 * `cancel_action` rule:  stop an action of this thing's that's running (epic `data` P11, language's cancelling).
 * - e.g. `cancel search`
 * - Beats `cancel <event>` in a handler when the thing DECLARES an action of that name (decision 6 of The Words):
 *   a name a person gave an action means that action, and an event's name is only a word until someone sends it.
 * - Nothing's running:  nothing happens.
 * - Compiles to `core.cancelActions(this, "search")`.
 */
export class CancelAction extends SpellStatement<"action"> {
  @proto static alias = "statement"
  @proto static priority = Priority.preferred

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const words = snakeCase(`${match.groups.action.raw}`.trim())
    const type = P.MethodScope.thingTypeOf(scope)
    const isAction = !!type?.getMember(words) || !!type?.methods?.get?.(words)
    return isAction ? match : undefined
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const name = fieldNamed(`${match.groups.action.raw}`)
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "cancelActions",
      args: [new P.ASTSelfLiteral(match), new P.ASTStringLiteral(match, { value: JSON.stringify(name) })]
    })
  }
}
