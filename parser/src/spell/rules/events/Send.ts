import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `send` rule:  sends an event to a thing, which hands it up its chain until a handler takes it
 * (epic `elemental-spell` P9, Owen's event model) -- see core's `send()`, `sending.ts`.
 * - `send flipped with side = its direction`:  to the thing whose method this is, `send(this, "flipped", {...}, this)`
 * - `send card picked to the pile with card = it`:  to the pile
 * - Outside a thing's method:  to the program's own listeners, `send(undefined, "start")`
 * - The sender is the thing whose method this is (`sender` in a handler), else none.
 * - An event still happening (`closing`;  Spanish `cerrando`:  the language's `ongoingEventName`) can be canceled
 *   (`cancel closing`):  then the method stops there, so what it was about to do (`closed`) doesn't happen --
 *   `if ((await send(this, "closing")).canceled) return`.
 *   - Any other event goes without waiting;  `wait for send x` waits for its handlers.
 * - `eventName` is a bare `keyword` or several words (`event_words`):  its `raw` form, dashed, is the event's name.
 * - `trigger` and `fire` stay the program-wide `trigger()` they were (`Trigger`).
 */
export class Send extends SpellStatement<"eventName|target?|props?", SendMatchData> {
  @proto static alias = "statement"

  /** Notes, while parsing, whether the event is one still happening in the file's language:  `closing`, `cerrando`. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (match) {
      const { eventName } = (match as P.MatchFor<this>).groups
      match.data.ongoing = SP.Language.of(scope).words.ongoingEventName.test(`${eventName.raw}`)
      match.data.inThing = !!P.MethodScope.withThing(scope)
    }
    return match
  }

  getAST(match: P.MatchFor<this>) {
    const { eventName, target, props } = match.groups
    const self = match.data.inThing ? new P.ASTSelfLiteral(match) : undefined
    const args: P.ASTExpression[] = [
      target ? P.asAST<P.ASTExpression>(target.AST) : (self ?? new P.ASTNothingLiteral(match)),
      new P.ASTQuotedExpression(match, `${eventName.raw}`)
    ]
    if (props || self) {
      args.push(props ? P.asAST<P.ASTExpression>(props.AST) : new P.ASTObjectLiteral(match, { properties: [] }))
    }
    if (self) args.push(new P.ASTSelfLiteral(match))
    const call = new P.ASTCoreMethodInvocation(match, { methodName: "send", args })
    if (!match.data.ongoing) return call
    // `if ((await send(this, "closing")).canceled) return`
    return new P.ASTIfStatement(match, {
      condition: new P.ASTPropertyExpression(match, {
        object: new P.ASTParenthesizedExpression(match, {
          expression: new P.ASTAwaitExpression(match, { expression: call })
        }),
        property: "canceled"
      }),
      statements: new P.ASTReturnStatement(match)
    })
  }
}

/** What `send` notes while parsing, for `getAST()`. */
type SendMatchData = {
  /** Is the event one still happening, which a handler can cancel? */
  ongoing?: boolean
  /** Is it sent from a thing's own method, where `this` is the thing? */
  inThing?: boolean
}
