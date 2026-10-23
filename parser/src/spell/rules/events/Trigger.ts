import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `trigger` rule:  fires a global event, optionally with a `props` object.
 * - e.g. `trigger card-click`, `fire event card-click with card = 1`
 * - `eventName` is a bare `keyword`, so its `raw` form (with dashes) is used directly as the event name.
 * - Builds a call to core's `trigger(name, props?)` (a `P.ASTCoreMethodInvocation`).
 *   - Javascript calls `trigger()` by name, imported from `@spell/core`:  `trigger('card-click', { card: 1 })`.
 */
export class Trigger extends SpellStatement<"eventName|props?"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const { eventName, props } = match.groups
    // Use the `raw` eventName, dashes are ok!
    const args: P.ASTExpression[] = [new P.ASTQuotedExpression(match, eventName.raw!)]
    if (props) args.push(P.asAST<P.ASTExpression>(props.AST))
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "trigger",
      args
    })
  }
}
