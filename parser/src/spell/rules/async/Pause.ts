import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * `pause` rule:  delay for a certain amount of time, e.g. `pause for 2 seconds`.
 * - Compiles to `await core.pauseFor(number, 'units')`.
 * - Its unit is the word rule `pause_units`:  the unit's MEANING is compiled, the runtime's name for it
 *   (`core.TIME_UNITS_MAP`'s keys), so `pausar 2 segundos` compiles as `pause for 2 seconds` does.
 * - TODO: "a second", "a little bit", "a while", "a noticeable amount".
 */
export class Pause extends SpellStatement<"number|units"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const { number, units } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "pauseFor",
      args: [
        P.asAST<P.ASTExpression>(number.AST),
        new P.ASTQuotedExpression(units, Wording.meaningOf(units) ?? DEFAULT_UNITS)
      ]
    })
  }
}

/** The unit a pause with no known meaning waits in, as the runtime's `pauseFor()` does. */
const DEFAULT_UNITS = "seconds"

/** The units a pause may wait in, the runtime's names (`core.TIME_UNITS_MAP`):  `pause_units`'s meanings. */
export const PAUSE_UNITS = ["second", "seconds", "sec", "millisecond", "milliseconds", "msec", "tick", "ticks"]
