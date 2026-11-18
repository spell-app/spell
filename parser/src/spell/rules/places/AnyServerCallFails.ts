import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import
import { CAUGHT_ERROR, passesWhatItDidNotCatch } from "spell/parser/spell/rules/methods/FailureHook"

/**
 * `any_server_call_fails` rule:  the app's own steps for every server action that fails, run last
 * (epic `data` P50, Q90, Q93).
 *
 * ```spell
 * when any server call fails
 * 	if the error is "not authorized"
 * 		show the sign in menu
 * 	otherwise
 * 		do nothing
 * ```
 *
 * - `if any server call fails` says the same;  Spanish `cuando falla cualquier llamada al servidor`.
 * - Runs after every action's own failure steps (`if completing a job fails`), for what they passed on;
 *   then Spell's notice, only for what nobody caught.  `otherwise do nothing` keeps the notice away.
 * - Its steps see `the error`;  catching and passing on as a failure step's (`failure_hook`).
 * - Compiles to `core.addServerFailureStep((error) => { ... })`.
 */
export class AnyServerCallFails extends SpellStatement<"body?"> {
  @proto static alias = "statement"
  // `if completing a job fails` reads these words too, and would refuse them:  no action reads "any server call"
  @proto static priority = Priority.mostSpecific
  /** What `isInFailureStep()` asks:  `nevermind` and `pass the error` go in its steps. */
  @proto static failureStep = true
  declare failureStep: boolean

  /** Its steps see `the error`. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return new P.MethodScope({
      parentScope: match.scope,
      declaredBy: match,
      args: [new P.ScopeVariable({ name: CAUGHT_ERROR })]
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const steps = P.matchAST(this.getBody(match)) as P.ASTStatementBlock | P.ASTStatement | undefined
    const step = new P.ASTMethodDefinition(match, {
      inline: true,
      args: [new P.ASTVariableExpression(match, { name: CAUGHT_ERROR })],
      body: steps
    })
    passesWhatItDidNotCatch(match, step.body)
    return new P.ASTCoreMethodInvocation(match, { methodName: "addServerFailureStep", args: [step] })
  }
}
