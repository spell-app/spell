import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { MethodDefinition } from "./MethodDefinition"
import type { MethodSignatureData } from "./methods.shared"

/**
 * `action_detail` rule:  one line of an ACTION's description, said indented under it (epic `elemental-spell` P5).
 * - e.g. under `- to turn it over:`
 *   - `- shortcut meta+T`:  a key that runs it, again for each
 *   - `- enabled when it is face down`:  when it may run
 *   - `- selected when it is face up`:  when it shows checked, in a menu
 *   - `- undone as "Turn Card"`:  its undo's name, `Undo Turn Card`
 *   - `- icon "rotate"`:  its icon
 *   - `- a new one replaces the last one`:  the newest wins, a running one canceled, where a repeat is otherwise ignored
 * - An action is a described command (Q33):  one action drives a menu item, a button and a key.
 *   Nothing runs from its description yet:  the actions phase (P10) reads it.
 * - Only in the body of an action of a template (`MethodDefinition`, its signature on a type):
 *   anywhere else it isn't understood.
 * - In the action's body, so `it` is the thing, as in its steps:  `enabled when it is face down`.
 * - Compiles to nothing itself.
 *   Its action's definition gathers them (`detailsOf()`):  a getter for each condition, then
 *   `core.describeAction(Card, "turnOver", {...})` after the class.
 */
export class ActionDetail extends SpellStatement<"keys?|enabled?|selected?|undoneAs?|icon?|replacesLast?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** Only in an action of a template's body -- see `actionIn()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (!ActionDetail.actionIn(scope)) return undefined
    return super.parse(scope, tokens)
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }

  /** The action definition whose body `scope` is, if it's a template's action:  a `MethodDefinition` match. */
  static actionIn(scope: P.Scope): P.Match | undefined {
    if (!(scope instanceof P.MethodScope)) return undefined
    const owner = scope.declaredBy
    if (!owner?.is(MethodDefinition)) return undefined
    const signature = (owner.data as { signature?: MethodSignatureData }).signature
    return signature?.instanceType && !signature.asPostfixExpression ? owner : undefined
  }

  /**
   * What the lines of action `match`'s body describe, in order -- `undefined` if none do.
   * - Reads ONLY matches:  pure, for `getAST()`.
   */
  static detailsOf(match: P.Match, body: P.Match | undefined): ActionDetails | undefined {
    const details: ActionDetails = { shortcuts: [] }
    let any = false
    for (const line of body?.matched ?? []) {
      const statement = line instanceof P.Match ? (line.data as { statement?: P.Match }).statement : undefined
      if (!statement?.is(ActionDetail)) continue
      any = true
      const { keys, enabled, selected, undoneAs, icon, replacesLast } = statement.groups
      if (keys) details.shortcuts.push(`${keys.value}`)
      if (enabled) details.enabled = enabled
      if (selected) details.selected = selected
      if (undoneAs) details.undoneAs = ActionDetail.textOf(undoneAs)
      if (icon) details.icon = ActionDetail.textOf(icon)
      if (replacesLast) details.replacesLast = true
    }
    return any ? details : undefined
  }

  /** Is `match` one of our lines, or the line holding one? */
  static isDetailLine(match: P.Match | undefined): boolean {
    if (!match) return false
    const statement = (match.data as { statement?: P.Match } | undefined)?.statement
    return !!match.is?.(ActionDetail) || !!statement?.is(ActionDetail)
  }

  /** The text inside a `text` match's quotes, e.g. `Turn Card`. */
  private static textOf(match: P.Match): string {
    const [token] = match.tokens
    return token instanceof P.TextToken ? token.innerText : `${match.value}`
  }
}

/**
 * What an action's description lines say -- see `ActionDetail.detailsOf()`.
 * - `shortcuts`:  each key, in order
 * - `enabled`, `selected`:  each condition's match, which a getter on the class returns
 * - `undoneAs`, `icon`:  the text each says
 */
export type ActionDetails = {
  shortcuts: string[]
  enabled?: P.Match
  selected?: P.Match
  undoneAs?: string
  icon?: string
  /** `- a new one replaces the last one` */
  replacesLast?: boolean
}
