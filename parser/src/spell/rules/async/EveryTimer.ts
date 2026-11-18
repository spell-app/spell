import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `every_timer` rule:  steps a thing or an app runs again and again while its program runs, e.g. a clock's
 * `every second`, then `set its time to now` under it (epic `language` T159;  Owen, 2026-11-17).
 * - In a type's outline only:  `it` and `its` are the thing, as in its other methods.
 * - How often is a DURATION, the built-in dimension, as a place's `check it every` reads one (`SP.durationUnitOf()`):
 *   a measure written out (`every 5 minutes`, `every 1 minute 30 seconds`), or one unit, its number dropped
 *   (`every second`, `every day`).  Anything else is refused, saying it isn't a duration.
 * - Then, if it likes, when it stops:
 *   - `until` a moment, read again before each run:  `every 2 seconds until its end`
 *   - a number of runs:  `every second 10 times`
 *   - else it runs until the program ends
 * - Spanish:  `cada segundo`, `cada 5 minutos hasta su fin`, `cada segundo 10 veces`.
 * - Its steps run while the program does, and stop when it ends;  they add no undo step, nor does an action they call.
 * - Compiles to a method of the type, named by how often, in English whatever the language (`everySecond()`,
 *   `every5Minutes()`, `everySecond10Times()`), and after the class,
 *   `core.addTimer(Clock, "everySecond", { seconds: 1 })`:  each thing made runs its own (core's `timers.ts`).
 *   - `until`:  a getter giving the moment, `everySecondUntil`, named in the description
 *   - `times`:  the number, in the description
 * - NOTE: two timers of the same words in one type are one method:  the later wins.
 */
export class EveryTimer extends SpellStatement<"interval?|until?|times?|body?|unit?", EveryTimerData> {
  @proto static alias = "statement"
  // before a line read as an expression, `every second` as a list of seconds
  @proto static priority = Priority.specific

  /** Only in a type's outline;  works out its seconds and its method's name, refusing what isn't a duration. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!P.SubjectScope.of(scope)?.subjectType) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return match
    const { interval, unit } = match.groups
    const said = (interval ?? unit)!
    const durationUnit = SP.durationUnitOf(said, unit)
    if (!durationUnit) {
      const message = SP.Language.of(scope).parserMessage("not-a-duration", { said: `${said.raw}` })
      return SpellStatement.refuse(match, message)
    }
    const amount = interval ? Number(interval.value) : 1
    match.data.seconds = Math.round(amount * durationUnit.factor * 1000) / 1000
    const times = match.groups.times ? Number(match.groups.times.raw) : undefined
    match.data.method = EveryTimer.methodNameFor(amount, durationUnit.id, times)
    return match
  }

  /**
   * The timer's method, by spell's names, from its words in English:  `every_second`, `every_5_minutes`,
   * `every_second_10_times`.
   * - The duration's unit is its English id in every language:  `cada segundo` is `every_second` too.
   */
  static methodNameFor(amount: number, unitId: string, times?: number): string {
    const often = amount === 1 ? `every_${unitId}` : `every_${String(amount).replace(/\W/g, "_")}_${unitId}s`
    return times === undefined ? often : `${often}_${times}_times`
  }

  /** Its steps' scope:  `it` and `its` are the thing, as in its type's other methods. */
  getNestedScopeForMatch(match: P.MatchFor<this>) {
    const subject = P.SubjectScope.of(match.scope)!.subjectType
    return new P.MethodScope({
      parentScope: match.scope,
      name: match.data.method ?? "every",
      args: [],
      declaredBy: match,
      ...(subject && { thisVar: subject.instanceName, mapItTo: "this", itDatatype: SP.typeName(subject.name) })
    })
  }

  /** Its method, its `until` getter if it says one, then `core.addTimer()` after the class. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { until, times } = match.groups
    const { seconds, method } = match.data
    const type = P.SubjectScope.of(match.scope)!.subject
    const body = this.getBody(match)
    const statements: P.ASTStatement[] = [
      new P.ASTPropertyDefinition(match, {
        type,
        property: method!,
        method: new P.ASTMethodDefinition(match, {
          body: body ? P.asAST<P.ASTStatementBlock | P.ASTStatement | P.ASTExpression>(body.AST) : undefined
        })
      })
    ]
    const description: Record<string, P.ASTDescriptionValue> = { seconds: seconds! }
    if (until) {
      const getter = `${method}_until`
      statements.push(
        new P.ASTPropertyDefinition(until, {
          type,
          property: getter,
          get: new P.ASTMethodDefinition(until, { body: P.asAST<P.ASTExpression>(until.AST) })
        })
      )
      description.until = { member: getter }
    }
    if (times) description.times = Number(times.raw)
    statements.push(new P.ASTTypeDescription(match, { type, describes: "timer", name: method!, description }))
    return new P.ASTStatementGroup(match, { statements })
  }
}

/** What `every_timer` worked out as it parsed. */
export type EveryTimerData = {
  /** how often, in seconds */
  seconds?: number
  /** its method, by spell's names:  `every_second` */
  method?: string
}
