import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

import { eventVariable, inHandler } from "./EventPart"

/**
 * `pass_event` rule:  in a handler, hand the event on up its chain, and stop here (epic `elemental-spell` P9, C25).
 * - e.g. `pass event`, `pass mouse down`:  `return event.pass()`
 * - A handler that runs TAKES its event:  nothing above hears it unless it passes it (Owen's model, HyperCard's `pass`).
 * - Only inside a handler.
 */
export class PassEvent extends SpellStatement<"eventName?"> {
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!inHandler(scope)) return undefined
    return super.parse(scope, tokens)
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTReturnStatement(match, {
      value: new P.ASTScopedMethodInvocation(match, { thing: eventVariable(match), methodName: "pass" })
    })
  }
}
