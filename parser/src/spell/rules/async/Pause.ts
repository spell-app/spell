import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `pause` rule:  wait a while, e.g. `pause for 2 seconds`, `pause for 3 ticks`, `pause for the delay`.
 * - How long is a DURATION, the built-in dimension (epic `language` T140):
 *   - a measure written out, `300 msec`, `1 minute 30 seconds`
 *   - anything that measures one, `the delay` (`its "delay" is a duration in msec`)
 *   - or a number with a duration's unit after it, `(10 + 10) sec`
 * - Compiles to `await core.pauseFor(number, "msec")`, the unit the core's name for it (`SP.CORE_TIME_UNITS`),
 *   so `pausar 2 segundos` compiles as `pause for 2 seconds` does.
 * - Anything else is refused, saying it isn't a duration:  `pause for 2`, `pause for 2 cm`.
 * - TODO: "a second", "a little bit", "a while", "a noticeable amount".
 */
export class Pause extends SpellStatement<"duration|unit?", PauseData> {
  @proto static alias = "statement"

  /** Notes the duration's unit;  refuses what isn't one, and a pause in a drawing, which must answer at once. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return match
    const { duration, unit } = match.groups
    const durationUnit = SP.durationUnitOf(duration, unit)
    if (!durationUnit) return refuseNonDuration(match, unit ?? duration)
    match.data.timeUnit = SP.CORE_TIME_UNITS[durationUnit.id] ?? durationUnit.id
    return SpellStatement.refuseWaitInDraw(match)
  }

  getAST(match: P.MatchFor<this>) {
    const { duration, unit } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "pauseFor",
      args: [P.asAST<P.ASTExpression>(duration.AST), new P.ASTQuotedExpression(unit ?? duration, match.data.timeUnit!)]
    })
  }
}

/** What `pause` noted:  the core's name for its unit, `"msec"`. */
export type PauseData = { timeUnit?: string }

/** `match` refused:  `said`, what it was to wait for, isn't a duration. */
function refuseNonDuration(match: P.Match, said: P.Match): P.Match {
  const message = SP.Language.of(match.scope).parserMessage("not-a-duration", { said: `${said.raw}` })
  return SpellStatement.refuse(match, message)
}
