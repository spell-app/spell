import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

import { eventVariable, inHandler } from "./EventPart"

/**
 * `cancel_event` rule:  in a handler, cancel an event still happening (epic `elemental-spell` P9, Q27).
 * - e.g. `cancel event`, `cancel closing`:  `event.cancel()`
 * - Only an `-ing` event can be:  its sender's next step (`closed`) doesn't happen (core's `send()`).
 *   Canceling `closed` does nothing:  it happened already.
 * - The handler goes on;  `pass event` after it hands it up, canceled.
 * - Only inside a handler.
 */
export class CancelEvent extends SpellStatement<"eventName?"> {
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!inHandler(scope)) return undefined
    return super.parse(scope, tokens)
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTScopedMethodInvocation(match, { thing: eventVariable(match), methodName: "cancel" })
  }
}
