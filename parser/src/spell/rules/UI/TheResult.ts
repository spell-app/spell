import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"

/**
 * `the_result` rule:  what closed the last dialog, e.g. which button closed a modal (epic `language` T155).
 * - e.g. `if the result is ok`, `if the result is "save the thing"`;  Spanish's `el resultado`, `si el resultado es aceptar`
 * - After `show "you won"`, once the modal has closed:  `ok` or `cancel` from a button that says so
 *   (`<action ok />`, `<action "save the thing" ok />`), else that button's action's name;
 *   `cancel` for Escape and the dimmer.
 * - After `alert`, `ok`;  `confirm`, `ok` or `cancel`;  `prompt`, the text typed, or `cancel`.
 * - Compiles to `core.result()`.  Compared with `is`, it compiles to `core.resultIs(...)`, with no regard to case,
 *   and `ok` and `cancel` (Spanish's `aceptar`, `cancelar`) read as its answers, unquoted (`is_equal`).
 * - `Priority.overridable`:  a program's own variable or action of these words wins.
 *   So does a property of the thing an action runs on:  `its "result" is a number`, then `the result` is that.
 */
export class TheResult extends SpellExpression<never, TheResultData> {
  @proto static priority = Priority.overridable

  /** Note the program's own property of its noun, `result`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return match
    const noun = `${match.inputText}`.trim().split(/\s+/).at(-1)!
    const member = P.MethodScope.thingTypeOf(scope)?.getMember(noun)
    if (member instanceof P.ScopeVariable) match.data.own = `${member.output ?? member.name}`
    else match.data.isLastAnswer = true
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { own } = match.data
    if (own) return new P.ASTPropertyExpression(match, { object: new P.ASTSelfLiteral(match), property: own })
    return new P.ASTCoreMethodInvocation(match, { methodName: "result", args: [] })
  }
}

/** What `the_result` keeps on its match. */
type TheResultData = {
  /** The program's own property of its noun, as compiled:  `the result` is `this.result`. */
  own?: string
  /** It's the last dialog's answer, not the program's own:  what `is_equal` reads, to compare it as one. */
  isLastAnswer?: boolean
}
