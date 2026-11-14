import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { ActionModifiers } from "./ActionModifier"
import { MethodDefinition } from "./MethodDefinition"
import type { MethodSignatureData } from "./methods.shared"

/**
 * `action_detail` rule:  one line of an ACTION's description, said indented under it (epic `elemental-spell` P5).
 * - e.g. under `- to turn it over:`
 *   - `- shortcut meta+T`:  a key that runs it, again for each
 *   - `- enabled when it is face down`:  when it may run
 *   - `- disabled when there are no face down cards`:  when it may NOT run, `enabled when` turned round (epic `language` T132);
 *     an action says one or the other, never both
 *   - `- selected when it is face up`:  when it shows checked, in a menu
 *   - `- undoable`:  ONE undo step, named by its title
 *   - `- undoable as "Turn Card"`:  one named otherwise, `Undo Turn Card`
 *   - `- can't be undone`:  no undo step, the steps before it kept (epic `language` P55, Q60):
 *     without it, every action is one step, named by its title
 *   - `- icon "rotate"`:  its icon
 *   - `- titled "Turn Over"`:  its title in menus, key tooltips and the Inspector, where its words aren't it
 *     (epic `language` P18);  a fill-in follows the program, `- titled "Duplicate [the project name]…"`
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
export class ActionDetail extends SpellStatement<"keys?|enabled?|disabled?|selected?|undoable?|undoneAs?|cantBeUndone?|icon?|replacesLast?|title?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /**
   * Only in an action of a template's body -- see `actionIn()`.
   * - SIDE EFFECT:  a `disabled when` line in an action that also says `enabled when` is refused,
   *   naming both, for as long as the action's body has both (`SP.SpellWarnings.refuseIf()`).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const action = ActionDetail.actionIn(scope)
    if (!action) return undefined
    const match = super.parse(scope, tokens)
    if (match?.groups.disabled) {
      SP.SpellWarnings.refuseIf(match, SP.Language.of(scope).parserMessage("enabled-and-disabled-when"), () =>
        ActionDetail.saysBoth(action)
      )
    }
    return match
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
   * What action `match` says about itself, in order -- `undefined` if it says nothing:
   * its head line's modifiers (`with title "Deal"`, `, undoable as "Move Card"`, `action_modifier`), then the lines of its body.
   * - Reads ONLY matches:  pure, for `getAST()`.
   */
  static detailsOf(match: P.Match, body: P.Match | undefined): ActionDetails | undefined {
    const details: ActionDetails = { shortcuts: [] }
    let any = false
    // what its head line says, `with title "Deal", shortcut "meta+N"` (epic `language` P48), before its body's lines
    for (const modifier of ActionModifiers.modifiersIn(match.groups.modifiers as P.Match | undefined)) {
      any = true
      const { title, icon, keys, undoable, undoneAs, cantBeUndone } = modifier.groups as Record<
        string,
        P.Match | undefined
      >
      if (keys) details.shortcuts.push(ActionDetail.textOf(keys))
      if (undoable) details.undoable = true
      if (cantBeUndone) details.cantBeUndone = true
      if (undoneAs) details.undoneAs = ActionDetail.textOf(undoneAs)
      if (icon) details.icon = ActionDetail.textOf(icon)
      if (title) details.title = title
    }
    for (const line of body?.matched ?? []) {
      const statement = line instanceof P.Match ? (line.data as { statement?: P.Match }).statement : undefined
      if (!statement?.is(ActionDetail)) continue
      any = true
      const { keys, enabled, disabled, selected, undoable, undoneAs, cantBeUndone, icon, replacesLast, title } =
        statement.groups
      if (keys) details.shortcuts.push(`${keys.value}`)
      if (enabled) details.enabled = enabled
      if (disabled) details.disabled = disabled
      if (selected) details.selected = selected
      if (undoable) details.undoable = true
      if (cantBeUndone) details.cantBeUndone = true
      if (undoneAs) details.undoneAs = ActionDetail.textOf(undoneAs)
      if (icon) details.icon = ActionDetail.textOf(icon)
      if (replacesLast) details.replacesLast = true
      if (title) details.title = title
    }
    return any ? details : undefined
  }

  /** Does action `action`'s body say both `enabled when` and `disabled when`? */
  static saysBoth(action: P.Match): boolean {
    const body = (action.rule as MethodDefinition).getBody(action)
    const said = new Set<string>()
    for (const line of body?.matched ?? []) {
      const statement = line instanceof P.Match ? (line.data as { statement?: P.Match }).statement : undefined
      if (!statement?.is(ActionDetail)) continue
      if (statement.groups.enabled) said.add("enabled")
      if (statement.groups.disabled) said.add("disabled")
    }
    return said.size === 2
  }

  /** Is `match` one of our lines, or the line holding one? */
  static isDetailLine(match: P.Match | undefined): boolean {
    if (!match) return false
    const statement = (match.data as { statement?: P.Match } | undefined)?.statement
    return !!match.is?.(ActionDetail) || !!statement?.is(ActionDetail)
  }

  /** The text inside a `text` match's quotes, e.g. `Turn Card`. */
  static textOf(match: P.Match): string {
    const [token] = match.tokens
    return token instanceof P.TextToken ? token.innerText : `${match.value}`
  }
}

/**
 * What an action's description lines say -- see `ActionDetail.detailsOf()`.
 * - `shortcuts`:  each key, in order
 * - `enabled`, `selected`:  each condition's match, which a getter on the class returns
 * - `disabled`:  `enabled`'s condition turned round, which the same getter returns `not` of
 * - `undoneAs`, `icon`:  the text each says
 * - `undoable`:  a bare `- undoable`, so its undo goes by the action's title
 */
export type ActionDetails = {
  shortcuts: string[]
  enabled?: P.Match
  /** `- disabled when ...`:  the getter `enabled` would have, negated */
  disabled?: P.Match
  selected?: P.Match
  undoable?: boolean
  undoneAs?: string
  /** `- can't be undone`:  no step of its own (Q60) */
  cantBeUndone?: boolean
  icon?: string
  /** `- a new one replaces the last one` */
  replacesLast?: boolean
  /** `- titled "Turn Over"`:  its `text` match, fill-ins and all */
  title?: P.Match
}
